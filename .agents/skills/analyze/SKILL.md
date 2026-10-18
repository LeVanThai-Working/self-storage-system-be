---
name: analyze
description: >-
  Use this skill when the user types /analyze followed by a task description or a task ID from docs/agent/PLAN.md. Analyzes the task to identify required APIs, models, services, layers, shared resources and libraries, and also covers authorization, state transitions and concurrency, money and time rules, audit, tests, migration, and differences between the written business description and the actual code. Does NOT make any code changes — output only. Run this before /planning.
---

# Skill: /analyze

Mục đích

Phân tích task được giao — xác định APIs cần thiết, services, thư viện, các thành phần cần tạo hoặc thay đổi, và các rủi ro nghiệp vụ (phân quyền, trạng thái, tiền, thời gian, audit, test, migration). Chạy trước /planning. Không thực hiện thay đổi code.

Hành vi

Khi người dùng gõ /analyze [mô tả task hoặc task ID], agent phải thực hiện tuần tự:

Bước 1 — Đọc context
Đọc .agents/rules/AGENTS.md để nắm coding rules (đặc biệt mục 14, 19, 20–23)
Đọc .agents/memory/memory.md để biết trạng thái hiện tại
Nếu task có ID (ví dụ T0.1) hoặc thuộc dự án đang theo kế hoạch:
docs/agent/PLAN.md: phần task, ma trận quyền, ma trận hoàn/mất cọc, danh sách quyết định
docs/agent/business-rules-current.md: hành vi hiện trạng do con người mô tả
docs/agent/PROGRESS.md: task đã xong, task phụ thuộc, giả định đã dùng
Đọc các file liên quan đến task (model, service, controller, schema, repository hiện có)
Tìm trong codebase các helper đã có thay vì đoán tên: kiểm tra phạm vi cơ sở (assertFacilityAccess), các hàm atomic của repository, helper giờ VN (startOfDayVN, endOfDayVN), file config (ví dụ reservation.config.ts), AuditLogService, @Transactional
Bước 2 — Kiểm tra trước khi phân tích
A. Phụ thuộc
Task phụ thuộc task nào? Task đó đã hoàn thành theo PROGRESS.md chưa?
Nếu chưa: báo rõ và dừng, không phân tích tiếp.
B. Quyết định đang mở
Liệt kê mọi [OPEN Dx] liên quan đến task.
Có giá trị mặc định trong PLAN.md: ghi lại giá trị đó và nơi sẽ đặt (config hoặc flag).
Không có mặc định: hỏi người dùng trước khi phân tích tiếp. Không tự chọn chính sách tiền, thời hạn hay tỷ lệ.
C. Hiện trạng so với mô tả
Đối chiếu mô tả nghiệp vụ (business-rules-current.md, PLAN.md, lời người dùng) với code thực tế.
Mỗi chỗ khác nhau ghi rõ: mô tả nói gì, code làm gì, file và dòng nào.
Mô tả do con người viết, code mới là sự thật. Khác nhau thì báo lại, không tự chọn bên và không tự sửa.
Bước 3 — Phân tích task
A. Entities / Models cần thiết
Model nào cần tạo mới?
Model nào cần cập nhật (thêm field)? Field mới có default không?
Mongoose interface (IXxx) và schema cần gì?
B. APIs cần thiết

Với mỗi API:

