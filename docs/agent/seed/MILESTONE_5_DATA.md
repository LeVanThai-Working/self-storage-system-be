# Milestone 5 — Reservation + Contract + Finance

Plan đã được duyệt ngày 18/11/2026. **Đã apply và đối soát DB thật lúc 18:51 ngày 18/11/2026 (giờ Việt Nam)**; checkpoint `module-seed-v1:5` complete. Quy tắc tầng mới: mọi kho floor numeric; warehouse seed ở floor=1. Dừng tại M5 để người dùng kiểm tra giao diện/dữ liệu trước M6.

Người dùng đã đổi yêu cầu từ floor=null sang floor=1 và đã cập nhật DB. Code/fixture/preflight được đồng bộ, không migrate hoặc reset dữ liệu. Dry-run kiểm tra cả 5 map Render floor=1 đã đạt. Phương án bổ sung 16 Reservation đã được duyệt; giữ nguyên số hợp đồng, tài nguyên và tổng tiền.

## Dữ liệu theo cơ sở

Chỉ Q2–Q5. Mỗi cơ sở dùng khách hàng cùng số quận (`kh2`–`kh5`), đúng quản lý và nhân viên cơ sở. Q1, user và profile giữ nguyên. Mã hợp đồng `SEED-M5-Qn-01`…`08`. Các hợp đồng **01, 04, 07, 08** có source=reservation; **02, 03, 05, 06** có source=walk_in. Mỗi cơ sở có 4 Reservation (2 thuê phòng, 2 thuê kệ), mã `${contractCode}-RES`, tất cả completed vì đã nhận kho và chuyển thành hợp đồng. Trạng thái completed của Reservation không quyết định trạng thái active/completed của hợp đồng.

| HĐ  | Tài nguyên Qn                              | Bắt đầu    | Kết thúc (bao gồm) | Trạng thái | Kỳ 30 ngày |
| --- | ------------------------------------------ | ---------- | ------------------ | ---------- | ---------: |
| 01  | TU-101                                     | 01/04/2026 | 29/06/2026         | completed  |          3 |
| 02  | NHO-101                                    | 01/04/2026 | 29/06/2026         | completed  |          3 |
| 03  | LON-101                                    | 01/05/2026 | 29/07/2026         | completed  |          3 |
| 04  | R01 (Economy), trong KHO-01                | 01/05/2026 | 29/07/2026         | completed  |          3 |
| 05  | TU-201                                     | 01/06/2026 | 27/11/2026         | active     |          6 |
| 06  | NHO-201                                    | 01/06/2026 | 27/11/2026         | active     |          6 |
| 07  | LON-201                                    | 01/06/2026 | 27/11/2026         | active     |          6 |
| 08  | R05 (Standard) + R09 (Prime), trong KHO-01 | 01/06/2026 | 27/11/2026         | active     |          6 |

Ngày lưu UTC, tính theo giờ Việt Nam. Kỳ cuối của hợp đồng active: 29/10–27/11/2026. Từ 28/11 trở đi lần apply đầu tiên bị chặn; không âm thầm đổi ngày. Rerun checkpoint complete vẫn hoạt động sau ngày này và không ghi lại dữ liệu.

## Tiện ích và tài chính

Đơn vị: VND. Phí một lần chỉ nằm ở kỳ đầu; tiền cọc không gồm tiện ích. Tên camera dùng đúng catalog hiện có: **Camera giám sát**.

| HĐ  | Tiện ích                                      | Thu mỗi kỳ | Một lần | Kỳ đầu | Tổng thuê/tiện ích |    Cọc |
| --- | --------------------------------------------- | ---------: | ------: | -----: | -----------------: | -----: |
| 01  | Không có                                      |      5.000 |       0 |  5.000 |             15.000 |  5.000 |
| 02  | Camera ×1, ổ khóa ×1                          |     13.000 |   5.000 | 18.000 |             44.000 |  8.000 |
| 03  | Máy lạnh ×1, camera ×1, carton ×2, bốc xếp ×1 |     23.000 |  20.000 | 43.000 |             89.000 | 10.000 |
| 04  | Camera ×1, carton ×2                          |     10.000 |  10.000 | 20.000 |             40.000 |  5.000 |
| 05  | Ổ khóa ×1                                     |      5.000 |   5.000 | 10.000 |             35.000 |  5.000 |
| 06  | Máy lạnh ×1                                   |     16.000 |       0 | 16.000 |             96.000 |  8.000 |
| 07  | Máy lạnh ×1, camera ×1                        |     23.000 |       0 | 23.000 |            138.000 | 10.000 |
| 08  | Camera ×1, carton ×4, bốc xếp ×1              |     23.000 |  30.000 | 53.000 |            168.000 | 18.000 |

