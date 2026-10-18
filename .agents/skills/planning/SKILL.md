---
name: planning
description: >-
  Use this skill when the user types /planning after running /analyze. Creates a detailed implementation plan with a phased checklist (tests, data, schemas, service, controller, wiring, verification) that also covers authorization, state transitions, transactions, audit logging, config and migration. MUST wait for user confirmation before making any code changes. Blocks execution until the user approves the plan.
---

# Skill: /planning

Mục đích

Dựa vào kết quả /analyze để lập kế hoạch chi tiết với checklist đầy đủ. Chờ xác nhận từ người dùng trước khi thực hiện bất kỳ thay đổi nào.

Hành vi

Khi người dùng gõ /planning, agent phải thực hiện tuần tự:

Bước 1 — Tổng hợp từ analyze và nạp context
Dựa vào kết quả phân tích từ /analyze (hoặc phân tích lại nếu chưa có).
Đọc .agents/rules/AGENTS.md, đặc biệt mục 14 (phân quyền), 15 (workflow), 18 (thứ tự ghi file), 19 (audit), 20–23 (transaction, tiền và thời gian, test, cấu hình và migration).
Nếu task có ID trong `docs/agent/<scope>/PLAN.md` (ví dụ `T0.1` hoặc `booking/T0.1`): đọc phần task đó, ma trận quyền hoặc ma trận hoàn/mất cọc liên quan, các quyết định [OPEN Dx], và `docs/agent/<scope>/PROGRESS.md`.
Kiểm tra phụ thuộc: nếu task phụ thuộc task chưa hoàn thành theo `docs/agent/<scope>/PROGRESS.md`, dừng lại và báo người dùng, không lập plan.
Quyết định [OPEN Dx]:
Có giá trị mặc định trong tài liệu task: dùng giá trị đó, đặt sau config hoặc feature flag, ghi vào mục "Giả định" của plan.
Không có mặc định: hỏi người dùng, không tự chọn, không lập plan.
Phạm vi: nguyên tắc một task một PR. Nếu plan chạm hơn một task ID hoặc vượt khoảng 15 file, đề xuất tách thành nhiều plan trước khi tiếp tục.
Bước 2 — Lập kế hoạch chi tiết

Thứ tự Phase theo AGENTS.md mục 18 (thứ tự ghi file), để service luôn import được type từ schema đã tồn tại. Mục nào không áp dụng thì ghi N/A, không bỏ trống, để thể hiện đã cân nhắc.

markdown

## 📋 Kế hoạch: [Tên task]

### Tổng quan

- Task ID: `<scope>/Txx` (hoặc "ngoài PLAN")
- Module: `src/modules/<domain>/`
- Ước tính files cần tạo/sửa: N files
- Breaking changes: Có / Không
- Đổi contract FE (endpoint, request schema, enum, error code): Có / Không

### Giả định và quyết định đang mở

| Quyết định  | Giá trị mặc định đang dùng | Đặt ở đâu (config / flag) |
| ----------- | -------------------------- | ------------------------- |
| `[OPEN Dx]` | ...                        | ...                       |

### Phân quyền (AGENTS.md mục 14)

| Endpoint    | Role được phép | Kiểm tra phạm vi (chủ tài nguyên / cơ sở) | Test chặn |
| ----------- | -------------- | ----------------------------------------- | --------- |
| `POST /xxx` | ...            | ...                                       | ...       |

### Chuyển trạng thái (AGENTS.md mục 20)

| Entity | Từ  | Sang | Cơ chế (conditional update / atomic) | Khi cập nhật trả null |
| ------ | --- | ---- | ------------------------------------ | --------------------- |

### Tiền, thời gian, cấu hình (AGENTS.md mục 21, 23)

- Công thức tiền (hàm thuần nào, làm tròn thế nào): ...
- Mốc ngày/giờ và helper giờ VN dùng: ...
- Giá trị lấy từ config nào: ...

### Audit và side effect (AGENTS.md mục 19, 20)

- Hành động audit (`AuditActionEnum`) và tài nguyên (`AuditResourceEnum`), enum nào cần thêm: ...
- Thao tác tiền hoặc pháp lý (cần audit bền): Có / Không
- Actor: người dùng / `SYSTEM` (job nền)
- Side effect chạy sau commit (`afterCommitHooks`): notification, Socket.IO, BullMQ, ...

### Checklist thực hiện

#### Phase 0 — Kiểm thử trước

- [ ] Viết test tái hiện lỗi hoặc test hành vi mong muốn (phải thất bại trước khi sửa); gồm ca dương, ca âm, ca chéo cơ sở / chéo khách hàng nếu có phân quyền
- [ ] Chưa có test framework: viết "Kịch bản kiểm thử thủ công" (endpoint, role, kết quả mong đợi, ít nhất một ca bị chặn đúng)

#### Phase 1 — Data Layer

- [ ] Thêm enum mới (trạng thái, `AuditActionEnum`, `AuditResourceEnum`) nếu cần
- [ ] Tạo/cập nhật Mongoose interface + schema (`<domain>.model.ts`); trường mới có default
- [ ] Tạo/cập nhật repository methods (`<domain>.repository.ts`): chỉ persistence, đổi trạng thái dùng conditional update, nhận `session`
- [ ] Script migration/backfill idempotent kèm cách rollback (nếu đổi dữ liệu đang có)

