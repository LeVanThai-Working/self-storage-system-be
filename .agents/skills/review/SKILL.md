---
name: review
description: >-
  Use this skill when the user types /review after completing an implementation. Verifies all changed files against AGENTS.md coding rules and the approved plan (scope, authorization, transactions and atomic updates, state transitions, money and time, audit logging, config and migration, tests), runs npm quality checks (check, build, test if available), and reports results as a checklist. Suggests fixes for any issues found. Recommend running /remember afterward.
---

# Skill: /review

Skill: /review
Mục đích

Kiểm tra lại tất cả những gì vừa được thực hiện, đảm bảo đúng coding rules và đúng kế hoạch đã duyệt, rồi báo cáo kết quả bằng checklist. Chạy sau khi hoàn thành implementation.

Nguyên tắc: review như một người khác, không bảo vệ code vừa viết. Không báo ✅ cho kiểm tra chưa thực sự chạy hoặc chưa thực sự đọc.

Hành vi

Khi người dùng gõ /review, agent phải thực hiện tuần tự:

Bước 1 — Đối chiếu kế hoạch và phạm vi thực tế
Xem lại plan từ /planning (checklist, "Files sẽ được tạo/chỉnh sửa", "Những gì KHÔNG thay đổi", "Giả định").
Lấy danh sách file thay đổi thực tế bằng git status và git diff --stat.
Kiểm tra phạm vi:
File có trong diff nhưng không có trong plan: ⚠️ kèm lý do, hoặc ❌ nếu thay đổi hành vi ngoài task.
File trong plan nhưng chưa có thay đổi: báo là chưa làm.
File thuộc mục "Những gì KHÔNG thay đổi" mà bị sửa: ❌.
Nếu task có ID trong `docs/agent/<scope>/PLAN.md`: đọc lại phần "Done khi" của task và đối chiếu từng tiêu chí.
Bước 2 — Kiểm tra từng file đã thay đổi

Với mỗi file được tạo/sửa, kiểm tra theo AGENTS.md. Mục nào không áp dụng thì ghi N/A.

