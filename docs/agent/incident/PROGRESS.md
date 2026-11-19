# Tiến độ task — Phân hệ Quản lý Sự cố & Hư hỏng Kho bãi (`incident`)

> File này được cập nhật bởi `/remember` và được commit lên Git.
> Phản ánh trạng thái thực tế của các tasks thuộc phân hệ `incident`.

---

## Bảng Theo dõi Tiến độ Task

|    ID    | Tên Task                                                                                | Trạng thái  | Phụ thuộc  | PR / Commit | Ghi chú & Phạm vi                                                                                                                                                                                                                                                                                                                                                               |
| :------: | :-------------------------------------------------------------------------------------- | :---------: | :--------: | :---------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **5A.1** | **Enums, Data Model & Migration (`Incident` & Embedded Subdocument `resolution`)**      | ✅ **DONE** |     —      |             | 27/10/2026: Model `Incident`, enum phân loại, subdocument `resolution` nhúng trực tiếp, Partial Unique Index `incidentCode`, trường `investigationNotes`, `putUnitUnderMaintenance`, `requiresRelocation`.                                                                                                                                                                      |
| **5A.2** | **Repository & Validation Schemas (`incident.repository` & schemas)**                   | ✅ **DONE** |    5A.1    |             | 27/10/2026: Repository với query phân trang, lọc đa tiêu chí, atomic updates; Zod request & response schemas cho 8 endpoints.                                                                                                                                                                                                                                                   |
| **5A.3** | **Service Logic, Phân quyền 2 Lớp & Điều phối FM -> Staff**                             | ✅ **DONE** |    5A.2    |             | 27/10/2026: Logic báo sự cố, FM phân công staff, staff khảo sát/sửa chữa, đồng bộ kho `UNDER_MAINTENANCE` $\leftrightarrow$ `AVAILABLE` trong `@Transactional()`, ghi Audit Log đầy đủ, tích hợp notification Socket.IO & email.                                                                                                                                                |
| **5A.4** | **Controller, RESTful Endpoints & TSOA Integration**                                    | ✅ **DONE** |    5A.3    |             | 27/10/2026: 8 RESTful endpoints chuẩn tsoa, caller extraction helper, Swagger docs, ioc registration.                                                                                                                                                                                                                                                                           |
| **5A.5** | **Integration Tests & Verification**                                                    | ✅ **DONE** |    5A.4    |             | 27/10/2026: Kịch bản kiểm thử toàn diện `scratch/test_incident_flow.ts`: vòng đời sự cố, phân quyền 2 lớp, cấn trừ tiền phạt `damageFee`, đồng bộ bảo trì kho, chặn hủy khi RESOLVED, Scoped Query Privacy Guard. **17/17 test cases PASS 100%**. `npm run check` & `npm run build` đạt chuẩn tuyệt đối.                                                                        |
|  **X5**  | **Đồng bộ `Incident.resolution.damageFee` ↔ `Contract.damageFee` & `checkOutContract`** | ✅ **DONE** | 5A.3, T1.5 |             | 27/10/2026: Bọc `@Transactional()` cho `closeIncident`, siết RBAC (chặn `FACILITY_STAFF` tự đóng sự cố, cho phép chủ HĐ `contract.customerId`), cộng dồn nguyên tử `damageFee` & `staffEvidenceImages` vào `Contract` khi `RESOLVED -> CLOSED`, chặn `checkOutContract` (`MESSAGE_CODE_421`) khi còn sự cố mở. **8/8 tests PASS** (`tests/incidentContractDamageSync.test.ts`). |

---

## Danh sách Quyết định Nghiệp vụ (`[OPEN Dx]`)

