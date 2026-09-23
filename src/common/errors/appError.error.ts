import {
  ERROR_MESSAGE,
  MESSAGE_CODE,
} from '../consts/messageCode.const.ts';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: number;
  public readonly expose: boolean;
  public readonly errorCode: string;
  public readonly params: unknown[];

  constructor(statusCode: number, errorCode: string, params: unknown[] = []) {
    const messageTemplate =
      ERROR_MESSAGE[errorCode as keyof typeof ERROR_MESSAGE] ??
      'An application error occurred.';
    const message = messageTemplate.replace(/\{(\d+)\}/g, (_, index) =>
      String(params[Number(index)] ?? `{${index}}`)
    );

    super(message);

    this.statusCode = statusCode;
    this.status = statusCode;
    this.expose = statusCode < 500;
    this.errorCode = errorCode;
    this.params = params;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}
