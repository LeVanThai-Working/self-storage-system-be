---
name: remember
description: >-
  Use this skill when the user types /remember at the end of a work session.
  Saves completed tasks, changed files, and notes from the current session into
  .agents/memory/memory.md. Also ensures .agents/memory/ is in .gitignore.
---

# Skill: /remember

## Mục đích

Lưu lại tiến độ và các task đã hoàn thiện trong phiên làm việc hiện tại vào `memory.md`.
Chạy skill này ở **cuối mỗi phiên làm việc**.

---

## Hành vi

Khi người dùng gõ `/remember`, agent phải thực hiện tuần tự:

### Bước 1 — Đọc memory.md hiện tại

Đọc `.agents/memory/memory.md` để biết nội dung cũ.
Nếu file chưa tồn tại, tạo mới với cấu trúc mẫu.

### Bước 2 — Tổng hợp phiên làm việc hiện tại

Thu thập thông tin từ conversation hiện tại:

- Ngày giờ làm việc
- Các task đã hoàn thành (checklist)
- Các thay đổi file đã thực hiện
- Các module mới đã tạo
- Ghi chú đặc biệt (gotchas, bugs, decisions)

### Bước 3 — Cập nhật memory.md

Thêm một section mới vào cuối phần "Task đã hoàn thiện ở phiên làm việc trước" với format:

```markdown
### [YYYY-MM-DD] — [Mô tả ngắn phiên làm việc]

**Thực hiện:**

- [x] Task 1 đã hoàn thành
- [x] Task 2 đã hoàn thành
- [ ] Task 3 chưa hoàn thành (nếu có)

**Files đã thay đổi:**

- `src/modules/<domain>/<file>.ts` — [mô tả thay đổi]

**Ghi chú:**

- [Bất kỳ ghi chú quan trọng nào]
```

Cập nhật bảng "Modules đã hoàn thiện" nếu có module mới được hoàn thành.

### Bước 4 — Kiểm tra .gitignore

Đọc file `.gitignore` tại root project.
Nếu chưa có entry cho `.agents/memory/`, thêm vào:

```
# Agent memory (personal, do not commit)
.agents/memory/
```

### Bước 5 — Xác nhận

Thông báo cho người dùng:

```
✅ Memory đã được lưu vào .agents/memory/memory.md
✅ .gitignore đã được cập nhật
📝 Session [ngày] đã được ghi lại
```

---

## Lưu ý

- Không xoá nội dung cũ trong memory.md — chỉ thêm vào
- Giữ nguyên cấu trúc file
- Nếu session không có thay đổi đáng kể, vẫn ghi lại với note "Không có thay đổi"