- 32 contracts: 16 completed + 16 active; 1 template; 4 signing authorizations.
- 16 Reservations completed, mỗi Reservation liên kết đúng 1 hợp đồng; có cả hợp đồng hoàn thành và đang hiệu lực.
- 160 invoices PAID: 32 first period + 112 recurring + 16 settlement (0đ).
- 176 payments PAID/CASH: **16 reservation_deposit + 16 contract_deposit** + 32 first period + 112 recurring. Không tạo Payment cọc thứ hai khi chuyển Reservation thành hợp đồng. `Reservation.paymentId` và `Contract.depositPaymentId` dùng chung Payment; payment cọc Reservation giữ `reservationId`, `contractId=null` đúng luồng backend hiện tại. Không tạo Payment 0đ, không tính hóa đơn và Payment thành hai lần thu.
- 16 RefundRequest PAID, liên kết payment cọc; completed depositStatus=refunded, active depositStatus=held.
- Tổng tiền thuê/tiện ích **2.500.000đ**, cọc thu **276.000đ**, cọc hoàn **112.000đ**, cọc giữ **164.000đ**. Thuê/tiện ích mỗi cơ sở 625.000đ.
- Phí hư hại/quá hạn, thuế và chiết khấu đều 0; không có tranh chấp, phụ lục, gia hạn hay sự cố.

Thứ tự lịch sử: Reservation đặt T-3 lúc 08:00, thu cọc trong thời hạn giữ chỗ, quản lý xác nhận 09:00; giao nhân viên T-1 lúc 08:30, đến cơ sở 08:55 ngày nhận kho, ca 09:00–11:00. Draft hợp đồng tạo T-1 lúc 09:00 → khách ký 10:00 → walk-in thu cọc 10:15 (Reservation giữ khoản đã thu T-3) → thu kỳ đầu 10:30 → quản lý ký/nhận kho 09:00 ngày bắt đầu. Snapshot chính sách Reservation lấy cấu hình hiện tại; startDate/checkInDate đầu ngày VN, rentalDuration=90/180 ngày. Kỳ sau phát hành T-7 và thanh toán T-1. Completed trả kho 16:00 ngày cuối → đề nghị hoàn 16:05 → khách xác nhận 16:15 → quản lý duyệt 16:30 → nhân viên xác nhận hoàn 17:00. Chữ ký không bị reset nên signatureHistory để trống.

Nhân viên 1 phụ trách/thu tiền; quản lý ký; nhân viên 2 nghiệm thu và đề nghị hoàn; quản lý duyệt; nhân viên 3 xác nhận hoàn. Audit thực ghi SYSTEM với milestone=5 và simulated=true; không giả mạo audit các giao dịch lịch sử là thao tác vừa xảy ra.

## Pháp lý, tài liệu và tài nguyên

- Dùng lại đúng pháp nhân active **Công Ty TNHH Storage Hub**, không sửa thông tin gốc. Gán pháp nhân cho Q2–Q5; không đụng Q1. Có xung đột pháp nhân thì dừng.
- Template `SEED-M5-STORAGE-2026`, v1.0.0. Mỗi quản lý Q2–Q5 một ủy quyền `SEED-M5-UQ-Qn`, hiệu lực cả năm 2026. Snapshot pháp nhân/quyền ký và khách hàng từ hồ sơ hiện tại; không sửa KYC/profile.
- 52 file PNG thật: 32 hợp đồng, 4 ủy quyền, 16 chứng từ hoàn. Nội dung SVG tĩnh được Cloudinary chuyển thành PNG; ghi rõ DỮ LIỆU SEED, không chữ ký thật, CCCD hay thông tin ngân hàng thật.
- Folder Cloudinary `self-storage/seed/module-seed-v1/milestone-5`; publicId chứa hash nội dung. Manifest gitignored `.agents/memory/seed-m5-assets.json`. Kiểm tra HTTPS đúng cloud, HTTP thành công, MIME image/png, chữ ký PNG và SHA-256; rerun kiểm tra checksum và không upload trùng. Nếu mất manifest sau upload, tra lại asset theo publicId. Không tự xóa/ghi đè file đã có.
- `signedContractFiles.fileHash` theo quy ước backend hiện tại (SHA-256 URL); manifest lưu riêng checksum bytes PNG.
- Sau apply: 12 phòng occupied, 12 phòng under_maintenance; 8 kệ rented đúng contract/customer. Kệ R01 của hợp đồng hoàn thành giữ available; warehouse vẫn available/floor=1; tiers chưa có hàng.
- InUse tăng cho mỗi Q2–Q5: máy lạnh +2, camera +2, ổ khóa +1, carton +4. Giữ lượng sử dụng trước đó và tổng stock; không tăng stock cho bốc xếp. Không tự dọn phòng completed về available.

