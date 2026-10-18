---
name: fe-prompt
description: >-
  Use this skill when the user types /fe-prompt <module-name> after completing or
  changing a backend module whose contract changed. Inspects backend routes,
  controllers, request and response schemas, enums, status-transition rules, error
  codes and constants, and generates a single copyable markdown handover prompt for
  the Frontend agent (monorepo: packages/shared, apps/web, apps/mobile). UI position
  and UX behavior are never guessed: they come from the user or stay as placeholders.
---

# Skill: /fe-prompt

## Mục đích

Xuất ra một prompt markdown duy nhất để bàn giao contract từ Backend sang Frontend agent (monorepo riêng: Next.js + React Native).
Chạy sau khi hoàn thành hoặc thay đổi một module backend có đổi contract bằng lệnh `/fe-prompt <tên module>`.

---

## Bối cảnh & Nguyên tắc hoạt động

1. **Phân tách hoàn toàn:** Source BE và FE nằm ở hai repo riêng biệt. Agent FE **không thể** đọc code BE. Prompt được xuất ra là nguồn thông tin duy nhất mà agent FE có về module này.
2. **FE cần gì (theo tài liệu kiến trúc FE):** `packages/shared` là nguồn sự thật cho hợp đồng dữ liệu. FE cần đủ bảy nhóm thông tin: phạm vi và role, đặc tả endpoint, request schema, cấu trúc response, enum và luồng trạng thái, mã thông báo kèm bản dịch, hành vi UI/UX. Prompt phải bao phủ các nhóm này.
3. **Phần BE tự trích xuất từ code, phần người dùng phải cung cấp:**
   - BE tự trích xuất: endpoint, request schema, response shape, enum, ma trận hành động theo trạng thái, mã lỗi, constants, quy tắc nghiệp vụ.
   - Người dùng cung cấp: vị trí hiển thị trên UI (route, table, dialog, sheet) và hành vi UI/UX sau khi gọi API (invalidate query nào, toast hay chuyển trang, khóa dịch). Skill **không tự suy đoán** các phần này; chưa có thì để placeholder `[Cần người dùng bổ sung]`.
4. **Phạm vi mặc định của FE:** chỉ `packages/shared` (enums, types, schemas, constants, utils). Chỉ làm `apps/web` hoặc `apps/mobile` khi mục "Phạm vi" của prompt ghi rõ và mục "Hành vi UI/UX" có yêu cầu cụ thể.
5. **Response được phép đưa vào, nhưng chỉ ở dạng hình dạng dữ liệu (shape):** lấy từ response schema và kết quả định dạng trong service. Không đưa cách BE tạo ra dữ liệu đó.

---

## Quy trình thực hiện

Khi nhận lệnh `/fe-prompt <tên module>`:

### Bước 1 — Xác định module mục tiêu

- Lấy tên module từ tham số: ví dụ `/fe-prompt auth`, `/fe-prompt contract`, `/fe-prompt storage-unit`.
- Nếu người dùng chưa cung cấp tên module, dừng lại và yêu cầu chỉ định rõ module cần bàn giao.
- Nếu thay đổi chỉ là siết phân quyền hoặc sửa logic nội bộ mà **không** đổi endpoint, request schema, response shape, enum, mã lỗi hay constant: báo "Không có thay đổi contract, không cần bàn giao FE" và dừng, không xuất prompt.

### Bước 2 — Đọc code Backend của module

Đọc toàn bộ các file liên quan trong module:

1. `src/modules/<domain>/<domain>.controller.ts` (và route nếu có): method, path, kiểu trả về, phân trang, tóm tắt nghiệp vụ.
   - **Auth / Role:** `@Security` đang bị comment theo AGENTS.md mục 14, nên **đọc dòng `// TODO: Role authorization:`** trên mỗi endpoint để lấy role. Nếu không có cả hai thì ghi "Chưa xác định role" thay vì "public".
