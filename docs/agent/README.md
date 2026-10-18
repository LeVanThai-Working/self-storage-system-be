# Tài liệu Kế hoạch & Tiến độ cho AI Agent (`docs/agent/`)

Thư mục này được chia theo **phân hệ nghiệp vụ (`<scope>`)** để các thành viên trong nhóm có thể cùng sử dụng bộ skill `.agents/skills/` và commit tiến độ lên Git mà không bị xung đột (`merge conflict`).

## Cấu trúc thư mục

```text
docs/agent/
  README.md
  booking/                        ← Phân hệ Đặt chỗ, Hợp đồng, Phụ lục, Thanh toán (Reservation, Contract, Payment)
    PLAN.md                       ← Kế hoạch task, quyết định [OPEN Dx], ma trận quyền
    PROGRESS.md                   ← Bảng theo dõi tiến độ theo task ID (cập nhật bởi /remember)
    business-rules-current.md     ← Mô tả hành vi nghiệp vụ hiện trạng
  <ten-phan-he-khac>/             ← Đồng đội tạo thư mục mới cho phân hệ mình phụ trách (vd: warehouse/, billing/, ...)
    PLAN.md
    PROGRESS.md
    business-rules-current.md     ← (tùy chọn)
```

## Quy ước cho các thành viên trong nhóm

1. **Khi thêm phân hệ mới:** Tạo thư mục `docs/agent/<scope>/` (ví dụ `docs/agent/warehouse/`, `docs/agent/billing/`).
2. **Đặt mã Task ID:** Khuyến nghị dùng tiền tố riêng hoặc gọi kèm tên scope khi dùng lệnh skill để không trùng lặp:
   - Gọi trực tiếp nếu mã task là duy nhất: `/analyze T0.1`
   - Hoặc chỉ định rõ scope: `/analyze booking/T0.1`, `/analyze warehouse/W1.1`
3. **Cách các skill hoạt động:**
   - `/overview`: Tự động quét tất cả các thư mục `docs/agent/<scope>/` và hiển thị chi tiết tiến độ của mọi phân hệ.
   - `/analyze` & `/planning` & `/review`: Tự động tìm task trong `docs/agent/<scope>/PLAN.md` và `PROGRESS.md` tương ứng.
   - `/remember`: Chỉ cập nhật đúng file `docs/agent/<scope>/PROGRESS.md` của phân hệ vừa làm việc (cùng `.agents/memory/memory.md` cá nhân được gitignore).
