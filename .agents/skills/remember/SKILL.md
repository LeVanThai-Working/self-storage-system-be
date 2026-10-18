---
name: remember
description: >-
  Use this skill when the user types /remember at the end of a work session. Saves the session summary into .agents/memory/memory.md (personal, gitignored, kept compact) and updates the shared task tracker docs/agent/<scope>/PROGRESS.md (committed): task status, OPEN-decision assumptions, out-of-scope findings. Also ensures .agents/memory/ is in .gitignore and docs/agent/ is not.
---

# Skill: /remember

Mục đích

Lưu lại tiến độ phiên làm việc hiện tại vào hai nơi, mỗi nơi một vai trò:

File Vai trò Có commit không
.agents/memory/memory.md Nhật ký cá nhân của agent: tóm tắt phiên, ghi chú, gotchas Không (nằm trong .gitignore)
docs/agent/<scope>/PROGRESS.md Theo dõi tiến độ chung theo phân hệ `<scope>` và task ID: trạng thái, giả định, phát hiện thêm Có (để mọi người và mọi agent cùng thấy mà không xung đột giữa các phân hệ)

Chạy skill này ở cuối mỗi phiên làm việc.

Hành vi

Khi người dùng gõ /remember, agent phải thực hiện tuần tự:

Bước 1 — Đọc trạng thái hiện tại
Đọc .agents/memory/memory.md. Nếu chưa tồn tại, tạo mới theo cấu trúc mẫu ở Bước 3.
Xác định phân hệ `<scope>` của phiên làm việc hiện tại (ví dụ `booking`, `warehouse`, ...). Đọc `docs/agent/<scope>/PROGRESS.md`. Nếu chưa tồn tại, tạo mới theo cấu trúc mẫu ở Bước 4: bảng task lấy từ danh sách task trong `docs/agent/<scope>/PLAN.md` với trạng thái TODO (nếu không có PLAN.md thì để bảng trống).
Bước 2 — Tổng hợp phiên làm việc hiện tại

Thu thập thông tin từ conversation hiện tại. Chỉ ghi những gì thực sự đã xảy ra, không suy đoán:

Ngày làm việc và task ID đã làm (nếu có)
Các task đã hoàn thành (checklist) và các task còn dở
Các thay đổi file đã thực hiện
Các module mới đã tạo
Kết quả các lệnh kiểm tra đã chạy thật: npm run check, npm run build, npm test (hoặc "chưa chạy" / "chưa có script")
Kết quả /review nếu đã chạy (còn ❌ Blocker hay không)
Giả định [OPEN Dx] đã dùng, kèm nơi đặt (config hoặc flag)
Phát hiện ngoài phạm vi (lỗi hoặc việc cần làm không thuộc task, không được tự sửa)
Ghi chú đặc biệt (gotchas, bugs, decisions)
Việc dở dang và bước tiếp theo

Không ghi secret, token, mật khẩu, connection string hay dữ liệu cá nhân của người dùng vào bất kỳ file nào.

Bước 3 — Cập nhật memory.md

Cấu trúc mẫu khi tạo mới:

markdown

# Agent Memory

## Modules đã hoàn thiện

| Module | Trạng thái | Ghi chú |
| ------ | ---------- | ------- |

## Task đã hoàn thiện ở phiên làm việc trước

Thêm một section mới vào cuối phần "Task đã hoàn thiện ở phiên làm việc trước" với format:

markdown

### [YYYY-MM-DD] — [Mô tả ngắn phiên làm việc]

**Task:** `<scope>/Txx` (hoặc "ngoài PLAN")

**Thực hiện:**

- [x] Task 1 đã hoàn thành
- [x] Task 2 đã hoàn thành
- [ ] Task 3 chưa hoàn thành (nếu có)

**Files đã thay đổi:**

- `src/modules/<domain>/<file>.ts` — [mô tả thay đổi]

**Kiểm tra đã chạy:**

- `npm run check`: ✅ / ❌ / chưa chạy
- `npm run build`: ✅ / ❌ / chưa chạy
- `npm test`: ✅ / ❌ / chưa có script

**Giả định `[OPEN]` đã dùng:**

- [Dx — giá trị — đặt ở config/flag nào] (hoặc "Không có")

**Ghi chú:**

- [Bất kỳ ghi chú quan trọng nào]

**Dở dang / bước tiếp theo:**

- [Việc dở dang và nhánh git đang dùng] (hoặc "Không có")

Cập nhật bảng "Modules đã hoàn thiện" nếu có module mới được hoàn thành.

Giữ file gọn để /overview không phải đọc quá nhiều:

