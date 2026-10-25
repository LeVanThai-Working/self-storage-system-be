# HƯỚNG DẪN TÍCH HỢP FRONTEND — TOÀN BỘ FLOW CHỌN LOẠI KHO & QUẢN LÝ SKU TRÊN KỆ TẦNG

> **Dành cho:** Frontend Agent (Web & Mobile App)  
> **Phân hệ:** `customer-inventory` & `customer-sku` & `storage-rack`  
> **Mục tiêu:** Hướng dẫn chi tiết luồng nghiệp vụ từ lúc Khách hàng chọn loại kho (có kệ vs không kệ), tạo danh mục hàng hóa (SKU), hiển thị sơ đồ trực quan các ngăn kệ, đến thao tác thêm/nhập/xuất/chuyển SKU vào từng ngăn của kệ hoặc để dưới sàn.

---

## I. TỔNG QUAN KIẾN TRÚC & MÔ HÌNH DỮ LIỆU CỐT LÕI

Để xây dựng giao diện chính xác, Frontend cần nắm rõ 4 cấp độ phân tầng vật lý của hệ thống Self-Storage:

```
[ Cơ sở: Facility.code ] (Ví dụ: HN01, SGN01)
       │
       ▼
[ Phòng kho: StorageUnit.unitNumber ] (Ví dụ: A101) (Thuộc một Hợp đồng Contract ACTIVE)
       │
       ├─── KHÔNG KỆ (LOCKER, SMALL, LARGE) hoặc HÀNG ĐỂ SÀN (Unracked Items)
       │       │
       │       ▼
       │    [ rackTierId: null ] ──► Nhãn vị trí: HN01-A101-FLOOR (hoặc HN01-A101)
       │
       └─── CÓ KỆ (WAREHOUSE_RACK)
               │
               ▼
       [ Kệ kho (StorageRack): R01, R02, R03... ]
               │
               ▼
       [ Tầng / Ngăn kệ (RackTier): R01-T01, R01-T02... ]
               │
               ▼
       [ rackTierId: "..." ] ──► Nhãn vị trí chuẩn: HN01-A101-R2-T1
```

### 1. Phân loại 4 nhóm phòng kho thực tế (`UnitTypeCategoryEnum`)

| Loại kho (`category`) | Kích thước & Thể tích                                     | Có hệ thống Kệ tầng không? | Cách hiển thị trên UI cho Khách                                            |
| :-------------------- | :-------------------------------------------------------- | :------------------------: | :------------------------------------------------------------------------- |
| `LOCKER`              | Tủ nhỏ ($S < 1.5\,\text{m}^2$, $V < 2\,\text{m}^3$)       |          ❌ Không          | Tủ cá nhân, để đồ trực tiếp                                                |
| `SMALL`               | Phòng nhỏ ($1.5 - 6\,\text{m}^2$, $3.5 - 15\,\text{m}^3$) |          ❌ Không          | Phòng để đồ gia dụng/phòng trọ, xếp sàn (`rackTierId: null`)               |
| `LARGE`               | Phòng lớn ($6 - 15\,\text{m}^2$, $15 - 40\,\text{m}^3$)   |          ❌ Không          | Chuyển nhà, nội thất lớn, xếp sàn (`rackTierId: null`)                     |
| `WAREHOUSE_RACK`      | Kho hàng ($\ge 15\,\text{m}^2$, $\ge 45\,\text{m}^3$)     |  ✅ **Có sẵn Kệ & Tầng**   | **Kho hàng chuyên nghiệp, hỗ trợ phân loại hàng theo từng Kệ & Tầng/Ngăn** |

### 2. Quy tắc Ghép Nhãn Vị trí Phân cấp (Location Label)

Frontend ghép nhãn hiển thị trực quan cho người dùng theo công thức:

- **Nếu hàng nằm trên tầng kệ:**
  `{facility.code}-{storageUnit.unitNumber}-{rack.rackCode}-{tier.tierCode}`  
  _(Ví dụ: `HN01-A101-R2-T1`)_
- **Nếu hàng để dưới sàn (không kệ):**
  `{facility.code}-{storageUnit.unitNumber}-FLOOR`  
  _(Ví dụ: `HN01-A101-FLOOR` hoặc ngắn gọn `HN01-A101`)_

---

## II. TOÀN BỘ LUỒNG NGHIỆP VỤ CHO FRONTEND (END-TO-END FLOW)

---

### BƯỚC 1: Khách hàng Chọn Loại Kho (Đặt chỗ & Thuê khoang chứa)

#### 1. Mục đích UI:

Hiển thị danh sách các loại kho tại chi nhánh. Giúp khách hàng phân biệt rõ kho thường (để sàn) và kho có trang bị hệ thống kệ tầng lưu hàng (`WAREHOUSE_RACK`).

#### 2. Gọi API Backend:

- Lấy danh sách loại kho khả dụng tại cơ sở:
  ```http
  GET /api/v1/facilities/{facilityId}/public-detail
  ```
  Hoặc:
  ```http
  GET /api/v1/unit-types?category=warehouse_rack
  ```

#### 3. Dữ liệu FE nhận được & Cách render UI:

- Trong response của `UnitType`:
  - Trường `category`: Nếu là `warehouse_rack`, FE hiển thị Huy hiệu nổi bật: **"✨ Có sẵn Kệ & Tầng lưu trữ"**.
  - Trường `defaultRackConfig`: Chứa thông số kệ mặc định:
    ```json
    "defaultRackConfig": {
      "rackCount": 3,
      "tiersPerRack": 4,
      "tierMaxWeightKg": 150,
      "tierDimensions": { "length": 1.2, "width": 0.6, "height": 0.5 }
    }
    ```
    $\rightarrow$ FE hiển thị thông tin tiện ích: _"Trang bị 3 kệ tiêu chuẩn $\times$ 4 tầng = 12 ngăn chứa đồ. Tải trọng mỗi tầng 150 kg"_.

---

### BƯỚC 2: Điều Kiện Tiên Quyết Để Quản Lý Hàng Hóa (Active Contract Guard)

- Khách hàng **chỉ có thể** quản lý tồn kho khi đã có hợp đồng thuê khoang chứa ở trạng thái **`ACTIVE`**.
- FE kiểm tra danh sách hợp đồng của khách:
  ```http
  GET /api/v1/contracts?status=active
  ```
- Từ hợp đồng `ACTIVE`, FE lưu trữ 2 ID bắt buộc:
  - `contractId`: ID hợp đồng thuê.
  - `storageUnitId`: ID phòng kho vật lý mà khách đang sở hữu.

---

### BƯỚC 3: Khách hàng Khởi Tạo Danh Mục Hàng Hóa (Quản lý Customer SKU)

Trước khi xếp hàng vào kệ, khách hàng cần định nghĩa mặt hàng họ muốn lưu trữ (Mã SKU, tên sản phẩm, barcode, ảnh...).

#### 1. Màn hình "Danh mục mặt hàng của tôi" (SKU List):

- Gọi API lấy danh sách SKU đã tạo:
  ```http
  GET /api/v1/customer-skus?page=1&limit=20
  ```
- Header gửi kèm token của khách (`Authorization: Bearer <accessToken>`).

#### 2. Màn hình / Modal "Tạo mã hàng mới" (Create SKU):

- Form nhập thông tin:
  - **Mã sản phẩm (`skuCode`):** _[Bắt buộc]_ Ví dụ: `SKU-A01`, `THUNG-TAI-LIEU`.
  - **Tên sản phẩm (`name`):** _[Bắt buộc]_ Ví dụ: `Bộ tách trà gốm sứ Bát Tràng`.
  - **Mã vạch (`barcode`):** _[Tùy chọn]_ Cho phép bấm nút **"Quét Barcode từ Camera"** trên điện thoại hoặc nhập tay.
  - **Đơn vị tính (`uom`):** _[Tùy chọn]_ Ví dụ: `thùng`, `hộp`, `kiện`, `cái`.
  - **Danh mục (`category`):** _[Tùy chọn]_ Creatable Dropdown gợi ý: `Gia dụng`, `Tài liệu`, `Thời trang`, `Điện tử`, `Đồ mùa đông`...
  - **Kích thước Dài $\times$ Rộng $\times$ Cao (`dimensions`):** Đơn vị cm.
  - **Khối lượng (`weightKg`):** Đơn vị kg.
  - **Ảnh sản phẩm (`imageUrl`):** Upload ảnh chụp hàng hóa.
