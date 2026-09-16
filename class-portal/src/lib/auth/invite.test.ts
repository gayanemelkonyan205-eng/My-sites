import { describe, expect, it } from "vitest";
import { verifyInviteCode } from "./invite";

const validHash = "5a1268686276ab5972418a60923b6feb17628a185fa535f2e626f7c134641d07";

describe("invite code verification", () => {
  it("accepts the matching code and trims surrounding whitespace", () => {
    expect(verifyInviteCode("CLASS-2026", validHash)).toBe(true);
    expect(verifyInviteCode("  CLASS-2026  ", validHash)).toBe(true);
  });

  it("rejects wrong codes and malformed hashes", () => {
    expect(verifyInviteCode("WRONG", validHash)).toBe(false);
    expect(verifyInviteCode("CLASS-2026", "not-a-sha256")).toBe(false);
    expect(verifyInviteCode("CLASS-2026", undefined)).toBe(false);
  });
});