## Cách chạy và điều kiện bảo vệ

```powershell
# Chỉ đọc DB/Render, xuất đầy đủ bảng ngày, tiền, tiện ích và resource updates
npm run db:seed:milestone -- --milestone 5 --dry-run

# Plan M5 cập nhật đã được duyệt; map cả 5 cơ sở phải đạt với floor=1
npm run db:seed:milestone -- --milestone 5 --apply --database self-storage-db
```

Không có cờ bypass Render, reset hoặc fake payment gateway. Dry-run không tạo backup, upload file, index hay checkpoint. Apply bị chặn trước mọi mutation nếu Render chưa đạt. Không thay public API/types nghiệp vụ trong M5.

Khi đủ điều kiện: backup mã hóa toàn DB và restore thử → upload/verify tài liệu → đọc lại/validate nền hiện tại → tạo index cần thiết → transaction ghi **405 records mới**, cập nhật 52 resources, 458 audit SYSTEM/simulated và checkpoint complete. Đối soát hash/các resource ngay trong transaction; lỗi bất kỳ rollback toàn bộ DB. Network upload ở ngoài transaction để retry không lặp side effect. Nếu DB thay đổi sau lần validate cuối, hash foundation hoặc conditional update sẽ chặn; asset đã tạo giữ trong manifest để resume.

Không ghi đè dữ liệu thủ công. Contract cùng tài nguyên có thời hạn giao nhau hoặc Reservation đang giữ cùng phòng/kệ sẽ bị chặn, kể cả trạng thái tài nguyên bị đánh dấu available sai. Kiểm tra liên kết Reservation/cọc trước mutation; checkpoint M5 thiếu phiên bản Reservation bị chặn, không tự seed bù vào checkpoint cũ. Checkpoint complete rerun chỉ đối soát ID còn đủ, báo totals ban đầu; không ép status, giá, kho hoặc quyền ký trở về seed.

## Kiểm chứng và điểm dừng

Test trên replica set tạm: số lượng/tiền/ngày, one-time fee, prerequisite/date/price/stock gates, thiếu asset, rollback khi duplicate payment, liên kết cọc và Reservation, xung đột hợp đồng/Reservation thủ công, giữ Q1/user/profile, rerun sau chỉnh sửa, đọc Reservation/Contract/Invoice qua service thật và chặn customer/facility chéo. Test tài liệu mock network kiểm tra PNG, checksum, resume và Render ready/not-ready. Không gọi dịch vụ thu tiền, email, queue hoặc worker.

Đã đối soát toàn bộ hash seed và 52 resource updates, kiểm tra liên kết cọc, đọc đủ 16 Reservation/32 Contract/160 Invoice qua service thật trên DB đích. Render map cả 5 cơ sở đạt; 52 PNG xác minh HTTP/MIME/checksum, đã mở mẫu hợp đồng/ủy quyền/hoàn cọc. Rerun `alreadyApplied=true`, không reset hoặc tạo trùng.

DB hiện có **18 Reservations, 33 contracts, 184 payments, 9 signing authorizations** vì giữ 2 Reservations/1 contract/8 payments/5 authorizations thủ công ngoài M5. Giữ 38 users/38 profiles và toàn bộ layout. Trong thời gian chạy, Quận 1 có nhận kho và duyệt phụ lục thủ công; đã đối chiếu audit/backup, các bản ghi này không nằm trong tập ghi M5 và không bị khôi phục về trạng thái cũ.

Người dùng còn kiểm tra API/UI trong phiên của mình trước khi duyệt bước tiếp theo. Chưa tạo dữ liệu M6 (Access Schedule, SKU, Inventory, Movement đều 0). Chỉ trình plan M6 sau khi người dùng kiểm tra M5.
