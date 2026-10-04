# AGENTS.md — Coding Rules for AI Agents

> Tài liệu này là phiên bản rút gọn, hướng dẫn AI agent tuân thủ kiến trúc và coding style của dự án `self-storage-system-be`.
> Dựa trên `CODING_RULES.md`. Chỉ liệt kê các rule `[MUST]` cốt lõi kèm ví dụ thực tế từ codebase.

---

## 1. Project Structure

### Module mới phải đặt tại `src/modules/<domain>/`

```
src/modules/<domain>/
  <domain>.route.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts      ← chỉ khi có DB access
  <domain>.model.ts           ← chỉ khi có Mongoose model
  <domain>.container.ts       ← wire dependencies
  schemas/<domain>.request.schema.ts
  schemas/<domain>.response.schema.ts
```

**Không** tạo layer nếu không có trách nhiệm thực sự (ví dụ: không cần repository nếu không có DB query).

### Các thư mục dùng chung

| Thư mục                 | Mục đích                                         |
| ----------------------- | ------------------------------------------------ |
| `src/common/consts/`    | Constants (MESSAGE_CODE)                         |
| `src/common/enums/`     | TypeScript enums                                 |
| `src/common/errors/`    | AppError class                                   |
| `src/common/schemas/`   | Shared Zod schemas                               |
| `src/common/types/`     | Shared TypeScript types                          |
| `src/common/templates/` | Email templates                                  |
| `src/config/`           | Infrastructure setup (DB, Redis, Mail, Passport) |
| `src/middlewares/`      | Express middleware                               |
| `src/utils/`            | Reusable technical helpers                       |

---

## 2. Naming Conventions

| Target                   | Convention                       | Ví dụ                                   |
| ------------------------ | -------------------------------- | --------------------------------------- |
| File                     | `<domain>.<role>.ts` (lowercase) | `auth.service.ts`, `user.repository.ts` |
| Class                    | PascalCase                       | `AuthService`, `UserRepository`         |
| Method / Variable        | camelCase                        | `findUserById`, `refreshToken`          |
| Constant                 | SCREAMING_SNAKE_CASE             | `MESSAGE_CODE.MESSAGE_CODE_001`         |
| Enum type                | PascalCase + `Enum` suffix       | `UserStatusEnum`, `RoleEnum`            |
| Enum member              | UPPERCASE                        | `ACTIVE = 'active'`                     |
| Interface (Mongoose doc) | Prefix `I`                       | `IUser`, `IOtp`                         |

---

## 3. Import / Export Rules

```ts
// ✅ Đúng — ESM với .ts extension
import { UserRepository } from './user.repository.ts';
import type { Request, Response } from 'express';

// ❌ Sai — CommonJS
const repo = require('./user.repository');

// ✅ Dùng import type cho type-only imports
import type { UserService } from './user.service.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
```

---

## 4. TypeScript Rules

- `strict: true` — không được tắt bất kỳ strict flag nào
- **Không dùng `any`** trong code mới — dùng generic hoặc `unknown` + narrowing
- Request types phải được infer từ Zod schema:

```ts
export type CreateUserRequest = z.infer<typeof createUserSchema>;
```

- Dùng enums đã định nghĩa, không dùng string literals:

```ts
// ✅
status: UserStatusEnum.ACTIVE;

// ❌
status: 'active';
```

---

## 5. Controller Pattern

Controllers là **HTTP boundary** — chỉ nhận request, gọi service, trả response.
**Không** chứa Mongoose query, Redis, bcrypt, hay business logic.

```ts
// ✅ Pattern chuẩn (tsoa style)
export class UserController extends Controller {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get('{id}')
  @Middlewares(validateRequest({ params: userIdParamSchema }))
  public async findUserById(
    @Path() id: string
  ): Promise<ApiResponse<UserResponse>> {
    const user = await this.userService.findUserById(id);
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: user,
    };
  }
}
```

---

## 6. Service Pattern

Services chứa **business logic**: duplicate check, hashing, token generation, validation nghiệp vụ.

```ts
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRedisService?: AuthRedisService
  ) {}

  async findUserById(id: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
    }
    return validateResponse(userResponseSchema, this.formatUser(user));
  }
}
```

**Không** instantiate dependency trong service method — nhận qua constructor.

---

## 7. Repository Pattern

Repositories chỉ chứa **Mongoose queries** — không có business logic.

```ts
export class UserRepository {
  constructor(private readonly user: SoftDeleteModel<IUser>) {}

  async findById(id: string) {
    return this.user.findById(id);
  }

  async updateUser(id: string, data: Partial<IUser>) {
    return this.user.findByIdAndUpdate(id, data, { new: true });
  }
}
```

---

## 8. Dependency Injection — Container

