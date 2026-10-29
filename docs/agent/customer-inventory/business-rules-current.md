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

### 4. Trạng thái Mặt hàng Tồn kho (`InventoryItemStatusEnum`)

- **Các trạng thái mặt hàng (`CustomerInventory.status`):**
  - `NORMAL` (Mặc định): Hàng hóa lưu trữ ổn định, sẵn sàng xuất kho hoặc bốc dời.
  - `TEMPORARY_HOLDING`: Hàng hóa vừa được hạ khẩn cấp từ kệ hỏng xuống sàn/khu lưu tạm, đang chờ khách ký phụ lục đổi kệ mới. **Bị khóa không cho xuất kho.**
  - `DAMAGED`: Hàng hóa bị phát hiện hư hỏng vật lý (ẩm ướt, móp vỡ), liên kết với mã sự cố `relatedIncidentId`. **Khóa tuyệt đối xuất kho và bốc dời** để bảo toàn hiện trường bồi thường.
  - `DISPUTED`: Hàng bị phong tỏa do tranh chấp hoặc hợp đồng quá hạn nợ cước (`OVERDUE`). Đóng băng toàn bộ thao tác.

---

## II. Phân loại Phòng kho, Cấu trúc Mã Định danh & Tự động sinh Kệ tầng

### 1. Quy chuẩn 4 loại phòng kho thực tế (`UnitTypeCategoryEnum`)

Hệ thống Self-Storage phân chia thành 4 nhóm kích thước phòng kho chuẩn:

1. `LOCKER`: Tủ gửi đồ cá nhân nhỏ ($S < 1.5\,\text{m}^2$, $V < 2.0\,\text{m}^3$). Khách thuê nguyên tủ tự quản lý đồ cá nhân, **không dùng hệ thống quản lý SKU**.
2. `SMALL`: Phòng kho nhỏ ($1.5\,\text{m}^2 \le S < 6\,\text{m}^2$, $3.5\,\text{m}^3 \le V < 15\,\text{m}^3$). Khách thuê nguyên phòng tự quản lý đồ gia dụng/phòng trọ, **không dùng hệ thống quản lý SKU**.
3. `LARGE`: Phòng kho lớn ($6.0\,\text{m}^2 \le S < 15\,\text{m}^2$, $15\,\text{m}^3 \le V < 40\,\text{m}^3$). Khách thuê nguyên phòng tự quản lý nội thất/đồ kích thước lớn, **không dùng hệ thống quản lý SKU**.
4. `WAREHOUSE_RACK`: Kho hàng hóa diện tích lớn ($S \ge 15.0\,\text{m}^2$, $V \ge 45.0\,\text{m}^3$) được trang bị hệ thống Kệ & Tầng công nghiệp. **Toàn bộ phân hệ quản lý danh mục SKU và vị trí tồn kho (`CustomerInventory`, `CustomerSku`, `StorageRack`, `RackTier`) CHỈ DÀNH RIÊNG CHO MÔ HÌNH NÀY.** Khách hàng thuê theo Kệ (`rentedRackIds`), và **100% hàng hóa bắt buộc phải được lưu trữ trên Kệ tầng**. Không có khái niệm hàng để sàn tự do trong vận hành bình thường.

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
   - **Phân quyền thực tế:** Do **Nhân viên kho (`FACILITY_STAFF`, `FACILITY_MANAGER`)** hoặc Quản lý (`OPS`, `ADMIN`) thực hiện sau khi đã bốc xếp thực tế ngoài kho. **Khách hàng bị chặn (`403 MESSAGE_CODE_103`)** để chống dữ liệu ảo (khách không vào kho bốc vác).
   - Staff phải thuộc cơ sở của hợp đồng (`assignedFacilityId`).
   - Bắt buộc phải có lý do điều chuyển (`reason` tối thiểu 5 ký tự, ví dụ: _"Theo ticket hỗ trợ SUP-261029-001"_ hoặc _"Dồn chỗ tối ưu kệ"_).
   - Kiểm tra vị trí đích (`toRackTierId`) phải khác vị trí nguồn (`fromRackTierId`).
   - Giảm tồn kho tại vị trí nguồn và tăng tồn kho tương ứng tại vị trí đích.
   - Đồng bộ trạng thái cả 2 tầng kệ: tầng nguồn có thể về `AVAILABLE` nếu hết hàng, tầng đích chuyển sang `OCCUPIED`.
   - **Tự động phục hồi trạng thái:** Nếu hàng nguồn đang ở trạng thái `TEMPORARY_HOLDING`, khi được xếp lên Kệ tầng đích mới sẽ tự động chuyển về `NORMAL`.
   - Ghi nhận 1 dòng sổ cái `InventoryMovement` loại `MOVE` với `performedBy: staffId`.
