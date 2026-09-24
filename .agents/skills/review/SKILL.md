---
name: review
description: >-
  Use this skill when the user types /review after completing an implementation.
  Verifies all changed files against AGENTS.md coding rules, runs npm quality
  checks (typecheck, lint, build), and reports results as a checklist.
  Suggests fixes for any issues found. Recommend running /remember afterward.
---

# Skill: /review

## Mục đích

Kiểm tra lại tất cả những gì vừa được thực hiện, đảm bảo đúng coding rules và báo cáo kết quả bằng checklist.
Chạy sau khi hoàn thành implementation.

---

## Hành vi

Khi người dùng gõ `/review`, agent phải thực hiện tuần tự:

### Bước 1 — Đọc kế hoạch đã thực hiện

Xem lại plan từ `/planning` và danh sách files đã được tạo/sửa trong phiên này.

### Bước 2 — Kiểm tra từng file đã thay đổi

Với mỗi file được tạo/sửa, kiểm tra theo AGENTS.md:

#### Checklist Cấu trúc

- [ ] File đặt đúng vị trí (`src/modules/<domain>/`)
- [ ] File name theo convention (`<domain>.<role>.ts`)

#### Checklist TypeScript

- [ ] Không có `any` trong code mới
- [ ] `import type` được dùng cho type-only imports
- [ ] Sử dụng `.ts` extension trong relative imports
- [ ] Request types được infer từ Zod schema

#### Checklist Controller

- [ ] Không có business logic trong controller
- [ ] Không có Mongoose query trong controller
- [ ] Dùng `@Middlewares(validateRequest({...}))` cho validation
- [ ] Return đúng format `ApiResponse<T>`
- [ ] Dùng đúng `MESSAGE_CODE` constant

#### Checklist Service

- [ ] Dependencies nhận qua constructor
- [ ] Dùng `AppError` cho expected errors
- [ ] Không access Mongoose model trực tiếp
- [ ] Dùng `validateResponse` cho output quan trọng

#### Checklist Repository

- [ ] Chỉ chứa Mongoose queries
- [ ] Không có business logic
- [ ] Nhận model qua constructor

#### Checklist Container

- [ ] Dependencies được wire đúng thứ tự
- [ ] Export controller để dùng trong ioc.ts

#### Checklist Validation

- [ ] Zod schema đầy đủ cho body/query/params
- [ ] Schema định nghĩa trong `schemas/<domain>.request.schema.ts`
- [ ] Types được export từ schema file

#### Checklist Error Handling

- [ ] Dùng `MESSAGE_CODE` (không dùng literal string)
- [ ] `AppError` được throw với đúng status code
- [ ] Không swallow errors

### Bước 3 — Chạy quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

Báo cáo kết quả:

- ✅ Passed
- ❌ Failed (kèm lỗi cụ thể)

### Bước 4 — Xuất báo cáo

```markdown
## ✅ Review Report — [Tên task] — [Ngày]

### Files đã review

| File                     | Status     | Ghi chú |
| ------------------------ | ---------- | ------- |
| `src/modules/xxx/xxx.ts` | ✅ OK      |         |
| `src/modules/xxx/xxx.ts` | ⚠️ Warning | [mô tả] |
| `src/modules/xxx/xxx.ts` | ❌ Issue   | [mô tả] |

### Quality Checks

- [x] `npm run typecheck` — ✅ Passed
- [x] `npm run lint` — ✅ Passed
- [x] `npm run build` — ✅ Passed

### Issues tìm thấy

- [Danh sách issues nếu có]

### Kết luận

✅ Implementation đạt chuẩn / ❌ Cần sửa [N] issues

---

💡 Chạy /remember để lưu lại phiên làm việc này.
```

### Bước 5 — Fix issues (nếu có)

Nếu có issues, tự động fix theo coding rules và review lại.
Báo cáo những gì đã được fix.

---

## Lưu ý

- Luôn chạy `npm run build` để regenerate tsoa routes sau khi thay đổi controller
- Nếu `npm run typecheck` fail, fix trước khi kết luận review
- Đề xuất `/remember` sau khi review thành công