Checklist Cấu trúc
File đặt đúng vị trí (src/modules/<domain>/)
File name theo convention (<domain>.<role>.ts)
Checklist TypeScript
Không có any trong code mới
import type được dùng cho type-only imports
Sử dụng .ts extension trong relative imports
Request types được infer từ Zod schema
Dùng enum đã định nghĩa, không dùng string literal cho trạng thái/role
Checklist Controller
Không có business logic trong controller
Không có Mongoose query trong controller
Dùng @Middlewares(validateRequest({...})) cho validation
Return đúng format ApiResponse<T>
Dùng đúng MESSAGE_CODE constant
@Security vẫn ở trạng thái comment (không tự bật sớm); endpoint nhạy cảm có // TODO: Role authorization: đúng role
Checklist Service
Dependencies nhận qua constructor
Dùng AppError cho expected errors
Không access Mongoose model trực tiếp
Dùng validateResponse cho output quan trọng
Checklist Repository
Chỉ chứa Mongoose queries
Không có business logic
Nhận model qua constructor
Nhận và dùng session ở các hàm tham gia transaction
Checklist Container
Dependencies được wire đúng thứ tự
auditLogService được inject nếu service ghi audit
Export controller để dùng trong ioc.ts
Checklist Validation
Zod schema đầy đủ cho body/query/params
Schema định nghĩa trong schemas/<domain>.request.schema.ts
Types được export từ schema file
Checklist Error Handling
Dùng MESSAGE_CODE (không dùng literal string)
AppError được throw với đúng status code
Không swallow errors
Message code mới nằm đúng messageCode.const.ts, không trùng mã đã có và không dùng lại mã cho ý nghĩa khác
Checklist Phân quyền (AGENTS.md mục 14)
Kiểm tra phạm vi tài nguyên nằm trong service: CUSTOMER chỉ tài nguyên của mình, FACILITY_STAFF/FACILITY_MANAGER chỉ trong assignedFacilityId (assertFacilityAccess), chưa gán cơ sở thì 403
Quy tắc ai được ký / duyệt / hoàn tiền / chấm dứt khớp ma trận quyền trong `docs/agent/<scope>/PLAN.md`
Không dùng x-user-id, body hay query để xác định quyền ngoài chuỗi fallback caller của dev; fallback không chạy ở production
Endpoint nhạy cảm có test hoặc kịch bản kiểm thử cho ca bị chặn (chéo cơ sở, chéo khách hàng)
Checklist Transaction và đồng thời (AGENTS.md mục 20)
Thao tác đổi nhiều bản ghi nằm trong một @Transactional(); session được truyền xuống mọi repository call
Đổi trạng thái dùng conditional update (trạng thái mong đợi trong filter), không đọc rồi ghi; xử lý đúng khi kết quả trả null
Giữ/nhả kho dùng các hàm atomic đã có, không update trạng thái kho thủ công
Side effect (notification, Socket.IO, email, BullMQ) nằm trong afterCommitHooks
Không có try/catch nuốt lỗi transaction hoặc fallback chạy không session cho production
Job nền: xử lý từng bản ghi hoặc batch nhỏ, truy vấn có limit, chạy lại không gây hại
Bảng chuyển trạng thái của entity được cập nhật nếu thêm hoặc đổi trạng thái
Checklist Tiền và thời gian (AGENTS.md mục 21)
Tiền là số nguyên, không có float; công thức nằm trong hàm thuần, một quy tắc làm tròn
So sánh theo ngày dùng helper giờ VN đã có; ngày đầu vào được chuẩn hóa tại boundary
Hạn và mốc tính từ dữ liệu gốc tại thời điểm kiểm tra, không phụ thuộc cờ do job đặt
Giá và chính sách được snapshot lúc tạo bản ghi
Checklist Audit (AGENTS.md mục 19)
Mọi mutation có ghi audit với đúng action/resource; enum mới đã được thêm vào file nguồn
Job nền ghi audit với actor SYSTEM tường minh
Thao tác tiền/pháp lý (thu, hoàn, tịch thu, quyết toán cọc, ký, chấm dứt) dùng audit bền, hoặc PR ghi rõ đang dùng audit best-effort
Trường dữ liệu nhạy cảm mới đã được thêm vào danh sách mask
Thao tác đọc (GET) không ghi audit
Checklist Cấu hình, dữ liệu nhạy cảm và migration (AGENTS.md mục 23)
Số tiền, thời hạn, tỷ lệ, ngưỡng lấy từ config, không hardcode; feature flag mặc định tắt
Dữ liệu nhạy cảm (tài khoản ngân hàng, CCCD, ảnh giấy tờ) được mã hóa khi lưu, che khi trả về, không log nguyên văn
Trường mới có default; script migration idempotent kèm cách rollback
Trường cũ mà FE đang dùng vẫn còn (alias hoặc dữ liệu dẫn xuất)
Checklist Test (AGENTS.md mục 22)
Nếu đã có test framework: có test mới cho ca dương, ca âm, ca chéo cơ sở/khách hàng và ca đồng thời (nếu liên quan); test chạy trên replica set
Nếu chưa có framework: PR có "Kịch bản kiểm thử thủ công" gồm ít nhất một ca bị chặn đúng
Sửa lỗi có test hoặc kịch bản tái hiện lỗi
Checklist Contract FE
Nếu đổi endpoint, request schema, enum, error code hoặc constant: nhắc chạy /fe-prompt <tên module>
Nếu đổi tên, bỏ hoặc thêm field response: ghi vào báo cáo là cần thông báo cho FE (/fe-prompt không chứa response)
Bước 3 — Chạy quality checks

Chạy thật các lệnh sau và ghi lại kết quả thật:

