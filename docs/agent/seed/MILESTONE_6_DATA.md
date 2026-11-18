# Milestone 6 — Access Schedule + SKU + Inventory + Movement

**ĐÃ APPLY VÀ ĐỐI SOÁT ngày 18/11/2026 lúc 20:16 (giờ Việt Nam).** Checkpoint `module-seed-v1:6` complete; không reset DB. Người dùng đã duyệt viết/chạy M6. Các ngày/giờ dưới đây là giờ Việt Nam; lưu UTC. Dừng sau M6 để người dùng kiểm tra.

## Phạm vi và số lượng

Chỉ dùng 8 hợp đồng kệ M5 tại Quận 2–5. Mỗi cơ sở dùng đúng khách hàng cùng quận và warehouse `Qn-KHO-01`, floor=1. Không thêm dữ liệu vào Quận 1 hoặc hợp đồng thuê phòng. Không thay đổi hợp đồng, Reservation, tiền, tiện ích, pháp lý hoặc trạng thái thuê kệ của M5.

| Nhóm                                  | Mỗi cơ sở Q2–Q5 | Tổng mới |
| ------------------------------------- | --------------: | -------: |
| Access Schedule                       |               6 |       24 |
| Customer SKU                          |               2 |        8 |
| Customer Inventory theo SKU/vị trí    |               6 |       24 |
| Inventory Movement                    |               9 |       36 |
| Rack Tier chuyển available → occupied |               2 |        8 |

Tổng 92 bản ghi nghiệp vụ mới; 8 tier updates và 1 checkpoint M6, kèm audit SYSTEM/simulated cùng transaction. Các vị trí lịch sử quantity=0 vẫn giữ bản ghi, không xóa để bảo toàn lịch sử.

## Access Schedule: 3 request đến cơ sở cho mỗi hợp đồng kệ

Request đến cơ sở là **Access Schedule**, không tạo InventoryRequest cũ. Tất cả 24 lịch completed, đã có nhân viên phụ trách, người check-in/check-out và thời gian hoàn thành. Không tạo pending, cancelled, no_show hoặc lịch tương lai trong mốc này.

| Hợp đồng mỗi cơ sở                | Mục đích      | Ngày       | Số người | Nhân viên phụ trách |
| --------------------------------- | ------------- | ---------- | -------: | ------------------- |
| `SEED-M5-Qn-04` completed, R01    | Nhập hàng     | 01/05/2026 |        5 | Nhân viên 1 Quận n  |
| Như trên                          | Dời hàng      | 15/05/2026 |        8 | Nhân viên 1 Quận n  |
| Như trên                          | Xuất hết hàng | 29/07/2026 |       10 | Nhân viên 1 Quận n  |
| `SEED-M5-Qn-08` active, R05 + R09 | Nhập hàng     | 01/06/2026 |        5 | Nhân viên 2 Quận n  |
| Như trên                          | Dời hàng      | 01/07/2026 |        8 | Nhân viên 2 Quận n  |
| Như trên                          | Xuất một phần | 15/11/2026 |       10 | Nhân viên 2 Quận n  |

- Dùng ca hiện có 09:00–11:00, snapshot đúng slotName/startTime/endTime. Tạo và quản lý cơ sở phân công từ ngày hôm trước; khách check-in 09:05, thực hiện hàng 09:15/09:20, check-out 10:30 cùng ngày. Lượt đầu diễn ra sau khi nhận kho lúc 09:00 của M5; lượt cuối completed xuất hết trước nghiệm thu 16:00.
- `numberOfPeople` là số người tham gia (5/8/10), không phải số lượng hàng hoặc số lịch chiếm capacity. Kiểm tra capacity theo số lịch, lịch nhân viên không chồng nhau và các xung đột với dữ liệu thủ công.
- `checkedInBy` và `checkedOutBy` cùng nhân viên được phân công; `assignedBy` là quản lý đúng cơ sở, assignmentVersion=1. Tên snapshot ghi đầy đủ.
- expiresAt tính theo cấu hình hiện tại của backend (slotStart + grace check-in), không lấy giờ kết thúc ca. Không tạo OTP sử dụng được cho lịch đã hoàn thành; otpHash/otpEncrypted=null. Phương tiện/biển số để null vì chưa có yêu cầu.
- Mã ví dụ `SEED-M6-Q2-04-AS-01`…`03`, tương tự hợp đồng 08 và Quận 3–5. Purpose ghi đầy đủ “Nhập hàng…”, “Dời hàng…”, “Xuất hàng…”.

