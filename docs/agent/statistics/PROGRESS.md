# Tiến Độ Task — Phân Hệ Thống Kê, Phân Tích Xu Hướng Thuê & Đánh Giá KPI Chi Nhánh (`statistics`)

> File này được cập nhật bởi `/remember` và được commit lên Git.  
> Theo dõi trạng thái thực tế của các tasks thuộc phân hệ `statistics`.

---

## Bảng Theo Dõi Tiến Độ Task

|    ID    | Tên Task                                                                        | Trạng thái |             Phụ thuộc             | PR / Commit | Cập nhật & Ghi chú                                                                                                                                                               |
| :------: | :------------------------------------------------------------------------------ | :--------: | :-------------------------------: | :---------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T0.1** | **Config, Enums, Message Code & Validation Schemas**                            |  ✅ DONE   |                 —                 |             | `2026-11-05`: Đã hoàn thành `statistics.config.ts`, `statistics.enum.ts`, `MESSAGE_CODE_820`, Zod request & response schemas                                                     |
| **T1.1** | **Thống kê Tổng quan Toàn chuỗi (`overview`)**                                  |  ✅ DONE   |               T0.1                |             | `2026-11-05`: Đã hoàn thành `GET /statistics/overview` (lấp đầy kho/kệ/diện tích, doanh thu, tăng trưởng kỳ trước, cọc đang giữ, nợ quá hạn, `actionRequired`)                   |
| **T1.2** | **Phân tích Xu hướng Thời gian, Cao/Thấp điểm & Khung giờ (`rental-trends`)**   |  ✅ DONE   | T0.1, `[OPEN D-STAT.1, D-STAT.4]` |             | `2026-11-05`: Đã hoàn thành `GET /statistics/rental-trends` (`timeSeries`, `peakPeriods`, `lowPeriods`, thứ trong tuần, nhu cầu ca hẹn, giờ đặt online, thời hạn thuê)           |
| **T1.3** | **Bảng xếp hạng & Chấm điểm KPI Chi nhánh (`facilities-kpi`)**                  |  ✅ DONE   | T0.1, `[OPEN D-STAT.2, D-STAT.3]` |             | `2026-11-05`: Đã hoàn thành `GET /statistics/facilities-kpi` (chấm điểm 4 trụ cột 0–100, `kpiTier`, `RevPAU`, `RevPAM`, `topPerformers`, `underperformers`, `alerts`)            |
| **T1.4** | **Phân tích Tài chính, Doanh thu, Tuổi nợ & Hoàn tiền (`financial-analytics`)** |  ✅ DONE   |               T0.1                |             | `2026-11-05`: Đã hoàn thành `GET /statistics/financial-analytics` (chuỗi doanh thu, khoản mục `InvoiceItemTypeEnum`, kênh thanh toán, SePay, `overdueAging`, hoàn tiền)          |
| **T1.5** | **Phân tích Sản phẩm, Phễu Vận hành, Controller, IoC & Integration Tests**      |  ✅ DONE   |             T1.1–T1.4             |             | `2026-11-05`: Đã hoàn thành `GET /statistics/product-and-operations`, `StatisticsController`, `ioc.ts`, `FE_PROMPT_STATISTICS.md` & `tests/statisticsAnalytics.test.ts` (9/9 ✅) |

---

## Danh Sách Quyết Định Nghiệp Vụ (`[OPEN Dx]`)

|      ID      | Quyết định                                                           | Giá trị mặc định đang áp dụng                                                                     | Trạng thái | Ghi chú                         |
| :----------: | :------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ | :--------: | :------------------------------ |
| **D-STAT.1** | Khoảng thời gian mặc định & giới hạn tối đa khi truy vấn             | Mặc định **30 ngày gần nhất** theo lịch VN; tối đa **366 ngày** (`maxRangeDays = 366`)            |  ĐỀ XUẤT   | Đặt tại `statistics.config.ts`  |
| **D-STAT.2** | Trọng số tính điểm KPI Chi nhánh (`kpiScore` 0–100)                  | Occupancy `0.30` + Collection `0.25` + Conversion & Retention `0.20` + Operations & SLA `0.25`    |  ĐỀ XUẤT   | Đặt tại `statistics.config.ts`  |
| **D-STAT.3** | Ngưỡng phân hạng KPI Chi nhánh (`FacilityKpiTierEnum`)               | `EXCELLENT` ($\ge 85$), `GOOD` ($70–84.99$), `AVERAGE` ($50–69.99$), `NEEDS_IMPROVEMENT` ($< 50$) |  ĐỀ XUẤT   | Đặt tại `statistics.config.ts`  |
| **D-STAT.4** | Số lượng mốc Cao điểm (`peakPeriods`) & Ít người thuê (`lowPeriods`) | Top **3** mốc cao nhất và Top **3** mốc thấp nhất kèm `%` chênh lệch so với trung bình            |  ĐỀ XUẤT   | Đặt tại `statistics.config.ts`  |
| **D-STAT.5** | Quyền xem thống kê của `FACILITY_MANAGER`                            | Cho phép gọi cả 5 API nhưng tự động khóa phạm vi vào đúng `assignedFacilityId` của mình           |  ĐỀ XUẤT   | Áp dụng tại `StatisticsService` |

---

## Giả Định Đã Dùng

| Task      | Giả định                                                                                                 | Đặt ở đâu (config / flag)                   |
| :-------- | :------------------------------------------------------------------------------------------------------- | :------------------------------------------ |
| T0.1–T1.5 | Tiền tệ là VND số nguyên (`Math.round()`), tỷ lệ phần trăm làm tròn tối đa 2 chữ số thập phân            | `statistics.service.ts`                     |
| T0.1–T1.5 | Mọi mốc thời gian và nhóm ngày/tuần/tháng/thứ/giờ tính theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7) | `date.util.ts` & `statistics.repository.ts` |

---

## Phát Hiện Thêm Ngoài Phạm Vi (Out of Scope Findings)

1. `FacilityManagerService.getMyFacilityDashboard` (`src/modules/facilityManager/facilityManager.service.ts` dòng 129–136) hiện đang cộng thủ công 5 trạng thái của `StorageUnit`, chưa cộng trạng thái `StorageUnitStatusEnum.PENDING_CLEARANCE`.