bash
npm run check # = npm run typecheck && npm run lint && npm run format:check
npm run build
Nếu npm run check lỗi, chạy riêng typecheck, lint, format:check để xác định bước lỗi.
Lỗi format:check sửa bằng script format của dự án nếu có (kiểm tra package.json), không sửa tay hàng loạt.
Kiểm tra package.json: nếu có script test thì chạy npm test. Nếu chưa có, báo "⚠️ Chưa có test framework" và dựa vào kịch bản kiểm thử thủ công.
Lệnh không chạy được (thiếu môi trường, thiếu MongoDB replica set, ...): ghi ⚠️ Not run kèm lý do. Không ghi ✅.
Bước 4 — Xuất báo cáo
markdown

## ✅ Review Report — [Tên task] — [Ngày]

### Phạm vi

- Task: `Txx` (hoặc "ngoài PLAN")
- File ngoài plan: [danh sách hoặc "Không có"]
- File trong plan chưa thay đổi: [danh sách hoặc "Không có"]
- Tiêu chí "Done khi": [x] / [ ] từng mục

### Files đã review

| File                     | Status     | Ghi chú |
| ------------------------ | ---------- | ------- |
| `src/modules/xxx/xxx.ts` | ✅ OK      |         |
| `src/modules/xxx/xxx.ts` | ⚠️ Warning | [mô tả] |
| `src/modules/xxx/xxx.ts` | ❌ Issue   | [mô tả] |

### Kết quả theo nhóm kiểm tra

| Nhóm                                                  | Kết quả            | Ghi chú |
| ----------------------------------------------------- | ------------------ | ------- |
| Cấu trúc, TypeScript, Controller, Service, Repository | ✅ / ⚠️ / ❌       |         |
| Phân quyền                                            | ✅ / ⚠️ / ❌ / N/A |         |
| Transaction và đồng thời                              | ✅ / ⚠️ / ❌ / N/A |         |
| Tiền và thời gian                                     | ✅ / ⚠️ / ❌ / N/A |         |
| Audit                                                 | ✅ / ⚠️ / ❌ / N/A |         |
| Cấu hình, dữ liệu nhạy cảm, migration                 | ✅ / ⚠️ / ❌ / N/A |         |
| Test                                                  | ✅ / ⚠️ / ❌       |         |

### Quality Checks

- [x] `npm run check` — ✅ Passed / ❌ Failed / ⚠️ Not run
- [x] `npm run build` — ✅ Passed / ❌ Failed / ⚠️ Not run
- [x] `npm test` — ✅ Passed / ❌ Failed / ⚠️ Chưa có script

### Issues tìm thấy

- ❌ Blocker (phân quyền, tiền, race condition, mất audit, vỡ FE): [danh sách]
- ⚠️ Warning: [danh sách]

### Giả định `[OPEN]` đã dùng

- [Quyết định, giá trị mặc định, nằm ở config/flag nào]

### Phát hiện ngoài phạm vi (không sửa)

- [Danh sách, để ghi vào PROGRESS.md qua /remember]

### Kết luận

✅ Implementation đạt chuẩn / ❌ Cần sửa [N] issues

---

💡 Chạy /remember để lưu lại phiên làm việc này.
Bước 5 — Fix issues (nếu có)

Chỉ sửa trong các file của plan. Phân loại trước khi sửa:

Lỗi quy tắc code (any, thiếu import type, đặt sai vị trí, thiếu .ts extension, format, thiếu inject container...): tự sửa theo coding rules, báo lại những gì đã sửa.
Lỗi ảnh hưởng hành vi nghiệp vụ (phân quyền, công thức tiền, chuyển trạng thái, chính sách, audit, migration): không tự sửa. Mô tả lỗi, đề xuất cách sửa và chờ người dùng xác nhận.
Phát hiện ngoài phạm vi: không sửa, chỉ ghi vào báo cáo.

Sau khi sửa, chạy lại các quality checks và cập nhật báo cáo. Tối đa 2 vòng tự sửa; nếu vẫn còn lỗi thì báo người dùng và dừng.

Lưu ý
Luôn chạy npm run build để regenerate tsoa routes sau khi thay đổi controller
Nếu npm run check fail, fix trước khi kết luận review
Không kết luận "đạt chuẩn" khi còn ❌ Blocker hoặc lệnh bắt buộc chưa chạy được
Đề xuất /remember sau khi review thành công