## SKU

Mỗi khách hàng Quận 2–5 có 2 SKU riêng (8 SKU), status=active kể cả khi tồn bằng 0.

| Mã ví dụ Quận n      | Tên đầy đủ                     | Nhóm        | Đơn vị | Dùng cho    |
| -------------------- | ------------------------------ | ----------- | ------ | ----------- |
| `SEED-M6-Qn-HOSO`    | Thùng hồ sơ Khách hàng n       | Hồ sơ       | thùng  | Hợp đồng 04 |
| `SEED-M6-Qn-GIADUNG` | Thùng đồ gia dụng Khách hàng n | Đồ gia dụng | thùng  | Hợp đồng 08 |

Mỗi thùng: dài 0,4m × rộng 0,3m × cao 0,3m, volume=0,036m³, weightKg=5. Không đặt barcode/ảnh giả; ghi chú rõ dữ liệu seed. Các thùng này là hàng của khách, không phải tiện ích Thùng carton được bán ở M5; không trừ stock hoặc thu thêm tiền.

## Nhập → dời → xuất và tồn cuối

### Hợp đồng 04 đã hoàn thành — 1 kệ R01

1. 01/05: nhập 10 thùng hồ sơ vào `Qn-R01-T01`: 0 → 10.
2. 15/05: dời cả 10 sang `Qn-R01-T02`: T01 10 → 0; T02 0 → 10.
3. 29/07: xuất hết 10 từ T02: 10 → 0.

Mỗi hợp đồng: 3 movements (1 IN, 1 MOVE, 1 OUT), 2 inventory records hiện đều quantity=0. Cả T01/T02 available, R01 vẫn available theo M5; không còn hàng của hợp đồng completed.

### Hợp đồng 08 còn hiệu lực — 2 kệ R05 + R09

1. 01/06: nhập 10 thùng đồ gia dụng, chia 5 vào R05-T01 và 5 vào R09-T01 (2 IN).
2. 01/07: mỗi kệ dời 5 thùng từ T01 sang T02 (2 MOVE). T01 của cả hai kệ về 0.
3. 15/11: xuất 2 thùng từ R05-T02 và 2 từ R09-T02 (2 OUT).

Mỗi hợp đồng: 6 movements, 4 inventory records: hai T01 quantity=0, hai T02 quantity=3. Tổng tồn 6 thùng, có hàng trên cả hai kệ; chỉ hai T02 occupied. R05/R09 vẫn rented, đúng contract/customer M5.

### Đối soát tổng

- Nhập **80 thùng**, xuất **56 thùng**, còn **24 thùng**; MOVE không cộng/trừ tổng tồn.
- 36 movements = **12 IN + 12 MOVE + 12 OUT**. MOVE ghi một ledger row với from/to tier; previousQuantity/newQuantity theo lượng ở nguồn, đúng backend hiện tại, không tạo thêm IN/OUT để đếm trùng.
- 24 inventory records = **8 records quantity=3 + 16 records quantity=0**; pendingOutboundQuantity=0, status=normal; holdingReason/incident=null.
- 8 tiers occupied, còn lại 192 available nếu không có chỉnh sửa thủ công. Chỉ CAS-update 8 tier đích đang trống được M6 sử dụng, không reset toàn bộ 200 tiers.
- `performedBy` của mọi movement là khách sở hữu hợp đồng. Nhân viên chỉ giám sát lượt đến cơ sở, không giả lập họ nhập/dời/xuất hàng của khách. Movement được liên hệ với mã Access Schedule qua notes; IN/OUT có thêm referenceCode; requestId=null vì không có InventoryRequest.

## Triển khai và bảo vệ dữ liệu sau khi được duyệt

