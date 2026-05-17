import {
  randomBytes,
  scrypt as scryptCallback,
  scryptSync,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export function hashPasswordSync(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${derivePasswordHashSync(password, salt)}`;
}

export async function verifyPassword(password: string, storedPasswordHash: string) {
  const [salt, hash] = storedPasswordHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const derivedHash = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const storedHashBuffer = Buffer.from(hash, "hex");

  if (storedHashBuffer.length !== derivedHash.length) {
    return false;
  }

  return timingSafeEqual(storedHashBuffer, derivedHash);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedHash = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedHash.toString("hex")}`;
}

function derivePasswordHashSync(password: string, salt: string) {
  return scryptSync(password, salt, KEY_LENGTH).toString("hex");
}
