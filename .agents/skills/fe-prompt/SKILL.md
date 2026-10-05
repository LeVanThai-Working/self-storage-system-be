---
name: fe-prompt
description: >-
  Use this skill when the user types /fe-prompt <module-name> after completing a backend module.
  Inspects backend routes, controllers, request schemas, enums, error codes, and constants to
  generate a single copyable markdown handover prompt for the Frontend agent (shared layer only).
  Does NOT include response information or frontend implementation details.
---

# Skill: /fe-prompt

## Mục đích

Xuất ra một prompt markdown duy nhất để bàn giao contract từ Backend sang Frontend agent (monorepo riêng: Next.js + React Native).
Chạy sau khi hoàn thành một module backend bằng lệnh `/fe-prompt <tên module>`.

---

## Bối cảnh & Nguyên tắc hoạt động

1. **Phân tách hoàn toàn:** Source BE và FE nằm ở hai repo/thư mục riêng biệt. Agent FE **không thể** đọc code BE. Prompt được xuất ra là nguồn thông tin duy nhất mà agent FE có về module này.
2. **Phạm vi của FE:** Agent FE chỉ đảm nhiệm phần **shared** (constants, enums, types, utils, pure functions). Mọi chi tiết về UI, màn hình, luồng giao diện, hook, state management hay cách gọi API đều không cần thiết và không được đưa vào.
3. **Chỉ lấy Request — KHÔNG lấy Response:**
   - Trích xuất toàn bộ file request schema nguyên văn (Zod/Joi/Yup).
   - **Tuyệt đối không** cung cấp response payload, response types, wrapper response hoặc suy đoán response structure.

---

## Quy trình thực hiện

Khi nhận lệnh `/fe-prompt <tên module>`:

### Bước 1 — Xác định module mục tiêu

- Lấy tên module từ tham số: ví dụ `/fe-prompt auth`, `/fe-prompt user`, `/fe-prompt storage-unit`.
- Nếu người dùng chưa cung cấp tên module, dừng lại và yêu cầu người dùng chỉ định rõ module cần bàn giao.

### Bước 2 — Đọc code Backend của module

Đọc toàn bộ các file liên quan trong module:

1. `src/modules/<domain>/<domain>.controller.ts` (và route nếu có): để lấy method, path, authentication (`@Security`), tóm tắt nghiệp vụ.
2. `src/modules/<domain>/schemas/<domain>.request.schema.ts`: lấy toàn bộ nội dung schema request (body, query, params) và các shared schemas được import (như `paginationQuerySchema`).
3. Enums liên quan: `src/common/enums/` hoặc enum cục bộ trong module.
4. Error codes / Message codes: các mã `MESSAGE_CODE` được ném ra trong controller/service của module từ `src/common/consts/messageCode.const.ts`.
5. Constants liên quan: `src/common/consts/` hoặc file const nội bộ của module (regex, giới hạn ký tự, default values...).
6. Service logic: chỉ đọc để nắm các quy tắc validate/nghiệp vụ bổ sung chưa thể hiện qua Zod schema (ví dụ: so sánh chéo giữa các field, ràng buộc logic).

### Bước 3 — Lọc nội dung (Cho phép vs Không cho phép)

#### ✅ ĐƯỢC PHÉP ĐƯA VÀO:

- **Endpoints:** HTTP method, đường dẫn API (path), mô tả nghiệp vụ 1 dòng, trạng thái xác thực (Auth: public / Bearer token / Cookie / Roles).
- **Request schema:** Đường dẫn file + **toàn bộ nội dung file nguyên văn** (body/query/params), nêu rõ thư viện validate đang dùng (ví dụ: Zod).
- **Enums:** Tên enum, danh sách key-value, đường dẫn file định nghĩa trong BE.
- **Error codes / Message codes:** Mã code (ví dụ: `MESSAGE_CODE_104`), HTTP status code tương ứng, ý nghĩa/thông điệp.
- **Constants dùng chung:** Tên, giá trị, ý nghĩa (ví dụ: giới hạn độ dài, regex email/password, default pagination limit...).
- **Quy tắc validate / nghiệp vụ bổ sung:** Các quy tắc kiểm tra logic nghiệp vụ không nằm trong schema (ví dụ: mật khẩu mới không trùng mật khẩu cũ, ngày kết thúc phải sau ngày bắt đầu...).
- **Thay đổi so với contract trước (nếu có):** Ghi rõ breaking change hoặc field mới thêm/bỏ nếu đây là cập nhật của module đã bàn giao trước đó.

#### ❌ TUYỆT ĐỐI KHÔNG ĐƯỢC ĐƯA VÀO:

- **Cấu trúc Response:** Bất kỳ response schema, response DTO, ApiResponse wrapper, payload trả về thành công hoặc lỗi.
- **UI / Giao diện:** Gợi ý màn hình, form fields trên giao diện, layout, component, user flow.
- **Logic nội bộ Backend:** Mongoose queries, service methods, database model, repository, cấu hình hạ tầng, server middleware chi tiết.
- **Cách FE triển khai:** Không đề xuất axios/fetch, React Query, Redux/Zustand, custom hooks, state handlers.
- **Thông tin nhạy cảm:** JWT secret keys, DB connection strings, internal server URLs, credentials.

### Bước 4 — In ra một khối Markdown duy nhất

Xuất kết quả bên trong **một khối markdown duy nhất** tuân thủ đúng cấu trúc mẫu bên dưới.
_(Lưu ý: Bỏ qua các mục không có dữ liệu thay vì để trống)_.

```markdown
# MODULE: <tên module>

Bổ sung phần shared (constants, enums, types, utils, pure functions) cho module này.
Chỉ làm đúng phạm vi shared theo rule của dự án.
Prompt này không chứa response, không tự tạo response type hoặc đoán cấu trúc response.

## Mô tả

<1-2 dòng tóm tắt nghiệp vụ của module>

## Endpoints

| Method | Path          | Mô tả              | Auth           |
| ------ | ------------- | ------------------ | -------------- |
| POST   | /api/v1/users | Tạo người dùng mới | Bearer (Admin) |

## Request schema (giữ nguyên, thêm vào shared nguyên văn)

Thư viện validate: <Zod/Joi/...>

### <đường dẫn file schema 1>

\`\`\`ts
<nội dung file nguyên văn>
\`\`\`

### <đường dẫn file schema 2 (nếu có)>

\`\`\`ts
<nội dung file nguyên văn>
\`\`\`

## Enums

### <Tên Enum> (File: `<đường dẫn file>`)

\`\`\`ts
<nội dung enum>
\`\`\`

## Error codes

| Message Code     | HTTP Status | Ý nghĩa        |
| ---------------- | ----------- | -------------- |
| MESSAGE_CODE_104 | 404         | User not found |

## Constants

| Tên Constant   | Giá trị | Ý nghĩa                        |
| -------------- | ------- | ------------------------------ |
| PASSWORD_REGEX | /.../   | Ràng buộc độ phức tạp mật khẩu |

## Quy tắc validate/nghiệp vụ bổ sung (không nằm trong schema)

- <Quy tắc 1>
- <Quy tắc 2>

## Thay đổi so với contract trước

- <Thay đổi hoặc ghi "Không có (module mới)">
```

### Bước 5 — Điểm không chắc chắn / Thiếu sót (nếu có)

Phía bên dưới (ngoài khối markdown bàn giao), liệt kê ngắn gọn các điểm còn nghi vấn, thiếu thông tin hoặc cần làm rõ từ BE (nếu có). Tuyệt đối không tự suy đoán.
