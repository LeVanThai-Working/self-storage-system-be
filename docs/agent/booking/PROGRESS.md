# Tiến độ task

> File này được cập nhật bởi `/remember` và được commit. Chỉ sửa dòng của task liên quan đến phiên làm việc, không định dạng lại cả file.

## Task

| ID    | Tên                                                | Trạng thái | Phụ thuộc               | PR / commit | Cập nhật                                                                                           |
| ----- | -------------------------------------------------- | ---------- | ----------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| T0.1  | Siết phân quyền Contract                           | DONE       | —                       |             | 2026-10-18: Đã siết phân quyền 9 endpoints + 32 test assertions PASS                               |
| T0.2  | Kiểm tra và siết phân quyền Addendum               | DONE       | —                       |             | 2026-10-21: Đổi sang `RENEW`/`UNIT_CHANGE` & siết phân quyền 6 endpoints + 34 test assertions PASS |
| T0.3  | Siết xác nhận thu và hoàn tiền                     | TODO       | —                       |             |                                                                                                    |
| T0.4  | An toàn môi trường production                      | TODO       | —                       |             |                                                                                                    |
| T0.5  | Bộ test phân quyền dùng chung                      | TODO       | —                       |             |                                                                                                    |
| T0.6  | Dọn mâu thuẫn endpoint                             | TODO       | `[OPEN D13]`            |             |                                                                                                    |
| T1.1  | Entity RefundRequest                               | TODO       | `[OPEN D5]`             |             |                                                                                                    |
| T1.2  | Mọi nguồn tiền hoàn đều vào RefundRequest          | TODO       | T1.1                    |             |                                                                                                    |
| T1.3  | Webhook SePay                                      | TODO       | T1.1, T1.8, `[OPEN D9]` |             |                                                                                                    |
| T1.4  | Tài khoản nhận hoàn tiền                           | TODO       | T1.1, `[OPEN D5]`       |             |                                                                                                    |
| T1.5  | Vòng đời cọc của Contract                          | TODO       | T1.1, `[OPEN D7]`       |             |                                                                                                    |
| T1.6  | Thu tiền thuê kỳ đầu                               | TODO       | `[OPEN D6]`             |             |                                                                                                    |
| T1.7  | Phí trễ hạn                                        | TODO       | `[OPEN D8]`             |             |                                                                                                    |
| T1.8  | Gỡ thanh toán thiếu và cộng dồn                    | TODO       | T1.1                    |             |                                                                                                    |
| T2.1  | Mốc hủy                                            | TODO       | T2.2, `[OPEN D1]`       |             |                                                                                                    |
| T2.2  | Snapshot chính sách và đồng ý điều khoản           | TODO       | —                       |             |                                                                                                    |
| T2.3  | Tách VOID và CANCEL cho hợp đồng DRAFT             | TODO       | T2.2                    |             |                                                                                                    |
| T2.4  | Force Cancel do cơ sở không giao được kho          | TODO       | T1.1, `[OPEN D3]`       |             |                                                                                                    |
| T2.5  | arrivedAt và hạn check-in                          | TODO       | —                       |             |                                                                                                    |
| T2.6  | Thời gian tối thiểu khi đặt trong ngày             | TODO       | —                       |             |                                                                                                    |
| T2.7  | Giới hạn startDate                                 | TODO       | `[OPEN D2]`             |             |                                                                                                    |
| T2.8  | Cờ check-in sớm hoặc ngoài khung giờ               | TODO       | —                       |             |                                                                                                    |
| T2.9  | Mở rộng reassign-unit                              | TODO       | `[OPEN D4]`             |             |                                                                                                    |
| T2.10 | Chấm dứt và trả kho an toàn                        | TODO       | `[OPEN D14]`            |             |                                                                                                    |
| T3.1  | process-overdue xử lý từng đơn riêng               | TODO       | —                       |             |                                                                                                    |
| T3.2  | Side effect chỉ chạy sau commit                    | TODO       | —                       |             |                                                                                                    |
| T3.3  | Job OVERDUE cho Contract và nhắc hạn               | TODO       | T3.2                    |             |                                                                                                    |
| T3.4  | Notification cho Contract và nhắc lịch Reservation | TODO       | T3.2                    |             |                                                                                                    |
| T3.5  | TTL và job đối soát                                | TODO       | —                       |             |                                                                                                    |
| T3.6  | Ràng buộc DB và idempotency                        | TODO       | —                       |             |                                                                                                    |
| T4.1  | LegalEntity, SigningAuthorization và snapshot      | TODO       | `[OPEN D12]`            |             |                                                                                                    |
| T4.2  | Danh tính khách                                    | TODO       | `[OPEN D10]`            |             |                                                                                                    |
| T4.3  | Bằng chứng ký và lịch sử chữ ký                    | TODO       | `[OPEN D11]`            |             |                                                                                                    |
| T4.4  | Template hợp đồng và xuất PDF                      | TODO       | T4.1, T4.2, T4.3        |             |                                                                                                    |
| T4.5  | Rule phụ lục                                       | TODO       | `[OPEN D4]`             |             |                                                                                                    |
| T4.6  | Walk-in tại quầy                                   | TODO       | T4.2, `[OPEN D10]`      |             |                                                                                                    |
| T4.7  | Đồ bỏ lại và nợ (chỉ thiết kế)                     | BLOCKED    | Chờ pháp chế duyệt      |             | Không lập trình trước khi pháp chế duyệt                                                           |