1. Viết fixture/seed độc lập, model-validate dữ liệu; CLI M6 dry-run trình bày lịch, SKU, từng movement, tồn cuối và tier updates. Không import app/container hoặc khởi động worker.
2. Yêu cầu checkpoint M5 complete, đủ 8 hợp đồng kệ từ IDs M5, khách/cơ sở/kệ/tầng đúng, ngày lịch nằm trong thời hạn và sau actual check-in/trước actual check-out. Hợp đồng completed chỉ thêm lịch sử, không gọi API hiện tại để nhập hàng vào hợp đồng đã đóng.
3. Chặn nếu nguồn M5 đã đổi làm sai plan, có hàng/lịch/nhân viên xung đột hoặc target ID/code trùng; không tự xóa dữ liệu thủ công hoặc đặt lại trạng thái. Warehouse floor=1; giữ Q1 và các thay đổi người dùng sau seed.
4. Hai model SKU/Inventory hiện còn partial unique index `deleted: {$ne:true}`. Sau duyệt cần đổi predicate sang `$in:[false,null]` tương tự M3/M4 để MongoDB tạo index; giữ nguyên ý nghĩa unique và kiểm tra active/soft-delete. Kiểm tra index thực tế trước khi quyết định cách nâng cấp, không tự drop index đang bảo vệ dữ liệu.
5. Test replica set: bảo toàn số lượng, ledger/tồn/tier, ownership, thời gian, capacity, workload, rollback khi lỗi cuối transaction, audit và rerun không tạo trùng/ghi đè chỉnh sửa. Kiểm tra đọc lịch/SKU/tồn/tree/locations/movement bằng service thật, cả ca chéo khách/cơ sở bị chặn.
6. Sau quality checks và dry-run đạt: backup mã hóa toàn DB, restore thử BSON/index/options; sau đó transaction ghi 92 records, 8 tier updates, audit và checkpoint M6. Revalidate hash/CAS trong transaction, lỗi thì rollback. Không upload tài liệu, gửi OTP/email/thông báo, queue hoặc thu tiền.
7. Đối soát DB thật và chạy lại xác nhận alreadyApplied=true; báo kết quả rồi dừng cho người dùng kiểm tra M6. Không tự chạy M7.

**Phân bổ đã duyệt:** 24 lịch completed, 8 SKU, 24 inventory records, 36 movements và tồn cuối 24 thùng như trên. M6 là mốc cuối thêm seed theo plan này; M7 chỉ đối soát/bàn giao và không tự thêm dữ liệu mới.

## Kết quả chạy và đối soát

- Đã chạy `npm run db:seed:milestone -- --milestone 6 --apply --database self-storage-db` thành công, complete lúc `2026-11-18T13:16:55.747Z`. Chạy lại trả alreadyApplied=true; không tạo trùng hoặc đặt lại số lượng/trạng thái sau seed.
- Backup mã hóa trước chạy: 33 collections, 2.117 documents; restore thử BSON/index/options đạt. Stem gitignored `.agents/memory/backups/seed-m1-2026-11-18T13-16-30-615Z-111b26d6-3583-401e-84c5-39d8b2e26db2`, gồm `.bson.enc`, `.key`, `.verified.json`, `.milestone-6.json`.
- Đã ghi 92 records, cập nhật 8 tiers, 101 audit SYSTEM/simulated và checkpoint trong một transaction. Hash records/resources và replay ledger đạt; 80 nhập − 56 xuất = 24 tồn; 8 tiers occupied.
- Đối chiếu hash **958 bản ghi có trước**: không có thay đổi ngoài field tier cho phép; Q1 và dữ liệu M5 được giữ nguyên. Không phát sinh thu tiền hoặc stock tiện ích.
- Đọc trên DB thật qua service: 8 SKU, 24 lịch, 24 inventory records, 8 SKU locations, 36 movements và 4 cây kệ. Mỗi cây của hợp đồng 08 có 2 kệ/8 tầng, 2 tầng occupied, tổng 6 thùng. Map Render cả 5 cơ sở đạt floor numeric/warehouse=1.
- `npm run check` PASS **756/756 tests, 75/75 files**, typecheck/lint/format PASS; `npm run build` và TypeScript scoped scripts/tests PASS. Có 12 test M6, gồm phân quyền chéo, rollback, index unique/soft-delete và hai lần apply đồng thời.
- Báo cáo gitignored `.agents/memory/milestone-6-final-verification.json`; log quality/build/dry-run/apply/rerun cùng thư mục. Người dùng còn kiểm tra giao diện trong phiên của mình; chưa chạy M7.
