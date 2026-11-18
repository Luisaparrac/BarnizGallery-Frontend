/** SHA-256 of the password, so the demo never keeps plain passwords (the backend uses BCrypt). */
export class PasswordHasher {
  static async hash(password: string): Promise<string> {
    const bytes = new TextEncoder().encode(`museo:${password}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
}
