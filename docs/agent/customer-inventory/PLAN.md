# Kế hoạch Nghiệp vụ & Task cho Agent: Phân hệ Quản lý Kệ kho & Tồn kho Hàng hóa Tự quản (`customer-inventory`)

> Tổng hợp từ kiến trúc khoang chứa lớn (`WAREHOUSE_RACK`), danh mục mã hàng SKU khách hàng, vận hành tồn kho và sổ cái biến động. Cập nhật ngày 20/10/2026.

---

## 1. Mục tiêu & Ranh giới Phân hệ (Scope Boundaries)

Phân hệ `customer-inventory` chịu trách nhiệm toàn bộ vòng đời lưu trữ hàng hóa của khách hàng bên trong các khoang tự quản:

1. **Hạ tầng Kệ & Tầng (`storageRack` & `rackTier`):** Cấu hình `defaultRackConfig` ở loại kho `WAREHOUSE_RACK`, cơ chế tự động sinh kệ tầng, cascade xóa mềm và phục hồi theo phòng kho.
2. **Danh mục Mã hàng Cá nhân (`customerSku`):** Quản lý SKU riêng biệt cho từng khách hàng, barcode, UOM, thể tích, cơ chế chống trùng lặp theo phạm vi khách hàng (`Scoped Uniqueness`) và bảo vệ chống xóa SKU còn hàng.
3. **Vận hành Tồn kho & Sổ cái Bất biến (`customerInventory` & `inventoryMovement`):** Luồng Nhập/Xuất/Chuyển/Kiểm kê hàng hóa nguyên tử trong `@Transactional()`, đảm bảo tính toàn vẹn giữa số lượng tồn và trạng thái tầng kệ `AVAILABLE` $\leftrightarrow$ `OCCUPIED`. Hỗ trợ cả hàng để sàn (`rackTierId: null`) cho phòng không kệ hoặc hàng cồng kềnh.
4. **Truy vấn & Sơ đồ Cây Khoang chứa (Task 6D):** Cung cấp các API trực quan hóa cây vị trí `Unit -> Rack -> Tier -> SKU`, tra cứu vị trí SKU theo mã hoặc barcode, và bảng tổng hợp tồn kho cá nhân.
5. **Khắc phục phản hồi Frontend (`BUGFIX-FE-01`):** Hỗ trợ `null` cho `rackTierId` trong các API thay đổi tồn kho, thêm `customerId/userId` cho API summary của Ops/Admin, bổ sung trường mã cơ sở `Facility.code` và nhúng `facility` vào response cây khoang chứa.

---

## 2. Quy tắc Làm việc cho Agent trong Scope này

1. **Bảo mật Quyền riêng tư Tuyệt đối (Self-Storage Privacy):**
   - Hàng hóa trong kho là tài sản riêng tư của khách hàng.
   - Nhân viên chi nhánh (`FACILITY_STAFF`) bị **chặn 100%** không được xem danh mục hàng hóa hay thao tác xuất nhập chuyển hàng của khách (`403 Access Denied`).
   - Quản lý chi nhánh (`FACILITY_MANAGER`) chỉ được xem danh mục hàng hóa hoặc cấu trúc kho của những khách hàng đang thuê tại chi nhánh mình phụ trách.
2. **Ràng buộc Hợp đồng (`Contract Status Guard`):**
   - Chỉ cho phép các thao tác thay đổi tồn kho (`IN`, `OUT`, `MOVE`, `ADJUST`) khi Hợp đồng thuê kho đang ở trạng thái `ACTIVE`.
3. **Transaction & Đồng thời (Rule 20):**
   - Mọi thao tác xuất nhập chuyển kiểm kê đều phải chạy trong `@Transactional()`, truyền `session` xuống các repository calls.
   - Không được "đọc rồi mới ghi" khi cập nhật số lượng tồn kho (sử dụng `$inc` hoặc conditional updates).
4. **Kiểm thử chất lượng:**
   - Mỗi task phải có bộ integration test hoặc script kiểm thử độc lập trong `scratch/` kiểm tra đủ ca hợp lệ (positive) và ca bị chặn (negative / access denied).

