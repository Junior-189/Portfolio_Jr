import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "";
if (JWT_SECRET.length < 16) {
  // Fail loudly at boot rather than silently signing tokens with a weak
  // or missing secret — a short-circuit here is much cheaper than a
  // forged-session incident later.
  throw new Error(
    "JWT_SECRET is missing or too short. Set a long random value in backend/.env (e.g. `openssl rand -base64 48`)."
  );
}

export interface SessionPayload { username: string; }

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