2. `src/modules/<domain>/schemas/<domain>.request.schema.ts`: toàn bộ schema request (body, query, params) và các shared schema được import (như `paginationQuerySchema`). Ghi lại danh sách giá trị cho phép của `sortBy` cùng giá trị mặc định của `sortBy` và `sortOrder`.
3. `src/modules/<domain>/schemas/<domain>.response.schema.ts` và hàm định dạng kết quả trong service (ví dụ `formatXxx`): để xác định hình dạng response, trường nào populate, cách serialize tiền, ngày, Decimal.
4. Enums liên quan: `src/common/enums/` hoặc enum cục bộ trong module.
5. Error codes / Message codes: các mã `MESSAGE_CODE` được ném ra trong controller/service của module (từ `src/common/consts/messageCode.const.ts`), cùng mẫu câu tiếng Anh mà BE dùng (nơi `formatMessage` lấy mẫu) và tham số `{0}` mà `AppError` truyền vào (ví dụ `['User']`).
6. Constants liên quan: `src/common/consts/` hoặc file const nội bộ của module (regex, giới hạn ký tự, default values...).
7. Service logic: đọc để nắm (a) quy tắc validate bổ sung chưa thể hiện qua Zod, (b) **điều kiện chuyển trạng thái**: ở trạng thái nào, role nào được thực hiện hành động nào.
8. Phiên bản Zod của BE trong `package.json` (FE dùng Zod v4): nếu schema dùng API khác biệt giữa các phiên bản, ghi chú lại.

### Bước 3 — Xác định thay đổi so với contract trước

- Nếu module đã bàn giao trước đó: so sánh với phiên bản contract trước bằng lịch sử git (`git log -p` trên các file schema, enum, messageCode của module). Nếu không biết mốc bàn giao trước, hỏi người dùng.
- Liệt kê rõ: endpoint thêm/bỏ, field request và response thêm/đổi tên/bỏ, giá trị enum thêm/bỏ, mã lỗi mới.
- Field đổi tên hoặc bỏ mà BE vẫn giữ alias để FE chuyển dần: ghi rõ tên cũ, tên mới, và "alias sẽ bị bỏ khi nào" nếu đã có quyết định (không bịa mốc thời gian).
- Module mới: ghi "Không có (module mới)".

### Bước 4 — Lọc nội dung (Cho phép vs Không cho phép)

#### ✅ ĐƯỢC PHÉP ĐƯA VÀO:

- **Phạm vi:** nền tảng mục tiêu (suy ra từ role: xem bảng bên dưới, đánh dấu "cần xác nhận"), role liên quan.
- **Endpoints:** HTTP method, path (đường dẫn gốc của BE, không có prefix `/api`), mô tả nghiệp vụ 1 dòng, role, path/query params, `sortBy` cho phép và mặc định, dạng phân trang.
- **Request schema:** đường dẫn file + **toàn bộ nội dung file nguyên văn**, nêu rõ thư viện validate và phiên bản.
- **Response shape:** nội dung response schema nguyên văn (hoặc type tương đương) cho từng endpoint, kèm:
  - bọc `ApiResponse<T>` (FE mặc định mọi API dùng wrapper này);
  - **dạng phân trang** nếu là API danh sách (xem Bước 5);
  - các trường tham chiếu (`facilityId`, `customerId`, `storageUnitId`...) trả về là `string` hay object đã populate, hay tách field riêng;
  - kiểu serialize: tiền là số nguyên VND, ngày là chuỗi ISO 8601, Decimal (`number`, `string` hay `{ $numberDecimal }`).
