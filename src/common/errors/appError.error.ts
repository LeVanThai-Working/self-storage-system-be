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
      messageCode;

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

// 3 supported ways to throw errors:

// Pattern 1: Pass any plain custom message string
// throw new AppError(400, 'This facility is fully booked and cannot accept more units!');
// -> Returns message: "This facility is fully booked and cannot accept more units!"

// Pattern 2: Pass custom string containing {0}, {1} placeholders
// throw new AppError(400, 'Cannot assign {0} because the facility is currently {1}', ['John Doe', 'Closed']);
// -> Returns message: "Cannot assign John Doe because the facility is currently Closed"

// Pattern 3: Use standard MESSAGE_CODE constant
// throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
// -> Returns message: "Facility Not Found"
