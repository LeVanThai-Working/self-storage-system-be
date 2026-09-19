export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: number;
  public readonly expose: boolean;
  public readonly messageCode: string;
  public readonly params: unknown[];

  constructor(statusCode: number, messageCode: string, params: unknown[] = []) {
    super(messageCode);

    this.statusCode = statusCode;
    this.status = statusCode;
    this.expose = statusCode < 500;
    this.messageCode = messageCode;
    this.params = params;
  }
}