- **Enums:** tên enum, danh sách key-value đúng chữ hoa/thường, đường dẫn file trong BE.
- **Ma trận hành động theo trạng thái:** trạng thái nào cho phép hành động nào, role nào được làm (để FE hiện/ẩn nút và badge).
- **Error codes / Message codes:** mã code, HTTP status, mẫu câu tiếng Anh, bản dịch tiếng Việt đề xuất (đánh dấu "đề xuất, cần xác nhận"), chủ thể truyền vào `{0}`.
- **Constants dùng chung:** tên, giá trị, ý nghĩa (giới hạn độ dài, regex, default pagination limit...).
- **Quy tắc validate/nghiệp vụ bổ sung ảnh hưởng FE:** các kiểm tra không nằm trong schema (ví dụ ngày kết thúc phải sau ngày bắt đầu; thanh toán chỉ chấp nhận đúng số tiền cọc).
- **Thay đổi so với contract trước**, kể cả thay đổi response, alias và enum mới.
- **Yêu cầu UI/UX do người dùng cung cấp** (vị trí hiển thị, invalidate query, toast hoặc chuyển trang, khóa dịch): đưa nguyên văn khi có.

#### ❌ TUYỆT ĐỐI KHÔNG ĐƯỢC ĐƯA VÀO:

- **Suy đoán UI/UX:** tự gợi ý màn hình, layout, component, user flow, form field nếu người dùng không cung cấp. Thiếu thì để placeholder.
- **Logic nội bộ Backend:** Mongoose queries, service methods, database model, repository, cấu hình hạ tầng, server middleware chi tiết, cách BE tạo ra response.
- **Cách FE triển khai:** không đề xuất axios/fetch, React Query, Redux/Zustand, custom hooks, state handlers (FE đã có kiến trúc riêng).
- **Thông tin nhạy cảm:** JWT secret keys, DB connection strings, internal server URLs, credentials, dữ liệu cá nhân thật.
- **Tự đoán response:** field nào không đọc được từ response schema hoặc code thì ghi vào "Điểm không chắc chắn", không tự điền.

### Bước 5 — In ra một khối Markdown duy nhất

Dạng phân trang cho API danh sách, xác định từ kiểu trả về trong controller:

- `ApiResponse<PaginatedData<T>>`: **Dạng 1**, `response.data.data` là `{ items: T[], pagination: PaginationMeta }`.
- `PaginatedResponse<T>`: **Dạng 2**, `response.data.data` là `T[]` và `response.data.pagination` nằm ngang hàng với `data`.
- Không xác định được: ghi "Chưa xác định" và đưa vào Bước 6, không đoán.

Bảng tham chiếu role và nền tảng FE (cập nhật nếu FE đổi):

| Role                   | Nền tảng / khu vực FE     |
| ---------------------- | ------------------------- |
| `system_admin`         | Web `/system-admin/*`     |
| `business_ops_manager` | Web `/business-ops/*`     |
| `facility_manager`     | Web `/facility-manager/*` |
| `facility_staff`       | Web `/facility-staff/*`   |
| `customer`             | Mobile (Customer App)     |
| không đăng nhập        | Web Landing / Auth        |

Xuất kết quả bên trong **một khối markdown duy nhất** tuân thủ đúng cấu trúc mẫu bên dưới.
_(Lưu ý: Mục không có dữ liệu thì bỏ qua thay vì để trống, trừ mục "Phạm vi" và "Hành vi UI/UX" luôn có để người dùng bổ sung)._

