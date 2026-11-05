import crypto from "node:crypto";

// AES-256-GCM at-rest encryption for iyzico identity numbers (TCKN). KVKK
// classifies the national ID as sensitive personal data, so it is never
// stored in plaintext. Key is a 32-byte value supplied as 64 hex chars.

function encryptionKey(): Buffer {
  const hex = process.env.BILLING_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("BILLING_ENCRYPTION_KEY must be a 32-byte hex string");
  }
  return Buffer.from(hex, "hex");
}

// Returns "iv:authTag:ciphertext", all hex-encoded.
export function encryptIdentity(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    tag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

export function decryptIdentity(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Malformed encrypted identity payload");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
