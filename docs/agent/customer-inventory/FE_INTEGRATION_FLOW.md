# HƯỚNG DẪN TÍCH HỢP FRONTEND — TOÀN BỘ FLOW CHỌN LOẠI KHO & QUẢN LÝ SKU TRÊN KỆ TẦNG

> **Dành cho:** Frontend Agent (Web & Mobile App)  
> **Phân hệ:** `customer-inventory` & `customer-sku` & `storage-rack`  
> **Mục tiêu:** Hướng dẫn chi tiết luồng nghiệp vụ từ lúc Khách hàng chọn loại kho (có kệ vs không kệ), tạo danh mục hàng hóa (SKU), hiển thị sơ đồ trực quan các ngăn kệ, đến thao tác thêm/nhập/xuất/chuyển SKU vào từng ngăn của kệ.

---

## I. TỔNG QUAN KIẾN TRÚC & MÔ HÌNH DỮ LIỆU CỐT LÕI

Để xây dựng giao diện chính xác, Frontend cần nắm rõ 4 cấp độ phân tầng vật lý của hệ thống Self-Storage:

```
[ Cơ sở (Facility) ]
       │
       ▼
[ Phòng kho vật lý (StorageUnit) ] (Thuộc một Hợp đồng Contract ACTIVE)
       │
       ├─── KHÔNG KỆ (LOCKER, SMALL, LARGE) ──► Toàn bộ hàng xếp dưới sàn: [ Unracked Items ]
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
       [ Mặt hàng của Khách (CustomerSku) ] (Lưu trữ số lượng tồn quantity)
```

### 1. Phân loại 4 nhóm phòng kho thực tế (`UnitTypeCategoryEnum`)

| Loại kho (`category`) | Kích thước & Thể tích                                     | Có hệ thống Kệ tầng không? | Cách hiển thị trên UI cho Khách                                            |
| :-------------------- | :-------------------------------------------------------- | :------------------------: | :------------------------------------------------------------------------- |
| `LOCKER`              | Tủ nhỏ ($S < 1.5\,\text{m}^2$, $V < 2\,\text{m}^3$)       |          ❌ Không          | Tủ cá nhân, để đồ trực tiếp                                                |
| `SMALL`               | Phòng nhỏ ($1.5 - 6\,\text{m}^2$, $3.5 - 15\,\text{m}^3$) |          ❌ Không          | Phòng để đồ gia dụng/phòng trọ, xếp sàn                                    |
| `LARGE`               | Phòng lớn ($6 - 15\,\text{m}^2$, $15 - 40\,\text{m}^3$)   |          ❌ Không          | Chuyển nhà, nội thất lớn, xếp sàn                                          |
| `WAREHOUSE_RACK`      | Kho hàng ($\ge 15\,\text{m}^2$, $\ge 45\,\text{m}^3$)     |  ✅ **Có sẵn Kệ & Tầng**   | **Kho hàng chuyên nghiệp, hỗ trợ phân loại hàng theo từng Kệ & Tầng/Ngăn** |

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
    "storageUnit": {
      "id": "663000000000000000000001",
      "unitNumber": "RACK-101",
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
        "rackCode": "R01",
        "name": "Kệ số 1",
        "tierCount": 4,
        "tiers": [
          {
            "id": "tier_01_id",
            "tierNumber": 1,
            "tierCode": "R01-T01",
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
            "tierCode": "R01-T02",
            "status": "available",
            "items": []
          }
        ]
      }
    ],
    "unrackedItems": []
  }
}
```

#### 3. Quy chuẩn Hiển thị Sơ đồ trên UI (UI/UX Best Practices):

1. **Header Thống kê (Summary Bar):**
   - Hiển thị badge: `Tổng số lượng hàng: 42 món` | `SKU khác nhau: 5 loại` | `Số tầng đã dùng: 4/12 (33% lấp đầy)`.
2. **Tab / Khu vực chuyển đổi Kệ:**
   - Nếu kho có 3 kệ (`R01`, `R02`, `R03`), FE có thể render dạng **Tab Bar** hoặc **Lưới 3D/2D trực quan**.
3. **Màu sắc trạng thái từng Tầng / Ngăn Kệ:**
   - 🟢 **Màu Xanh lá (`AVAILABLE`):** Tầng trống hoàn toàn (`items.length === 0`). Sẵn sàng nhận hàng mới.
   - 🟠 **Màu Cam / Xanh dương (`OCCUPIED`):** Tầng đang chứa hàng (`items.length > 0`). Hiển thị danh sách badge/thumbnail các sản phẩm đang nằm trong tầng này.
   - ⚪ **Màu Xám / Vàng (`MAINTENANCE` / `INACTIVE`):** Đang bảo trì, tạm khóa không cho click nhập hàng.
4. **Khu vực Hàng Để Sàn (`unrackedItems`):**
   - Đặt ở đáy màn hình: _"Khu vực để đồ dưới sàn (Không dùng kệ)"_. Dành cho các kiện hàng lớn, cồng kềnh hoặc pallet hàng.

---

### BƯỚC 5: Thao Tác Thêm / Nhập SKU Vào Từng Ngăn Của Kệ (Stock In Flow)

#### 1. Luồng Người Dùng (User Action):

1. Trên sơ đồ kệ, khách hàng chạm/click vào một **Tầng kệ cụ thể** (Ví dụ: Chạm vào ngăn `R01-T02` đang trống hoặc `R01-T01` muốn thêm).
2. FE hiển thị Modal / Bottom Sheet: **"Nhập hàng vào ngăn: Kệ R01 - Tầng 2"**.
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

_(Nếu là hàng để sàn, truyền `"rackTierId": null`)_.

#### 3. Phản hồi & Cập nhật UI:

- Backend thực thi trong Database Transaction:
  1. Tăng tồn kho của SKU tại ngăn `R01-T02`.
  2. Ghi một dòng vào sổ cái bất biến `InventoryMovement` loại `IN`.
  3. Tự động chuyển trạng thái ngăn `R01-T02` từ `AVAILABLE` sang `OCCUPIED`.
- FE làm mới dữ liệu (`invalidateQueries(['storage-unit-tree'])`):
  - Ngăn `R01-T02` lập tức đổi màu sang **Cam (`OCCUPIED`)**.
  - Hiển thị badge: `SKU-TEA-01 x 15 bộ`.
  - Bắn Toast thông báo thành công: _"Đã nhập 15 bộ tách trà vào Kệ R01 - Tầng 2 thành công!"_.

---

### BƯỚC 6: Các Thao Tác Vận Hành Khác Trên Ngăn Kệ

Khi click vào một ngăn kệ đang có hàng (`OCCUPIED`), FE mở danh sách chi tiết các mặt hàng trong ngăn đó và cung cấp 3 nút hành động:

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
- **Hệ quả State Machine:** Nếu khách xuất hết toàn bộ hàng trong ngăn (`quantity = 0`), Backend tự động chuyển tầng kệ về `AVAILABLE`. FE tự động đổi màu ngăn về Xanh lá.

#### 2. Chuyển hàng giữa các ngăn kệ (`Stock Move`):

- Khách muốn sắp xếp lại kho, chuyển 5 thùng từ Tầng 1 sang Tầng 3.
- FE cung cấp giao diện Kéo-thả (Drag & Drop) hoặc Form chọn:
  - Ngăn nguồn: `R01-T01`.
  - Ngăn đích: `R01-T03`.
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
- Backend trừ tồn ngăn nguồn và cộng tồn ngăn đích nguyên tử. Cập nhật trạng thái cả hai tầng đồng thời.

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
        "storageUnit": { "unitNumber": "RACK-101" },
        "storageRack": { "rackCode": "R01", "name": "Kệ số 1" },
        "rackTier": { "tierCode": "R01-T01", "tierNumber": 1 },
        "quantity": 10
      },
      {
        "storageUnit": { "unitNumber": "RACK-101" },
        "storageRack": { "rackCode": "R01", "name": "Kệ số 1" },
        "rackTier": { "tierCode": "R01-T03", "tierNumber": 3 },
        "quantity": 15
      }
    ]
  }
  ```