- Gọi API:
  ```http
  POST /api/v1/customer-skus
  Content-Type: application/json

  {
    "skuCode": "SKU-TEA-01",
    "name": "Bộ tách trà cao cấp",
    "barcode": "8936001009999",
    "category": "Gia dụng",
    "uom": "bộ",
    "dimensions": { "length": 30, "width": 20, "height": 15 },
    "weightKg": 2.5,
    "imageUrl": "https://res.cloudinary.com/.../tea.jpg"
  }
  ```

---

### BƯỚC 4: Hiển Thị Sơ Đồ Trực Quan Khoang Chứa Đa Tầng (Storage Unit Tree Layout)

Đây là **màn hình trung tâm (Core Screen)** cho trải nghiệm Self-Storage trực quan của khách hàng.

#### 1. Gọi API Sơ đồ cây khoang chứa:

```http
GET /api/v1/customer-inventories/unit/{storageUnitId}/tree
```

#### 2. Cấu trúc Response và cách FE Render:

```json
{
  "success": true,
  "data": {
    "facility": {
      "id": "663000000000000000000099",
      "code": "HN01",
      "name": "Cơ sở Cầu Giấy",
      "city": "Hà Nội",
      "address": "Số 12 Duy Tân, Cầu Giấy, Hà Nội"
    },
    "storageUnit": {
      "id": "663000000000000000000001",
      "unitNumber": "A101",
      "floor": 1,
      "zone": "Khu A"
    },
    "summary": {
      "totalRacks": 3,
      "totalTiers": 12,
      "occupiedTiers": 4,
      "availableTiers": 8,
      "totalSkus": 5,
      "totalQuantity": 42
    },
    "racks": [
      {
        "id": "rack_01_id",
        "rackCode": "R1",
        "name": "Kệ số 1",
        "tierCount": 4,
        "tiers": [
          {
            "id": "tier_01_id",
            "tierNumber": 1,
            "tierCode": "T1",
            "maxWeightKg": 150,
            "status": "occupied",
            "items": [
              {
                "inventoryId": "inv_01_id",
                "quantity": 10,
                "sku": {
                  "id": "sku_01_id",
                  "skuCode": "SKU-TEA-01",
                  "name": "Bộ tách trà cao cấp",
                  "uom": "bộ",
                  "imageUrl": "https://..."
                }
              }
            ]
          },
          {
            "id": "tier_02_id",
            "tierNumber": 2,
            "tierCode": "T2",
            "status": "available",
            "items": []
          }
        ]
      }
    ],
    "unrackedItems": [
      {
        "inventoryId": "inv_02_id",
        "quantity": 5,
        "sku": {
          "id": "sku_02_id",
          "skuCode": "PALLET-BOX-01",
          "name": "Kiện hàng công nghiệp để sàn",
          "uom": "kiện"
        }
      }
    ]
  }
}
```

#### 3. Quy chuẩn Hiển thị Sơ đồ trên UI (UI/UX Best Practices):

1. **Hiển thị Nhãn Định danh Đầy đủ (Breadcrumb / Badge):**
   - Tiêu đề màn hình: `[HN01] Cơ sở Cầu Giấy > Phòng A101`.
   - Nhãn vị trí ngăn: `HN01-A101-R1-T1`.
2. **Header Thống kê (Summary Bar):**
   - Hiển thị badge: `Tổng số lượng hàng: 47 món` | `SKU khác nhau: 6 loại` | `Số tầng đã dùng: 4/12 (33% lấp đầy)`.
3. **Tab / Khu vực chuyển đổi Kệ:**
   - Nếu kho có 3 kệ (`R1`, `R2`, `R3`), FE render dạng **Tab Bar** hoặc **Lưới 3D/2D trực quan**.
4. **Màu sắc trạng thái từng Tầng / Ngăn Kệ:**
   - 🟢 **Màu Xanh lá (`AVAILABLE`):** Tầng trống hoàn toàn (`items.length === 0`). Sẵn sàng nhận hàng mới.
   - 🟠 **Màu Cam / Xanh dương (`OCCUPIED`):** Tầng đang chứa hàng (`items.length > 0`). Hiển thị danh sách badge/thumbnail các sản phẩm đang nằm trong tầng này.
   - ⚪ **Màu Xám / Vàng (`MAINTENANCE` / `INACTIVE`):** Đang bảo trì, tạm khóa không cho click nhập hàng.
5. **Khu vực Hàng Để Sàn (`unrackedItems`):**
   - Đặt ở đáy màn hình: _"Khu vực để đồ dưới sàn (Không dùng kệ) — Nhãn: HN01-A101-FLOOR"_. Dành cho các kiện hàng lớn, cồng kềnh, pallet hoặc phòng kho không kệ (`LARGE`, `SMALL`).

---

### BƯỚC 5: Thao Tác Thêm / Nhập SKU Vào Từng Ngăn Của Kệ (Stock In Flow)

#### 1. Luồng Người Dùng (User Action):

1. Trên sơ đồ kệ, khách hàng chạm/click vào một **Tầng kệ cụ thể** (Ví dụ: Chạm vào ngăn `T2` đang trống hoặc `T1` muốn thêm).  
   _(Nếu để hàng dưới sàn phòng hoặc kho không kệ: Bấm nút **"Nhập hàng để sàn"**)_.
2. FE hiển thị Modal / Bottom Sheet: **"Nhập hàng vào ngăn: Kệ R1 - Tầng 2"** (hoặc **"Nhập hàng để sàn phòng A101"**).
3. Khách hàng lựa chọn:
   - **Chọn SKU:** Chọn từ dropdown danh sách SKU đã tạo ở Bước 3, hoặc bấm nút **"Quét mã vạch"** để camera tự nhận diện SKU.
   - **Số lượng nhập (`quantity`):** Nhập số nguyên $\ge 1$ (Ví dụ: `15`).
   - **Mã tham chiếu (`referenceCode`):** _[Tùy chọn]_ Ví dụ: `PNK-20261019-01`.
   - **Ghi chú (`notes`):** _[Tùy chọn]_ Ví dụ: `Đóng trong 3 thùng carton nhỏ`.
4. Bấm **"Xác nhận Nhập kho"**.

#### 2. Gọi API Nhập kho:

```http
POST /api/v1/customer-inventories/in
Content-Type: application/json

{
  "contractId": "6ad1a2bbb3fa5fa49d2d02d0",
  "skuId": "6ad5978aaedccb4cd17e9567",
  "rackTierId": "6ad0da75b510541dc2bfbf43",
  "quantity": 15,
  "referenceCode": "PNK-001",
  "notes": "Hàng mới nhập về sáng nay"
}
```

> [!TIP]
> **Hàng để sàn hoặc phòng không có kệ:** Truyền `"rackTierId": null`. Backend hỗ trợ đầy đủ `null`, không còn bị lỗi `MESSAGE_CODE_101`.

#### 3. Phản hồi & Cập nhật UI:

- Backend thực thi trong Database Transaction:
  1. Tăng tồn kho của SKU tại ngăn `T2` (hoặc sàn phòng kho).
  2. Ghi một dòng vào sổ cái bất biến `InventoryMovement` loại `IN`.
  3. Nếu nhập vào tầng kệ: Tự động chuyển trạng thái ngăn `T2` từ `AVAILABLE` sang `OCCUPIED`. (Nếu để sàn: bỏ qua cập nhật trạng thái tầng).