---

## 3. Backlog Tasks theo Thứ tự Triển khai

### Task 6A: Hạ tầng Kệ kho & Tự động sinh Kệ tầng (`storageRack` & `rackTier`) — [DONE ✅]

- **Mục tiêu:** Xây dựng models `StorageRack`, `RackTier`, cấu hình `defaultRackConfig` ở `UnitType`, auto-provisioning khi tạo phòng `WAREHOUSE_RACK`.
- **Hoàn thành:** 14/10/2026. Integration test 10/10 PASS.

### Task 6B: Quản lý Danh mục Mã hàng Khách hàng (`customerSku`) — [DONE ✅]

- **Mục tiêu:** CRUD danh mục SKU của khách, scoped uniqueness per customer, tính volume, chặn trùng barcode, bảo vệ không xóa SKU còn hàng (Rule 613).
- **Hoàn thành:** 15/10/2026. Integration test 10/10 PASS.

### Task 6C: Tồn kho Kệ tầng & Vận hành Nhập/Xuất/Chuyển (`customerInventory` & `inventoryMovement`) — [DONE ✅]

- **Mục tiêu:** Mô hình `CustomerInventory` và sổ cái `InventoryMovement` (`MOV-YYYYMMDD-XXXXXX`), 4 luồng `IN`, `OUT`, `MOVE`, `ADJUST` trong transaction, đồng bộ state machine tầng kệ `AVAILABLE` $\leftrightarrow$ `OCCUPIED`.
- **Hoàn thành:** 16/10/2026. Integration test 10/10 PASS.

---

### Task 6D: Truy vấn & Sơ đồ Cây Tồn kho Khoang chứa — [COMPLETED ✅]

- **Hoàn thành:** 19/10/2026. Integration test 8/8 PASS. Review đạt chuẩn.

#### 1. Sơ đồ Cây Khoang chứa Đa tầng (`GET /customer-inventories/unit/{storageUnitId}/tree`)

- **Mô tả:** Trả về cấu trúc cây đầy đủ của phòng kho:
  - Thông tin cơ sở (`facility`): id, code, name, city, address.
  - Thông tin phòng kho (`storageUnit`): unitNumber, floor, zone, status.
  - Hợp đồng đang hiệu lực (`contractCode`, khách hàng thuê).
  - Tóm tắt tổng quan: `totalRacks`, `totalTiers`, `occupiedTiers`, `availableTiers`, `totalSkus`, `totalQuantity`.
  - Danh sách Kệ (`racks`) và Tầng (`tiers`) kèm danh sách mặt hàng SKU.
  - Danh sách hàng để sàn (`unrackedItems`): Các mặt hàng được xếp trực tiếp trong phòng kho mà không để trên tầng kệ (`rackTierId: null`).
- **Phân quyền:** Khách hàng thuê phòng xem được phòng mình; FM xem được phòng thuộc cơ sở mình; Ops/Admin xem toàn bộ. Staff bị chặn `403`.

#### 2. Tra cứu Vị trí Lưu trữ của SKU (`GET /customer-inventories/sku/{skuId}/locations`)

- **Mô tả:** Tìm kiếm toàn bộ các vị trí (cơ sở, phòng kho, kệ, tầng, số lượng) mà SKU này đang hiện diện.
- **Phân quyền:** Khách hàng chỉ xem được vị trí SKU của mình; FM xem được SKU của khách thuê tại cơ sở mình.

#### 3. Quét Barcode Tra cứu Vị trí Tồn kho (`GET /customer-inventories/barcode/{barcode}/locations`)

- **Mô tả:** Tra cứu nhanh vị trí tồn kho thông qua quét mã vạch sản phẩm barcode.

#### 4. Bảng Thống kê Tồn kho Khách hàng (`GET /customer-inventories/summary`)

- **Mô tả:** Dashboard thống kê nhanh: Tổng số SKU, tổng số lượng hàng trong kho, số hợp đồng active, số phòng đang thuê, phân loại theo ngành hàng (`categoryBreakdown`), và 5 giao dịch biến động gần nhất.

