# Tiến độ task — Phân hệ Quản lý Kệ kho & Tồn kho Hàng hóa Tự quản (`customer-inventory`)

> File này được cập nhật bởi `/remember` và được commit lên Git.
> Phản ánh trạng thái thực tế của các tasks thuộc phân hệ `customer-inventory`.

---

## Bảng Theo dõi Tiến độ Task

|     ID     | Tên Task                                                                       | Trạng thái  | Phụ thuộc |         PR / Commit         | Ghi chú & Phạm vi                                                                                                                                                                                                                                                                                |
| :--------: | :----------------------------------------------------------------------------- | :---------: | :-------: | :-------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   **6A**   | **Hạ tầng Kệ kho & Tự động sinh Kệ (StorageRack & RackTier)**                  | ✅ **DONE** |     —     |    `feature/storageRack`    | Model `StorageRack`, `RackTier`, cấu hình `defaultRackConfig` ở `UnitType`, auto-provisioning kệ tầng khi tạo `StorageUnit`, cascade soft-delete & restore, integration test 10/10 PASS                                                                                                          |
|   **6B**   | **Quản lý Danh mục Mã hàng Khách hàng (CustomerSku)**                          | ✅ **DONE** |    6A     |    `feature/customerSku`    | CRUD danh mục SKU của khách (`CustomerSku`), mã barcode, uom, tự động tính volume, scoped uniqueness per customer, bảo vệ không xóa SKU còn tồn kho (Rule 613), chặn Staff truy cập, integration test 10/10 PASS                                                                                 |
|   **6C**   | **Tồn kho Kệ tầng & Vận hành Nhập/Xuất/Chuyển (CustomerInventory & Movement)** | ✅ **DONE** |    6B     | `feature/customerInventory` | Quản lý số lượng tồn (`CustomerInventory`), luồng IN/OUT/MOVE/ADJUST nguyên tử trong `@Transactional()`, kiểm tra Contract ACTIVE, bảo vệ quyền riêng tư Self-Storage (Staff/FM bị chặn), đồng bộ State Machine RackTier (`AVAILABLE` $\leftrightarrow$ `OCCUPIED`), integration test 10/10 PASS |
|   **6D**   | **Truy vấn & Sơ đồ Cây Tồn kho Khoang chứa**                                   | ✅ **DONE** |    6C     | `feature/customerInventory` | 19/10/2026: API sơ đồ cây đa tầng `Unit -> Rack -> Tier -> SKU`, tra cứu vị trí SKU theo ID/barcode, dashboard tổng quan cá nhân, filter sổ cái `rackTierId`, siết quyền FM (Rule 14), integration tests 100% PASS, /review đạt chuẩn                                                            |
| **FE-FIX** | **Khắc phục Feedback Frontend & Bổ sung Mã Cơ sở (Facility Code)**             | ✅ **DONE** |    6D     | `feature/customerInventory` | Đã xử lý 100%: nhận null cho rackTierId trong In/Out/Move/Adjust, thêm customerId/userId cho summary của Ops/Admin, trường Facility.code tự điền + unique check + migration 21 cơ sở, nhúng facility vào response sơ đồ cây, integration tests 19/19 PASS                                        |

---

## Danh sách Quyết định Nghiệp vụ (`[OPEN Dx]`)

|    ID    | Vấn đề / Quyết định                                                    | Giá trị đang áp dụng                                                                                                       | Trạng thái | Ghi chú                                                                                        |
| :------: | :--------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :--------: | :--------------------------------------------------------------------------------------------- |
| **D6.1** | Quyền xem chi tiết hàng hóa của Quản lý chi nhánh (`FACILITY_MANAGER`) | Chỉ được xem danh mục SKU và vị trí tồn kho của những khách hàng đang có hợp đồng thuê tại chi nhánh mình quản lý          |  **CHỐT**  | Bảo vệ quyền riêng tư Self-Storage                                                             |
| **D6.2** | Cho phép lưu hàng để sàn trong phòng kho (`rackTierId: null`)          | Có hỗ trợ, đưa vào mục `unrackedItems` trong sơ đồ cây                                                                     |  **CHỐT**  | Phù hợp với hàng cồng kềnh, kiện hàng pallet lớn để trực tiếp dưới sàn phòng hoặc kho không kệ |
| **D6.3** | Ngưỡng cảnh báo tải trọng tầng kệ (`maxWeightKg`)                      | Cảnh báo mềm ở tầng giao diện / response, không chặn cứng thao tác nhập hàng thủ công trừ khi có yêu cầu cân hàng bắt buộc |  **CHỐT**  | Khách hàng tự đóng thùng và chịu trách nhiệm sắp xếp                                           |
| **D6.4** | Quy tắc đặt mã cơ sở kho (`Facility.code`)                             | Admin tự điền khi tạo/sửa cơ sở, in hoa, không trùng lặp toàn hệ thống (`unique: true`, vd: `HN01`, `SGN01`)               |  **CHỐT**  | Ghép thành chuỗi vị trí phân cấp `HN01-A101-R2-T1`                                             |

---

## Phát hiện thêm ngoài phạm vi (Out of Scope Findings)

- Chưa có gì phát hiện thêm.
