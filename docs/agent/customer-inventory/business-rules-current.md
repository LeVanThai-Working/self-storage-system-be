# business-rules-current.md — Phân hệ Quản lý Kệ kho & Tồn kho Hàng hóa Tự quản (Self-Storage Inventory)

> Mô tả nghiệp vụ do hệ thống ghi nhận. Nếu có điểm khác biệt với code thực tế, code là nguồn sự thật (Single Source of Truth).
>
> 💡 **Hướng dẫn Tích hợp Frontend:** Xem toàn bộ luồng chọn loại kho, render sơ đồ trực quan và thêm SKU vào từng ngăn kệ tại [FE_INTEGRATION_FLOW.md](file:///c:/NgocTuyen/selfStorageManagementSystem/self-storage-system-be/docs/agent/customer-inventory/FE_INTEGRATION_FLOW.md).

---

## I. Danh mục Thực thể & Trạng thái trong Vòng đời

### 1. Kệ kho (`StorageRack`) & Tầng kệ (`RackTier`)

- **Trạng thái Kệ (`RackStatusEnum`):**
  - `ACTIVE`: Kệ đang hoạt động bình thường, sẵn sàng lưu trữ hàng hóa.
  - `INACTIVE`: Kệ tạm ngưng sử dụng (do sắp xếp lại mặt bằng kho hoặc sửa chữa).
  - `MAINTENANCE`: Kệ đang được bảo trì, gia cố kỹ thuật hoặc kiểm định an toàn chịu lực.
- **Trạng thái Tầng kệ (`RackTierStatusEnum`):**
  - `AVAILABLE`: Tầng kệ trống hoàn toàn (tổng số lượng tồn kho của mọi SKU trên tầng $= 0$).
  - `OCCUPIED`: Tầng kệ đang chứa hàng hóa của khách hàng (tổng số lượng tồn $> 0$).
  - `MAINTENANCE`: Tầng kệ đang bảo trì, hư hỏng hoặc quá tải.
  - `INACTIVE`: Tầng kệ tạm ngưng sử dụng.

### 2. Danh mục Mã hàng Khách hàng (`CustomerSku`)

- **Trạng thái SKU (`CustomerSkuStatusEnum`):**
  - `ACTIVE`: Mặt hàng đang hoạt động, cho phép khách hàng thực hiện các giao dịch nhập/xuất/chuyển vị trí.
  - `INACTIVE`: Mặt hàng tạm ngưng giao dịch (khách hàng có thể ẩn đi khi không còn kinh doanh hoặc không còn lưu trữ mặt hàng này).

### 3. Sổ cái Biến động Tồn kho (`InventoryMovement`)

- **Loại biến động (`MovementTypeEnum`):**
  - `IN` (Nhập hàng): Đưa hàng mới hoặc hàng bổ sung vào phòng kho / tầng kệ.
  - `OUT` (Xuất hàng): Lấy hàng ra khỏi phòng kho / tầng kệ mang về sử dụng hoặc giao cho đối tác.
  - `MOVE` (Chuyển vị trí): Dời hàng từ tầng kệ này sang tầng kệ khác trong cùng phòng kho mà không thay đổi tổng số lượng tồn của khách.
  - `ADJUST` (Điều chỉnh kiểm kê): Cân bằng lại số lượng tồn thực tế sau khi khách hàng tự kiểm đếm hàng trong kho (bắt buộc nhập lý do chênh lệch).

---

## II. Phân loại Phòng kho, Cấu trúc Mã Định danh & Tự động sinh Kệ tầng

### 1. Quy chuẩn 4 loại phòng kho thực tế (`UnitTypeCategoryEnum`)

Hệ thống Self-Storage phân chia thành 4 nhóm kích thước phòng kho chuẩn:

1. `LOCKER`: Tủ gửi đồ cá nhân nhỏ ($S < 1.5\,\text{m}^2$, $V < 2.0\,\text{m}^3$). Không dùng kệ (`defaultRackConfig: null`).
2. `SMALL`: Phòng kho nhỏ ($1.5\,\text{m}^2 \le S < 6\,\text{m}^2$, $3.5\,\text{m}^3 \le V < 15\,\text{m}^3$). Chứa đồ gia dụng, đồ phòng trọ nguyên phòng, để sàn, không dùng kệ (`defaultRackConfig: null`).
3. `LARGE`: Phòng kho lớn ($6.0\,\text{m}^2 \le S < 15\,\text{m}^2$, $15\,\text{m}^3 \le V < 40\,\text{m}^3$). Chứa nội thất căn hộ gia đình, đồ kích thước lớn, không kệ (`defaultRackConfig: null`).
4. `WAREHOUSE_RACK`: Kho hàng hóa diện tích lớn ($S \ge 15.0\,\text{m}^2$, $V \ge 45.0\,\text{m}^3$). **Có sẵn hệ thống Kệ & Tầng** tiêu chuẩn (`defaultRackConfig` mặc định: 3 kệ $\times$ 4 tầng = 12 tầng), cho phép khách hàng tự quản lý danh mục SKU và theo dõi vị trí chính xác đến từng tầng kệ.

### 2. Cấu trúc Mã Định danh Phân tầng & Nhãn Vị trí Chuẩn (`HN01-A101-R2-T1`)

Hệ thống Self-Storage quản lý vị trí theo mô hình cây phân cấp 4 tầng:

```
[ Cơ sở: Facility.code ] ──► [ Phòng: StorageUnit.unitNumber ] ──► [ Kệ: StorageRack.rackCode ] ──► [ Tầng: RackTier.tierCode ]
        HN01                             A101                                  R2                               T1
```

- **Quy chuẩn mã từng cấp:**
  1. **Cấp 1 — Mã cơ sở (`Facility.code`):** Do Admin tự điền khi tạo/cập nhật cơ sở, in hoa, không trùng lặp toàn hệ thống (`unique: true`, ví dụ: `HN01`, `SGN01`, `HCM02`).
  2. **Cấp 2 — Mã phòng kho (`StorageUnit.unitNumber`):** Do Admin định danh theo số phòng thực tế, unique trong phạm vi cơ sở (ví dụ: `A101`, `B204`).
  3. **Cấp 3 — Mã kệ (`StorageRack.rackCode`):** Tự sinh hoặc do quản lý đặt, unique trong phạm vi phòng kho (ví dụ: `R1`, `R2`, `R01`).
  4. **Cấp 4 — Mã tầng (`RackTier.tierCode`):** Tự sinh theo tầng, unique trong phạm vi kệ (ví dụ: `T1`, `T2`, `T01`).
- **Nhãn vị trí hiển thị trên giao diện (Location Label):**
  - **Hàng nằm trên tầng kệ:** `{FacilityCode}-{UnitNumber}-{RackCode}-{TierCode}` (Ví dụ: `HN01-A101-R2-T1`).
  - **Hàng để sàn phòng kho hoặc kho không có kệ:** `{FacilityCode}-{UnitNumber}-FLOOR` (hoặc `{FacilityCode}-{UnitNumber}`, ví dụ: `HN01-A101-FLOOR`).

### 3. Cơ chế Auto-provisioning Kệ & Tầng (Task 6A)

- Khi Quản lý tạo mới một phòng kho (`StorageUnit`) thuộc loại `WAREHOUSE_RACK`:
  - Hệ thống tự động kích hoạt tiến trình sinh Kệ và Tầng trong cùng một Database Transaction `@Transactional()`.
  - Tự động sinh các kệ `R01`, `R02`, `R03`... kèm các tầng trực thuộc `R01-T01`, `R01-T02`... với các thông số kích thước, tải trọng tối đa (`maxWeightKg`), và tự động tính thể tích tầng $V = l \times w \times h$.
  - Trạng thái ban đầu của tất cả các tầng mới sinh là `AVAILABLE`.
- Khi phòng kho bị xóa mềm (`DELETE /storage-units/:id`), toàn bộ Kệ và Tầng trực thuộc được cascade xóa mềm.
- Khi phòng kho được khôi phục (`POST /storage-units/:id/restore`), toàn bộ Kệ và Tầng trực thuộc được tự động khôi phục đồng bộ.

---

## III. Danh mục Mã hàng Khách hàng (`CustomerSku`) — Task 6B

### 1. Tính Độc nhất theo Phạm vi Khách hàng (Scoped Uniqueness)

- Mỗi khách hàng được toàn quyền định nghĩa mã sản phẩm (`skuCode`) và mã vạch (`barcode`) theo cách quản lý riêng của họ.
- Cơ chế Compound Partial Unique Index dưới MongoDB đảm bảo:
  - `{ customerId: 1, skuCode: 1 }` (`deleted: false`): Không bao giờ trùng `skuCode` trong cùng 1 khách hàng, nhưng hai khách hàng khác nhau hoàn toàn có thể cùng đặt mã `SP-01`.
  - `{ customerId: 1, barcode: 1 }` (`deleted: false`): Không trùng mã vạch trong cùng 1 khách hàng.
- Tự động tính thể tích sản phẩm $volume = length \times width \times height$ phục vụ gợi ý sức chứa.

### 2. Quy tắc Bảo mật & Quyền Riêng tư (Strict Privacy)

- **Khách hàng (`CUSTOMER`):** Là người DUY NHẤT có quyền tạo, sửa, xóa danh mục mã hàng của mình.
- **Nhân viên chi nhánh (`FACILITY_STAFF`):** BỊ CHẶN TUYỆT ĐỐI (`403 MESSAGE_CODE_103: Access Denied`). Nhân viên không được phép soi hoặc tra cứu danh mục hàng hóa của khách.
- **Quản lý cơ sở (`FACILITY_MANAGER`):** Chỉ được cấp quyền đọc (Read-only) danh mục SKU của những khách hàng đang có hợp đồng thuê kho tại cơ sở do mình phụ trách.

### 3. Quy tắc Bảo vệ khi Xóa (Delete Protection — Rule 613)

- Hệ thống **chặn tuyệt đối việc xóa mềm SKU** nếu SKU đó vẫn còn số lượng tồn kho ($quantity > 0$) tại bất kỳ phòng kho hoặc tầng kệ nào trong hệ thống (`400 MESSAGE_CODE_613`).
- Khách hàng bắt buộc phải thực hiện xuất hết hàng khỏi kho (`Stock Out` về 0) trước khi có thể xóa mã hàng này.

---

## IV. Vận hành Nhập/Xuất/Chuyển/Kiểm kê (`CustomerInventory`) — Task 6C & 6D

### 1. Ràng buộc Hợp đồng Thuê kho (Contract Status Guard — Rule 622)

- Mọi thao tác thay đổi tồn kho (`IN`, `OUT`, `MOVE`, `ADJUST`) bắt buộc phải gắn liền với một Hợp đồng thuê kho (`contractId`).
- **Hợp đồng bắt buộc phải đang ở trạng thái `ACTIVE`**. Nếu hợp đồng đang ở trạng thái `DRAFT`, `PENDING_SIGNATURE`, `EXPIRED`, `TERMINATED` hoặc `CANCELLED`, hệ thống từ chối thực hiện giao dịch (`400 MESSAGE_CODE_622`).

### 2. Quy tắc 4 Luồng Nghiệp vụ Biến động Hàng hóa

Tất cả 4 thao tác đều chạy nguyên tử trong một `@Transactional()`, đảm bảo tính nhất quán giữa bảng tồn kho `CustomerInventory`, bảng sổ cái `InventoryMovement`, và trạng thái tầng kệ `RackTier`:

1. **Nhập hàng (`POST /customer-inventories/in`):**
   - Tăng số lượng tồn kho tại vị trí chỉ định (`incrementQuantity`). Nếu vị trí chưa có bản ghi, tạo mới bản ghi `CustomerInventory`.
   - Ghi nhận 1 dòng sổ cái `InventoryMovement` loại `IN` với mã tự sinh `MOV-YYYYMMDD-XXXXXX`.
   - Nếu hàng được đưa vào tầng kệ (`rackTierId` khác null), cập nhật trạng thái tầng kệ sang `OCCUPIED`.
2. **Xuất hàng (`POST /customer-inventories/out`):**
   - Kiểm tra tồn kho tại vị trí: Không cho phép xuất quá số lượng hiện có (chặn xuất âm, ném `400 MESSAGE_CODE_623`).
   - Giảm số lượng tồn kho (`quantity = quantity - exportQuantity`).
   - Ghi nhận 1 dòng sổ cái `InventoryMovement` loại `OUT`.
   - **Tự động nhả tầng kệ:** Hệ thống kiểm tra tổng tồn kho của toàn bộ các SKU còn lại trên tầng kệ đó. Nếu tổng số lượng $= 0$, tầng kệ tự động chuyển trạng thái về `AVAILABLE`.
3. **Chuyển vị trí nội bộ (`POST /customer-inventories/move`):**
   - Áp dụng khi khách dời hàng giữa 2 tầng kệ hoặc giữa sàn và kệ trong cùng phòng kho.
   - Kiểm tra vị trí đích (`toRackTierId`) phải khác vị trí nguồn (`fromRackTierId`).
   - Giảm tồn kho tại vị trí nguồn và tăng tồn kho tương ứng tại vị trí đích.
   - Đồng bộ trạng thái cả 2 tầng kệ: tầng nguồn có thể về `AVAILABLE` nếu hết hàng, tầng đích chuyển sang `OCCUPIED`.
   - Ghi nhận 1 dòng sổ cái `InventoryMovement` loại `MOVE`.
4. **Kiểm kê / Điều chỉnh tồn kho (`POST /customer-inventories/adjust`):**
   - Cho phép khách hàng cập nhật số lượng tồn thực tế (`newQuantity`) sau khi tự đếm hàng.
   - Bắt buộc phải có lý do điều chỉnh (`reason` tối thiểu 3 ký tự, ví dụ: "Hao hụt vận chuyển", "Đếm lại sau khi đóng thùng").
   - Tính toán lượng delta chênh lệch, cập nhật bản ghi tồn kho và ghi sổ cái loại `ADJUST`.

### 3. Quy tắc Quản lý Hàng để sàn & Phòng kho không kệ (Unracked Items — `[D6.2]`)

- **Bản chất nghiệp vụ:** Khách hàng thuê bất kỳ loại phòng kho nào (kể cả phòng lớn không kệ `LARGE`, phòng nhỏ `SMALL`, hoặc phòng có kệ `WAREHOUSE_RACK`) đều có thể tự quản lý danh mục SKU và xuất nhập tồn.
- **Hàng để sàn (Unracked Floor Items):**
  - Áp dụng cho:
    1. Phòng kho không trang bị kệ tầng.
    2. Các kiện hàng cồng kềnh, quá tải trọng, pallet lớn để trực tiếp dưới sàn phòng kho có kệ.
  - Khi thao tác Nhập/Xuất/Chuyển/Kiểm kê: Request truyền `rackTierId: null` (với Move thì `fromRackTierId: null` hoặc `toRackTierId: null`).
  - **Bỏ qua State Machine tầng kệ:** Vì không gắn với tầng kệ vật lý nào, hệ thống bỏ qua việc chuyển trạng thái `OCCUPIED` / `AVAILABLE`.
  - **Hiển thị trên Sơ đồ Cây:** Các mặt hàng này được gom vào mảng `unrackedItems` của API `GET /customer-inventories/unit/{storageUnitId}/tree`.

### 4. Quy tắc Bảng Điều khiển Tổng hợp Tồn kho (`GET /customer-inventories/summary`)

- **Mục đích:** Cung cấp số liệu tổng quan về tồn kho cá nhân (tổng số SKU, tổng số lượng kiện hàng, số hợp đồng active, số phòng đang thuê, cơ cấu ngành hàng, và 5 biến động gần nhất).
- **Phân quyền truy xuất theo Caller:**
  - **Khách hàng (`CUSTOMER`):** Hệ thống luôn ép buộc lấy theo `caller.id`. Khách hàng chỉ xem được số liệu của chính mình, không thể xem của khách khác kể cả khi truyền query param.
  - **Quản lý Vận hành / Quản trị viên (`BUSINESS_OPS_MANAGER`, `SYSTEM_ADMIN`):**
    - Khi xem trang chi tiết khách hàng trên Backoffice CMS, cho phép truyền query param `?customerId=<id_khách>` (hoặc alias `?userId=<id_khách>`).
    - Hệ thống sẽ trả về bảng tổng quan tồn kho của khách hàng được chỉ định để Admin/Ops hỗ trợ hoặc đối soát.

---

## V. Ma trận Phân quyền & Bảo mật Nghiệp vụ

| Thao tác / Endpoint                                |      CUSTOMER (Chủ kho)       |  FACILITY_STAFF  |      FACILITY_MANAGER       |   OPS_MANAGER / ADMIN    |
| :------------------------------------------------- | :---------------------------: | :--------------: | :-------------------------: | :----------------------: |
| `POST /customer-skus` (Tạo SKU)                    |      ✅ Chỉ tạo của mình      | ❌ 403 Forbidden |      ❌ 403 Forbidden       |     ❌ Chỉ khách tạo     |
| `GET /customer-skus` (Xem danh sách SKU)           |        ✅ Xem của mình        | ❌ 403 Forbidden |  👁️ Chỉ khách thuộc cơ sở   |      ✅ Toàn quyền       |
| `PATCH / DELETE /customer-skus/:id`                |    ✅ Chỉ sửa/xóa của mình    | ❌ 403 Forbidden |      ❌ 403 Forbidden       |     ❌ 403 Forbidden     |
| `POST /customer-inventories/in` (Nhập hàng)        | ✅ Thao tác hợp đồng của mình | ❌ 403 Forbidden |      ❌ 403 Forbidden       |      ✅ Toàn quyền       |
| `POST /customer-inventories/out` (Xuất hàng)       | ✅ Thao tác hợp đồng của mình | ❌ 403 Forbidden |      ❌ 403 Forbidden       |      ✅ Toàn quyền       |
| `POST /customer-inventories/move` (Chuyển kệ)      | ✅ Thao tác hợp đồng của mình | ❌ 403 Forbidden |      ❌ 403 Forbidden       |      ✅ Toàn quyền       |
| `POST /customer-inventories/adjust` (Kiểm kê)      | ✅ Thao tác hợp đồng của mình | ❌ 403 Forbidden |      ❌ 403 Forbidden       |      ✅ Toàn quyền       |
| `GET /customer-inventories` (Tra cứu tồn kho)      |    ✅ Tự động lọc của mình    | ❌ 403 Forbidden |  👁️ Xem khách thuộc cơ sở   |      ✅ Toàn quyền       |
| `GET /customer-inventories/movements` (Sổ cái)     |    ✅ Tự động lọc của mình    | ❌ 403 Forbidden |  👁️ Xem khách thuộc cơ sở   |      ✅ Toàn quyền       |
| `GET /customer-inventories/unit/:id/tree` (6D)     |   ✅ Xem kho mình đang thuê   | ❌ 403 Forbidden | 👁️ Xem kho thuộc cơ sở mình |      ✅ Toàn quyền       |
| `GET /customer-inventories/sku/:id/locations` (6D) |  ✅ Xem vị trí SKU của mình   | ❌ 403 Forbidden |  👁️ Xem khách thuộc cơ sở   |      ✅ Toàn quyền       |
| `GET /customer-inventories/summary` (6D)           |        ✅ Xem của mình        | ❌ 403 Forbidden |      ❌ 403 Forbidden       | ✅ Xem theo `customerId` |
