import { describe, expect, it } from "vitest";
import { mapSignupError } from "./error-codes";

describe("signup error mapping", () => {
  it("maps known server markers to safe public error codes", () => {
    expect(mapSignupError("portal_invite_invalid")).toBe("invalid_invite");
    expect(mapSignupError("portal_try_later")).toBe("try_later");
  });

  it("does not expose unknown backend messages", () => {
    expect(mapSignupError("database internal detail")).toBe("registration_failed");
    expect(mapSignupError(undefined)).toBe("registration_failed");
  });
});