4. **Kiểm kê / Điều chỉnh tồn kho (`POST /customer-inventories/adjust`):**
   - Cho phép khách hàng cập nhật số lượng tồn thực tế (`newQuantity`) sau khi tự đếm hàng.
   - Bắt buộc phải có lý do điều chỉnh (`reason` tối thiểu 3 ký tự, ví dụ: "Hao hụt vận chuyển", "Đếm lại sau khi đóng thùng").
   - Tính toán lượng delta chênh lệch, cập nhật bản ghi tồn kho và ghi sổ cái loại `ADJUST`.

### 3. Luồng Hạ Hàng Khẩn Cấp Xuống Khu Lưu Tạm (`POST /customer-inventories/racks/evacuate-to-holding`)

- Áp dụng khi kệ gặp sự cố kỹ thuật khẩn cấp (kệ nứt, rỉ nước) nhưng kho **không còn kệ cùng loại** để dời 1-Click (Task 7E).
- Thao tác trong transaction:
  - Hạ toàn bộ hàng trên kệ cũ xuống sàn (`rackTierId: null`, `storageRackId: null`).
  - Đổi trạng thái hàng hóa từ `NORMAL` sang `TEMPORARY_HOLDING`.
  - Chuyển Kệ cũ sang `MAINTENANCE` để phong tỏa bảo trì.
  - Giải phóng toàn bộ các Tầng kệ cũ về `AVAILABLE`.
  - Sinh $N$ bản ghi sổ cái `InventoryMovement` loại `MOVE` với lý do khẩn cấp.
- Sau khi khách hàng ký Phụ lục hợp đồng mới, nhân viên dùng API `move` xếp hàng lên Kệ mới và hàng tự động trở lại `NORMAL`.

### 4. Luồng Cập Nhật Trạng Thái Mặt Hàng (`PATCH /customer-inventories/{id}/status`)

- Dành cho Staff/FM cơ sở và Ops/Admin:
  - Cho phép đánh dấu hàng bị `DAMAGED` (khi phát hiện hư hỏng, bắt buộc kèm `incidentId`).
  - Hoặc chuyển hàng sang `DISPUTED` (khi tranh chấp/quá hạn nợ).
  - Hoặc phục hồi về `NORMAL` khi sự cố đã bồi thường xong.

### 5. Quy tắc Vị trí Tồn kho trong Kho Kệ (`WAREHOUSE_RACK`)

- **Bắt buộc ở trên Kệ tầng:** Trong điều kiện vận hành bình thường, mọi mặt hàng tồn kho `CustomerInventory` bắt buộc phải có `storageRackId` và `rackTierId` hợp lệ, thuộc danh sách Kệ mà hợp đồng khách đang thuê (`contract.rentedRackIds`). Trạng thái hàng là `NORMAL`.
- **Trường hợp duy nhất không gắn tầng kệ (`rackTierId: null`):**
  - Chỉ xảy ra khi Kệ bị sự cố kỹ thuật khẩn cấp và toàn bộ hàng được sơ tán xuống Khu vực lưu tạm của cơ sở (`POST /customer-inventories/racks/evacuate-to-holding`).
  - Khi đó, hàng mang trạng thái `TEMPORARY_HOLDING`, tạm mất vị trí kệ tầng và **bị khóa tuyệt đối không cho phép xuất kho** cho đến khi nhân viên bốc hàng lên Kệ mới và phục hồi về `NORMAL`.
  - Không có hàng để sàn tự do hay tồn kho không kệ trong vận hành thông thường.

### 6. Quy tắc Bảng Điều khiển Tổng hợp Tồn kho (`GET /customer-inventories/summary`)