Mỗi module có `<domain>.container.ts` để wire dependencies:

```ts
// src/modules/user/user.container.ts
const userRepository = new UserRepository(User);
const userService = new UserService(userRepository, authRedisService);
export const userController = new UserController(userService);
```

Khi thêm controller mới, phải đăng ký trong `src/ioc.ts`:

```ts
export const iocContainer: IocContainer = {
  get: <T>(controller: unknown): T => {
    if (controller === UserController) return userController as unknown as T;
    if (controller === AuthController) return authController as unknown as T;
    // Thêm controller mới ở đây
    throw new Error(`Controller not found: ${String(controller)}`);
  },
};
```

---

## 9. Error Handling

**Luôn dùng `AppError`** cho expected errors. Để global error middleware xử lý.

```ts
// ✅ Đúng
throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, ['Email']);
throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);

// ❌ Sai — literal string
throw new AppError(401, 'INVALID_TOKEN');

// ❌ Sai — tự trả response trong service
res.status(404).json({ error: 'Not found' });
```

Khi cần thêm error category mới, thêm vào `src/common/consts/messageCode.const.ts`:

```ts
export const MESSAGE_CODE = {
  // ... existing codes
  MESSAGE_CODE_300: 'MESSAGE_CODE_300', // Thêm code mới
} as const;
```

---

## 10. Request Validation

**Mọi** input (body, query, params) phải được validate bằng Zod tại route boundary:

```ts
// Route level (tsoa @Middlewares)
@Middlewares(validateRequest({ body: createUserSchema }))
@Middlewares(validateRequest({ params: userIdParamSchema, body: updateUserSchema }))

// Zod schema
export const userIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});
```

---

## 11. Response Format

**Luôn dùng** `ResponseUtils` hoặc trả object theo chuẩn `ApiResponse<T>`:

```ts
// Success response (Express style)
ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, data);
ResponseUtils.paginated(
  res,
  200,
  MESSAGE_CODE.MESSAGE_CODE_001,
  items,
  pagination
);
ResponseUtils.noContent(res);

// Success response (tsoa style — return object)
return {
  success: true,
  statusCode: 200,
  messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
  message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
  data: user,
};
```

**HTTP Status conventions:**

- `200` — read/update/action thành công
- `201` — tạo mới thành công
- `204` — không có content
- `400` — invalid request / conflict
- `401` — unauthorized
- `403` — access denied
- `404` — not found
- `500` — internal error

---

## 12. Pagination

```ts
// Repository — dùng paginate() utility
return paginate<IUser>(this.user, {
  page: query.page,
  limit: query.limit,
  sortBy,
  sortOrder,
  filter,
});

// Query schema — kế thừa từ paginationQuerySchema
export const domainQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
});
```

Max limit = 100 (enforced trong `pagination.util.ts`).

---

## 13. Database — Mongoose Model

```ts
// Interface kế thừa SoftDeleteDocument nếu dùng soft-delete
export interface IUser extends SoftDeleteDocument {
  name: string;
  email: string;
  // ...
}

// Schema với timestamps
const userSchema = new mongoose.Schema<IUser>(
  { ... },
  { timestamps: true }
);

// Soft-delete plugin
userSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
});
```

---

## 14. Authentication & Authorization (Phân quyền)

- **Access Token:** 15 phút, lưu trong cookie `httpOnly` hoặc `Authorization: Bearer`
- **Refresh Token:** 7 ngày, RTR (Refresh Token Rotation) + Family Token trong Redis
- **Protected routes:** dùng `@Security('bearerAuth')` hoặc `@Security('cookieAuth')` trong tsoa controller
- **tsoa authentication:** implement qua `expressAuthentication()` trong `src/middlewares/auth.tsoa.ts`
- **[MUST] Role Authorization Comments:** Các endpoint nhạy cảm đều có comment đánh dấu role (`// TODO: Role authorization: ...`) sẵn sàng cho phase hoàn thiện bảo mật cuối.
  ```ts
  // @Security('bearerAuth')
  // @Security('cookieAuth')
  // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
  @Post('')
  ```

---

## 15. Workflow khi thêm feature mới

```
1. Thêm/cập nhật Zod schema trong schemas/<domain>.request.schema.ts
2. Thêm/cập nhật response schema nếu output contract thay đổi
3. Thêm repository methods (chỉ persistence operations)
4. Thêm service logic + AppError handling + ghi audit log (cho các mutation)
5. Wire dependencies trong <domain>.container.ts (inject auditLogService nếu cần)
6. Thêm controller method với ResponseUtils / ApiResponse
7. Thêm @openapi documentation (tsoa decorators)
8. Thêm MESSAGE_CODE / AuditActionEnum / AuditResourceEnum mới nếu cần
9. Cập nhật ioc.ts nếu thêm controller mới
10. Chạy: npm run check && npm run build
11. Bàn giao FE: chạy `/fe-prompt <tên module>` để xuất prompt bàn giao contract (shared layer)
```