- **Hành vi UI:** FE hiển thị thông báo: _"Mặt hàng này đang nằm ở Kệ R01 - Tầng 1 (10 bộ) và Kệ R01 - Tầng 3 (15 bộ)"_. Sơ đồ kệ tự động nhấp nháy (highlight) 2 ngăn này.

---

### BƯỚC 8: Bảng Điều Khiển Tổng Quan Tồn Kho (Personal Inventory Dashboard)

Tại trang chủ Mobile App hoặc Customer Web Portal:

- Gọi API:
  ```http
  GET /api/v1/customer-inventories/summary
  ```
- Render các widget:
  1. **Thống kê Card:** Tổng số SKU (`totalSkus`), Tổng số lượng hàng trong kho (`totalQuantity`), Số phòng kho đang thuê (`totalStorageUnits`).
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

---

## IV. GỢI Ý CẤU TRÚC COMPONENT TREE CHO FRONTEND

```
📁 CustomerInventoryModule/
├── 📄 InventoryDashboardView.tsx            (Bước 8: Tổng quan, pie chart ngành hàng, recent movements)
├── 📄 SkuManagementView.tsx                 (Bước 3: Quản lý danh mục mặt hàng SKU, nút scan barcode)
│   ├── 🧩 CreateSkuModal.tsx                (Form thêm SKU mới kèm kích thước, barcode camera)
│   └── 🧩 SkuDetailDrawer.tsx               (Xem thông tin & các vị trí đang cất SKU)
├── 📄 StorageUnitVisualTreeView.tsx         (Bước 4: Sơ đồ trực quan phòng kho & các kệ tầng)
│   ├── 🧩 RackTabs.tsx                      (Chuyển đổi giữa các kệ R01, R02, R03)
│   ├── 🧩 RackTierGrid.tsx                  (Lưới trực quan các tầng: Xanh/Cam kèm badge số lượng)
│   ├── 🧩 UnrackedFloorSection.tsx          (Khu vực để đồ dưới sàn phòng)
│   ├── 🧩 StockInModal.tsx                  (Bước 5: Thêm SKU vào ngăn kệ đã chọn)
│   ├── 🧩 StockOutModal.tsx                 (Bước 6.1: Lấy hàng ra khỏi ngăn)
│   ├── 🧩 StockMoveModal.tsx                (Bước 6.2: Dời hàng sang ngăn khác)
│   └── 🧩 StockAdjustModal.tsx              (Bước 6.3: Kiểm kê điều chỉnh số dư)
└── 📄 BarcodeScannerModal.tsx               (Bước 7: Quét camera tra cứu ngăn kệ tức thì)
```