- **Mục đích:** Cung cấp số liệu tổng quan về tồn kho cá nhân (tổng số SKU, tổng số lượng kiện hàng, số hợp đồng active, số phòng đang thuê, cơ cấu ngành hàng, và 5 biến động gần nhất).
- **Phân quyền truy xuất theo Caller:**
  - **Khách hàng (`CUSTOMER`):** Hệ thống luôn ép buộc lấy theo `caller.id`. Khách hàng chỉ xem được số liệu của chính mình, không thể xem của khách khác kể cả khi truyền query param.
  - **Quản lý Vận hành / Quản trị viên (`BUSINESS_OPS_MANAGER`, `SYSTEM_ADMIN`):**
    - Khi xem trang chi tiết khách hàng trên Backoffice CMS, cho phép truyền query param `?customerId=<id_khách>` (hoặc alias `?userId=<id_khách>`).
    - Hệ thống sẽ trả về bảng tổng quan tồn kho của khách hàng được chỉ định để Admin/Ops hỗ trợ hoặc đối soát.

---

## V. Ma trận Phân quyền & Bảo mật Nghiệp vụ

| Thao tác / Endpoint                                    |      CUSTOMER (Chủ kho)       |    FACILITY_STAFF     |      FACILITY_MANAGER       |   OPS_MANAGER / ADMIN    |
| :----------------------------------------------------- | :---------------------------: | :-------------------: | :-------------------------: | :----------------------: |
| `POST /customer-skus` (Tạo SKU)                        |      ✅ Chỉ tạo của mình      |  👁️ Hỗ trợ tạo quầy   |     👁️ Hỗ trợ tạo quầy      |     ❌ Chỉ khách tạo     |
| `GET /customer-skus` (Xem danh sách SKU)               |        ✅ Xem của mình        | 👁️ Khách thuộc cơ sở  |  👁️ Chỉ khách thuộc cơ sở   |      ✅ Toàn quyền       |
| `PATCH / DELETE /customer-skus/:id`                    |    ✅ Chỉ sửa/xóa của mình    |  👁️ Hỗ trợ sửa quầy   |     👁️ Hỗ trợ sửa quầy      |      ✅ Toàn quyền       |
| `POST /customer-inventories/in` (Nhập hàng)            | ✅ Thao tác hợp đồng của mình |   ❌ 403 Forbidden    |      ❌ 403 Forbidden       |      ✅ Toàn quyền       |
| `POST /customer-inventories/out` (Xuất hàng)           | ✅ Thao tác hợp đồng của mình |   ❌ 403 Forbidden    |      ❌ 403 Forbidden       |      ✅ Toàn quyền       |
| `POST /customer-inventories/move` (Chuyển kệ)          |  ❌ **403 Chống dữ liệu ảo**  | ✅ **Bốc dời cơ sở**  |    ✅ **Bốc dời cơ sở**     |      ✅ Toàn quyền       |
| `POST /customer-inventories/adjust` (Kiểm kê)          | ✅ Thao tác hợp đồng của mình |   ❌ 403 Forbidden    |      ❌ 403 Forbidden       |      ✅ Toàn quyền       |
| `POST /customer-inventories/racks/evacuate-to-holding` |       ❌ 403 Forbidden        | ✅ **Hạ hàng cơ sở**  |    ✅ **Hạ hàng cơ sở**     |      ✅ Toàn quyền       |
| `PATCH /customer-inventories/:id/status`               |       ❌ 403 Forbidden        | ✅ **Đổi trạng thái** |    ✅ **Đổi trạng thái**    |      ✅ Toàn quyền       |
| `GET /customer-inventories` (Tra cứu tồn kho)          |    ✅ Tự động lọc của mình    | 👁️ Khách thuộc cơ sở  |  👁️ Xem khách thuộc cơ sở   |      ✅ Toàn quyền       |
| `GET /customer-inventories/movements` (Sổ cái)         |    ✅ Tự động lọc của mình    | 👁️ Khách thuộc cơ sở  |  👁️ Xem khách thuộc cơ sở   |      ✅ Toàn quyền       |
| `GET /customer-inventories/unit/:id/tree` (6D)         |   ✅ Xem kho mình đang thuê   |   ❌ 403 Forbidden    | 👁️ Xem kho thuộc cơ sở mình |      ✅ Toàn quyền       |
| `GET /customer-inventories/sku/:id/locations` (6D)     |  ✅ Xem vị trí SKU của mình   |   ❌ 403 Forbidden    |  👁️ Xem khách thuộc cơ sở   |      ✅ Toàn quyền       |
| `GET /customer-inventories/summary` (6D)               |        ✅ Xem của mình        |   ❌ 403 Forbidden    |      ❌ 403 Forbidden       | ✅ Xem theo `customerId` |