- FE làm mới dữ liệu (`invalidateQueries(['storage-unit-tree'])`):
  - Ngăn `T2` lập tức đổi màu sang **Cam (`OCCUPIED`)**.
  - Hiển thị badge: `SKU-TEA-01 x 15 bộ`.
  - Bắn Toast thông báo thành công: _"Đã nhập 15 bộ tách trà vào Kệ R1 - Tầng 2 thành công!"_.

---

### BƯỚC 6: Các Thao Tác Vận Hành Khác Trên Ngăn Kệ

Khi click vào một ngăn kệ đang có hàng (`OCCUPIED`) hoặc một món hàng dưới sàn, FE mở danh sách chi tiết các mặt hàng và cung cấp 3 nút hành động:

#### 1. Xuất hàng khỏi ngăn (`Stock Out`):

- Khách bấm **"Xuất hàng"** trên một SKU:
  - Nhập số lượng cần lấy ra (không được vượt quá số lượng đang có).
  - Nhập lý do (ví dụ: `Giao cho khách hàng`).
- Gọi API:
  ```http
  POST /api/v1/customer-inventories/out

  {
    "contractId": "...",
    "skuId": "...",
    "rackTierId": "tier_01_id",
    "quantity": 5,
    "reason": "Lấy về nhà sử dụng"
  }
  ```
  _(Nếu xuất từ sàn phòng kho: gửi `"rackTierId": null`)_.
- **Hệ quả State Machine:** Nếu khách xuất hết toàn bộ hàng trong ngăn (`quantity = 0`), Backend tự động chuyển tầng kệ về `AVAILABLE`. FE tự động đổi màu ngăn về Xanh lá.

#### 2. Chuyển hàng giữa các ngăn kệ hoặc chuyển giữa sàn và kệ (`Stock Move`):

- Khách muốn sắp xếp lại kho, chuyển 5 thùng từ Tầng 1 sang Tầng 3 (hoặc chuyển từ sàn lên kệ).
- FE cung cấp giao diện Kéo-thả (Drag & Drop) hoặc Form chọn:
  - Vị trí nguồn (`fromRackTierId`): `tier_01_id` (hoặc `null` nếu lấy từ sàn).
  - Vị trí đích (`toRackTierId`): `tier_03_id` (hoặc `null` nếu dời xuống sàn).
  - Số lượng chuyển: `5`.
- Gọi API:
  ```http
  POST /api/v1/customer-inventories/move

  {
    "contractId": "...",
    "skuId": "...",
    "fromRackTierId": "tier_01_id",
    "toRackTierId": "tier_03_id",
    "quantity": 5,
    "reason": "Sắp xếp lại ngăn để trống tầng 1"
  }
  ```
- Backend trừ tồn vị trí nguồn và cộng tồn vị trí đích nguyên tử. Cập nhật trạng thái các tầng liên quan đồng thời.

#### 3. Kiểm kê / Cân bằng tồn kho thực tế (`Stock Adjust`):

- Khách đến kho đếm lại thấy thừa/thiếu hàng do nhầm lẫn trước đó.
- Nhập số lượng đếm thực tế mới (`newQuantity`) và bắt buộc nhập lý do (`reason` $\ge 3$ ký tự).
- Gọi API:
  ```http
  POST /api/v1/customer-inventories/adjust

  {
    "contractId": "...",
    "skuId": "...",
    "rackTierId": "tier_01_id",
    "newQuantity": 8,
    "reason": "Kiểm kê định kỳ phát hiện vỡ 2 bộ"
  }
  ```
  _(Nếu kiểm kê hàng để sàn: gửi `"rackTierId": null`)_.

---

### BƯỚC 7: Tra Cứu Vị Trí & Quét Mã Barcode Bằng Camera

FE tích hợp tính năng tìm kiếm siêu nhanh cho khách hàng khi đứng tại kho:

#### 1. Quét mã Barcode trên thùng hàng để biết vị trí trên kệ:

- Khách bật camera quét barcode dán trên thùng hàng:
  ```http
  GET /api/v1/customer-inventories/barcode/{barcode}/locations
  ```
- Response trả về:
  ```json
  {
    "sku": {
      "skuCode": "SKU-TEA-01",
      "name": "Bộ tách trà",
      "totalQuantity": 25
    },
    "locations": [
      {
        "facility": { "code": "HN01", "name": "Cơ sở Cầu Giấy" },
        "storageUnit": { "unitNumber": "A101" },
        "storageRack": { "rackCode": "R1", "name": "Kệ số 1" },
        "rackTier": { "tierCode": "T1", "tierNumber": 1 },
        "quantity": 10
      },
      {
        "facility": { "code": "HN01", "name": "Cơ sở Cầu Giấy" },
        "storageUnit": { "unitNumber": "A101" },
        "storageRack": { "rackCode": "R1", "name": "Kệ số 1" },
        "rackTier": { "tierCode": "T3", "tierNumber": 3 },
        "quantity": 15
      }
    ]
  }
  ```
- **Hành vi UI:** FE hiển thị thông báo: _"Mặt hàng này đang nằm ở [HN01-A101-R1-T1] (10 bộ) và [HN01-A101-R1-T3] (15 bộ)"_. Sơ đồ kệ tự động nhấp nháy (highlight) 2 ngăn này.

---

### BƯỚC 8: Bảng Điều Khiển Tổng Quan Tồn Kho (Personal Inventory Dashboard)

#### 1. Dành cho Khách hàng (Mobile App / Customer Web Portal):

- Gọi API:
  ```http
  GET /api/v1/customer-inventories/summary
  ```
- Backend tự động nhận diện token khách hàng và trả về số liệu tồn kho cá nhân của khách đó.

#### 2. Dành cho Quản trị viên & Quản lý Vận hành (Admin / Ops CMS):

- Khi Admin/Ops xem trang chi tiết một Khách hàng cụ thể trên Backoffice CMS:
- Gọi API kèm query param:
  ```http
  GET /api/v1/customer-inventories/summary?customerId=6ad1a2bbb3fa5fa49d2d02d0
  ```
  _(Hoặc alias: `?userId=6ad1a2bbb3fa5fa49d2d02d0`)_
- Backend trả về đúng bảng tổng quan tồn kho của khách hàng được chỉ định thay vì trả về rỗng.

#### 3. Render các widget trên Dashboard:

1. **Thống kê Card:** Tổng số SKU (`totalSkus`), Tổng số lượng hàng trong kho (`totalQuantity`), Số hợp đồng active (`totalActiveContracts`), Số phòng kho đang thuê (`totalStorageUnits`).
2. **Biểu đồ tròn (Pie/Donut Chart) Ngành hàng:** Phân loại theo `categoryBreakdown` (Gia dụng: 40%, Hồ sơ: 30%, Thời trang: 30%...).
3. **Lịch sử hoạt động gần nhất:** Render 5 giao dịch `recentMovements` (Vừa nhập hàng, vừa xuất hàng lúc mấy giờ, kèm mã phiếu `movementCode`).

---

## III. BẢNG MÃ LỖI THƯỜNG GẶP & CÁCH XỬ LÝ TRÊN FORM GIAO DIỆN

