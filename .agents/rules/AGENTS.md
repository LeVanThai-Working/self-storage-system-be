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

### [MUST] Hai lớp phân quyền: lớp nào được hoãn, lớp nào không

| Lớp                                          | Nội dung                                                                                                                                | Thời điểm triển khai                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Xác thực + role gate (decorator)             | `@Security('bearerAuth')`, `@Security('cookieAuth')` và chặn theo role ở tầng route                                                     | **Hoãn** đến phase hoàn thiện cuối cùng, theo quy tắc ẩn `@Security` dưới |
| Quy tắc nghiệp vụ theo vai trò và tài nguyên | Chủ tài nguyên (khách chỉ thao tác dữ liệu của mình), phạm vi cơ sở (`assertFacilityAccess`), ai được ký / duyệt / hoàn tiền / chấm dứt | **KHÔNG hoãn.** Làm trong service, ngay trong task tạo hoặc sửa endpoint  |

**Lý do:** lớp thứ hai là business rule (ví dụ chỉ chủ hợp đồng mới được ký, chỉ `FACILITY_MANAGER` của cơ sở mới được ký nhận kho). Nếu hoãn, endpoint cho phép thao tác chéo cơ sở hoặc chéo khách hàng, và việc bật `@Security` sau này không vá được lỗ hổng đó.

Quy tắc phạm vi tài nguyên (kiểm tra trong service):

- `CUSTOMER`: chỉ thao tác tài nguyên có `customerId === caller.userId`.
- `FACILITY_STAFF`, `FACILITY_MANAGER`: chỉ thao tác tài nguyên thuộc `user.assignedFacilityId`. Chưa được gán cơ sở thì từ chối (403, dùng mã đã có như `MESSAGE_CODE_103`).
- `BUSINESS_OPS_MANAGER`, `SYSTEM_ADMIN`: phạm vi toàn hệ thống.
- Ma trận quyền chi tiết theo từng endpoint nằm ở `docs/agent/PLAN.md` (mục ma trận quyền). Không tự suy diễn quyền cho endpoint không có trong ma trận, hãy hỏi.

### [MUST] Quy tắc ghi nhận Role và ẩn `@Security` trong giai đoạn phát triển

1. **Ẩn `@Security`:** tạm thời comment out `// @Security('bearerAuth')` và `// @Security('cookieAuth')` để tránh block kiểm thử và luồng gọi API giữa các module.
2. **Ghi chú Role (`// TODO: Role authorization:`):** mọi endpoint nhạy cảm/cần phân quyền **bắt buộc** có comment đánh dấu role chính xác ngay trên decorator HTTP method (`@Post`, `@Patch`, `@Delete`, `@Get`) để sẵn sàng cho phase hoàn thiện bảo mật:
   ```ts
   // @Security('bearerAuth')
   // @Security('cookieAuth')
   // TODO: Role authorization: SYSTEM_ADMIN, BUSINESS_OPS_MANAGER
   @Post('')
   ```
3. **Nhận diện Caller:** dùng helper chung để lấy caller, không tự viết lại trong từng controller.
   - **Production:** chỉ chấp nhận `req.user` từ token đã xác thực.
   - **Dev/test (khi `@Security` đang ẩn):** chuỗi fallback `req.user` ➔ header `x-user-id` ➔ giải mã JWT nếu client gửi `Bearer` ➔ id từ body/query ➔ `throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102)` nếu không có thông tin caller.
   - **[MUST]** Các bước fallback từ `x-user-id` trở đi chỉ chạy khi `NODE_ENV !== 'production'` **và** biến môi trường `ALLOW_INSECURE_CALLER_FALLBACK === 'true'`. Nếu cờ này bật khi `NODE_ENV === 'production'`, ứng dụng phải dừng ngay lúc khởi động. Lý do: header hoặc id trong body do client tự gửi, nên bất kỳ ai cũng có thể mạo danh người khác.
   - Kiểm tra phạm vi tài nguyên (phía trên) luôn chạy trên id caller đã nhận diện, kể cả khi đang dùng fallback.
