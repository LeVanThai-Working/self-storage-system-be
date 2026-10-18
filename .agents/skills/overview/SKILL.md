---
name: overview
description: >-
  Use this skill when the user types /overview at the start of a work session. Reads .agents/rules/AGENTS.md for coding rules, .agents/memory/memory.md for session history, and docs/agent/PROGRESS.md for task progress, checks the git working tree, then summarizes the current state of the project and which tasks are ready to start.
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

Bước 3 — Đọc tiến độ task

Nếu tồn tại docs/agent/PROGRESS.md, đọc để biết:

Task nào đã xong, đang làm, bị chặn
Quyết định [OPEN Dx] đã chốt hoặc đang dùng giá trị mặc định
Danh sách "phát hiện thêm" chưa xử lý

Nếu tồn tại docs/agent/PLAN.md, chỉ đọc mục lục và phần phụ thuộc giữa các task để xác định task nào sẵn sàng làm. Không nạp toàn bộ nội dung từng task ở bước này (việc đó thuộc /analyze).

Bước 4 — Kiểm tra working tree

Chạy lệnh chỉ đọc:

bash
git branch --show-current
git status --short

Báo cáo nhánh hiện tại và cảnh báo nếu có thay đổi chưa commit (có thể là công việc dở của phiên trước).

Bước 5 — Tóm tắt và báo cáo

Sau khi đọc xong, xuất ra báo cáo ngắn gọn theo format:

## 📖 Overview — [Ngày hiện tại]

### Coding Rules đã nạp

- [x] AGENTS.md đã đọc (các mục chính: phân quyền, transaction, audit, tiền/thời gian, testing)

### Trạng thái dự án (từ memory.md)

- Modules hoàn thiện: auth ✅, user ✅
- Modules chưa có: profile 🔲
- Session trước: [Tóm tắt ngắn task đã làm]

### Tiến độ task (từ PROGRESS.md)

- Đã xong: [danh sách task ID]
- Đang làm / dở dang: [danh sách task ID, kèm ghi chú]
- Bị chặn: [task ID — lý do (phụ thuộc hoặc `[OPEN Dx]` chưa có mặc định)]
- Sẵn sàng làm tiếp: [task ID không bị chặn, theo thứ tự ưu tiên]

### Quyết định và phát hiện đang chờ

- Quyết định `[OPEN Dx]` chờ chốt: [danh sách]
- Phát hiện thêm chưa xử lý: [danh sách]

### Git

- Nhánh: [tên nhánh]
- Thay đổi chưa commit: Có / Không [tóm tắt nếu có]

### Sẵn sàng nhận task ✅

Lưu ý
Nếu memory.md chưa tồn tại, thông báo cho người dùng chạy /remember để khởi tạo
Nếu AGENTS.md chưa tồn tại, báo lỗi và hướng dẫn tạo lại
Nếu docs/agent/PROGRESS.md chưa tồn tại, ghi "Chưa có theo dõi tiến độ task" và bỏ qua các mục tương ứng; không tự tạo file trong skill này
Mục nào không có dữ liệu thì bỏ qua, không suy đoán
Không thực hiện bất kỳ thay đổi code nào trong skill này