| Mã lỗi (`messageCode`) | Trạng thái HTTP | Nguyên nhân nghiệp vụ                                            | Cách hiển thị trên UI Frontend                                                                                                   |
| :--------------------- | :-------------: | :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `MESSAGE_CODE_622`     |       400       | Hợp đồng chưa ACTIVE (đã hết hạn, đang nợ cọc, hoặc đã thanh lý) | Chặn mở form nhập/xuất, hiển thị Alert đỏ: _"Hợp đồng thuê kho chưa có hiệu lực. Vui lòng thanh toán cọc hoặc liên hệ quản lý."_ |
| `MESSAGE_CODE_621`     |       400       | Xuất hàng vượt quá số lượng tồn đang có trong ngăn               | Validate trực tiếp dưới ô input số lượng: _"Số lượng xuất không thể lớn hơn số lượng hiện có trong ngăn ({max})"_                |
| `MESSAGE_CODE_624`     |       400       | Chọn nhầm tầng kệ của phòng kho khác                             | Thông báo toast: _"Tầng kệ không thuộc phòng kho này"_                                                                           |
| `MESSAGE_CODE_625`     |       400       | Tầng kệ đang ở trạng thái bảo trì hoặc khóa                      | Khóa không cho click vào ngăn, hiển thị tooltip: _"Tầng kệ đang bảo trì, không thể xếp hàng vào đây"_                            |
| `MESSAGE_CODE_627`     |       400       | Ngăn đích và ngăn nguồn giống nhau khi chuyển kệ                 | Chặn nút xác nhận, báo lỗi: _"Vị trí đích phải khác vị trí nguồn"_                                                               |
| `MESSAGE_CODE_613`     |       400       | Khách cố tình bấm xóa SKU trong khi trên kệ vẫn còn hàng         | Hiển thị Dialog cảnh báo: _"Mặt hàng này vẫn còn tồn kho trên kệ. Bạn cần xuất hết hàng về 0 trước khi xóa mã hàng này."_        |
| `MESSAGE_CODE_103`     |       403       | Tài khoản nhân viên chi nhánh cố tình truy cập hàng của khách    | Không hiển thị các nút thao tác hàng hóa cho tài khoản `FACILITY_STAFF`                                                          |
| `MESSAGE_CODE_630`     |       404       | Phiếu yêu cầu nhập/xuất kho không tồn tại hoặc đã bị xóa         | Hiển thị thông báo: _"Không tìm thấy phiếu yêu cầu nhập/xuất kho này."_                                                          |
| `MESSAGE_CODE_631`     |       400       | Mã OTP 6 số hoặc mã QR lấy hàng không đúng, hết hạn hoặc đã dùng | Báo đỏ tại ô quét/nhập: _"Mã lấy hàng hoặc OTP không hợp lệ, đã hết hạn hoặc đã được sử dụng trước đó."_                         |
| `MESSAGE_CODE_632`     |       400       | Thao tác sai quy trình chuyển trạng thái của phiếu               | Báo lỗi Toast: _"Phiếu đang ở trạng thái không thể thực hiện thao tác này."_                                                     |
| `MESSAGE_CODE_633`     |       400       | Thiếu ảnh bằng chứng bàn giao hoặc tiếp nhận (< 3 ảnh)           | Hiển thị cảnh báo cạnh nút Upload: _"Vui lòng chụp đủ ít nhất 3 ảnh bằng chứng (xe hàng, kiện hàng, phiếu giao có chữ ký)."_     |
| `MESSAGE_CODE_634`     |       400       | Khách cố tình hủy phiếu khi nhân viên kho đang bốc hàng          | Chặn nút hủy, hiển thị Alert: _"Phiếu xuất kho đang được nhân viên xử lý tại quầy, không thể hủy lệnh vào lúc này."_             |
| `MESSAGE_CODE_635`     |       400       | Kho kệ WAREHOUSE_RACK mà không chọn Kệ hoặc Tầng kệ              | Validate form: _"Mô hình kho kệ bắt buộc phải chỉ định cụ thể Kệ và Tầng kệ lưu trữ."_                                           |
| `MESSAGE_CODE_636`     |       400       | Tầng kệ không thuộc Kệ kho đã chỉ định                           | Validate dropdown: _"Tầng kệ đã chọn không thuộc Kệ kho này."_                                                                   |
| `MESSAGE_CODE_630`     |       404       | Phiếu yêu cầu nhập/xuất kho không tồn tại hoặc đã bị xóa         | Hiển thị thông báo: _"Không tìm thấy phiếu yêu cầu nhập/xuất kho này."_                                                          |
| `MESSAGE_CODE_631`     |       400       | Mã OTP 6 số hoặc mã QR lấy hàng không đúng, hết hạn hoặc đã dùng | Báo đỏ tại ô quét/nhập: _"Mã lấy hàng hoặc OTP không hợp lệ, đã hết hạn hoặc đã được sử dụng trước đó."_                         |
| `MESSAGE_CODE_632`     |       400       | Thao tác sai quy trình chuyển trạng thái của phiếu               | Báo lỗi Toast: _"Phiếu đang ở trạng thái không thể thực hiện thao tác này."_                                                     |
| `MESSAGE_CODE_633`     |       400       | Thiếu ảnh bằng chứng bàn giao hoặc tiếp nhận (< 3 ảnh)           | Hiển thị cảnh báo cạnh nút Upload: _"Vui lòng chụp đủ ít nhất 3 ảnh bằng chứng (xe hàng, kiện hàng, phiếu giao có chữ ký)."_     |
| `MESSAGE_CODE_634`     |       400       | Khách cố tình hủy phiếu khi nhân viên kho đang bốc hàng          | Chặn nút hủy, hiển thị Alert: _"Phiếu xuất kho đang được nhân viên xử lý tại quầy, không thể hủy lệnh vào lúc này."_             |
| `MESSAGE_CODE_635`     |       400       | Kho kệ WAREHOUSE_RACK mà không chọn Kệ hoặc Tầng kệ              | Validate form: _"Mô hình kho kệ bắt buộc phải chỉ định cụ thể Kệ và Tầng kệ lưu trữ."_                                           |
| `MESSAGE_CODE_636`     |       400       | Tầng kệ không thuộc Kệ kho đã chỉ định                           | Validate dropdown: _"Tầng kệ đã chọn không thuộc Kệ kho này."_                                                                   |

---

## IV. GỢI Ý CẤU TRÚC COMPONENT TREE CHO FRONTEND

```
📁 CustomerInventoryModule/
├── 📄 InventoryDashboardView.tsx            (Bước 8: Tổng quan, pie chart ngành hàng, recent movements - hỗ trợ ?customerId cho Admin)
├── 📄 SkuManagementView.tsx                 (Bước 3: Quản lý danh mục mặt hàng SKU, nút scan barcode)
│   ├── 🧩 CreateSkuModal.tsx                (Form thêm SKU mới kèm kích thước, barcode camera)
│   └── 🧩 SkuDetailDrawer.tsx               (Xem thông tin & các vị trí đang cất SKU dạng HN01-A101-R2-T1)
├── 📄 StorageUnitVisualTreeView.tsx         (Bước 4: Sơ đồ trực quan phòng kho & các kệ tầng)
│   ├── 🧩 LocationBreadcrumb.tsx            (Hiển thị [HN01] Cơ sở Cầu Giấy > Phòng A101)
│   ├── 🧩 RackTabs.tsx                      (Chuyển đổi giữa các kệ R1, R2, R3)
│   ├── 🧩 RackTierGrid.tsx                  (Lưới trực quan các tầng: Xanh/Cam kèm badge số lượng)
│   ├── 🧩 UnrackedFloorSection.tsx          (Khu vực để đồ dưới sàn phòng: HN01-A101-FLOOR)
│   ├── 🧩 StockInModal.tsx                  (Bước 5: Thêm SKU vào ngăn kệ đã chọn hoặc để sàn: rackTierId: null)
│   ├── 🧩 StockOutModal.tsx                 (Bước 6.1: Lấy hàng ra khỏi ngăn hoặc sàn)
│   ├── 🧩 StockMoveModal.tsx                (Bước 6.2: Dời hàng sang ngăn khác hoặc dời sàn/kệ)
│   └── 🧩 StockAdjustModal.tsx              (Bước 6.3: Kiểm kê điều chỉnh số dư)
├── 📄 BarcodeScannerModal.tsx               (Bước 7: Quét camera tra cứu ngăn kệ tức thì)
│
└── 📁 InventoryRequestModule/               (TASK 7D: PHIẾU YÊU CẦU NHẬP/XUẤT & BẮT TAY KÉP)
    ├── 📄 CustomerRequestListView.tsx       (App Khách: Danh sách phiếu Inbound/Outbound, tab Đang xử lý / Đã xong)
    ├── 📄 CreateOutboundRequestModal.tsx    (App Khách: Tạo lệnh xuất kho, chọn SKU & số lượng, nhập thông tin Shipper)
    ├── 📄 OutboundCredentialsDrawer.tsx     (App Khách: Xem One-Time Pickup QR token + OTP 6 số, đếm ngược 24h, nút Copy/Share)
    ├── 📄 InboundStagingConfirmDrawer.tsx   (App Khách: Xem 3 ảnh do Staff chụp hộ, nút Xác nhận nhận hàng hoặc Khiếu nại)
    ├── 📄 StaffCounterScannerView.tsx       (Web/Tablet Staff: Quét camera QR / gõ tay OTP đối soát tài xế)
    ├── 📄 StaffHandoverFulfillmentModal.tsx (Web/Tablet Staff: Đối soát bốc hàng, xuất 1 phần thiếu/hỏng, chụp ảnh & ký điện tử)
    ├── 📄 StaffAssistedInboundModal.tsx     (Web/Tablet Staff: Nhập hộ hàng tại quầy, bắt buộc 3 ảnh bằng chứng + chữ ký tài xế)
    └── 📄 StaffPutawayModal.tsx             (Web/Tablet Staff: Chọn Kệ/Tầng trống xếp hàng từ Staging Area lên kệ)
```

