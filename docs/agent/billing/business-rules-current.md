# Quy Tắc Nghiệp Vụ Hiện Hành: Phân Hệ Hóa Đơn & Thanh Toán Định Kỳ (Invoice & Billing)

> Phiên bản: `2026-10-v1`  
> Cập nhật: 31/10/2026  
> Phạm vi: Toàn bộ quy tắc tính toán tiền thuê, chu kỳ hóa đơn, hạn thanh toán, ân hạn nợ, cấn trừ cọc và tích hợp cổng thanh toán SePay.

---

## 1. Mô Hình Chu Kỳ Tính Phí (Billing Cycle)

### 1.1. Chu kỳ theo Tháng (`BillingUnitEnum.MONTH`)

- **Đơn vị kỳ:** 1 tháng dương lịch (Calendar Month) hoặc block 30 ngày chuẩn (`standardDaysPerMonth = 30`).
- **Xác định mốc kỳ:**
  - Kỳ 1 (`billingPeriodIndex = 1`): Từ `startDate` đến `startDate + 1 tháng - 1 ngày` (hoặc `startDate + 30 ngày`).
  - Kỳ $N$ (`billingPeriodIndex = N`): Bắt đầu ngay sau ngày kết thúc của kỳ $N-1$.
- **Thời điểm phát hành hóa đơn:**
  - Kỳ 1: Phát hành ngay khi tạo Hợp đồng nháp (DRAFT).
  - Kỳ $N \ge 2$: Phát hành trước **7 ngày** tính từ ngày bắt đầu của kỳ $N$ ($T-7$ ngày lúc 01:00 AM VN).
- **Hạn thanh toán (Due Date):**
  - Mặc định là **ngày bắt đầu kỳ mới** lúc 23:59:59 VN ($T-0$).
- **Thời gian ân hạn (Grace Period):**
  - Khách hàng được ân hạn **3 ngày** sau Due Date để hoàn tất thanh toán.
  - Trong 3 ngày ân hạn, trạng thái hóa đơn vẫn là `ISSUED` nhưng hệ thống gửi thông báo cảnh báo khẩn cấp.
  - Hết 3 ngày ân hạn (ngày $T+4$ lúc 02:00 AM VN): Hóa đơn tự động chuyển `OVERDUE`.

### 1.2. Chu kỳ theo Ngày (`BillingUnitEnum.DAY`)

- **Hợp đồng ngắn hạn ($\le 14$ ngày):**
  - Chỉ có **1 hóa đơn duy nhất** (`billingPeriodIndex = 1`, loại `FIRST_PERIOD`).
  - Số tiền = $\text{basePrice} \times \text{rentalDuration} + \sum \text{amenities}$.
  - Thu trọn gói 100% trước khi check-in.
- **Hợp đồng dài hạn ($> 14$ ngày):**
  - Chia chu kỳ mỗi **7 ngày** (1 tuần).
  - Kỳ 1: 7 ngày đầu tiên (thu trước check-in).
  - Kỳ 2: 7 ngày tiếp theo (phát hành vào ngày thứ 5 của kỳ 1, tức trước kỳ 2 là 2 ngày).
  - Kỳ cuối: Số ngày còn lại thực tế của hợp đồng.

---

## 2. Cấu Trúc Hóa Đơn & Công Thức Tính Tiền

### 2.1. Các Dòng Mục Hóa Đơn (`InvoiceItem`)

Mỗi hóa đơn gồm danh sách chi tiết các khoản phí:

1. **Tiền thuê không gian lưu trữ (`RENT`):**
   - Tiền thuê phòng kho hoặc kệ kho cho kỳ đó: $\text{rentalPrice}$.
2. **Tiền tiện ích đi kèm (`AMENITY`):**
   - Tổng tiền các tiện ích đăng ký theo kỳ: $\sum (\text{quantity} \times \text{pricePerUnit})$.
3. **Phí phạt trễ hạn (`OVERDUE_FEE`):**
   - Chỉ xuất hiện ở hóa đơn phát sinh hoặc hóa đơn quyết toán trả kho.
4. **Phí bồi thường hư hại kho (`DAMAGE_FEE`):**
   - Đồng bộ từ biên bản xử lý sự cố (`Incident.resolution.damageFee`).
5. **Chiết khấu / Khuyến mãi (`DISCOUNT`):**
   - Giảm trừ theo chính sách hoặc voucher (nếu có).

### 2.2. Tổng Tiền Hóa Đơn

$$\text{subtotal} = \sum \text{items.amount}$$
$$\text{totalAmount} = \text{subtotal} - \text{discountAmount} + \text{taxAmount}$$

> **Quy tắc làm tròn:** Số tiền tính bằng VND, luôn làm tròn số nguyên gần nhất: `Math.round(totalAmount)`. Không bao giờ lưu số thập phân trong DB.

---

## 3. Vòng Đời Trạng Thái Hóa Đơn (State Machine)

