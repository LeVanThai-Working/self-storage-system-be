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

// 3 kiểu lỗi có thể trả

// Kiểu 1: Truyền chuỗi chữ thuần túy bất kỳ bạn muốn
// throw new AppError(400, 'Cơ sở này hiện đã kín phòng, không thể nhận thêm!');
// -> Trả về message: "Cơ sở này hiện đã kín phòng, không thể nhận thêm!"

// Kiểu 2: Truyền chuỗi tự do có chứa {0}, {1}
// throw new AppError(400, 'Không thể gán {0} vì cơ sở đang ở trạng thái {1}', ['Nguyễn Văn A', 'Đóng cửa']);
// -> Trả về message: "Không thể gán Nguyễn Văn A vì cơ sở đang ở trạng thái Đóng cửa"

// Kiểu 3: Vẫn dùng mã lỗi chuẩn MESSAGE_CODE như bình thường
// throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
// -> Trả về message: "Facility Not Found"