---

## V. HƯỚNG DẪN CHI TIẾT TÍCH HỢP UI: TASK 7D — PHIẾU YÊU CẦU NHẬP/XUẤT KHO & CƠ CHẾ BẮT TAY KÉP (DUAL HANDSHAKE)

> Phân hệ này áp dụng đặc thù cho mô hình **Kho kệ dùng chung có nhân viên phục vụ (`WAREHOUSE_RACK`)**. Khách hàng giám sát từ xa trên App/Web, ủy quyền cho Shipper/Tài xế đến lấy/giao hàng, và Nhân viên kho (`FACILITY_STAFF`) chịu trách nhiệm bốc xếp, kiểm đếm tại quầy.

```
                    ┌──────────────────────────────────────────────┐
                    │            BẮT TAY KÉP 2 CHIỀU               │
                    │         (DUAL HANDSHAKE WORKFLOW)            │
                    └──────────────────────────────────────────────┘

  [ CUSTOMER APP ]                                               [ STAFF COUNTER / PDA ]
         │                                                                  │
  1. Tạo phiếu Xuất Kho ──► Sinh QR Code + OTP 6 số (HMAC)                  │
         │                  (Gửi cho Shipper/Tài xế)                        │
         │                             │                                    │
         │                             ▼                                    │
         │                   Shipper đến kho quầy                           │
         │                             │                                    │
         │                             └──────────► 2. Quét QR / Gõ OTP ────┤
         │                                          (Hệ thống tự động:      │
         ▼                                           - Huỷ QR & OTP tức thì │
  Khóa nút HỦY trên App ◄─────────────────────────── - Chuyển PROCESSING)   │
  (Chống hủy khi đang bốc)                                                  │
                                                                            ▼
                                                                3. Bốc hàng theo vị trí Kệ/Tầng
                                                                4. Chụp ảnh kiện hàng + người nhận
                                                                5. Tài xế ký xác nhận trên màn hình
                                                                            │
  6. Nhận Push Notification & Ảnh bằng chứng ◄────────────────── 6. Bấm "Hoàn tất bàn giao"
     (Tồn kho khả dụng giảm ngay lập tức)                          (Hệ thống chạy @Transactional)
```

---

### 1. Luồng Xuất Kho An Toàn (Stock Out / Outbound Request)

#### Bước 1: Khách hàng tạo phiếu xuất kho trên App

- **Endpoint:** `POST /api/v1/customer-inventories/requests/outbound`
- **Request Body:**
  ```json
  {
    "contractId": "6ad1a2bbb3fa5fa49d2d02d0",
    "items": [
      {
        "skuId": "6ad1a2bbb3fa5fa49d2d02d1",
        "quantity": 10,
        "storageRackId": "6ad1a2bbb3fa5fa49d2d02d2",
        "rackTierId": "6ad1a2bbb3fa5fa49d2d02d3"
      }
    ],
    "transporterInfo": {
      "name": "Nguyễn Văn Shipper",
      "phoneNumber": "0901234567",
      "vehiclePlate": "59A-123.45",
      "deliveryCompany": "Lalamove"
    },
    "notes": "Hàng dễ vỡ, xin bốc cẩn thận"
  }
  ```
- **Xử lý UI:**
  - Backend trả về `pickupQrPayload` (dạng `PICKUP:REQ-OUT-20261025-0001:uuid-token`) và `rawOtpCode` (mã số 6 chữ số, ví dụ `482915`).
  - **LƯU Ý BẢO MẬT:** `rawOtpCode` **chỉ được trả về 1 lần duy nhất** tại response tạo phiếu này (DB chỉ lưu hash HMAC-SHA256).
  - Frontend hiển thị modal/drawer bảo mật: Render mã QR từ chuỗi `pickupQrPayload`, hiển thị 6 số OTP nổi bật kèm thời gian hết hạn (`expiresAt` - 24 giờ) và nút bấm **"Chia sẻ mã cho tài xế"** (Native Share sheet hoặc Copy).

#### Bước 2: Nhân viên kho đối soát tại quầy (Camera QR Scanner hoặc Nhập tay OTP)

- **Endpoint:** `POST /api/v1/customer-inventories/requests/verify-code`
- **Request Body (Khi dùng camera quét mã QR):**
  ```json
  {
    "pickupCode": "PICKUP:REQ-OUT-20261025-0001:7b6058e0-1c09-4ee7-b864-4bf819a8a306"
  }
  ```
- **Request Body (Khi tài xế đọc mã OTP 6 số gõ tay):**
  ```json
  {
    "pickupCode": "482915",
    "requestCode": "REQ-OUT-20261025-0001"
  }
  ```
- **Xử lý UI Staff:**
  - Hệ thống tự động chuyển trạng thái phiếu sang `PROCESSING`, xóa bỏ ngay mã OTP/QR trong database.
  - Trả về chi tiết phiếu kèm `transporterInfo` để Staff đối chiếu mặt tài xế + biển số xe.
  - Hiển thị danh sách ngăn kệ chi tiết cần bốc: Kệ `rackCode`, dãy `aisle`, khoang `bay`, tầng `tierNumber`.

#### Bước 3: Khóa chặt nút Hủy trên giao diện Khách hàng (Chống Race Condition)

- Khi phiếu ở trạng thái `PROCESSING`:
  - **Khách hàng KHÔNG thể hủy phiếu.** Ẩn hoặc disable nút "Hủy phiếu".
  - Nếu khách cố tình gọi `POST /api/v1/customer-inventories/requests/{id}/cancel-outbound`, backend sẽ trả lỗi `400` với mã `MESSAGE_CODE_634`.
  - Hiển thị banner cam trên App khách: _"Đơn xuất kho đang được nhân viên bốc hàng tại quầy. Để đảm bảo tính toàn vẹn hàng hóa, bạn không thể hủy đơn vào lúc này."_

#### Bước 4: Bàn giao vật lý & Bằng chứng tại quầy (Proof of Handover)

- **Endpoint:** `POST /api/v1/customer-inventories/requests/{id}/complete-outbound`
- **Trường hợp A: Bàn giao đủ 100% số lượng:**
  ```json
  {
    "evidenceImages": ["https://cdn.example.com/handover-box.jpg"],
    "signatureUrl": "https://cdn.example.com/driver-signature.png",
    "staffNotes": "Đã giao đủ 10 thùng nguyên đai nguyên kiện"
  }
  ```
- **Trường hợp B: Xuất một phần do hàng trên kệ thực tế bị móp/thiếu (`PARTIAL_OUTBOUND`):**
  - Staff chỉnh ô số lượng thực xuất `actualQuantity` nhỏ hơn số lượng khách đặt (ví dụ khách đặt 10 nhưng kệ chỉ còn 8 kiện nguyên vẹn):
  ```json
  {
    "actualItems": [
      {
        "skuId": "6ad1a2bbb3fa5fa49d2d02d1",
        "actualQuantity": 8
      }
    ],
    "discrepancyReason": "2 thùng ở góc tầng bị móp rách bao bì, giữ lại đối soát",
    "discrepancyImages": ["https://cdn.example.com/shelf-damaged-boxes.jpg"],
    "evidenceImages": ["https://cdn.example.com/handover-8-boxes.jpg"],
    "signatureUrl": "https://cdn.example.com/driver-sign.png"
  }
  ```