### Bàn giao Frontend sau khi hoàn thành module

Khi hoàn thành một module backend, dùng slash command:

```bash
/fe-prompt <tên module>
```

Lệnh này sẽ trích xuất toàn bộ request schemas, enums, error codes, constants và endpoints để tạo prompt gửi cho agent Frontend (chỉ làm tầng shared, không chứa response hay UI).

---

## 16. Enums hiện có

```ts
enum RoleEnum {
  CUSTOMER = 'customer',
  SYSTEM_ADMIN = 'system_admin',
  FACILITY_STAFF = 'facility_staff',
  FACILITY_MANAGER = 'facility_manager',
  BUSINESS_OPS_MANAGER = 'business_ops_manager',
}

enum UserStatusEnum {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  BANNED = 'banned',
  DELETED = 'deleted',
}

enum AuthProviderEnum {
  LOCAL = 'local',
  GOOGLE = 'google',
}

enum AuditActionEnum {
  REGISTER = 'register',
  LOGIN = 'login',
  LOGIN_GOOGLE = 'login_google',
  LOGOUT = 'logout',
  SEND_OTP = 'send_otp',
  FORGOT_PASSWORD = 'forgot_password',
  RESET_PASSWORD = 'reset_password',
  CHANGE_PASSWORD = 'change_password',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',
  ASSIGN_MANAGER = 'assign_manager',
  TOGGLE_MAINTENANCE = 'toggle_maintenance',
}

enum AuditResourceEnum {
  AUTH = 'auth',
  USER = 'user',
  PROFILE = 'profile',
  FACILITY = 'facility',
  UNIT_TYPE = 'unit_type',
  AMENITY = 'amenity',
  FACILITY_UNIT_TYPE_OFFERING = 'facility_unit_type_offering',
  FACILITY_AMENITY_OFFERING = 'facility_amenity_offering',
  STORAGE_UNIT = 'storage_unit',
  RESERVATION = 'reservation',
}

enum AuditStatusEnum {
  SUCCESS = 'success',
  FAILURE = 'failure',
}
```

---

## 17. Message Codes hiện có

| Code               | Ý nghĩa                                  | Nhóm / Mục đích                           |
| ------------------ | ---------------------------------------- | ----------------------------------------- |
| `MESSAGE_CODE_001` | Operation Successful                     | Thành công (001-004)                      |
| `MESSAGE_CODE_002` | {0} Created Successfully                 | Thành công                                |
| `MESSAGE_CODE_003` | {0} Updated Successfully                 | Thành công                                |
| `MESSAGE_CODE_004` | {0} Deleted Successfully                 | Thành công                                |
| `MESSAGE_CODE_101` | Invalid Request                          | Lỗi chung (101-106)                       |
| `MESSAGE_CODE_102` | Unauthorized Access                      | Lỗi chung                                 |
| `MESSAGE_CODE_103` | Access Denied                            | Lỗi chung                                 |
| `MESSAGE_CODE_104` | {0} Not Found                            | Lỗi chung                                 |
| `MESSAGE_CODE_105` | {0} Already Exists                       | Lỗi chung                                 |
| `MESSAGE_CODE_106` | Internal Server Error                    | Lỗi chung                                 |
| `MESSAGE_CODE_107` | Invalid Email Or Password                | Xác thực & Đăng nhập (107-109)            |
| `MESSAGE_CODE_108` | {0} Email Is Not Verified                | Xác thực & Đăng nhập                      |
| `MESSAGE_CODE_109` | Invalid Or Expired OTP                   | Xác thực & Đăng nhập                      |
| `MESSAGE_CODE_110` | {0} Is Inactive                          | Trạng thái tài khoản & thực thể (110-112) |
| `MESSAGE_CODE_111` | {0} Is Banned Or Locked                  | Trạng thái tài khoản & thực thể           |
| `MESSAGE_CODE_112` | {0} Has Been Deleted                     | Trạng thái tài khoản & thực thể           |
| `MESSAGE_CODE_120` | {0} Role Is Invalid                      | Xét vai trò & phân quyền (120-122)        |
| `MESSAGE_CODE_121` | User Must Have Role {0}                  | Xét vai trò & phân quyền                  |
| `MESSAGE_CODE_122` | You Do Not Have Permission To Manage {0} | Xét vai trò & phân quyền                  |
| `MESSAGE_CODE_200` | {0} Is Required                          | Validation & Token (200-201)              |
| `MESSAGE_CODE_201` | Invalid Token                            | Validation & Token                        |

---