4. Endpoint nhạy cảm (tiền, ký, hủy, chấm dứt, xác nhận hoàn tiền) phải có test phân quyền dương và âm, gồm ca chéo cơ sở và chéo khách hàng (xem mục 22).

---

## 15. Workflow khi thêm feature mới

```
0. Đọc task và tài liệu nghiệp vụ; xác định chuyển trạng thái, thao tác tiền, quy tắc phân quyền liên quan (mục 14, 20, 21)
1. Thêm/cập nhật Zod schema trong schemas/<domain>.request.schema.ts
2. Thêm/cập nhật response schema nếu output contract thay đổi
3. Thêm repository methods (chỉ persistence operations; đổi trạng thái dùng conditional update)
4. Thêm service logic + AppError handling + kiểm tra phân quyền theo tài nguyên (mục 14)
   + @Transactional khi đổi nhiều bản ghi (mục 20) + ghi audit log (cho các mutation, mục 19)
5. Wire dependencies trong <domain>.container.ts (inject auditLogService nếu cần)
6. Thêm controller method với ResponseUtils / ApiResponse
7. Thêm @openapi documentation (tsoa decorators)
8. Thêm MESSAGE_CODE / AuditActionEnum / AuditResourceEnum mới nếu cần (đọc file nguồn trước, không tự đoán)
9. Cập nhật ioc.ts nếu thêm controller mới
10. Viết/chạy test (khi đã có framework) hoặc nêu kịch bản kiểm thử thủ công trong PR (mục 22)
11. Chạy: npm run check && npm run build
    (npm run check = npm run typecheck && npm run lint && npm run format:check; chưa bao gồm test)
12. Bàn giao FE: nếu contract thay đổi, chạy `/fe-prompt <tên module>` để xuất prompt bàn giao (shared layer)
```

### Bàn giao Frontend sau khi hoàn thành module

Khi hoàn thành một module backend có thay đổi contract (endpoint, request schema, enum, error code, constant), dùng slash command:

```bash
/fe-prompt <tên module>
```

Lệnh này sẽ trích xuất toàn bộ request schemas, enums, error codes, constants và endpoints để tạo prompt gửi cho agent Frontend (chỉ làm tầng shared, không chứa response hay UI).

Task chỉ siết phân quyền hoặc sửa logic nội bộ mà không đổi contract thì không cần chạy `/fe-prompt`.

---

## 16. Enums

Danh sách enum thay đổi thường xuyên nên **không chép vào tài liệu này**. Luôn đọc file nguồn:

- Enum dùng chung: `src/common/enums/`
- Enum cục bộ của module: trong thư mục `src/modules/<domain>/`

Chỉ giữ lại enum vai trò vì mọi quy tắc phân quyền đều dựa vào nó:

```ts
enum RoleEnum {
  CUSTOMER = 'customer',
  SYSTEM_ADMIN = 'system_admin',
  FACILITY_STAFF = 'facility_staff',
  FACILITY_MANAGER = 'facility_manager',
  BUSINESS_OPS_MANAGER = 'business_ops_manager',
}
```

`AuditActionEnum`, `AuditResourceEnum`, `AuditStatusEnum` cũng đọc từ file nguồn. Khi thêm hành động hoặc tài nguyên mới cần ghi audit, bổ sung member vào đúng enum nếu chưa tồn tại (ví dụ `CANCEL`, `CONFIRM`, `SIGN`, `CHECK_IN`, `CHECK_OUT`, `TERMINATE`, `APPROVE`, `REFUND`; tài nguyên `CONTRACT`, `CONTRACT_ADDENDUM`, `PAYMENT`, `REFUND_REQUEST`). Kiểm tra file nguồn trước để không tạo trùng.

---

## 17. Message Codes

