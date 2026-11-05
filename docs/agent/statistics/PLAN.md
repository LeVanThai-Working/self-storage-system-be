# Kế Hoạch Nghiệp Vụ & Thiết Kế Task: Phân Hệ Thống Kê, Phân Tích Xu Hướng Thuê & Đánh Giá KPI Chi Nhánh (`statistics`)

> **Căn cứ:**
>
> - [AGENTS.md](file:///d:/Studying/FALL2026/self-storage-system-be/.agents/rules/AGENTS.md)
> - Tổng hợp từ kiến trúc dữ liệu hiện tại của hệ thống Self-Storage (`Facility`, `StorageUnit`, `StorageRack`, `UnitType`, `FacilityUnitTypeOffering`, `FacilityAmenityOffering`, `Reservation`, `Contract`, `Invoice`, `Payment`, `PaymentTransaction`, `RefundRequest`, `Incident`, `SupportTicket`, `AccessSchedule`, `CustomerInventory`, `InventoryMovement`, `ApprovalRequest`).
> - Tài liệu này thiết lập toàn bộ quy tắc tính toán, công thức chấm điểm KPI chi nhánh, thuật toán phát hiện khoảng thời gian cao điểm / thấp điểm, ma trận phân quyền 2 lớp (Rule 14) và lộ trình triển khai cho phân hệ **`statistics`**.

---

## 1. Mục Tiêu & Phạm Vi Phân Hệ

1. **Tổng quan Điều hành Toàn chuỗi (`GET /statistics/overview`):**
   - Cung cấp bức tranh toàn cảnh về quy mô chuỗi (số chi nhánh hoạt động, tổng số phòng kho & kệ kho, tỷ lệ lấp đầy theo phòng / kệ / diện tích $\text{m}^2$).
   - Dòng tiền thực thu, doanh thu ròng, tốc độ tăng trưởng so với kỳ liền trước (`growthPercent`), tiền cọc đang giữ và công nợ quá hạn.
   - Bảng cảnh báo công việc tồn đọng cần `BUSINESS_OPS_MANAGER` xử lý ngay (`actionRequired`: yêu cầu phê duyệt `ApprovalRequest`, hoàn tiền $\ge 10\text{M VND}$, giao dịch SePay chưa khớp `UNMATCHED`, sự cố nghiêm trọng `HIGH`/`CRITICAL`).
2. **Phân tích Xu hướng Thời gian, Mùa vụ Cao/Thấp điểm & Khung giờ Thuê (`GET /statistics/rental-trends`):**
   - Thống kê chuỗi thời gian theo độ mịn (`day`, `week`, `month`, `quarter`) chuẩn múi giờ Việt Nam (`Asia/Ho_Chi_Minh`).
   - **Tự động chỉ ra Khoảng thời gian hay được thuê nhất (`peakPeriods`) và Khoảng thời gian ít người thuê nhất (`lowPeriods`)** kèm tỷ lệ lệch so với trung bình để hỗ trợ quyết định giá và khuyến mãi.
   - Phân bổ nhu cầu theo **Thứ trong tuần (`dayOfWeekDistribution`)**, theo **Khung giờ hẹn check-in / ra vào kho (`timeSlotDemand`)**, theo **Giờ đặt đơn online trong ngày (`hourOfDayDistribution`)**, và theo **Thời hạn thuê / Chu kỳ thanh toán (`durationBreakdown`: `DAY` vs `MONTH`, `<=14d`, `1m`, `2-3m`, `4-6m`, `>6m`)**.
3. **Bảng xếp hạng & Chấm điểm KPI Chi nhánh (`GET /statistics/facilities-kpi`):**
   - Đánh giá khách quan từng chi nhánh (`Facility`) qua **4 trụ cột KPI định lượng**:
     - Hiệu suất Lấp đầy (`Occupancy`: kho, kệ, diện tích $\text{m}^2$, tỷ lệ kẹt bảo trì `maintenanceDragRate`).
     - Hiệu quả Tài chính & Thu hồi nợ (`Financial & Collection`: doanh thu thực thu, doanh thu ròng, `RevPAU`, `RevPAM`, tỷ lệ thu hóa đơn đúng hạn `collectionRate`, tỷ lệ nợ quá hạn).
     - Chuyển đổi & Giữ chân khách hàng (`Conversion & Retention`: tỷ lệ chuyển đổi đặt chỗ thành hợp đồng, tỷ lệ khách Walk-in, tỷ lệ gia hạn hợp đồng `renewalRate`).
     - Chất lượng Vận hành & SLA (`Operations & SLA`: số lần hủy đơn lỗi cơ sở `FACILITY_FAULT`, tỷ lệ giải quyết sự cố & ticket hỗ trợ, thời gian xác nhận đơn trung bình).
   - Tổng hợp điểm `kpiScore` (thang `0–100`), phân hạng `kpiTier` (`EXCELLENT`, `GOOD`, `AVERAGE`, `NEEDS_IMPROVEMENT`), xếp hạng `rank` và sinh cảnh báo tự động (`alerts`) cho từng chi nhánh.
4. **Phân tích Tài chính, Doanh thu, Tuổi nợ & Hoàn tiền (`GET /statistics/financial-analytics`):**
   - Biểu đồ dòng tiền theo thời gian, cơ cấu nguồn thu theo hạng mục hóa đơn (`RENT`, `AMENITY`, `OVERDUE_FEE`, `DAMAGE_FEE`, `DISCOUNT`), cơ cấu phương thức thanh toán (`SEPAY_QR`, `CASH`, `BANK_TRANSFER`), sức khỏe đối soát cổng SePay, báo cáo tuổi nợ hóa đơn (`overdueAging`: `1-3d`, `4-7d`, `8-15d`, `>15d`) và phân tích hoàn tiền theo lý do (`RefundRequestReasonEnum`).
5. **Phân tích Hiệu suất Sản phẩm (Loại Kho, Kệ, Tiện ích) & Phễu Vận hành (`GET /statistics/product-and-operations`):**
   - So sánh hiệu suất lấp đầy và doanh thu theo `UnitType` / `UnitTypeCategoryEnum` (`LOCKER`, `SMALL`, `LARGE`, `WAREHOUSE_RACK`) và theo phân khu kệ `RackZoneEnum` (`PRIME`, `STANDARD`, `ECONOMY`).
   - Top tiện ích đi kèm (`Amenity`) và tỷ lệ mua kèm tiện ích (`amenityAttachRate`).
   - Phễu chuyển đổi đặt chỗ (`bookingFunnel`) và lưu lượng ra vào kho tự quản (`AccessSchedule` & `InventoryMovement`).

---

## 2. Ma Trận Phân Quyền 2 Lớp (AGENTS.md Mục 14)

| Endpoint                                 |           `SYSTEM_ADMIN`            |       `BUSINESS_OPS_MANAGER`        |             `FACILITY_MANAGER`             | `FACILITY_STAFF` |   `CUSTOMER`   |
| :--------------------------------------- | :---------------------------------: | :---------------------------------: | :----------------------------------------: | :--------------: | :------------: |
| `GET /statistics/overview`               | ✅ Toàn hệ thống / Lọc `facilityId` | ✅ Toàn hệ thống / Lọc `facilityId` |    ✅ Chỉ `assignedFacilityId` của mình    |  ❌ 403 (`103`)  | ❌ 403 (`103`) |
| `GET /statistics/rental-trends`          | ✅ Toàn hệ thống / Lọc `facilityId` | ✅ Toàn hệ thống / Lọc `facilityId` |    ✅ Chỉ `assignedFacilityId` của mình    |  ❌ 403 (`103`)  | ❌ 403 (`103`) |
| `GET /statistics/facilities-kpi`         |     ✅ Bảng xếp hạng toàn chuỗi     |     ✅ Bảng xếp hạng toàn chuỗi     | ✅ Chỉ cơ sở `assignedFacilityId` của mình |  ❌ 403 (`103`)  | ❌ 403 (`103`) |
| `GET /statistics/financial-analytics`    | ✅ Toàn hệ thống / Lọc `facilityId` | ✅ Toàn hệ thống / Lọc `facilityId` |    ✅ Chỉ `assignedFacilityId` của mình    |  ❌ 403 (`103`)  | ❌ 403 (`103`) |
| `GET /statistics/product-and-operations` | ✅ Toàn hệ thống / Lọc `facilityId` | ✅ Toàn hệ thống / Lọc `facilityId` |    ✅ Chỉ `assignedFacilityId` của mình    |  ❌ 403 (`103`)  | ❌ 403 (`103`) |

> **Quy tắc kiểm tra phạm vi cơ sở cho `FACILITY_MANAGER`:**
>
> - Nếu tài khoản `FACILITY_MANAGER` chưa được gán cơ sở (`!caller.assignedFacilityId` và không phải `Facility.managerId`) $\rightarrow$ từ chối `403 MESSAGE_CODE_103`.
> - Nếu `FACILITY_MANAGER` truyền `query.facilityId` khác với cơ sở mình phụ trách $\rightarrow$ từ chối `403 MESSAGE_CODE_122`.

---

## 3. Quyết Định Nghiệp Vụ (`[OPEN D-STAT.x]`)

|       ID       | Vấn đề / Quyết định                                                  | Giá trị mặc định áp dụng                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Đặt ở đâu                         |
| :------------: | :------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------- |
| **`D-STAT.1`** | Khoảng thời gian mặc định & giới hạn tối đa khi truy vấn             | Mặc định **30 ngày gần nhất** theo lịch VN (`startOfDayVN(now - 29d)` đến `endOfDayVN(now)`); tối đa **366 ngày** (`maxRangeDays = 366`). Vi phạm ném `400 MESSAGE_CODE_820`.                                                                                                                                                                                                                                                                                               | `src/config/statistics.config.ts` |
| **`D-STAT.2`** | Trọng số tính điểm KPI Chi nhánh (`kpiScore` 0–100)                  | - `occupancyWeight = 0.30` (Mục tiêu lấp đầy chuẩn `targetOccupancyRate = 80%` đạt 100đ; phạt nếu `maintenanceDragRate > 15%`)<br>- `collectionWeight = 0.25` (Dựa trên `invoiceCollectionRate` và trừ phạt `overdueContractRate`)<br>- `conversionWeight = 0.20` (Kết hợp `reservationConversionRate` 70% + `contractRenewalRate` 30%)<br>- `operationsWeight = 0.25` (100đ trừ `15đ` cho mỗi đơn hủy `FACILITY_FAULT`, kết hợp tỷ lệ giải quyết xong sự cố & ticket CSKH) | `src/config/statistics.config.ts` |
| **`D-STAT.3`** | Ngưỡng phân hạng KPI Chi nhánh (`FacilityKpiTierEnum`)               | - `EXCELLENT`: $\ge 85$<br>- `GOOD`: $70 \le \text{score} < 85$<br>- `AVERAGE`: $50 \le \text{score} < 70$<br>- `NEEDS_IMPROVEMENT`: $< 50$                                                                                                                                                                                                                                                                                                                                 | `src/config/statistics.config.ts` |
| **`D-STAT.4`** | Số lượng mốc Cao điểm (`peakPeriods`) & Ít người thuê (`lowPeriods`) | Trả về Top **3** mốc cao nhất và Top **3** mốc thấp nhất (kèm `%` chênh lệch so với trung bình `varianceFromAvgPercent`)                                                                                                                                                                                                                                                                                                                                                    | `src/config/statistics.config.ts` |
| **`D-STAT.5`** | Quyền xem thống kê của `FACILITY_MANAGER`                            | Cho phép gọi cả 5 API nhưng tự động khóa phạm vi dữ liệu vào đúng cơ sở được phân công (`assignedFacilityId`)                                                                                                                                                                                                                                                                                                                                                               | `StatisticsService`               |

---

## 4. Danh Sách Tasks Triển Khai

|  Task ID   | Tên Task                                                                        | Mô tả & Trách nhiệm                                                                                                                                                                                                   |   Phụ thuộc   |
| :--------: | :------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----------: |
| **`T0.1`** | **Config, Enums, Message Code & Validation Schemas**                            | Tạo `statistics.config.ts`, `statistics.enum.ts`, thêm `MESSAGE_CODE_820`, định nghĩa Zod request & response schemas cho 5 API thống kê                                                                               |       —       |
| **`T1.1`** | **Thống kê Tổng quan Toàn chuỗi (`overview`)**                                  | Aggregation tổng hợp quy mô cơ sở, tỷ lệ lấp đầy kho/kệ/diện tích, doanh thu & tăng trưởng kỳ trước, tiền cọc, nợ quá hạn và danh sách `actionRequired`                                                               |    `T0.1`     |
| **`T1.2`** | **Phân tích Xu hướng Thời gian, Cao/Thấp điểm & Khung giờ (`rental-trends`)**   | Aggregation chuỗi thời gian (`day`/`week`/`month`/`quarter`), thuật toán xác định `peakPeriods` & `lowPeriods`, phân bổ theo thứ trong tuần, khung giờ ca hẹn, giờ đặt online và độ dài kỳ thuê                       |    `T0.1`     |
| **`T1.3`** | **Bảng xếp hạng & Chấm điểm KPI Chi nhánh (`facilities-kpi`)**                  | Batch aggregation đa bảng theo `facilityId`, hàm thuần `computeFacilityKpiScore`, xếp hạng `rank`, phân hạng `kpiTier`, sinh cảnh báo `alerts` và tách `topPerformers` / `underperformers`                            |    `T0.1`     |
| **`T1.4`** | **Phân tích Tài chính, Doanh thu, Tuổi nợ & Hoàn tiền (`financial-analytics`)** | Chuỗi thời gian tài chính, cơ cấu doanh thu theo `InvoiceItemTypeEnum`, phương thức thanh toán, đối soát SePay, báo cáo tuổi nợ `overdueAging` và phân tích hoàn tiền                                                 |    `T0.1`     |
| **`T1.5`** | **Phân tích Sản phẩm, Phễu Vận hành, Controller, IoC & Integration Tests**      | Hiệu suất `UnitType`, `RackZone`, `Amenity`, phễu đặt chỗ `bookingFunnel`, lưu lượng `AccessSchedule` & `InventoryMovement`; `StatisticsController`, `ioc.ts` và bộ test tích hợp `tests/statisticsAnalytics.test.ts` | `T1.1`–`T1.4` |