```markdown
# MODULE: <tên module>

Bổ sung hợp đồng dữ liệu cho module này vào `packages/shared`. Phạm vi mặc định chỉ là `packages/shared` (enums, types, schemas, constants, utils); chỉ làm `apps/web` hoặc `apps/mobile` khi mục Phạm vi ghi rõ.
Nếu thiếu thông tin hoặc có mâu thuẫn, hỏi lại, không tự suy đoán.

## Phạm vi

- Nền tảng: <shared only / web / mobile / cả hai> (suy ra từ role, cần xác nhận)
- Role và khu vực FE: <bảng role → khu vực>
- Vị trí hiển thị trên UI: [Cần người dùng bổ sung]

## Mô tả

<1-2 dòng tóm tắt nghiệp vụ của module>

## Endpoints

| Method | Path       | Mô tả              | Role                | Phân trang |
| ------ | ---------- | ------------------ | ------------------- | ---------- |
| POST   | /users     | Tạo người dùng mới | system_admin        | —          |
| GET    | /contracts | Danh sách hợp đồng | facility_manager, … | Dạng 1     |

Query cho API danh sách:

- `sortBy` cho phép: <danh sách>, mặc định: <giá trị>
- `sortOrder`: `asc` | `desc`, mặc định: <giá trị>

## Request schema (giữ nguyên, thêm vào `packages/shared/src/schemas/request/`)

Thư viện validate: <Zod, phiên bản BE>. FE dùng Zod v4: <ghi chú nếu có API khác biệt>.

### <đường dẫn file schema 1>

\`\`\`ts
<nội dung file nguyên văn>
\`\`\`

## Response (hình dạng dữ liệu, cập nhật `packages/shared/src/types/`)

Mọi API trả về `ApiResponse<T>`.

### <endpoint> → <tên type>

\`\`\`ts
<response schema hoặc type nguyên văn>
\`\`\`

- Trường tham chiếu: <`facilityId` là string / object đã populate / field riêng>
- Tiền: số nguyên VND. Ngày: chuỗi ISO 8601. Decimal: <number / string / { $numberDecimal }>

## Enums (cập nhật `packages/shared/src/enums/`)

### <Tên Enum> (File BE: `<đường dẫn file>`)

\`\`\`ts
<nội dung enum, đúng chữ hoa/thường>
\`\`\`

## Ma trận hành động theo trạng thái

| Hành động | Trạng thái cho phép                     | Role     | Ghi chú |
| --------- | --------------------------------------- | -------- | ------- |
| Hủy đơn   | `pending_payment`, `payment_successful` | customer | ...     |

## Error codes và thông báo (cập nhật `MESSAGE_CODE`, `MESSAGE_DICTIONARY_EN/VI`, `ENTITY_SUBJECT_DICTIONARY`)

| Message Code     | HTTP | Mẫu EN              | Mẫu VI (đề xuất) | Chủ thể `{0}` |
| ---------------- | ---- | ------------------- | ---------------- | ------------- |
| MESSAGE_CODE_308 | 400  | {0} Is Out Of Stock | {0} đã hết hàng  | Amenity       |

## Constants

| Tên Constant   | Giá trị | Ý nghĩa                        |
| -------------- | ------- | ------------------------------ |
| PASSWORD_REGEX | /.../   | Ràng buộc độ phức tạp mật khẩu |

## Quy tắc validate/nghiệp vụ bổ sung (không nằm trong schema)

- <Quy tắc 1>
- <Quy tắc 2>

## Hành vi UI/UX mong muốn (người dùng cung cấp)

- Làm mới (`invalidateQueries`) sau khi thành công: [Cần người dùng bổ sung]
- Thông báo hoặc chuyển trang: [Cần người dùng bổ sung]
- Khóa dịch cần thêm vào `messages/{vi,en}.json` hoặc `locales/{vi,en}.json`: [Cần người dùng bổ sung]

## Thay đổi so với contract trước

- <Endpoint, field request/response, enum, mã lỗi thêm/đổi/bỏ; alias kèm tên cũ → tên mới>
- <Hoặc ghi "Không có (module mới)">
```

### Bước 6 — Điểm không chắc chắn / cần người dùng bổ sung

Phía bên dưới (ngoài khối markdown bàn giao), liệt kê ngắn gọn:

- Các placeholder `[Cần người dùng bổ sung]` còn lại (vị trí UI, hành vi UI/UX).
- Các điểm không xác định được từ code (dạng phân trang, kiểu serialize, trường populate...).
- Bản dịch tiếng Việt đề xuất cần xác nhận.
- Mốc bỏ alias nếu chưa có quyết định.

Tuyệt đối không tự suy đoán.

---

## Lưu ý

- Chỉ chạy lệnh chỉ đọc (đọc file, `grep`, `git log`, `git diff`); không thay đổi code
- Prompt cuối cùng là nguồn duy nhất của FE: không tham chiếu file BE mà FE không đọc được, trừ đường dẫn dùng để định danh
- Khi đổi tên hoặc bỏ field response, luôn nêu trong "Thay đổi so với contract trước" để FE không bị vỡ
