---
name: overview
description: >-
  Use this skill when the user types /overview at the start of a work session.
  Reads .agents/rules/AGENTS.md for coding rules and .agents/memory/memory.md
  for project progress, then summarizes the current state of the project.
---

# Skill: /overview

## Mục đích

Đọc lại coding rules và trạng thái dự án trước khi bắt đầu làm việc.
Luôn chạy skill này ở đầu mỗi phiên làm việc mới.

---

## Hành vi

Khi người dùng gõ `/overview`, agent phải thực hiện tuần tự:

### Bước 1 — Đọc AGENTS.md

Đọc file `.agents/rules/AGENTS.md`.
Nội dung bao gồm:

- Project structure rules
- Naming conventions
- TypeScript patterns
- Controller / Service / Repository patterns
- Error handling conventions
- Workflow khi thêm feature

### Bước 2 — Đọc memory.md

Đọc file `.agents/memory/memory.md`.
Nội dung bao gồm:

- Tiến độ hoàn thiện hiện tại
- Task đã hoàn thiện ở phiên làm việc trước

### Bước 3 — Tóm tắt và báo cáo

Sau khi đọc xong, xuất ra báo cáo ngắn gọn theo format:

```
## 📖 Overview — [Ngày hiện tại]

### Coding Rules đã nạp
- [x] AGENTS.md đã đọc — N rules [MUST] đã nạp

### Trạng thái dự án (từ memory.md)
- Modules hoàn thiện: auth ✅, user ✅
- Modules chưa có: profile 🔲
- Session trước: [Tóm tắt ngắn task đã làm]

### Sẵn sàng nhận task ✅
```

---

## Lưu ý

- Nếu `memory.md` chưa tồn tại, thông báo cho người dùng chạy `/remember` để khởi tạo
- Nếu `AGENTS.md` chưa tồn tại, báo lỗi và hướng dẫn tạo lại
- Không thực hiện bất kỳ thay đổi code nào trong skill này
