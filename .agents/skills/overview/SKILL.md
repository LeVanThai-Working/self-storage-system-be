---
name: overview
description: >-
  Use this skill when the user types /overview at the start of a work session. Reads .agents/rules/AGENTS.md for coding rules, .agents/memory/memory.md for session history, and docs/agent/<scope>/PROGRESS.md across all scopes for task progress, checks the git working tree, then summarizes the current state of the project and which tasks are ready to start.
---

# Skill: /overview

Mục đích

Đọc lại coding rules và trạng thái dự án trước khi bắt đầu làm việc. Luôn chạy skill này ở đầu mỗi phiên làm việc mới. Chỉ đọc, không thay đổi file nào.

Hành vi

Khi người dùng gõ /overview, agent phải thực hiện tuần tự:

Bước 1 — Đọc AGENTS.md

Đọc file .agents/rules/AGENTS.md. Nội dung bao gồm:

Project structure rules
Naming conventions
TypeScript patterns
Controller / Service / Repository patterns
Error handling conventions
Phân quyền (hai lớp: role gate được hoãn, phạm vi tài nguyên không hoãn)
Workflow khi thêm feature
Audit, transaction và đồng thời, tiền và thời gian, testing, cấu hình và migration
Quy tắc làm việc theo task
Bước 2 — Đọc memory.md

Đọc file .agents/memory/memory.md. Nội dung bao gồm:

Tiến độ hoàn thiện hiện tại
Task đã hoàn thiện ở các phiên làm việc trước

Nếu file dài, đọc phần trạng thái hiện tại và vài phiên gần nhất, không cần đọc toàn bộ lịch sử.

Bước 3 — Đọc tiến độ task của tất cả phân hệ (`docs/agent/<scope>/`)

Quét tất cả các thư mục con `docs/agent/<scope>/` (ví dụ `docs/agent/booking/`, `docs/agent/warehouse/`, ...). Với **mỗi phân hệ (`<scope>`)** tìm thấy, hiển thị chi tiết như nhau:

Nếu tồn tại `docs/agent/<scope>/PROGRESS.md`, đọc để biết:

Task nào đã xong, đang làm, bị chặn
Quyết định [OPEN Dx] đã chốt hoặc đang dùng giá trị mặc định
Danh sách "phát hiện thêm" chưa xử lý

Nếu tồn tại `docs/agent/<scope>/PLAN.md`, chỉ đọc mục lục và phần phụ thuộc giữa các task để xác định task nào sẵn sàng làm. Không nạp toàn bộ nội dung từng task ở bước này (việc đó thuộc /analyze).

Bước 4 — Kiểm tra working tree

Chạy lệnh chỉ đọc:

bash
git branch --show-current
git status --short

Báo cáo nhánh hiện tại và cảnh báo nếu có thay đổi chưa commit (có thể là công việc dở của phiên trước).

Bước 5 — Tóm tắt và báo cáo

Sau khi đọc xong, xuất ra báo cáo ngắn gọn theo format (lặp lại mục tiến độ cho từng `<scope>` trong `docs/agent/*/`):

## 📖 Overview — [Ngày hiện tại]

### Coding Rules đã nạp

- [x] AGENTS.md đã đọc (các mục chính: phân quyền, transaction, audit, tiền/thời gian, testing)

### Trạng thái dự án (từ memory.md)

- Modules hoàn thiện: auth ✅, user ✅, ...
- Modules chưa có: ...
- Session trước: [Tóm tắt ngắn task đã làm]

### Tiến độ task — Phân hệ `<scope>` (từ `docs/agent/<scope>/PROGRESS.md`)

_(Hiển thị chi tiết như nhau cho từng `<scope>` có trong `docs/agent/*/`)_

- Đã xong: [danh sách task ID]
- Đang làm / dở dang: [danh sách task ID, kèm ghi chú]
- Bị chặn: [task ID — lý do (phụ thuộc hoặc `[OPEN Dx]` chưa có mặc định)]
- Sẵn sàng làm tiếp: [task ID không bị chặn, theo thứ tự ưu tiên]
- Quyết định `[OPEN Dx]` chờ chốt: [danh sách]
- Phát hiện thêm chưa xử lý: [danh sách]

### Git

- Nhánh: [tên nhánh]
- Thay đổi chưa commit: Có / Không [tóm tắt nếu có]

### Sẵn sàng nhận task ✅

Lưu ý
Nếu memory.md chưa tồn tại, thông báo cho người dùng chạy /remember để khởi tạo
Nếu AGENTS.md chưa tồn tại, báo lỗi và hướng dẫn tạo lại
Nếu trong một `docs/agent/<scope>/` chưa tồn tại `PROGRESS.md`, ghi "Chưa có theo dõi tiến độ task cho phân hệ `<scope>`" và bỏ qua các mục tương ứng; không tự tạo file trong skill này
Mục nào không có dữ liệu thì bỏ qua, không suy đoán
Không thực hiện bất kỳ thay đổi code nào trong skill này
