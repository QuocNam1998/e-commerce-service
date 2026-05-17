import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { serializeCookie } from "../../lib/cookies.js";
import {
  deleteAccount,
  getAuthenticatedUser,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateProfile,
} from "./auth.service.js";
import {
  forgotPasswordSchema,
  loginSchema,
  parseSessionCookie,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "./auth.validation.js";
import { findUserByEmail } from "./auth.repository.js";
import { createHash, randomBytes } from "node:crypto";
import { deletePasswordResetsByUserId, savePasswordReset } from "./auth.session.repository.js";
import { isMailConfigured, sendMail } from "../../lib/mail.js";

function getSessionSameSitePolicy() {
  return env.NODE_ENV === "production" ? "None" : "Lax";
}

function buildPasswordResetUrl(token: string) {
  const resetUrl = new URL("/reset-password", env.CORS_ORIGIN);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

function appendSessionCookie(
  response: Response,
  sessionToken: string,
  expiresAt: string,
) {
  response.append(
    "Set-Cookie",
    serializeCookie(env.SESSION_COOKIE_NAME, sessionToken, {
      expires: new Date(expiresAt),
      httpOnly: true,
      path: "/",
      sameSite: getSessionSameSitePolicy(),
      secure: env.NODE_ENV === "production",
    }),
  );
}

export async function handleForgotPassword(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const emailToFind = forgotPasswordSchema.parse(request.body).email;
    const user = await findUserByEmail(emailToFind);
    if (user) {
      await deletePasswordResetsByUserId(user.id);

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      await savePasswordReset({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetUrl = buildPasswordResetUrl(rawToken);
      if (isMailConfigured()) {
        await sendMail({
          to: user.email,
          subject: "Reset your password",
          text: [
            `Hello ${user.displayName},`,
            "",
            "We received a request to reset your password.",
            `Reset link: ${resetUrl}`,
            `This link expires at ${expiresAt.toISOString()}.`,
            "",
            "If you did not request this, you can ignore this email.",
          ].join("\n"),
          html: `
            <p>Hello ${user.displayName},</p>
            <p>We received a request to reset your password.</p>
            <p><a href="${resetUrl}">Reset your password</a></p>
            <p>This link expires at ${expiresAt.toISOString()}.</p>
            <p>If you did not request this, you can ignore this email.</p>
          `,
        });
      } else {
        logger.warn({ resetUrl, email: user.email }, "Password reset email skipped — SMTP not configured");
      }
    }

    return response.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
}

export async function handleResetPassword(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(request.body);
    await resetPassword(token, newPassword);

    response.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    next(error);
  }
}

export async function handleLogin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const input = loginSchema.parse(request.body);
    if (!input.identifier || !input.password) {
      response.status(400).json({
        message: "Both identifier and password are required.",
      });
      return;
    }
    const result = await loginUser(input);
    appendSessionCookie(response, result.sessionToken, result.expiresAt);

    response.status(200).json({
      message: "Login successful.",
      data: {
        expiresAt: result.expiresAt,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetCurrentUser(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const sessionToken = parseSessionCookie(
      request.headers.cookie,
      env.SESSION_COOKIE_NAME,
    );
    const user = await getAuthenticatedUser(sessionToken);

    response.status(200).json({
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleLogout(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const sessionToken = parseSessionCookie(
      request.headers.cookie,
      env.SESSION_COOKIE_NAME,
    );
    await logoutUser(sessionToken);

    response.append(
      "Set-Cookie",
      serializeCookie(env.SESSION_COOKIE_NAME, "", {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        sameSite: getSessionSameSitePolicy(),
        secure: env.NODE_ENV === "production",
      }),
    );

    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function handleRegister(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const input = registerSchema.parse(request.body);
    const result = await registerUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      phone: input.phone || null,
    });

    appendSessionCookie(response, result.sessionToken, result.expiresAt);

    response.status(201).json({
      message: "Registration successful.",
      data: {
        expiresAt: result.expiresAt,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateProfile(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const sessionToken = parseSessionCookie(request.headers.cookie, env.SESSION_COOKIE_NAME);
    const user = await getAuthenticatedUser(sessionToken);
    const input = updateProfileSchema.parse(request.body);
    const updated = await updateProfile(user.id, input);
    response.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteAccount(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const sessionToken = parseSessionCookie(request.headers.cookie, env.SESSION_COOKIE_NAME);
    const user = await getAuthenticatedUser(sessionToken);
    await deleteAccount(user.id);
    response.append(
      "Set-Cookie",
      serializeCookie(env.SESSION_COOKIE_NAME, "", {
        expires: new Date(0),
        httpOnly: true,
        path: "/",
        sameSite: getSessionSameSitePolicy(),
        secure: env.NODE_ENV === "production",
      }),
    );
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