#### 5. Mở rộng Bộ lọc Sổ cái Biến động theo Tầng kệ (`rackTierId`)

- **Mô tả:** Mở rộng `inventoryMovementQuerySchema` và `InventoryMovementRepository.findPaginated` hỗ trợ lọc theo `rackTierId`.

---

### Task BUGFIX-FE-01: Khắc phục Feedback Frontend & Bổ sung Mã Cơ sở — [READY 🚀]

- **Vấn đề 1:** Khắc phục lỗi `MESSAGE_CODE_101` khi FE gửi `rackTierId: null` trong các API `in`, `out`, `move`, `adjust`. Định nghĩa explicit TypeScript interfaces cho body params để TSOA sinh đúng union `string | null`.
- **Vấn đề 2:** Mở rộng `GET /customer-inventories/summary` nhận query param `customerId?: string` (alias `userId?: string`), cho phép Ops/Admin tra cứu dashboard tồn kho của khách hàng chỉ định trên Backoffice CMS.
- **Vấn đề 3:** Bổ sung trường `code` vào `Facility` model & schemas (Admin tự điền, in hoa, unique). Nhúng object `facility` vào response của API `GET /unit/{storageUnitId}/tree` để FE hiển thị nhãn vị trí phân cấp dạng `HN01-A101-R2-T1`.

---

## 4. Ma trận Quyền chi tiết theo Endpoints

| Endpoint                                                   |         CUSTOMER          |  FACILITY_STAFF  |        FACILITY_MANAGER         | OPS_MANAGER / SYSTEM_ADMIN |
| :--------------------------------------------------------- | :-----------------------: | :--------------: | :-----------------------------: | :------------------------: |
| `GET /customer-inventories/unit/{storageUnitId}/tree`      | ✅ (Chỉ phòng mình thuê)  | ❌ 403 Forbidden | 👁️ (Chỉ phòng thuộc cơ sở mình) |       ✅ Toàn quyền        |
| `GET /customer-inventories/sku/{skuId}/locations`          |   ✅ (Chỉ SKU của mình)   | ❌ 403 Forbidden |   👁️ (Khách thuộc cơ sở mình)   |       ✅ Toàn quyền        |
| `GET /customer-inventories/barcode/{barcode}/locations`    |   ✅ (Chỉ SKU của mình)   | ❌ 403 Forbidden |   👁️ (Khách thuộc cơ sở mình)   |       ✅ Toàn quyền        |
| `GET /customer-inventories/summary`                        | ✅ (Chỉ dữ liệu của mình) | ❌ 403 Forbidden |        ❌ 403 Forbidden         |  ✅ Xem theo `customerId`  |
| `GET /customer-inventories/movements` _(kèm `rackTierId`)_ | ✅ (Chỉ dữ liệu của mình) | ❌ 403 Forbidden |   👁️ (Khách thuộc cơ sở mình)   |       ✅ Toàn quyền        |

---

## 5. Definition of Done (DoD) cho Task 6D

- [x] Zod Schemas hoàn thiện: `storageUnitTreeResponseSchema`, `skuLocationsResponseSchema`, `customerInventorySummaryResponseSchema`.
- [x] Mở rộng `inventoryMovementQuerySchema` với `rackTierId`.
- [x] Data access methods tối ưu trong `CustomerInventoryRepository` (dựng cây $O(N)$ in-memory, không query N+1).
- [x] Service logic kiểm tra đầy đủ quyền riêng tư: Customer chỉ xem kho/hàng của mình; FM chỉ xem phòng thuộc chi nhánh của mình; Staff bị chặn.
- [x] REST Controller với tsoa decorators, note role và ẩn `@Security` theo Rule 14.
- [x] Bộ integration test tự động `scratch/test_inventory_tree_and_locations_api.ts` đạt 100% PASS (8/8) cho cả ca hợp lệ và ca bị chặn phân quyền.
- [x] Chạy `npm run check` (typecheck + lint + prettier) và `npm run build` PASS 100%.
- [x] Cập nhật tiến độ vào `docs/agent/customer-inventory/PROGRESS.md`.
