import rateLimit from "express-rate-limit";
import { Router } from "express";
import {
  handleDeleteAccount,
  handleForgotPassword,
  handleGetCurrentUser,
  handleLogin,
  handleLogout,
  handleRegister,
  handleResetPassword,
  handleUpdateProfile,
} from "./auth.controller.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset requests, please try again later." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts, please try again later." },
});

export const authRouter = Router();

authRouter.post("/login", loginLimiter, handleLogin);
authRouter.get("/me", handleGetCurrentUser);
authRouter.patch("/me", handleUpdateProfile);
authRouter.delete("/me", handleDeleteAccount);
authRouter.post("/logout", handleLogout);
authRouter.post("/register", registerLimiter, handleRegister);
authRouter.post("/forgot-password", forgotPasswordLimiter, handleForgotPassword);
authRouter.post("/reset-password", handleResetPassword);