Danh sách message code **không chép vào tài liệu này** vì đã có nhiều mã ngoài các nhóm cơ bản (ví dụ các mã nhóm 3xx và 4xx của Reservation và Contract). Luôn đọc `src/common/consts/messageCode.const.ts` để biết mã nào đã tồn tại và ý nghĩa của nó.

Nhóm cơ bản (ổn định):

| Nhóm        | Mục đích                                                               |
| ----------- | ---------------------------------------------------------------------- |
| `001`–`004` | Thành công                                                             |
| `101`–`106` | Lỗi chung (invalid, unauthorized, denied, not found, exists, internal) |
| `107`–`109` | Xác thực và đăng nhập                                                  |
| `110`–`112` | Trạng thái tài khoản và thực thể                                       |
| `120`–`122` | Vai trò và phân quyền                                                  |
| `200`–`201` | Validation và token                                                    |

Quy tắc:

- Không dùng lại mã đã có cho ý nghĩa khác, không tự đoán ý nghĩa của mã chưa đọc.
- Mã mới lấy số kế tiếp trong nhóm phù hợp, thêm vào file nguồn và ghi vào mô tả task.
- Mỗi lỗi nghiệp vụ mới (ví dụ khách chưa ký, kho không còn ở trạng thái mong đợi) có mã riêng, không dùng chung `MESSAGE_CODE_101`.

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

