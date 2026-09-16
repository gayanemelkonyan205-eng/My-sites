import { createHash, timingSafeEqual } from "node:crypto";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function verifyInviteCode(code: string, expectedHash = process.env.CLASS_INVITE_CODE_SHA256): boolean {
  if (!expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const actual = Buffer.from(sha256Hex(code.trim()), "hex");
  const expected = Buffer.from(expectedHash.toLowerCase(), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