- **Xử lý UI:** Hệ thống chỉ trừ đúng 8 kiện trong tồn kho, ghi sổ cái `InventoryMovement` type `OUT` kèm lý do chênh lệch.

---

### 2. Luồng Nhập Kho & Tấm Khiên Bảo Vệ Nhân Viên (Stock In & Staff Assistance)

#### Bước 1: Tiếp nhận hàng bất ngờ tại kho (Staff-Assisted Inbound)

- Khi tài xế chở hàng đến kho mà khách hàng chưa kịp tạo phiếu trước trên App, Staff được quyền tạo phiếu tiếp nhận hộ nhưng **BẮT BUỘC tuân thủ cơ chế bảo vệ 3 lớp**:
- **Endpoint:** `POST /api/v1/customer-inventories/requests/inbound`
- **Request Body:**
  ```json
  {
    "contractId": "6ad1a2bbb3fa5fa49d2d02d0",
    "items": [
      {
        "skuId": "6ad1a2bbb3fa5fa49d2d02d1",
        "quantity": 20
      }
    ],
    "transporterInfo": {
      "name": "Bác Tài Xe Tải 50H-999.88",
      "phoneNumber": "0918889999",
      "vehiclePlate": "50H-999.88",
      "deliveryCompany": "Chành xe Phương Trang"
    },
    "evidenceImages": [
      "https://cdn.example.com/delivery-truck.jpg",
      "https://cdn.example.com/unloaded-pallets.jpg",
      "https://cdn.example.com/signed-waybill-receipt.jpg"
    ],
    "signatureUrl": "https://cdn.example.com/driver-signed.png",
    "staffNotes": "Tiếp nhận 20 kiện từ tài xế lúc 14h30, để tại khu Staging"
  }
  ```
- **YÊU CẦU UI STAFF:**
  - Form nhập hộ bắt buộc phải upload **tối thiểu 3 ảnh**:
    1. Ảnh 1: Toàn cảnh xe giao hàng và kiện hàng dỡ trước cửa kho.
    2. Ảnh 2: Cận cảnh tình trạng kiện hàng (rách/móp/ướt nếu có).
    3. Ảnh 3: Phiếu giao hàng giấy (Waybill) có chữ ký xác nhận số lượng của tài xế.
  - Khung Canvas chữ ký cảm ứng để tài xế ký tay trực tiếp xác nhận số lượng bàn giao.

#### Bước 2: Cách ly tại Khu vực Đệm (Inbound Staging Area)

- Sau khi Staff tạo phiếu, trạng thái là `PENDING_CUSTOMER_CONFIRMATION`.
- **QUY TẮC HIỂN THỊ TRÊN UI KHÁCH HÀNG:**
  - Số hàng này **TUYỆT ĐỐI CHƯA ĐƯỢC CỘNG VÀO TỒN KHO KHẢ DỤNG (`CustomerInventory`)**.
  - Khách hàng không thể tạo lệnh xuất kho cho số hàng này.
  - Trên màn hình danh sách tồn kho, hiển thị tab/banner riêng: _"Có 20 kiện hàng mới được nhân viên tiếp nhận tại quầy. Mời bạn kiểm tra hình ảnh và xác nhận."_
  - Hiển thị đồng hồ đếm ngược **24 giờ (Auto-Acceptance Policy)**: _"Nếu bạn không có phản hồi trong vòng 24h, phiếu sẽ tự động được phê duyệt theo điều khoản hợp đồng."_

#### Bước 3: Khách hàng xử lý tại Staging Area

- **Lựa chọn 1: Khách bấm "Xác nhận nhận hàng" (Confirm):**
  - **Endpoint:** `POST /api/v1/customer-inventories/requests/{id}/confirm-inbound`
  - Phiếu chuyển sang `READY_TO_PUTAWAY` (hoặc `COMPLETED` nếu đã có sẵn kệ tầng chỉ định).
- **Lựa chọn 2: Khách bấm "Khiếu nại số lượng / tình trạng" (Dispute):**
  - **Endpoint:** `POST /api/v1/customer-inventories/requests/{id}/dispute-inbound`
  - **Request Body:**
    ```json
    {
      "notes": "Tôi gửi 25 kiện nhưng biên bản ghi 20 kiện. Yêu cầu kiểm tra lại camera xe tải."
    }
    ```
  - Phiếu chuyển sang `DISPUTED`. Hàng giữ nguyên tại khu vực đệm cách ly, chuyển cho Quản lý cơ sở (`FACILITY_MANAGER`) làm việc 3 bên (Khách - Nhà xe - Kho).

#### Bước 4: Nhân viên xếp hàng lên kệ tầng (Putaway Workflow)

- Khi phiếu ở trạng thái `READY_TO_PUTAWAY`, trên màn hình Staff hiển thị nút **"Tiến hành xếp lên kệ (Putaway)"**.
- **Endpoint:** `POST /api/v1/customer-inventories/requests/{id}/putaway`
- **Request Body:**
  ```json
  {
    "placements": [
      {
        "skuId": "6ad1a2bbb3fa5fa49d2d02d1",
        "quantity": 20,
        "storageRackId": "6ad1a2bbb3fa5fa49d2d02d2",
        "rackTierId": "6ad1a2bbb3fa5fa49d2d02d3"
      }
    ]
  }
  ```
- **Xử lý UI:**
  - Tồn kho khả dụng chính thức tăng lên.
  - Trạng thái tầng kệ chuyển sang `OCCUPIED`.
  - Phiếu chuyển sang `COMPLETED`.

---

### 3. Tra Cứu & Lọc Danh Sách Phiếu Yêu Cầu

- **Endpoint:** `GET /api/v1/customer-inventories/requests`
- **Query Params hỗ trợ:**
  - `type`: `inbound` | `outbound`
  - `status`: `pending` | `pending_customer_confirmation` | `processing` | `ready_to_putaway` | `completed` | `disputed` | `cancelled`
  - `contractId`, `facilityId`, `customerId`
  - `search`: Tìm kiếm theo mã phiếu `requestCode` (vd: `REQ-OUT-20261025-0001`) hoặc tên/SĐT tài xế
  - `page`, `limit`, `sortBy`, `sortOrder`
- **Chi tiết 1 phiếu:** `GET /api/v1/customer-inventories/requests/{id}`

---

### 4. Bảng Quy Định Trạng Thái & Màu Sắc Badge Trên UI

| Trạng thái (`status`)           | Tên hiển thị trên UI   | Màu Badge     | Ý nghĩa nghiệp vụ                                                               |
| :------------------------------ | :--------------------- | :------------ | :------------------------------------------------------------------------------ |
| `PENDING`                       | Chờ lấy hàng           | Vàng (Yellow) | Khách đã tạo lệnh xuất, đang chờ Shipper đến kho xuất trình QR/OTP.             |
| `PENDING_CUSTOMER_CONFIRMATION` | Chờ khách xác nhận     | Cam (Orange)  | Hàng nhập hộ đang nằm tại khu đệm (Staging), chưa cộng vào tồn kho khả dụng.    |
| `PROCESSING`                    | Đang bốc hàng tại quầy | Xanh dương    | Staff đã quét QR/OTP hợp lệ, khóa nút hủy của khách, đang lấy hàng ra bàn giao. |
| `READY_TO_PUTAWAY`              | Sẵn sàng xếp lên kệ    | Tím (Purple)  | Khách đã xác nhận hàng nhập, chờ nhân viên đem hàng xếp vào tầng kệ.            |
| `COMPLETED`                     | Hoàn tất               | Xanh lá       | Đã bàn giao xong cho Shipper (Xuất) hoặc đã xếp ngay ngắn lên kệ tầng (Nhập).   |
| `DISPUTED`                      | Đang khiếu nại         | Đỏ (Red)      | Khách khiếu nại hàng nhập sai/hỏng, giữ nguyên tại khu đệm chờ quản lý xử lý.   |
| `CANCELLED`                     | Đã hủy                 | Xám (Gray)    | Khách chủ động hủy khi phiếu còn ở trạng thái `PENDING`.                        |
| `EXPIRED`                       | Hết hạn lấy hàng       | Nâu/Đen       | Quá 24h kể từ lúc tạo mà không có người đến xuất trình mã QR/OTP lấy hàng.      |

