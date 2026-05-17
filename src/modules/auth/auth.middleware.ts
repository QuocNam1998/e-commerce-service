import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/httpError.js";
import { getAuthenticatedUser } from "./auth.service.js";
import { parseSessionCookie } from "./auth.validation.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = parseSessionCookie(req.headers.cookie, env.SESSION_COOKIE_NAME);
    res.locals.user = await getAuthenticatedUser(sessionToken);
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = parseSessionCookie(req.headers.cookie, env.SESSION_COOKIE_NAME);
    const user = await getAuthenticatedUser(sessionToken);
    if (user.role !== "admin") {
      throw new HttpError(403, "Admin access required.");
    }
    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