Phần "Task đã hoàn thiện ở phiên làm việc trước" chỉ giữ 5 phiên gần nhất.
Khi có hơn 5 phiên, chuyển (không xóa) các phiên cũ nhất sang .agents/memory/archive/memory-archive.md (tạo nếu chưa có, ghi nối vào cuối).
Không xóa nội dung nếu chưa chuyển sang archive.
Bước 4 — Cập nhật `docs/agent/<scope>/PROGRESS.md`

Cấu trúc mẫu khi tạo mới:

markdown

# Tiến độ task

> File này được cập nhật bởi `/remember` và được commit. Chỉ sửa dòng của task liên quan đến phiên làm việc, không định dạng lại cả file.

## Task

| ID   | Tên                      | Trạng thái | Phụ thuộc | PR / commit | Cập nhật |
| ---- | ------------------------ | ---------- | --------- | ----------- | -------- |
| T0.1 | Siết phân quyền Contract | TODO       | —         |             |          |

## Quyết định `[OPEN]`

| ID  | Quyết định       | Giá trị đang dùng  | Trạng thái | Ghi chú            |
| --- | ---------------- | ------------------ | ---------- | ------------------ |
| D1  | Mốc hủy miễn phí | 24h trước giờ slot | OPEN       | Mặc định, chờ chốt |

## Giả định đã dùng

| Task | Giả định | Đặt ở đâu (config / flag) |
| ---- | -------- | ------------------------- |

## Phát hiện thêm (ngoài phạm vi)

| #   | Mô tả | Phát hiện ở task | Trạng thái |
| --- | ----- | ---------------- | ---------- |

Quy tắc cập nhật:

Trạng thái task: TODO, IN_PROGRESS, BLOCKED, DONE.
Chỉ đặt DONE khi /review đã chạy, không còn ❌ Blocker và các lệnh bắt buộc đã chạy thật (npm run check, npm run build, npm test nếu có script). Nếu chưa đủ điều kiện, đặt IN_PROGRESS và ghi lý do ngắn vào cột "Cập nhật" (cùng với ngày).
BLOCKED khi phụ thuộc chưa xong hoặc [OPEN Dx] chưa có mặc định; ghi rõ lý do.
Task dở dang: ghi tên nhánh và bước tiếp theo vào cột "Cập nhật".
Cột "PR / commit": điền nếu người dùng đã cung cấp; nếu chưa có, để trống, không bịa.
Quyết định [OPEN]: cập nhật giá trị đang dùng khi phiên này dùng mặc định. Khi người dùng đã chốt thì đổi trạng thái thành CHỐT kèm giá trị cuối.
Giả định đã dùng và Phát hiện thêm: thêm dòng mới cho mỗi mục phát sinh trong phiên; không xóa dòng cũ, chỉ đổi trạng thái (OPEN / ĐÃ XỬ LÝ).
Xung đột: nếu trạng thái trong file khác với những gì phiên này biết (ví dụ người khác đã đổi), không ghi đè. Báo cho người dùng và hỏi.
Giữ nguyên thứ tự và cấu trúc bảng; chỉ sửa các dòng liên quan.
Bước 5 — Kiểm tra .gitignore

Đọc file .gitignore tại root project.

Nếu chưa có entry cho .agents/memory/, thêm vào:

# Agent memory (personal, do not commit)

.agents/memory/
Kiểm tra `docs/agent/` không bị ignore (bởi `docs/`, `docs/agent/` hay pattern tương tự). Nếu bị ignore, cảnh báo người dùng vì `docs/agent/<scope>/PROGRESS.md` cần được commit. Không tự xóa pattern của người dùng.
Bước 6 — Xác nhận

Thông báo cho người dùng:

✅ Memory đã được lưu vào .agents/memory/memory.md
✅ Tiến độ task đã cập nhật trong docs/agent/<scope>/PROGRESS.md
✅ .gitignore đã được kiểm tra
📝 Session [ngày] đã được ghi lại

⚠️ docs/agent/<scope>/PROGRESS.md cần được commit cùng thay đổi của task (skill này không tự commit).

Nếu có task chuyển sang DONE, BLOCKED, hoặc có phát hiện thêm mới, tóm tắt ngắn gọn ở cuối.

Lưu ý
Không xóa nội dung cũ trong memory.md; khi vượt 5 phiên thì chuyển sang archive, không xóa
Không bao giờ ghi đè PROGRESS.md toàn bộ; chỉ sửa các dòng liên quan
Không ghi DONE khi chưa review hoặc chưa chạy các lệnh bắt buộc
Không ghi secret hay dữ liệu cá nhân vào memory hay PROGRESS
Không tự git commit hay git push
Giữ nguyên cấu trúc file
Nếu session không có thay đổi đáng kể, vẫn ghi lại với note "Không có thay đổi"