## Quyết định `[OPEN]`

| ID  | Quyết định                                                    | Giá trị đang dùng                                                                                          | Trạng thái | Ghi chú                                                     |
| --- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| D1  | Mốc hủy miễn phí tính từ đâu                                  | 24h trước giờ bắt đầu `checkInTimeSlot`, cấu hình qua `cancellationPolicy.mode`                            | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T2.1)                     |
| D2  | Cho `startDate` khác `checkInDate` không, lệch tối đa         | Tối đa 3 ngày, đặt trong config                                                                            | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T2.7)                     |
| D3  | Bản chất pháp lý của cọc đặt chỗ & mức bồi thường khi từ chối | Hoàn 100%, hệ số bồi thường thêm = 0 trong config cho đến khi pháp chế xác nhận                            | OPEN       | Mặc định đề xuất, chờ pháp chế (Chặn: T2.4)                 |
| D4  | Giá khi nâng hạng miễn phí và khi gia hạn                     | Giữ `rentalPrice` trong kỳ hiện tại, gắn cờ `isComplimentaryUpgrade`; giá gia hạn do Manager nhập          | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T2.9, T4.5)               |
| D5  | Hoàn tiền: tài khoản nhận, SLA, ngưỡng duyệt                  | Tài khoản khách khai ở trường riêng; Manager duyệt; `refund.opsApprovalThreshold` (chưa có số); SLA 3 ngày | OPEN       | Mặc định đề xuất, cần chốt số ngưỡng OPS (Chặn: T1.1, T1.4) |
| D6  | Thu tiền thuê kỳ đầu và ngày bắt đầu tính tiền                | Thu kỳ đầu trước khi Manager ký check-in; `startDate` chốt lại theo ngày check-in thực tế nếu trễ          | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T1.6)                     |
| D7  | Terminate xử lý cọc thế nào                                   | Trừ công nợ thực tế rồi hoàn phần dư; tịch thu toàn bộ chỉ khi có lý do bắt buộc và OPS duyệt              | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T1.5)                     |
| D8  | Công thức phí trễ hạn                                         | Giữ 1.5× (đã gồm tiền thuê ngày đó); `endDate` inclusive; ngày lịch VN; VND làm tròn số nguyên             | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T1.7)                     |
| D9  | Webhook đến trễ so với mốc 15 phút; có khôi phục đơn không    | So mốc theo `transactionDate` cộng đệm 2 phút; vẫn hoàn tiền thay vì khôi phục đơn                         | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T1.3)                     |
| D10 | Walk-in: KYC và cách ký                                       | Tạo tài khoản kèm xác minh email/SĐT; lưu CCCD mã hóa và ảnh; khách đăng nhập trên thiết bị tại quầy để ký | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T4.2, T4.6)               |
| D11 | Hình thức ký                                                  | Giữ click-to-sign nhưng bắt buộc lưu bằng chứng (`termsVersion`, hash nội dung, IP, thiết bị); OTP để sau  | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T4.3)                     |
| D12 | Pháp nhân: một cho cả chuỗi hay mỗi cơ sở; ai có ủy quyền ký  | Mỗi `Facility` trỏ tới một `LegalEntity` (nhiều cơ sở có thể dùng chung)                                   | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T4.1)                     |
| D13 | `POST /contracts/:id/renew` còn tồn tại không                 | Nếu còn thì vô hiệu hóa, chỉ giữ gia hạn qua phụ lục `RENEW`                                               | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T0.6)                     |
| D14 | Terminate hoặc check-out khi đồ còn trong kho                 | Thêm bước `PENDING_CLEARANCE` trước khi kho sang `UNDER_MAINTENANCE`                                       | OPEN       | Mặc định đề xuất, chờ chốt (Chặn: T2.10)                    |

## Giả định đã dùng

| Task | Giả định                                                                                                               | Đặt ở đâu (config / flag)                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| T0.1 | Fallback nhận diện caller qua `x-user-id` chỉ bật ở dev/test khi cờ môi trường cho phép                                | `process.env.ALLOW_INSECURE_CALLER_FALLBACK === 'true'` (`contract.controller.ts`) |
| T0.2 | `[OPEN D4]` Giữ nguyên `rentalPrice` khi kích hoạt phụ lục `RENEW`, chỉ cập nhật `endDate`, `renewalCount`, `renewals` | `ContractService.signAddendumInternal` (`contract.service.ts`)                     |

## Phát hiện thêm (ngoài phạm vi)

| #   | Mô tả                                                                                                                                                                      | Phát hiện ở task | Trạng thái |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- |
| 1   | `POST /contracts/:id/renew` (`ContractService.renewContract`) vẫn tồn tại song song với Phụ lục `RENEW` và chưa kiểm tra `actorRole`/`assertFacilityAccess` (thuộc `T0.6`) | T0.1, T0.2       | OPEN       |