```bash
# Tương đương trên bash/zsh (macOS, Linux, WSL)
wc -c < <path>       # Phải > 0
test -s <path> && echo OK
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

### [MUST] Audit cho job nền (cron, BullMQ worker)

Job nền không có request context nên `AsyncLocalStorage` không có thông tin user. Mọi thao tác do job thực hiện (hủy no-show, chuyển OVERDUE, hết hạn thanh toán, tự hủy đơn) phải ghi audit với actor `SYSTEM` truyền tường minh. Nếu `AuditLogService.record` chưa hỗ trợ ghi đè actor, bổ sung tham số `actor` tùy chọn (làm thành task riêng và ghi vào `PROGRESS.md`). Không để audit ghi rỗng người thực hiện.

### [MUST] Audit bền cho thao tác tiền và pháp lý

Ghi log fire-and-forget phù hợp với thao tác thường, nhưng **không đủ** cho: thu tiền, xác nhận thu thủ công, hoàn tiền, tịch thu hoặc quyết toán cọc, ký hợp đồng và phụ lục, chấm dứt hợp đồng. Với nhóm này, nếu ghi audit thất bại thì bằng chứng bị mất sau khi dữ liệu đã đổi. Yêu cầu:

- Ghi audit trong cùng transaction với thay đổi dữ liệu, hoặc dùng cơ chế retry/outbox đã thống nhất.
- Lỗi ghi audit của nhóm này phải log ở mức `error` và có cảnh báo, không nuốt im lặng.
- Cho đến khi cơ chế bền được dựng, ghi rõ trong PR rằng thao tác này đang dùng audit best-effort.

### [MUST] Dữ liệu nhạy cảm trong audit

Trường mới có dữ liệu cá nhân hoặc tài chính (số tài khoản ngân hàng, số CCCD, ảnh giấy tờ, mã tham chiếu giao dịch) phải được thêm vào danh sách mask của `AuditLogService` trước khi merge.

---

## 20. Transaction, đồng thời và side effect

- **[MUST]** Thao tác đổi nhiều bản ghi liên quan (đơn đặt chỗ, kho, hợp đồng, thanh toán, hoàn tiền) chạy trong **một** `@Transactional()` ở service. Truyền `session` xuống mọi repository call của nghiệp vụ đó theo cơ chế hiện có (session là tham số cuối).
- **[MUST]** Đổi trạng thái bằng conditional update, không đọc rồi ghi:
  ```ts
  // ✅ Đúng — chỉ thành công nếu trạng thái hiện tại đúng như mong đợi
  const updated = await repo.atomicUpdateStatus(id, expectedStatus, payload);
  if (!updated) {
    // đã bị tiến trình khác đổi: bỏ qua hoặc throw AppError, KHÔNG chạy tiếp các bước phụ thuộc
  }

  // ❌ Sai — đọc rồi ghi, hai request song song cùng thành công
  const doc = await repo.findById(id);
  if (doc.status === expectedStatus) await repo.update(id, payload);
  ```
- **[MUST]** Giữ và nhả kho dùng các hàm atomic đã có (ví dụ `findAndReserveUnitAtomic`, `markOccupiedAtomic`, `releaseReservedUnitAtomic`, `releaseOccupiedUnitAtomic`). Không tự viết update trạng thái kho thủ công. Kiểm tra tên hàm hiện có trong repository trước khi dùng.
- **[MUST]** Side effect ngoài DB (notification, Socket.IO, email, BullMQ job, gọi dịch vụ bên thứ ba) chỉ chạy **sau khi commit** thông qua `afterCommitHooks`, vì `withTransaction` có thể chạy lại callback và rollback sẽ không thu hồi được thông báo đã gửi.
- **[MUST]** Không dùng fallback "chạy không session" ở production và không thêm `try/catch` nuốt lỗi transaction. Production phải chạy MongoDB replica set; ứng dụng kiểm tra điều này lúc khởi động và dừng nếu thiếu.
- **Job nền (cron, BullMQ):**
  - Xử lý từng bản ghi trong transaction riêng hoặc batch nhỏ (20–50 bản ghi); bắt lỗi từng bản ghi, ghi log kèm cảnh báo rồi đi tiếp. Một bản ghi lỗi không được chặn các bản ghi còn lại.
  - Truy vấn quét luôn có `limit`.
  - Mọi bước idempotent: chạy lại hoặc chạy song song với thao tác tay không gây hại.
- **Idempotency:** endpoint tạo mới và endpoint liên quan tiền nhận idempotency key hoặc dùng khóa tự nhiên; webhook dùng id giao dịch của bên thứ ba làm khóa chống trùng.
- **State machine:** mỗi entity có một bảng chuyển trạng thái hợp lệ đặt ở một nơi (const hoặc service), không rải điều kiện trạng thái khắp code. Thêm hoặc đổi trạng thái phải cập nhật bảng này và kèm test.

---

## 21. Tiền và thời gian

- **[MUST]** Tiền VND lưu bằng số nguyên (đơn vị đồng), không dùng `float`. Công thức tính tiền (phí trễ hạn, cấn trừ cọc, hoàn tiền) nằm trong hàm thuần có test, một quy tắc làm tròn duy nhất. Không tính tiền trong controller.
- **[MUST]** Lưu thời điểm ở dạng UTC. Mọi so sánh theo "ngày" dùng helper giờ Việt Nam đã có (ví dụ `startOfDayVN`, `endOfDayVN`); tìm trong codebase và dùng lại, không tự viết lại. Chuẩn hóa ngày đầu vào về đầu ngày giờ VN tại boundary (schema hoặc service), không tin giá trị 00:00 UTC do client gửi.
- **[MUST]** Hạn và mốc (ân hạn check-in, hết hạn, mốc hủy miễn phí) được tính tại thời điểm kiểm tra từ dữ liệu gốc, không phụ thuộc cờ hay trạng thái do job đặt. Job chỉ là lớp dọn dẹp, không phải nguồn sự thật duy nhất.
- **[MUST]** Giá và chính sách áp dụng cho một đơn hoặc hợp đồng được snapshot lúc tạo (giá, tiền cọc, quy tắc hủy và tịch thu, phiên bản điều khoản). Thay đổi cấu hình sau đó không làm đổi quyền lợi của bản ghi cũ.

---

## 22. Testing

**Hiện trạng:** dự án chưa có test framework. `npm run check` hiện chỉ chạy `typecheck`, `lint` và `format:check`, không chạy test.

- Việc dựng test framework là một task riêng (xem `docs/agent/PLAN.md`, task T0.5), cần xác nhận lựa chọn công cụ trước. Đề xuất: Vitest (phù hợp ESM và import đuôi `.ts`) cùng `mongodb-memory-server` ở chế độ replica set. **Không tự cài framework ngoài task được giao.**
- **Khi chưa có framework:** mọi thay đổi nghiệp vụ phải kèm "Kịch bản kiểm thử thủ công" trong PR: gọi endpoint nào, với role nào, kết quả mong đợi, và ít nhất một ca âm (bị chặn đúng).
- **Khi đã có framework:**
  - Thêm `npm test` vào `npm run check`.
  - Test phải chạy trên MongoDB replica set để kiểm chứng transaction và atomic update, không dựa vào fallback không session.
  - Mỗi endpoint đổi dữ liệu có test phân quyền dương và âm, gồm ca chéo cơ sở và chéo khách hàng.
  - Mỗi chuyển trạng thái có test cho cả ca hợp lệ và ca bị chặn; thao tác tiền và kho có test chạy song song.
  - Sửa lỗi phải bắt đầu bằng test tái hiện lỗi.

---

## 23. Cấu hình, dữ liệu nhạy cảm và migration

- **Cấu hình:** số tiền, thời hạn, tỷ lệ, ngưỡng duyệt lấy từ cấu hình tập trung (ví dụ `reservation.config.ts`), không hardcode literal trong service. Feature flag đọc từ biến môi trường, mặc định ở trạng thái an toàn (tắt).
- **Dữ liệu nhạy cảm** (số tài khoản ngân hàng, số CCCD, ảnh giấy tờ):
  - Mã hóa khi lưu, che khi trả về và khi hiển thị (ví dụ `****1234`), không log nguyên văn.
  - Phân quyền xem theo vai trò; tuân thủ Nghị định 13/2023/NĐ-CP.
  - Thêm vào danh sách mask của audit (mục 19).
- **Migration:**
  - Trường mới có giá trị mặc định; script backfill idempotent (chạy lại không gây hại) kèm cách rollback ghi trong PR.
  - Giữ trường cũ ở dạng alias hoặc dữ liệu dẫn xuất cho đến khi FE chuyển xong (ví dụ `refundAmount`, `refundStatus`, `staffSigned`).
  - Không xóa hoặc đổi tên trường đang được FE dùng trong cùng PR với thay đổi logic.

---

## 24. Làm việc theo task

Áp dụng khi nhận một task từ `docs/agent/PLAN.md`:

1. **Khảo sát trước khi sửa:** báo cáo ngắn hiện trạng code (file, hàm, endpoint liên quan) và những chỗ khác với mô tả nghiệp vụ. Mô tả nghiệp vụ do con người viết, code mới là sự thật; khác nhau thì báo lại, không tự chọn bên.
2. **Một task một PR nhỏ**, revert được độc lập. Không gộp refactor với đổi hành vi.
3. **Quyết định đang mở `[OPEN Dx]`:** dùng giá trị mặc định ghi trong tài liệu task, đặt sau config hoặc feature flag, ghi giả định trong PR và `docs/agent/PROGRESS.md`. Không tự quyết chính sách tiền, thời hạn hay tỷ lệ.
4. **Không sửa ngoài phạm vi:** phát hiện lỗi ngoài task thì ghi vào danh sách "phát hiện thêm" trong `PROGRESS.md`, không tự sửa.
5. **Nộp kèm mỗi task:** danh sách file đã đổi, giả định đã dùng, test hoặc kịch bản kiểm thử, rủi ro còn lại.
6. **Tài liệu nghiệp vụ:** `docs/agent/PLAN.md` (task, ma trận quyền, ma trận hoàn/mất cọc), `docs/agent/business-rules-current.md` (hành vi hiện trạng), `docs/agent/PROGRESS.md` (tiến độ theo task ID).
