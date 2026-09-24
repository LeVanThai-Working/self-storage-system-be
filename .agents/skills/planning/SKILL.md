---
name: planning
description: >-
  Use this skill when the user types /planning after running /analyze.
  Creates a detailed implementation plan with a phased checklist based on the
  analyze output. MUST wait for user confirmation before making any code changes.
  Blocks execution until the user approves the plan.
---

# Skill: /planning

## Mục đích

Dựa vào kết quả `/analyze` để lập kế hoạch chi tiết với checklist đầy đủ.
**Chờ xác nhận từ người dùng trước khi thực hiện bất kỳ thay đổi nào.**

---

## Hành vi

Khi người dùng gõ `/planning`, agent phải thực hiện tuần tự:

### Bước 1 — Tổng hợp từ analyze

Dựa vào kết quả phân tích từ `/analyze` (hoặc phân tích lại nếu chưa có).

### Bước 2 — Lập kế hoạch chi tiết

Tạo plan theo đúng thứ tự triển khai trong `AGENTS.md` section 15:

```markdown
## 📋 Kế hoạch: [Tên task]

### Tổng quan

- Module: `src/modules/<domain>/`
- Ước tính files cần tạo/sửa: N files
- Breaking changes: Có / Không

### Checklist thực hiện

#### Phase 1 — Data Layer

- [ ] Tạo/cập nhật Mongoose interface + schema (`<domain>.model.ts`)
- [ ] Tạo/cập nhật repository methods (`<domain>.repository.ts`)

#### Phase 2 — Business Logic

- [ ] Thêm MESSAGE_CODE mới (nếu cần) vào `messageCode.const.ts`
- [ ] Tạo/cập nhật service methods (`<domain>.service.ts`)

#### Phase 3 — API Layer

- [ ] Tạo/cập nhật Zod request schemas (`schemas/<domain>.request.schema.ts`)
- [ ] Tạo/cập nhật response schemas (`schemas/<domain>.response.schema.ts`)
- [ ] Tạo/cập nhật controller methods (`<domain>.controller.ts`)

#### Phase 4 — Wiring

- [ ] Cập nhật container (`<domain>.container.ts`)
- [ ] Cập nhật `ioc.ts` (nếu có controller mới)

#### Phase 5 — Verification

- [ ] Chạy `npm run typecheck`
- [ ] Chạy `npm run lint`
- [ ] Chạy `npm run build` (regenerate tsoa routes)
- [ ] Chạy `/review` để kiểm tra kết quả

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
```

### Bước 3 — Hỏi xác nhận

**BẮT BUỘC** xuất câu hỏi sau và **dừng lại chờ người dùng phản hồi**:

```
---
⚠️ **Đây là kế hoạch — chưa có thay đổi nào được thực hiện.**

Bạn có muốn:
A) ✅ Xác nhận và thực hiện kế hoạch này
B) ✏️ Điều chỉnh kế hoạch (nêu phần cần thay đổi)
C) ❌ Hủy

Vui lòng phản hồi trước khi tôi bắt đầu implement.
```

### Bước 4 — Thực hiện (sau khi được xác nhận)

Chỉ bắt đầu implement khi người dùng xác nhận (A hoặc sau khi điều chỉnh từ B).
Thực hiện tuần tự theo checklist, đánh dấu [x] sau mỗi bước hoàn thành.

---

## Lưu ý

- **Không bao giờ** bỏ qua bước xác nhận
- Nếu người dùng yêu cầu thay đổi kế hoạch, cập nhật plan và hỏi xác nhận lại
- Theo đúng thứ tự Phase 1 → 2 → 3 → 4 → 5
- Sau mỗi Phase, báo cáo ngắn gọn cho người dùng
