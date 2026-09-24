---
name: analyze
description: >-
  Use this skill when the user types /analyze followed by a task description.
  Analyzes the task to identify required APIs, models, services, layers, shared
  resources, and libraries needed. Does NOT make any code changes — output only.
  Run this before /planning.
---

# Skill: /analyze

## Mục đích

Phân tích task được giao — xác định APIs cần thiết, services, thư viện, và các thành phần cần tạo hoặc thay đổi.
Chạy trước `/planning`. **Không thực hiện thay đổi code.**

---

## Hành vi

Khi người dùng gõ `/analyze [mô tả task]`, agent phải thực hiện tuần tự:

### Bước 1 — Đọc context

1. Đọc `.agents/rules/AGENTS.md` để nắm coding rules
2. Đọc `.agents/memory/memory.md` để biết trạng thái hiện tại
3. Đọc các file liên quan đến task (model, service, controller, schema hiện có)

### Bước 2 — Phân tích task

Xác định:

#### A. Entities / Models cần thiết

- Model nào cần tạo mới?
- Model nào cần cập nhật (thêm field)?
- Mongoose interface (`IXxx`) và schema cần gì?

#### B. APIs cần thiết

Với mỗi API:

- Method + path (ví dụ: `POST /profile/update`)
- Input: body / query / params schema (Zod)
- Output: response schema
- Authentication cần không? (`@Security`)
- Business rules đặc biệt?

#### C. Layers cần tạo/cập nhật

- [ ] Model (nếu có DB entity mới)
- [ ] Repository methods (Mongoose queries)
- [ ] Service methods (business logic)
- [ ] Controller methods (HTTP handlers)
- [ ] Route (Zod validation + tsoa decorators)
- [ ] Container (DI wiring)
- [ ] ioc.ts (nếu có controller mới)

#### D. Shared resources cần thêm

- `MESSAGE_CODE` mới nào cần thêm?
- Enum mới nào cần thêm?
- Utility mới nào cần tạo?

#### E. Dependencies / Thư viện

- Thư viện nào cần cài thêm? (`npm install`)
- Thư viện nào đã có sẵn?

#### F. Rủi ro và lưu ý

- Breaking changes?
- Migration cần thiết?
- Tác động đến module khác?

### Bước 3 — Xuất kết quả phân tích

```markdown
## 🔍 Phân tích Task: [Tên task]

### Entities cần thiết

- [Danh sách model]

### APIs cần implement

| Method | Path | Auth | Mô tả |
| ------ | ---- | ---- | ----- |
| POST   | /xxx | 🔒   | ...   |

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

### ⚠️ Lưu ý / Rủi ro

- [Danh sách]

---

✅ Phân tích hoàn tất. Chạy /planning để lên kế hoạch.
```

---

## Lưu ý

- Không thực hiện bất kỳ thay đổi code nào
- Nếu task không rõ ràng, hỏi người dùng trước khi phân tích
- Tham chiếu code hiện có để tránh duplicate
