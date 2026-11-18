/** Error every service throws, with a code the interface translates ("error.<code>"). */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly params: Record<string, string | number> = {},
  ) {
    super(message);
    this.name = "AppError";
  }
}