Method + path (ví dụ: POST /profile/update)
Input: body / query / params schema (Zod)
Output: response schema
Authentication cần không? (@Security, hiện đang comment theo AGENTS.md mục 14)
Business rules đặc biệt?
C. Layers cần tạo/cập nhật
Model (nếu có DB entity mới)
Repository methods (Mongoose queries)
Service methods (business logic)
Controller methods (HTTP handlers)
Route (Zod validation + tsoa decorators)
Container (DI wiring)
ioc.ts (nếu có controller mới)
D. Shared resources cần thêm
MESSAGE_CODE mới nào cần thêm? (đọc messageCode.const.ts trước, không trùng mã)
Enum mới nào cần thêm (trạng thái, AuditActionEnum, AuditResourceEnum)?
Utility mới nào cần tạo? (kiểm tra đã có helper tương đương chưa)
E. Dependencies / Thư viện
Thư viện nào cần cài thêm? (npm install)
Thư viện nào đã có sẵn?
Không đề xuất cài test framework nếu task không phải task dựng test (AGENTS.md mục 22).
F. Phân quyền (AGENTS.md mục 14)
Với mỗi endpoint: role nào được gọi, phạm vi tài nguyên nào (chủ tài nguyên, assignedFacilityId).
Quy tắc nghiệp vụ theo vai trò: ai được ký, duyệt, hoàn tiền, chấm dứt (đối chiếu ma trận quyền trong PLAN.md).
Code hiện tại đã kiểm tra những gì, còn thiếu gì (chéo cơ sở, chéo khách hàng).
Endpoint nào cần comment // TODO: Role authorization:.
G. Chuyển trạng thái và đồng thời (AGENTS.md mục 20)
Entity nào đổi trạng thái, từ trạng thái nào sang trạng thái nào, điều kiện cho phép.
Chỗ nào đang đọc rồi ghi (race condition) và cần chuyển sang conditional update.
Thao tác nào đổi nhiều bản ghi (đơn, kho, hợp đồng, thanh toán) và cần @Transactional().
Dùng được hàm atomic nào đã có (giữ/nhả kho, atomicUpdateStatus).
Side effect nào (notification, Socket.IO, email, BullMQ) cần chuyển vào afterCommitHooks.
Có job nền liên quan không (batch, limit, idempotent, xử lý từng bản ghi).
H. Tiền, thời gian, cấu hình (AGENTS.md mục 21, 23)
Công thức tiền nào tham gia, kiểu dữ liệu, quy tắc làm tròn.
Mốc ngày/giờ nào, endDate inclusive hay exclusive, helper giờ VN nào dùng.
Giá trị nào phải lấy từ config thay vì hardcode; feature flag nào cần thêm.
Dữ liệu nào cần snapshot lúc tạo (giá, cọc, chính sách, phiên bản điều khoản).
Dữ liệu nhạy cảm nào (tài khoản ngân hàng, CCCD, ảnh giấy tờ): cần mã hóa, che, mask trong audit.
I. Audit (AGENTS.md mục 19)
Mutation nào cần ghi audit, action và resource nào, enum nào cần thêm.
Thao tác tiền hoặc pháp lý nào cần audit bền.
Actor là người dùng hay SYSTEM (job nền).
J. Test và kiểm thử (AGENTS.md mục 22)
Các ca dương, ca âm, ca chéo cơ sở/khách hàng, ca đồng thời cần kiểm chứng.
Dự án đã có test framework chưa (kiểm tra package.json). Chưa có: liệt kê kịch bản kiểm thử thủ công.
K. Migration và tương thích với FE
Dữ liệu đang có có cần backfill không; script phải idempotent và có cách rollback.
Field cũ nào FE đang dùng và phải giữ dạng alias hoặc dữ liệu dẫn xuất.
Task có đổi contract FE không (endpoint, request schema, enum, error code, constant) để quyết định có cần /fe-prompt không. Đổi field response thì ghi rõ là cần thông báo FE qua kênh khác.
L. Rủi ro và lưu ý
Breaking changes?
Tác động đến module khác?
Điểm chưa chắc chắn cần người dùng xác nhận.
Bước 4 — Xuất kết quả phân tích
markdown

## 🔍 Phân tích Task: [Tên task]

### Task và phụ thuộc

- Task ID: `Txx` (hoặc "ngoài PLAN")
- Phụ thuộc: [task đã xong / chưa xong]

### Giả định và quyết định đang mở

| Quyết định  | Giá trị mặc định | Đặt ở đâu (config / flag) |
| ----------- | ---------------- | ------------------------- |
| `[OPEN Dx]` | ...              | ...                       |

### Khác biệt giữa mô tả và code

| Mô tả nói | Code đang làm | File |
| --------- | ------------- | ---- |

### Entities cần thiết

- [Danh sách model]

### APIs cần implement

| Method | Path | Auth | Mô tả |
| ------ | ---- | ---- | ----- |
| POST   | /xxx | 🔒   | ...   |

### Phân quyền

| Endpoint | Role | Phạm vi (chủ tài nguyên / cơ sở) | Hiện tại đã kiểm tra | Còn thiếu |
| -------- | ---- | -------------------------------- | -------------------- | --------- |

### Chuyển trạng thái và đồng thời

| Entity | Từ  | Sang | Cơ chế hiện có | Cần thay đổi |
| ------ | --- | ---- | -------------- | ------------ |

- `@Transactional` cần cho: [danh sách]
- Side effect chuyển vào `afterCommitHooks`: [danh sách]

### Tiền, thời gian, cấu hình

- Công thức và làm tròn: ...
- Mốc ngày/giờ và helper: ...
- Config/flag cần thêm: ...
- Snapshot cần lưu: ...
- Dữ liệu nhạy cảm: ...

### Audit

- Action / resource (enum cần thêm): ...
- Audit bền: Có / Không
- Actor: người dùng / `SYSTEM`

### Layers cần tạo/cập nhật

| File                           | Action | Mô tả |
| ------------------------------ | ------ | ----- |
| `src/modules/xxx/xxx.model.ts` | CREATE | ...   |

### Shared resources cần thêm

- MESSAGE_CODE: [danh sách]
- Enum: [danh sách]

### Dependencies

- Đã có: [danh sách]
- Cần cài: [danh sách] (nếu có)

### Test và kiểm thử

- Test framework: Có / Chưa có
- Các ca cần kiểm chứng: [dương / âm / chéo cơ sở / chéo khách hàng / đồng thời]

### Migration và FE

- Backfill: Có / Không
- Field cũ cần giữ alias: [danh sách]
- Đổi contract FE: Có / Không (cần `/fe-prompt`: Có / Không)

### ⚠️ Lưu ý / Rủi ro

- [Danh sách]

---

✅ Phân tích hoàn tất. Chạy /planning để lên kế hoạch.
Lưu ý
Không thực hiện bất kỳ thay đổi code nào; chỉ chạy lệnh chỉ đọc (đọc file, grep, git status, git log). Không chạy npm install hay lệnh ghi dữ liệu
Nếu task không rõ ràng hoặc có [OPEN Dx] chưa có mặc định, hỏi người dùng trước khi phân tích
Tham chiếu code hiện có để tránh duplicate; tìm tên hàm và file thật bằng cách đọc code, không đoán
Mô tả nghiệp vụ khác code thì báo lại; code là sự thật
Mục nào không áp dụng thì ghi N/A, không bỏ trống