---

## VI. Quy Tắc Di Dời Kệ Hàng Loạt & Khóa Sở Hữu Kệ (Task 7E)

### 1. Khóa Bảo Vệ Quyền Sở Hữu Kệ (`Rack Ownership Guard` — Rule 637)

- Mọi thao tác đưa hàng vào khoang chứa có kệ (`IN`, `OUT`, `MOVE`, `ADJUST` và `Putaway`), hệ thống bắt buộc đối soát `storageRackId` của tầng kệ với mảng `contract.rentedRackIds`:
  - **Kệ phải nằm trong `rentedRackIds` của Hợp đồng.**
  - Nếu khách hàng hoặc nhân viên thao tác trên kệ của người khác hoặc kệ chưa thuê $\rightarrow$ Chặn ngay với lỗi `400 MESSAGE_CODE_637 (Storage Rack Is Not Rented By Contract)`.
  - Đối với thao tác `MOVE`: Áp dụng kiểm tra bảo vệ cho **cả vị trí nguồn lẫn vị trí đích**. Khách chỉ được đảo hàng giữa các kệ mình đã thuê.

### 2. Phân Định Rạch Ròi Giữa `MOVE` Nội Bộ và Đổi Kệ Mới (`Rack Relocation`)

- **`MOVE` nội bộ trong phạm vi kệ đã thuê:**
  - Di chuyển giữa các tầng trong cùng 1 kệ, hoặc giữa các kệ mà hợp đồng đã thuê (`contract.rentedRackIds`).
  - Hợp đồng giữ nguyên 100%, không cần phụ lục hợp đồng.
- **Đổi sang Kệ MỚI chưa từng thuê (`Rack Relocation`):**
  - **Bắt buộc có Phụ lục Hợp đồng (`ContractAddendum`) hoặc Biên bản sự cố kỹ thuật.**
  - Hợp đồng không được tự ý sửa ngầm `rentedRackIds` nếu chưa có văn bản pháp lý 2 bên ký duyệt.

### 3. Quy Trình Chuyển Đổi Kệ Hàng Loạt (`POST /customer-inventories/racks/batch-migrate`)

- **Đối tượng gọi:** Dành riêng cho `FACILITY_STAFF`, `FACILITY_MANAGER` (thuộc cơ sở), `BUSINESS_OPS_MANAGER`, `SYSTEM_ADMIN`. Khách hàng bị chặn `403`.
- **Căn cứ pháp lý bắt buộc:** Bắt buộc truyền `addendumId` (Phụ lục hợp đồng trạng thái `ACTIVE`) HOẶC `emergencyReason` (Biên bản lý do sự cố $\ge 10$ ký tự) (`400 MESSAGE_CODE_641`).
- **Xử lý nguyên tử trong `@Transactional()`:**
  1. Kiểm tra kệ đích phải cùng cơ sở, cùng số lượng tầng, đang trống hoàn toàn (`AVAILABLE`) (`400 MESSAGE_CODE_639`).
  2. Kệ nguồn phải có hàng tồn kho (`400 MESSAGE_CODE_638`).
  3. Di dời toàn bộ bản ghi tồn kho sang các tầng tương ứng của kệ đích.
  4. Ghi nhận sổ cái `InventoryMovement` loại `MOVE` cho từng SKU với `referenceCode: addendumId || emergencyReason`.
  5. Đồng bộ trạng thái: Kệ nguồn về `AVAILABLE`, Kệ đích sang `RENTED`. Tầng nguồn về `AVAILABLE`, tầng đích sang `OCCUPIED`.
  6. Cập nhật `contract.rentedRackIds`: Thay thế ID kệ cũ bằng ID kệ mới.
