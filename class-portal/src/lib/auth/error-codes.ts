export type SignupErrorCode = "invalid_invite" | "try_later" | "registration_failed";

export function mapSignupError(message: string | undefined): SignupErrorCode {
  if (!message) return "registration_failed";
  if (message.includes("portal_invite_invalid")) return "invalid_invite";
  if (message.includes("portal_try_later")) return "try_later";
  return "registration_failed";
}