#### Phase 2 — Contract Layer

- [ ] Thêm MESSAGE_CODE mới (nếu cần) vào `messageCode.const.ts` (đọc file nguồn trước, không trùng mã)
- [ ] Tạo/cập nhật Zod request schemas (`schemas/<domain>.request.schema.ts`)
- [ ] Tạo/cập nhật response schemas (`schemas/<domain>.response.schema.ts`) chỉ khi output contract thay đổi

#### Phase 3 — Business Logic

- [ ] Tạo/cập nhật service methods (`<domain>.service.ts`)
- [ ] Kiểm tra phân quyền theo tài nguyên trong service (chủ tài nguyên, `assertFacilityAccess`, quy tắc ai được ký/duyệt/hoàn tiền)
- [ ] `@Transactional()` cho thao tác đổi nhiều bản ghi; side effect đưa vào `afterCommitHooks`
- [ ] Ghi audit log (actor `SYSTEM` cho job nền; audit bền cho thao tác tiền/pháp lý)
- [ ] Giá trị tiền, hạn, ngưỡng lấy từ config; không hardcode

#### Phase 4 — API Layer

- [ ] Tạo/cập nhật controller methods (`<domain>.controller.ts`): không có business logic
- [ ] Giữ `@Security` ở trạng thái comment; thêm `// TODO: Role authorization:` cho endpoint nhạy cảm
- [ ] Thêm tài liệu `@openapi` / tsoa

#### Phase 5 — Wiring

- [ ] Cập nhật container (`<domain>.container.ts`), inject `auditLogService` nếu cần
- [ ] Cập nhật `ioc.ts` (nếu có controller mới)

#### Phase 6 — Verification

- [ ] Chạy `npm run check` (= typecheck + lint + format:check)
- [ ] Chạy `npm run build` (regenerate tsoa routes)
- [ ] Chạy `npm test` nếu dự án đã có script test
- [ ] Đối chiếu `git diff --stat` với danh sách file trong plan
- [ ] Chạy `/review` để kiểm tra kết quả

#### Phase 7 — Bàn giao

- [ ] Nếu đổi contract FE: chạy `/fe-prompt <tên module>`
- [ ] Chạy `/remember` để ghi tiến độ vào `docs/agent/<scope>/PROGRESS.md` và memory

### Files sẽ được tạo mới

| File                           | Mô tả |
| ------------------------------ | ----- |
| `src/modules/xxx/xxx.model.ts` | ...   |

### Files sẽ được chỉnh sửa

| File                                     | Thay đổi              |
| ---------------------------------------- | --------------------- |
| `src/common/consts/messageCode.const.ts` | Thêm MESSAGE_CODE mới |

### Những gì KHÔNG thay đổi

- [Danh sách files/modules không bị ảnh hưởng]

### Rủi ro và cách giảm thiểu

- [Race condition, tương thích ngược với FE, dữ liệu cũ, ...]
  Bước 3 — Hỏi xác nhận

BẮT BUỘC xuất câu hỏi sau và dừng lại chờ người dùng phản hồi:

---

⚠️ **Đây là kế hoạch — chưa có thay đổi nào được thực hiện.**

Bạn có muốn:
A) ✅ Xác nhận và thực hiện kế hoạch này
B) ✏️ Điều chỉnh kế hoạch (nêu phần cần thay đổi)
C) ❌ Hủy

Vui lòng phản hồi trước khi tôi bắt đầu implement.
Bước 4 — Thực hiện (sau khi được xác nhận)

Chỉ bắt đầu implement khi người dùng xác nhận (A hoặc sau khi điều chỉnh từ B).

Thực hiện tuần tự theo checklist, đánh dấu [x] sau mỗi bước hoàn thành.
Ghi file từng file một theo AGENTS.md mục 18 và kiểm tra size > 0 sau mỗi lần ghi.
Không mở rộng phạm vi. Nếu trong lúc làm phát hiện cần sửa file ngoài plan, hoặc phát hiện lỗi ngoài task: dừng lại, báo người dùng, cập nhật plan và hỏi xác nhận lại. Lỗi ngoài task chỉ ghi vào danh sách "Phát hiện thêm" để /remember lưu, không tự sửa.
Nếu test (Phase 0) vẫn pass trước khi sửa, hoặc conditional update trả null ở chỗ plan không lường trước: dừng và báo, không tự đoán cách xử lý.
Sau mỗi Phase, báo cáo ngắn gọn cho người dùng.
Lưu ý
Không bao giờ bỏ qua bước xác nhận
Nếu người dùng yêu cầu thay đổi kế hoạch, cập nhật plan và hỏi xác nhận lại
Theo đúng thứ tự Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7
Không tự quyết chính sách tiền, thời hạn hay tỷ lệ; chỉ dùng giá trị mặc định đã ghi trong tài liệu task và đặt sau config hoặc flag
Không báo "đã chạy xong" cho lệnh chưa chạy thật; ghi rõ lệnh nào chưa chạy và lý do