## 18. File Writing — Quy tắc ghi file an toàn

### [MUST] Ghi file tuần tự — KHÔNG ghi song song

```
// ✅ Đúng — ghi từng file, đợi xong mới ghi tiếp
write_to_file(file1) → verify size > 0 → write_to_file(file2) → verify → ...

// ❌ Sai — ghi nhiều file cùng lúc (parallel)
write_to_file(file1) + write_to_file(file2) + write_to_file(file3)
// Có thể gây file rỗng nếu bị interrupt
```

**Lý do:** Khi nhiều `write_to_file` chạy song song, nếu task bị interrupt/cancel giữa chừng, file được tạo nhưng nội dung chưa được flush → file có size = 0 bytes (mất toàn bộ code).

### [MUST] Verify size sau mỗi lần ghi

Sau mỗi `write_to_file`, kiểm tra file size > 0 trước khi tiếp tục:

```powershell
# Verify file không rỗng sau khi ghi
Get-Item <path> | Select-Object Length  # Phải > 0
```

### [MUST] Thứ tự ghi file trong một module mới

Luôn ghi theo thứ tự sau, **từng file một**:

```
1. enums (nếu có)
2. model
3. repository
4. request.schema
5. response.schema
6. service
7. controller
8. container
9. Cập nhật ioc.ts
```

---

## 19. Audit Logging (Ghi nhận hành động người dùng)

### [MUST] Khi nào PHẢI ghi log?

- **Mọi thao tác làm thay đổi dữ liệu (Mutations):** `CREATE`, `UPDATE`, `DELETE`, `RESTORE`.
- **Mọi hành động nhạy cảm hoặc thay đổi trạng thái:** `REGISTER`, `LOGIN` (cả SUCCESS lẫn FAILURE), `LOGOUT`, `SEND_OTP`, `CHANGE_PASSWORD`, `ASSIGN_MANAGER`, `TOGGLE_MAINTENANCE`, `CANCEL`, `CONFIRM`, v.v.

### [MUST] Khi nào KHÔNG ghi log?

- **Mọi thao tác đọc (Read-only queries):** `GET /`, `GET /{id}`, tra cứu danh sách, tìm kiếm kho trống.
- **Thao tác nội bộ có tần suất cao:** `refreshTokens` (đã có RTR + Redis quản lý).

### [MUST] Quy tắc tích hợp vào Service

1. **Dependency Injection:** Nhận `auditLogService?: AuditLogService` dạng **optional** qua constructor:
   ```ts
   export class ExampleService {
     constructor(
       private readonly exampleRepository: ExampleRepository,
       private readonly auditLogService?: AuditLogService
     ) {}
   }
   ```
2. **Container wiring:** Import `auditLogService` từ `../auditLog/auditLog.container.ts` và inject vào service trong `<domain>.container.ts`.

3. **Ghi log an toàn qua Optional Chaining (`?.`):**

   ```ts
   // Tạo mới: chỉ truyền after
   this.auditLogService?.record({
     action: AuditActionEnum.CREATE,
     resourceType: AuditResourceEnum.RESERVATION,
     resourceId: String(createdDoc._id),
     after: createdDoc,
   });

   // Cập nhật: truyền before và after (hệ thống tự diff các trường thay đổi & mask thông tin nhạy cảm)
   this.auditLogService?.record({
     action: AuditActionEnum.UPDATE,
     resourceType: AuditResourceEnum.RESERVATION,
     resourceId: String(id),
     before: oldDoc,
     after: updatedDoc,
   });

   // Xoá mềm: truyền before
   this.auditLogService?.record({
     action: AuditActionEnum.DELETE,
     resourceType: AuditResourceEnum.RESERVATION,
     resourceId: String(id),
     before: oldDoc,
   });

   // Khôi phục:
   this.auditLogService?.record({
     action: AuditActionEnum.RESTORE,
     resourceType: AuditResourceEnum.RESERVATION,
     resourceId: String(id),
     before: { deleted: true },
     after: { deleted: false },
   });
   ```

4. **Async Context:** KHÔNG cần truyền thủ công `actorId`, `ip`, `userAgent`, `requestId`. Hệ thống `AsyncLocalStorage` (`requestContext.util.ts`) tự động trích xuất thông tin user đã đăng nhập.
5. **Hỗ trợ Transaction (`@Transactional`):** Log được giữ trong bộ đệm tự động và **chỉ ghi xuống DB khi transaction commit thành công**. Nếu transaction rollback/retry, buffer bị huỷ bỏ, tránh log ảo (phantom logs).
6. **Non-blocking & An toàn:** Ghi log chạy fire-and-forget, không bao giờ làm gián đoạn hoặc ném lỗi ảnh hưởng đến nghiệp vụ chính của người dùng.
