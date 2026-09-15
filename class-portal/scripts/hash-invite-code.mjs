import { createHash } from "node:crypto";

const code = process.argv[2];
if (!code || code.length < 8) {
  console.error("Usage: npm run invite:hash -- 'YOUR-LONG-INVITE-CODE'");
  process.exit(1);
}
console.log(createHash("sha256").update(code, "utf8").digest("hex"));