|    ID     | Vấn đề / Quyết định                                   | Giá trị đang áp dụng                                                                                                                                                                                     | Trạng thái | Ghi chú                                                                    |
| :-------: | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------: | :------------------------------------------------------------------------- |
| **D5A.1** | Kiến trúc module                                      | Tách riêng module `src/modules/incident/` độc lập với `support`                                                                                                                                          |  **CHỐT**  | Giữ ranh giới rõ ràng giữa bảo trì vật lý và CSKH                          |
| **D5A.2** | Cơ chế tương tác & trao đổi                           | Không dùng chat realtime; dùng mô hình Request - One-off Resolution Note & Biên bản                                                                                                                      |  **CHỐT**  | Tinh gọn, minh bạch, có bằng chứng ảnh đối chứng                           |
| **D5A.3** | Mô hình lưu trữ biên bản xử lý / bồi thường           | Nhúng Subdocument `resolution` trực tiếp vào `Incident` khi `RESOLVED`                                                                                                                                   |  **CHỐT**  | Tận dụng điểm mạnh MongoDB, tối ưu hiệu năng, đảm bảo tính nguyên tử       |
| **D5A.4** | Đối tượng & Chuỗi phân cấp điều phối                  | Khách hàng mở sự cố -> Gửi thông báo tới FM cơ sở -> FM phân công Staff -> Staff khảo sát & sửa chữa -> Khách/FM nghiệm thu đóng                                                                         |  **CHỐT**  | Việc bảo trì nội bộ kho trống của Staff dùng trực tiếp `toggleMaintenance` |
| **D5A.5** | Quy tắc đối với phòng đang có khách thuê (`OCCUPIED`) | Giữ nguyên trạng thái `OCCUPIED` của kho; chỉ chuyển `UNDER_MAINTENANCE` đối với kho trống (`AVAILABLE`)                                                                                                 |  **CHỐT**  | Tránh vi phạm hợp đồng đang thuê của khách                                 |
| **D5A.6** | Thời điểm đồng bộ `damageFee` sang `Contract` (`Q3`)  | Cộng dồn `resolution.damageFee` & `staffEvidenceImages` vào `Contract` khi `Incident` chuyển sang `CLOSED` (`liableParty = CUSTOMER`, `damageFee > 0`); chặn `checkOutContract` (`421`) khi còn sự cố mở |  **CHỐT**  | Đã triển khai và kiểm chứng ở task `X5`                                    |

---

## Phát hiện thêm ngoài phạm vi (Out of Scope Findings)

### Đồng bộ FE và nghiệm thu — 19/11/2026

- Danh sách khách dùng phạm vi `reporterId = caller` **hoặc** hợp đồng thuộc khách; phạm vi này được AND với tìm kiếm/bộ lọc trước khi phân trang. Không thay đổi API public.
- Thông báo sơ tán và biên bản gửi chủ hợp đồng, fallback người báo nếu là khách; thông báo khách xác nhận gửi quản lý cùng cơ sở và nhân viên phụ trách, sau transaction commit.
- FE bổ sung kiểm đếm/sơ tán, upload PDF/ảnh có chữ ký, xác nhận riêng trên mobile, đóng từ `IN_PROGRESS` cho relocation và giữ bồi thường cơ sở. Module hợp đồng vẫn xử lý đổi kệ/thanh lý.
- Test hồi quy mới đã tái hiện lỗi danh sách và sai người nhận trước khi sửa. Ba bộ test incident enhancement, addendum/settlement và contract damage sync: **36/36 pass** trên MongoDB memory replica set. `tsc --noEmit` và build BE pass.
- `npm run check` toàn BE: **767/767 test pass**, typecheck/lint/format pass. Sau bổ sung tên người upload/xác nhận, chạy lại incident enhancement: **13/13 pass**. FE: **64 test pass**, type-check web/mobile và lint phần thay đổi pass.
- Không migration; triển khai BE/FE đồng bộ. Xem hướng dẫn kiểm thử FE tại `self-storage-system-fe/docs/incident-workflow.md`.
- Giới hạn: sơ tán chỉ nhận `skuId`, chưa phân biệt nhiều vị trí cùng SKU; FE chặn trường hợp này để tránh sai kiểm đếm. Audit tài chính cũ vẫn best-effort; chưa bổ sung outbox hay thay đổi quy tắc quyết toán. Kiểm thử UI với tài khoản local và upload thực tế chưa được thực hiện trong phiên này.

- `IncidentService.resolveIncident` (`src/modules/incident/incident.service.ts` dòng 528–544) mở lại kho `UNDER_MAINTENANCE -> AVAILABLE` chưa kiểm tra `countRemainingByStorageUnit === 0` (guard `MESSAGE_CODE_629` của `X1`).