| Trạng thái  | Ý nghĩa                      | Điều kiện chuyển                            | Hành động tiếp theo                        |
| :---------- | :--------------------------- | :------------------------------------------ | :----------------------------------------- |
| `DRAFT`     | Hóa đơn nháp đang soạn       | Khởi tạo bởi Quản lý                        | Xem trước, điều chỉnh                      |
| `ISSUED`    | Đã phát hành, chờ thanh toán | Tự động sinh bởi Job hoặc Manager phát hành | Khách quét QR SePay / Thanh toán quầy      |
| `PAID`      | Đã thanh toán đầy đủ         | Webhook SePay khớp tiền hoặc Xác nhận quầy  | Gạch nợ, gửi email hóa đơn PDF             |
| `OVERDUE`   | Quá hạn thanh toán           | Quá Due Date + 3 ngày ân hạn chưa trả       | Khóa hợp đồng sang OVERDUE, chặn nhập hàng |
| `CANCELLED` | Đã bị hủy bỏ                 | Manager hủy do sai sót hoặc miễn giảm       | Vô hiệu hóa mã thanh toán                  |
| `VOID`      | Hủy theo hợp đồng            | Hợp đồng bị hủy trước khi check-in          | Đóng hóa đơn                               |

---

## 4. Xử Lý Khi Hóa Đơn Quá Hạn (`OVERDUE`)

Khi một hóa đơn định kỳ bị chuyển sang `OVERDUE`:

1. **Đồng bộ trạng thái Hợp đồng:**
   - Hợp đồng chuyển sang `ContractStatusEnum.OVERDUE`.
2. **Hạn chế thao tác tồn kho khoang chứa:**
   - Theo ma trận `INVENTORY_OPS_BY_CONTRACT_STATUS`:
     - Khách hàng bị **chặn Nhập hàng (`IN`) và Điều chỉnh (`ADJUST`)** (ném lỗi `MESSAGE_CODE_644`).
     - Khách hàng vẫn được phép **Xuất hàng (`OUT`) và Di chuyển nội bộ (`MOVE`)** để lấy tài sản về.
3. **Kích hoạt phí phạt quá hạn:**
   - Tính phí theo công thức chuẩn `calculateContractOverdueFee`:
     $$\text{overdueFee} = \text{overdueDays} \times \text{dailyRate} \times 1.5$$
4. **Khôi phục trạng thái (`Restoration`):**
   - Ngay khi khách hàng thanh toán đầy đủ hóa đơn quá hạn (và không còn hóa đơn nào khác bị nợ):
   - Hợp đồng tự động được hoàn nguyên về `ContractStatusEnum.ACTIVE`.
   - Quyền nhập hàng khoang chứa được mở khóa tức thì.

---

## 5. Quyết Toán Trả Kho & Cấn Trừ Cọc (`CHECK_OUT_SETTLEMENT`)

Khi khách hàng yêu cầu Check-out trả phòng kho:

1. **Tổng hợp công nợ cuối kỳ:**
   $$\text{totalLiabilities} = \text{unpaidInvoicesTotal} + \text{damageFee} + \text{overdueFee}$$
2. **So sánh với tiền cọc đang giữ (`depositAmount`):**
   - **Trường hợp 1: Tiền cọc $\ge \text{totalLiabilities}$:**
     - Sinh hóa đơn quyết toán `CHECK_OUT_SETTLEMENT` với số tiền bằng $\text{totalLiabilities}$.
     - Tự động cấn trừ cọc: Hóa đơn đánh dấu `PAID`.
     - Số tiền cọc dư: $\text{refundAmount} = \text{depositAmount} - \text{totalLiabilities}$.
     - Tự động tạo `RefundRequest` loại `DEPOSIT_SETTLEMENT` để chuyển trả lại cho khách hàng.
   - **Trường hợp 2: Tiền cọc $< \text{totalLiabilities}$:**
     - Tịch thu toàn bộ tiền cọc: `forfeitedAmount = depositAmount`.
     - Số tiền còn thiếu: $\text{additionalPaymentRequired} = \text{totalLiabilities} - \text{depositAmount}$.
     - Sinh hóa đơn `CHECK_OUT_SETTLEMENT` với số tiền bằng $\text{additionalPaymentRequired}$, trạng thái `ISSUED`.
     - Khách hàng bắt buộc thanh toán hóa đơn này để hoàn tất thủ tục trả kho.

---

## 6. Tích Hợp Cổng Thanh Toán SePay VietQR

- **Nguyên tắc Thanh toán Một lần (Single Payment Invariant):**
  - Mỗi hóa đơn chỉ được thanh toán đúng 1 lần với số tiền chính xác 100% bằng `invoice.totalAmount`.
  - Không chấp nhận thanh toán cộng dồn nhiều lần hoặc thanh toán thiếu tiền.
- **Nội dung chuyển khoản (Payment Code):**
  - Cú pháp tự động: `SEPAY<MãCơSở> INV<MãHóaĐơn>` (ví dụ `SEPAYHN01 INV261031A1B2`).
- **Xử lý Webhook SePay:**
  - Kiểm tra `verifyWebhookSignature` đảm bảo an toàn.
  - Tìm bản ghi `Payment` khớp `paymentCode`.
  - Cập nhật `Payment -> PAID` và `Invoice -> PAID` trong cùng một `@Transactional()`.
  - Side effect (bắn Socket.IO, gửi email) chỉ thực hiện trong `runAfterCommit(cb)`.
