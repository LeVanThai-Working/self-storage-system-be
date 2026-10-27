# Tiến độ task — Phân hệ Quản lý Sự cố & Hư hỏng Kho bãi (`incident`)

> File này được cập nhật bởi `/remember` và được commit lên Git.
> Phản ánh trạng thái thực tế của các tasks thuộc phân hệ `incident`.

---

## Bảng Theo dõi Tiến độ Task

|    ID    | Tên Task                                                                           | Trạng thái  | Phụ thuộc | PR / Commit | Ghi chú & Phạm vi                                                                                                                                                                                                                                                                                        |
| :------: | :--------------------------------------------------------------------------------- | :---------: | :-------: | :---------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5A.1** | **Enums, Data Model & Migration (`Incident` & Embedded Subdocument `resolution`)** | ✅ **DONE** |     —     |             | 27/10/2026: Model `Incident`, enum phân loại, subdocument `resolution` nhúng trực tiếp, Partial Unique Index `incidentCode`, trường `investigationNotes`, `putUnitUnderMaintenance`, `requiresRelocation`.                                                                                               |
| **5A.2** | **Repository & Validation Schemas (`incident.repository` & schemas)**              | ✅ **DONE** |   5A.1    |             | 27/10/2026: Repository với query phân trang, lọc đa tiêu chí, atomic updates; Zod request & response schemas cho 8 endpoints.                                                                                                                                                                            |
| **5A.3** | **Service Logic, Phân quyền 2 Lớp & Điều phối FM -> Staff**                        | ✅ **DONE** |   5A.2    |             | 27/10/2026: Logic báo sự cố, FM phân công staff, staff khảo sát/sửa chữa, đồng bộ kho `UNDER_MAINTENANCE` $\leftrightarrow$ `AVAILABLE` trong `@Transactional()`, ghi Audit Log đầy đủ, tích hợp notification Socket.IO & email.                                                                         |
| **5A.4** | **Controller, RESTful Endpoints & TSOA Integration**                               | ✅ **DONE** |   5A.3    |             | 27/10/2026: 8 RESTful endpoints chuẩn tsoa, caller extraction helper, Swagger docs, ioc registration.                                                                                                                                                                                                    |
| **5A.5** | **Integration Tests & Verification**                                               | ✅ **DONE** |   5A.4    |             | 27/10/2026: Kịch bản kiểm thử toàn diện `scratch/test_incident_flow.ts`: vòng đời sự cố, phân quyền 2 lớp, cấn trừ tiền phạt `damageFee`, đồng bộ bảo trì kho, chặn hủy khi RESOLVED, Scoped Query Privacy Guard. **17/17 test cases PASS 100%**. `npm run check` & `npm run build` đạt chuẩn tuyệt đối. |

---

## Danh sách Quyết định Nghiệp vụ (`[OPEN Dx]`)

|    ID     | Vấn đề / Quyết định                                   | Giá trị đang áp dụng                                                                                                             | Trạng thái | Ghi chú                                                                    |
| :-------: | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :--------: | :------------------------------------------------------------------------- |
| **D5A.1** | Kiến trúc module                                      | Tách riêng module `src/modules/incident/` độc lập với `support`                                                                  |  **CHỐT**  | Giữ ranh giới rõ ràng giữa bảo trì vật lý và CSKH                          |
| **D5A.2** | Cơ chế tương tác & trao đổi                           | Không dùng chat realtime; dùng mô hình Request - One-off Resolution Note & Biên bản                                              |  **CHỐT**  | Tinh gọn, minh bạch, có bằng chứng ảnh đối chứng                           |
| **D5A.3** | Mô hình lưu trữ biên bản xử lý / bồi thường           | Nhúng Subdocument `resolution` trực tiếp vào `Incident` khi `RESOLVED`                                                           |  **CHỐT**  | Tận dụng điểm mạnh MongoDB, tối ưu hiệu năng, đảm bảo tính nguyên tử       |
| **D5A.4** | Đối tượng & Chuỗi phân cấp điều phối                  | Khách hàng mở sự cố -> Gửi thông báo tới FM cơ sở -> FM phân công Staff -> Staff khảo sát & sửa chữa -> Khách/FM nghiệm thu đóng |  **CHỐT**  | Việc bảo trì nội bộ kho trống của Staff dùng trực tiếp `toggleMaintenance` |
| **D5A.5** | Quy tắc đối với phòng đang có khách thuê (`OCCUPIED`) | Giữ nguyên trạng thái `OCCUPIED` của kho; chỉ chuyển `UNDER_MAINTENANCE` đối với kho trống (`AVAILABLE`)                         |  **CHỐT**  | Tránh vi phạm hợp đồng đang thuê của khách                                 |

---

## Phát hiện thêm ngoài phạm vi (Out of Scope Findings)

- Chưa có gì phát hiện thêm.