---

## V. HƯỚNG DẪN CHI TIẾT TÍCH HỢP UI: TASK 7D — PHIẾU YÊU CẦU NHẬP/XUẤT KHO & CƠ CHẾ BẮT TAY KÉP (DUAL HANDSHAKE)

> Phân hệ này áp dụng đặc thù cho mô hình **Kho kệ dùng chung có nhân viên phục vụ (`WAREHOUSE_RACK`)**. Khách hàng giám sát từ xa trên App/Web, ủy quyền cho Shipper/Tài xế đến lấy/giao hàng, và Nhân viên kho (`FACILITY_STAFF`) chịu trách nhiệm bốc xếp, kiểm đếm tại quầy.

```
                    ┌──────────────────────────────────────────────┐
                    │            BẮT TAY KÉP 2 CHIỀU               │
                    │         (DUAL HANDSHAKE WORKFLOW)            │
                    └──────────────────────────────────────────────┘

  [ CUSTOMER APP ]                                               [ STAFF COUNTER / PDA ]
         │                                                                  │
  1. Tạo phiếu Xuất Kho ──► Sinh QR Code + OTP 6 số (HMAC)                  │
         │                  (Gửi cho Shipper/Tài xế)                        │
         │                             │                                    │
         │                             ▼                                    │
         │                   Shipper đến kho quầy                           │
         │                             │                                    │
         │                             └──────────► 2. Quét QR / Gõ OTP ────┤
         │                                          (Hệ thống tự động:      │
         ▼                                           - Huỷ QR & OTP tức thì │
  Khóa nút HỦY trên App ◄─────────────────────────── - Chuyển PROCESSING)   │
  (Chống hủy khi đang bốc)                                                  │
                                                                            ▼
                                                                3. Bốc hàng theo vị trí Kệ/Tầng
                                                                4. Chụp ảnh kiện hàng + người nhận
                                                                5. Tài xế ký xác nhận trên màn hình
                                                                            │
  6. Nhận Push Notification & Ảnh bằng chứng ◄────────────────── 6. Bấm "Hoàn tất bàn giao"
     (Tồn kho khả dụng giảm ngay lập tức)                          (Hệ thống chạy @Transactional)
```

---

### 1. Luồng Xuất Kho An Toàn (Stock Out / Outbound Request)

#### Bước 1: Khách hàng tạo phiếu xuất kho trên App

- **Endpoint:** `POST /api/v1/customer-inventories/requests/outbound`
- **Request Body:**
  ```json
  {
    "contractId": "6ad1a2bbb3fa5fa49d2d02d0",
    "items": [
      {
        "skuId": "6ad1a2bbb3fa5fa49d2d02d1",
        "quantity": 10,
        "storageRackId": "6ad1a2bbb3fa5fa49d2d02d2",
        "rackTierId": "6ad1a2bbb3fa5fa49d2d02d3"
      }
    ],
    "transporterInfo": {
      "name": "Nguyễn Văn Shipper",
      "phoneNumber": "0901234567",
      "vehiclePlate": "59A-123.45",
      "deliveryCompany": "Lalamove"
    },
    "notes": "Hàng dễ vỡ, xin bốc cẩn thận"
  }
  ```
- **Xử lý UI:**
  - Backend trả về `pickupQrPayload` (dạng `PICKUP:REQ-OUT-20261025-0001:uuid-token`) và `rawOtpCode` (mã số 6 chữ số, ví dụ `482915`).
  - **LƯU Ý BẢO MẬT:** `rawOtpCode` **chỉ được trả về 1 lần duy nhất** tại response tạo phiếu này (DB chỉ lưu hash HMAC-SHA256).
  - Frontend hiển thị modal/drawer bảo mật: Render mã QR từ chuỗi `pickupQrPayload`, hiển thị 6 số OTP nổi bật kèm thời gian hết hạn (`expiresAt` - 24 giờ) và nút bấm **"Chia sẻ mã cho tài xế"** (Native Share sheet hoặc Copy).

#### Bước 2: Nhân viên kho đối soát tại quầy (Camera QR Scanner hoặc Nhập tay OTP)

- **Endpoint:** `POST /api/v1/customer-inventories/requests/verify-code`
- **Request Body (Khi dùng camera quét mã QR):**
  ```json
  {
    "pickupCode": "PICKUP:REQ-OUT-20261025-0001:7b6058e0-1c09-4ee7-b864-4bf819a8a306"
  }
  ```
- **Request Body (Khi tài xế đọc mã OTP 6 số gõ tay):**
  ```json
  {
    "pickupCode": "482915",
    "requestCode": "REQ-OUT-20261025-0001"
  }
  ```
- **Xử lý UI Staff:**
  - Hệ thống tự động chuyển trạng thái phiếu sang `PROCESSING`, xóa bỏ ngay mã OTP/QR trong database.
  - Trả về chi tiết phiếu kèm `transporterInfo` để Staff đối chiếu mặt tài xế + biển số xe.
  - Hiển thị danh sách ngăn kệ chi tiết cần bốc: Kệ `rackCode`, dãy `aisle`, khoang `bay`, tầng `tierNumber`.

#### Bước 3: Khóa chặt nút Hủy trên giao diện Khách hàng (Chống Race Condition)

- Khi phiếu ở trạng thái `PROCESSING`:
  - **Khách hàng KHÔNG thể hủy phiếu.** Ẩn hoặc disable nút "Hủy phiếu".
  - Nếu khách cố tình gọi `POST /api/v1/customer-inventories/requests/{id}/cancel-outbound`, backend sẽ trả lỗi `400` với mã `MESSAGE_CODE_634`.
  - Hiển thị banner cam trên App khách: _"Đơn xuất kho đang được nhân viên bốc hàng tại quầy. Để đảm bảo tính toàn vẹn hàng hóa, bạn không thể hủy đơn vào lúc này."_

#### Bước 4: Bàn giao vật lý & Bằng chứng tại quầy (Proof of Handover)

- **Endpoint:** `POST /api/v1/customer-inventories/requests/{id}/complete-outbound`
- **Trường hợp A: Bàn giao đủ 100% số lượng:**
  ```json
  {
    "evidenceImages": ["https://cdn.example.com/handover-box.jpg"],
    "signatureUrl": "https://cdn.example.com/driver-signature.png",
    "staffNotes": "Đã giao đủ 10 thùng nguyên đai nguyên kiện"
  }
  ```
- **Trường hợp B: Xuất một phần do hàng trên kệ thực tế bị móp/thiếu (`PARTIAL_OUTBOUND`):**
  - Staff chỉnh ô số lượng thực xuất `actualQuantity` nhỏ hơn số lượng khách đặt (ví dụ khách đặt 10 nhưng kệ chỉ còn 8 kiện nguyên vẹn):
  ```json
  {
    "actualItems": [
      {
        "skuId": "6ad1a2bbb3fa5fa49d2d02d1",
        "actualQuantity": 8
      }
    ],
    "discrepancyReason": "2 thùng ở góc tầng bị móp rách bao bì, giữ lại đối soát",
    "discrepancyImages": ["https://cdn.example.com/shelf-damaged-boxes.jpg"],
    "evidenceImages": ["https://cdn.example.com/handover-8-boxes.jpg"],
    "signatureUrl": "https://cdn.example.com/driver-sign.png"
  }
  ```
- **Xử lý UI:** Hệ thống chỉ trừ đúng 8 kiện trong tồn kho, ghi sổ cái `InventoryMovement` type `OUT` kèm lý do chênh lệch.

---

