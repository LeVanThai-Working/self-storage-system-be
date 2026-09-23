import { MESSAGE_DICTIONARY } from '../consts/messageCode.const.ts';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: number;
  public readonly expose: boolean;
  public readonly messageCode: string;
  public readonly params: unknown[];

  constructor(statusCode: number, messageCode: string, params: unknown[] = []) {
    const messageTemplate =
      MESSAGE_DICTIONARY[messageCode as keyof typeof MESSAGE_DICTIONARY] ??
      'An application error occurred.';
    const message = messageTemplate.replace(/\{(\d+)\}/g, (_, index) =>
      String(params[Number(index)] ?? `{${index}}`)
    );

    super(message);

    this.statusCode = statusCode;
    this.status = statusCode;
    this.expose = statusCode < 500;
    this.messageCode = messageCode;
    this.params = params;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}
