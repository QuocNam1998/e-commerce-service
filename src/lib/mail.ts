import nodemailer from "nodemailer";
import { env } from "../config/env.js";

type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function getMailerConfig() {
  const missingKeys = [
    ["SMTP_HOST", env.SMTP_HOST],
    ["SMTP_PORT", env.SMTP_PORT],
    ["SMTP_USER", env.SMTP_USER],
    ["SMTP_PASS", env.SMTP_PASS],
    ["MAIL_FROM", env.MAIL_FROM],
  ]
    .filter(([, value]) => value === undefined || value === "")
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(
      `Mail is not configured. Missing environment variables: ${missingKeys.join(", ")}`,
    );
  }

  return {
    host: env.SMTP_HOST!,
    port: env.SMTP_PORT!,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
    },
    from: env.MAIL_FROM!,
  };
}

export function isMailConfigured() {
  return Boolean(
    env.SMTP_HOST &&
      env.SMTP_PORT &&
      env.SMTP_USER &&
      env.SMTP_PASS &&
      env.MAIL_FROM,
  );
}

export async function sendMail({ to, subject, text, html }: SendMailOptions) {
  const mailerConfig = getMailerConfig();
  const transporter = nodemailer.createTransport({
    host: mailerConfig.host,
    port: mailerConfig.port,
    secure: mailerConfig.secure,
    auth: mailerConfig.auth,
  });

  await transporter.sendMail({
    from: mailerConfig.from,
    to,
    subject,
    text,
    html,
  });
}