### 2. Luồng Nhập Kho & Tấm Khiên Bảo Vệ Nhân Viên (Stock In & Staff Assistance)

#### Bước 1: Tiếp nhận hàng bất ngờ tại kho (Staff-Assisted Inbound)

- Khi tài xế chở hàng đến kho mà khách hàng chưa kịp tạo phiếu trước trên App, Staff được quyền tạo phiếu tiếp nhận hộ nhưng **BẮT BUỘC tuân thủ cơ chế bảo vệ 3 lớp**:
- **Endpoint:** `POST /api/v1/customer-inventories/requests/inbound`
- **Request Body:**
  ```json
  {
    "contractId": "6ad1a2bbb3fa5fa49d2d02d0",
    "items": [
      {
        "skuId": "6ad1a2bbb3fa5fa49d2d02d1",
        "quantity": 20
      }
    ],
    "transporterInfo": {
      "name": "Bác Tài Xe Tải 50H-999.88",
      "phoneNumber": "0918889999",
      "vehiclePlate": "50H-999.88",
      "deliveryCompany": "Chành xe Phương Trang"
    },
    "evidenceImages": [
      "https://cdn.example.com/delivery-truck.jpg",
      "https://cdn.example.com/unloaded-pallets.jpg",
      "https://cdn.example.com/signed-waybill-receipt.jpg"
    ],
    "signatureUrl": "https://cdn.example.com/driver-signed.png",
    "staffNotes": "Tiếp nhận 20 kiện từ tài xế lúc 14h30, để tại khu Staging"
  }
  ```
- **YÊU CẦU UI STAFF:**
  - Form nhập hộ bắt buộc phải upload **tối thiểu 3 ảnh**:
    1. Ảnh 1: Toàn cảnh xe giao hàng và kiện hàng dỡ trước cửa kho.
    2. Ảnh 2: Cận cảnh tình trạng kiện hàng (rách/móp/ướt nếu có).
    3. Ảnh 3: Phiếu giao hàng giấy (Waybill) có chữ ký xác nhận số lượng của tài xế.
  - Khung Canvas chữ ký cảm ứng để tài xế ký tay trực tiếp xác nhận số lượng bàn giao.

#### Bước 2: Cách ly tại Khu vực Đệm (Inbound Staging Area)

- Sau khi Staff tạo phiếu, trạng thái là `PENDING_CUSTOMER_CONFIRMATION`.
- **QUY TẮC HIỂN THỊ TRÊN UI KHÁCH HÀNG:**
  - Số hàng này **TUYỆT ĐỐI CHƯA ĐƯỢC CỘNG VÀO TỒN KHO KHẢ DỤNG (`CustomerInventory`)**.
  - Khách hàng không thể tạo lệnh xuất kho cho số hàng này.
  - Trên màn hình danh sách tồn kho, hiển thị tab/banner riêng: _"Có 20 kiện hàng mới được nhân viên tiếp nhận tại quầy. Mời bạn kiểm tra hình ảnh và xác nhận."_
  - Hiển thị đồng hồ đếm ngược **24 giờ (Auto-Acceptance Policy)**: _"Nếu bạn không có phản hồi trong vòng 24h, phiếu sẽ tự động được phê duyệt theo điều khoản hợp đồng."_

#### Bước 3: Khách hàng xử lý tại Staging Area

- **Lựa chọn 1: Khách bấm "Xác nhận nhận hàng" (Confirm):**
  - **Endpoint:** `POST /api/v1/customer-inventories/requests/{id}/confirm-inbound`
  - Phiếu chuyển sang `READY_TO_PUTAWAY` (hoặc `COMPLETED` nếu đã có sẵn kệ tầng chỉ định).
- **Lựa chọn 2: Khách bấm "Khiếu nại số lượng / tình trạng" (Dispute):**
  - **Endpoint:** `POST /api/v1/customer-inventories/requests/{id}/dispute-inbound`
  - **Request Body:**
    ```json
    {
      "notes": "Tôi gửi 25 kiện nhưng biên bản ghi 20 kiện. Yêu cầu kiểm tra lại camera xe tải."
    }
    ```
  - Phiếu chuyển sang `DISPUTED`. Hàng giữ nguyên tại khu vực đệm cách ly, chuyển cho Quản lý cơ sở (`FACILITY_MANAGER`) làm việc 3 bên (Khách - Nhà xe - Kho).

#### Bước 4: Nhân viên xếp hàng lên kệ tầng (Putaway Workflow)

- Khi phiếu ở trạng thái `READY_TO_PUTAWAY`, trên màn hình Staff hiển thị nút **"Tiến hành xếp lên kệ (Putaway)"**.
- **Endpoint:** `POST /api/v1/customer-inventories/requests/{id}/putaway`
- **Request Body:**
  ```json
  {
    "placements": [
      {
        "skuId": "6ad1a2bbb3fa5fa49d2d02d1",
        "quantity": 20,
        "storageRackId": "6ad1a2bbb3fa5fa49d2d02d2",
        "rackTierId": "6ad1a2bbb3fa5fa49d2d02d3"
      }
    ]
  }
  ```
- **Xử lý UI:**
  - Tồn kho khả dụng chính thức tăng lên.
  - Trạng thái tầng kệ chuyển sang `OCCUPIED`.
  - Phiếu chuyển sang `COMPLETED`.

---

### 3. Tra Cứu & Lọc Danh Sách Phiếu Yêu Cầu

- **Endpoint:** `GET /api/v1/customer-inventories/requests`
- **Query Params hỗ trợ:**
  - `type`: `inbound` | `outbound`
  - `status`: `pending` | `pending_customer_confirmation` | `processing` | `ready_to_putaway` | `completed` | `disputed` | `cancelled`
  - `contractId`, `facilityId`, `customerId`
  - `search`: Tìm kiếm theo mã phiếu `requestCode` (vd: `REQ-OUT-20261025-0001`) hoặc tên/SĐT tài xế
  - `page`, `limit`, `sortBy`, `sortOrder`
- **Chi tiết 1 phiếu:** `GET /api/v1/customer-inventories/requests/{id}`

---

### 4. Bảng Quy Định Trạng Thái & Màu Sắc Badge Trên UI

| Trạng thái (`status`)           | Tên hiển thị trên UI   | Màu Badge     | Ý nghĩa nghiệp vụ                                                               |
| :------------------------------ | :--------------------- | :------------ | :------------------------------------------------------------------------------ |
| `PENDING`                       | Chờ lấy hàng           | Vàng (Yellow) | Khách đã tạo lệnh xuất, đang chờ Shipper đến kho xuất trình QR/OTP.             |
| `PENDING_CUSTOMER_CONFIRMATION` | Chờ khách xác nhận     | Cam (Orange)  | Hàng nhập hộ đang nằm tại khu đệm (Staging), chưa cộng vào tồn kho khả dụng.    |
| `PROCESSING`                    | Đang bốc hàng tại quầy | Xanh dương    | Staff đã quét QR/OTP hợp lệ, khóa nút hủy của khách, đang lấy hàng ra bàn giao. |
| `READY_TO_PUTAWAY`              | Sẵn sàng xếp lên kệ    | Tím (Purple)  | Khách đã xác nhận hàng nhập, chờ nhân viên đem hàng xếp vào tầng kệ.            |
| `COMPLETED`                     | Hoàn tất               | Xanh lá       | Đã bàn giao xong cho Shipper (Xuất) hoặc đã xếp ngay ngắn lên kệ tầng (Nhập).   |
| `DISPUTED`                      | Đang khiếu nại         | Đỏ (Red)      | Khách khiếu nại hàng nhập sai/hỏng, giữ nguyên tại khu đệm chờ quản lý xử lý.   |
| `CANCELLED`                     | Đã hủy                 | Xám (Gray)    | Khách chủ động hủy khi phiếu còn ở trạng thái `PENDING`.                        |
| `EXPIRED`                       | Hết hạn lấy hàng       | Nâu/Đen       | Quá 24h kể từ lúc tạo mà không có người đến xuất trình mã QR/OTP lấy hàng.      |
