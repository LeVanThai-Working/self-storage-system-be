# Seed theo milestone module

Quy tắc floor cập nhật ngày 18/11/2026: mọi kho có tầng số nguyên dương; warehouse seed ở floor=1. Yêu cầu này thay thế quy tắc warehouse floor=null trước đó. Người dùng đã sửa dữ liệu và code đã đồng bộ. M5 có Reservation đã được duyệt, apply và đối soát; không reset DB, dừng để người dùng kiểm tra trước M6.

## Quy tắc đã chốt

- Mỗi milestone hoàn thành phải dừng, báo kết quả và chờ người dùng kiểm tra trước khi chạy bước tiếp theo.
- Trước khi viết test/seed hoặc chạy code cho milestone tiếp theo, trình plan có tên dữ liệu, số lượng, cấu hình và giá để người dùng chỉnh và xác nhận. Không tự triển khai chỉ vì milestone trước đã xong.
- Chỉ reset toàn bộ DB một lần ở milestone 2, sau backup mới và trong cửa sổ bảo trì. Các milestone sau chỉ thêm dữ liệu module, không reset lại.
- Ngày tham chiếu dữ liệu: **18/11/2026**, giờ Việt Nam; lưu thời điểm UTC.
- DB đích lấy từ `MONGODB_URI`. Không log URI, mật khẩu DB, dữ liệu cá nhân hay khóa backup.
- Giữ nguyên thay đổi có sẵn trong working tree. Không đổi API/schema nghiệp vụ.

## Tiến trình

| Mốc | Module / công việc                           | Dữ liệu đích                                                                     |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Chuẩn bị script và backup                    | Chỉ đọc DB nguồn; backup mã hóa và restore thử vào replica set tạm               |
| 2   | Account + Facility                           | Reset một lần; 37 account, 37 profile, 5 cơ sở Q1–Q5                             |
| 3   | Unit Type + Amenity + Offering + Timeslot    | 4 loại, 5 tiện ích, 20 offering kho, 25 offering tiện ích, 35 timeslot           |
| 4   | Storage Unit + Storage Rack + Rack Tier      | 90 phòng thường, 5 warehouse; mỗi warehouse 10 kệ × 4 tầng; tổng 50 kệ, 200 tầng |
| 5   | Reservation + Contract + Finance             | Q2–Q5 mỗi nơi 4 Reservation, 6 HĐ phòng + 2 HĐ kệ; tổng 16 Reservation/32 HĐ     |
| 6   | Access Schedule + SKU + Inventory + Movement | 3 lịch/hợp đồng kệ, tổng 24 lịch; nhập → dời → xuất                              |
| 7   | Đối soát và bàn giao                         | Kiểm tra toàn bộ liên kết, tiền, trạng thái, phân quyền và giao diện             |

## Milestone 1: chuẩn bị và backup

- Script độc lập: `scripts/seed-milestones.ts`. Không gọi hoặc sửa master seed cũ.
- Mặc định inspect/dry-run; không ghi DB nguồn hoặc tạo backup file.
- `--backup` đọc snapshot nhất quán trong transaction, lưu tài liệu bằng raw BSON base64 để giữ chính xác ObjectId, Date, int64, số và binary subtype.
- Lưu options và indexes của mọi collection, kể cả collection rỗng. So sánh metadata trước/sau snapshot; nếu thay đổi thì dừng.
- Backup AES-256-GCM, khóa ngẫu nhiên lưu file riêng; đọc lại và kiểm tra checksum.
- Restore thử chỉ dùng replica set local mới do `mongodb-memory-server` tạo. Tắt TTL monitor ở DB tạm để tài liệu lịch sử không biến mất khi đối soát. Đối chiếu raw BSON, toàn bộ indexes (giữ thứ tự compound key) và collection options.
- Không nhận URI restore đích. Milestone 1 chỉ chuẩn bị/backup; reset và seed Account + Facility thuộc milestone 2 riêng. Milestone 3 thêm danh mục và đổi tên; milestone 4 thêm phòng/kệ/tầng, warehouse floor=1. Milestone 5 đã apply và đối soát; milestone 6–7 chưa triển khai.
- Không cần cài thư viện mới. Không import app/container để tránh khởi động worker, Redis hoặc gửi email.
- Chỉ hỗ trợ collection thường với options validator/validationLevel/validationAction/collation. Gặp view, system collection hoặc cấu trúc đặc biệt khác phải báo lỗi, không âm thầm bỏ qua.

### Lệnh sử dụng

```powershell
# Chỉ xem inventory và các checkpoint; không ghi DB hay file backup
npm run db:seed:milestone -- --milestone 1 --dry-run

# Tạo backup, đọc lại và restore thử; vẫn không thay đổi DB nguồn
npm run db:seed:milestone -- --milestone 1 --backup

# Kiểm tra lại backup đã lưu, không kết nối MONGODB_URI
# <stem> là đường dẫn bỏ đuôi .bson.enc/.key/.verified.json
npm run db:seed:milestone -- --verify-backup "<stem>"
```

Các file `.bson.enc`, `.key`, `.verified.json` nằm trong `.agents/memory/backups/`, đã được gitignore. Cần giữ cả backup lẫn key để khôi phục; không commit hoặc in key. File `.verified.json` chỉ chứa thống kê/checksum và kết quả đối soát, có thể mở để kiểm tra.

**Rollback:** milestone 1 không thay đổi DB nguồn nên không cần rollback DB. Helper đã kiểm chứng restore vào DB tạm; chưa có CLI restore vào DB thật. Nếu cần khôi phục DB thật ở milestone sau, dừng ứng dụng và dùng quy trình restore có kiểm soát, kiểm tra DB đích và backup trước khi mở ứng dụng. Không tự restore vào DB đang chạy.

**Độ mới backup:** backup chỉ phản ánh thời điểm capture. Trước reset ở milestone 2 phải dừng API/worker, tạo lại và xác minh backup mới; không dùng bản milestone 1 nếu dữ liệu đã thay đổi.

## Milestone 2: Account + Facility

Đã được người dùng cho phép thực hiện reset và seed. Chỉ tạo 37 account, 37 profile, 5 facility cùng audit và checkpoint; chưa chạy các module tiếp theo.

```powershell
# Chỉ xem DB đích, checkpoint và số lượng dự kiến
npm run db:seed:milestone -- --milestone 2 --dry-run

# Lần đầu: backup mới + restore thử, reset dữ liệu và nạp Account + Facility
npm run db:seed:milestone -- --milestone 2 --reset --apply --database self-storage-db
```

- DB thực tế từ `MONGODB_URI` phải trùng `--database`; thiếu cờ hoặc sai DB thì không reset.
- API local phải dừng. Script kiểm tra API/worker, tạm dừng đúng 5 queue ứng dụng và từ chối nếu còn worker/job active. Không hỗ trợ tự dừng API remote.
- Dữ liệu mới được validate bằng model; ID ổn định theo email/mã cơ sở, mật khẩu bcrypt. Mọi thao tác xóa, insert và audit cùng transaction; so checksum từng collection với backup trước khi xóa. Lỗi thì rollback.
- Không drop database/index. Dùng `deleteMany` và tạo lại index của User/Profile/Facility/AuditLog nếu DB ban đầu trống hoặc đã bị drop. Điều kiện partial unique index Facility dùng `deleted: {$in: [false, null]}` để bao gồm false/null/missing, loại deleted=true; MongoDB không hỗ trợ `$ne` trong partial index.
- Checkpoint `seedmilestones` có hai trạng thái `seeded` và `complete`: commit dữ liệu trước, dọn Redis sau. Xóa job cũ chỉ trong queue ứng dụng; thu hồi session của user bị xóa, kể cả user đã mất do DB bị drop trước đó. Không dùng FLUSHALL, không xóa session của user mới hoặc key khác.
- Nếu Redis cleanup lỗi sau commit, giữ queue paused và checkpoint `seeded`; chạy lại cùng lệnh chỉ hoàn tất cleanup, không reset lại DB. Khi `complete`, chạy lại chỉ đối soát dữ liệu/index, không reset hoặc xóa job mới.
- Báo cáo là `<backup-stem>.milestone-2.json` trong thư mục backup gitignored. API không được khởi động tự động; có thể chạy `npm run dev` để kiểm tra UI sau khi milestone hoàn tất.

### Kiểm tra thủ công tại điểm dừng

- Đăng nhập `admin@example.com`, `ops@example.com`, `qlq1@example.com`, `nv1q1@example.com`, `kh1@example.com`; mật khẩu chung `Password123@`.
- Kiểm tra 5 cơ sở Q1–Q5, mỗi cơ sở 1 quản lý và 5 staff đúng quận, thông tin profile và trạng thái active/verified.
- Chưa có phòng, kệ, offering, hợp đồng hoặc tồn kho. Chờ người dùng kiểm tra trước milestone 3.

### Test bổ sung milestone 2

Replica set tạm: dữ liệu và phân công đúng, backup stale bị chặn, rollback khi insert lỗi, giữ index, tạo index khi DB mới, unique code chặn cơ sở active trùng và cho phép soft-deleted, rerun không xóa dữ liệu module sau, cleanup tiếp tục khi chưa complete, chỉ dọn session user cũ và phát hiện orphan session khi DB trống.

## Milestone 3: dữ liệu đã được duyệt và triển khai

Người dùng yêu cầu xem plan trước, sau đó đã xác nhận "okk tiến hành đi". Chỉ thêm danh mục và đổi tên hiển thị, không reset DB và không dọn Redis.

```powershell
npm run db:seed:milestone -- --milestone 3 --dry-run
npm run db:seed:milestone -- --milestone 3 --apply --database self-storage-db
```

Không chấp nhận cờ `--reset` cho milestone 3. Bắt buộc milestone 2 đã complete. Backup mã hóa và restore thử trước khi cập nhật; ghi tên, catalog và audit cùng transaction. Dừng nếu danh mục đã có dữ liệu mà chưa có checkpoint, tránh ghi đè dữ liệu tự tạo. Nếu transaction rollback thì tên cũng không đổi. Chạy lại khi có checkpoint không insert hoặc đổi tên lại, chỉ đối soát/index và hoàn tất trạng thái còn dở.

### Tên hiển thị mới

- `admin` → Quản trị viên hệ thống; `ops` → Quản lý vận hành.
- `qlq1`–`qlq5` → Quản lý Quận 1–5.
- `nv1q1`… → Nhân viên 1 Quận 1…; luôn có số thứ tự và quận.
- `kh1`–`kh5` → Khách hàng 1–5.
- Chỉ cập nhật `name` và `updatedAt` của 37 tài khoản seed; giữ ID/email/password/role/phân công và mọi profile/facility. Factory milestone 2 cũng dùng tên đầy đủ cho DB mới.

### Unit Type — 4 bản ghi

| Tên                     | Dài × rộng × cao (m) | Diện tích (m²) |
| ----------------------- | -------------------- | -------------- |
| Tủ lưu trữ cá nhân 1 m² | 1 × 1 × 1            | 1              |
| Phòng kho nhỏ 5 m²      | 2 × 2,5 × 2,7        | 5              |
| Phòng kho lớn 10,05 m²  | 3 × 3,35 × 3         | 10,05          |
| Kho kệ hàng 100 m²      | 16 × 6,25 × 5,5      | 100            |

Tất cả active. Warehouse có defaultRackConfig 10 kệ × 4 tầng; kích thước tầng 2,5 × 1,2 × 0,9 m, tải trọng 800 kg/tầng. Chưa tạo Storage Unit/Rack/Tier thực tế.

### Amenity — 5 bản ghi, 25 offering

| Tên             | Loại     | Giá (đ) | Chu kỳ   | Tổng lượng mỗi cơ sở  |
| --------------- | -------- | ------- | -------- | --------------------- |
| Máy lạnh        | PHYSICAL | 8.000   | MONTH    | 20                    |
| Camera giám sát | PHYSICAL | 5.000   | MONTH    | 20                    |
| Thùng carton    | PHYSICAL | 5.000   | ONE_TIME | 200                   |
| Ổ khóa          | PHYSICAL | 5.000   | ONE_TIME | 100                   |
| Dịch vụ bốc xếp | SERVICE  | 10.000  | ONE_TIME | null (không giới hạn) |

Tất cả active, inUseQuantity = 0. Cả 5 cơ sở dùng cùng bảng giá. Thêm 20 offering kho: locker/small/large = 5.000/8.000/10.000đ/tháng; warehouse giá cơ bản 10.000đ, zone Economy/Standard/Prime = 5.000/8.000/10.000đ/kệ/tháng. Cọc một kỳ, tối thiểu 30 ngày.

### Timeslot — 35 bản ghi

Mỗi cơ sở có 7 ca: 07:00–09:00, 09:00–11:00, 11:00–13:00, 13:00–15:00, 15:00–17:00, 17:00–19:00, 19:00–21:00. Sức chứa lần lượt 4/4/3/4/4/3/2 lịch, isActive = true. Slot name lưu dạng `07:00 - 09:00`. Sửa partial unique index Timeslot từ `$ne:true` sang `$in:[false,null]` như Facility để MongoDB có thể tạo index mới mà vẫn loại soft-deleted.

### Kiểm tra và điểm dừng

Kiểm tra 4/5/20/25/35 bản ghi, đầy đủ quan hệ và giá, 37 tên đúng, mật khẩu/email/ID/phân công và profile/facility không đổi. Test rollback, chặn danh mục tự tạo, chạy lại không ghi đè, unique timeslot active và cho phép soft-deleted. Báo cáo `<backup-stem>.milestone-3.json` trong thư mục backup gitignored. Chờ người dùng kiểm tra; trình plan Milestone 4 trước khi viết thêm code.

## Milestone 4: phòng, kệ, tầng kệ và numeric floor

Người dùng cập nhật warehouse từ null sang `floor=1`; phòng thường dùng tầng 1/2. Đồng bộ logic numeric floor, không reset DB hoặc thay đổi số phòng/kệ.

```powershell
npm run db:seed:milestone -- --milestone 4 --dry-run
npm run db:seed:milestone -- --milestone 4 --apply --database self-storage-db
```

### Dữ liệu

Mỗi Q1–Q5 có 6 tủ lưu trữ + 6 phòng nhỏ + 6 phòng lớn (mỗi loại 3 phòng tầng 1, 3 phòng tầng 2), cùng 1 warehouse floor=1. Tổng 95 units: 50 floor=1, 45 floor=2; không có floor null.

- Ví dụ mã Quận 1: `Q1-TU-101`…`103`, `Q1-TU-201`…`203`; tương tự tiền tố `NHO`, `LON`. Warehouse `Q1-KHO-01`, không mã hóa tầng vào mã warehouse.
- Zone ghi đầy đủ: Khu tủ lưu trữ / Khu phòng kho nhỏ / Khu phòng kho lớn / Khu kho kệ. Notes mô tả đủ số phòng, tầng, quận; warehouse notes “Kho kệ hàng Quận 1”. Ảnh unit để trống. Mọi unit ban đầu available.
- Warehouse có 10 racks, mỗi rack 4 tiers. Mã `Q1-R01`…`Q1-R10`, name “Kệ 01 Quận 1”…; Q2–Q5 thay quận.
- R01–R04: Economy, dãy A bay 1–4; R05–R08: Standard, dãy B bay 1–4; R09–R10: Prime, dãy C bay 1–2. customPrice=null, currentContractId/currentCustomerId=null; giá lấy từ offering zone hiện có.
- Tier number 1–4, mã `Q1-R01-T01`…`T04`, kích thước 2,5×1,2×0,9m, volume=2,7m³, maxWeightKg=800; available. Tổng 50 racks, 200 tiers; 345 bản ghi nghiệp vụ.

### API và vận hành

- IStorageUnit.floor và response floor là number, nguyên >=1 cho mọi loại kho. Create bỏ floor mặc định 1; PATCH bỏ floor giữ tầng; đổi Unit Type hai chiều giữ tầng nếu không truyền floor mới. Null/0/âm/phân số bị chặn. Service dùng lỗi 608 chung; 607 giữ mã cũ tương thích nhưng không còn được phát.
- Không thêm endpoint/cú pháp filter. Snapshot Contract/Reservation và các ref StorageRack/Incident/Inventory không nhận floor null; ref một phần vẫn có thể bỏ field floor. Không ép null thành 0. Đồng bộ OpenAPI/tsoa; handover FE tại `FE_PROMPT_STORAGE_FLOOR.md`.
- Giữ generator `strictNullChecks` đồng nhất TypeScript dự án; chỉ loại nullable của floor, không đổi các field nullable khác. Test validator route thực chặn floor null và OpenAPI ghi floor numeric.
- Partial unique index StorageUnit/RackTier chuyển `$ne:true` sang `$in:[false,null]` để tạo được trên MongoDB. Chặn trùng mã phòng, mã/vị trí kệ, tier number trong kệ; soft-deleted được loại khỏi unique constraint.
- Seed yêu cầu checkpoint M3 complete, đủ 5 cơ sở active và 4 unit types active, đủ offering active theo cặp cơ sở/loại, cấu hình warehouse 10×4 và tier dimensions/tải trọng đúng plan.
- Dùng các Unit Type hiện tại làm liên kết; không yêu cầu diện tích/thể tích/ảnh của M3 phải khớp seed gốc và không ghi đè chỉnh sửa của người dùng. Không gọi `verifyCatalog` với fixture gốc làm điều kiện chạy M4.
- Backup và restore thử trước insert. Từ chối nếu đích có dữ liệu tự tạo mà chưa có checkpoint. Insert 3 nhóm + 345 audit SYSTEM cùng transaction, sau đó verify và complete checkpoint. Không dùng hàm auto provision vốn xếp 10 kệ đầu vào Prime.
- Chạy lại có checkpoint chỉ kiểm tra/index và complete phần còn dở, không insert hoặc reset trạng thái rented/occupied/resources. Khi M4 complete, kiểm tra không ép status/customer/contract/customPrice về trạng thái ban đầu.
- Không cần backfill dữ liệu cũ khi chạy lần đầu vì collection đích trống; nếu có dữ liệu ngoài seed phải dừng để người dùng quyết định, không tự migrate.

### Verification

Test API trên replica set: warehouse/phòng thường bỏ tầng mặc định 1, chấp nhận tầng nguyên dương, chặn null/0/âm/phân số; đổi Unit Type hai chiều giữ tầng; list/detail/available/map và snapshot số. Test seed giữ nguyên số lượng, links, rollback, unique, rerun và catalog đã chỉnh sửa; warehouse floor=1.

## Milestone 5: đặt chỗ, hợp đồng và tài chính

Người dùng đã duyệt plan chi tiết và yêu cầu triển khai. Chốt 90/180 ngày (3/6 kỳ 30 ngày), phối hợp cả 5 tiện ích và có tài liệu mẫu mở được. Bảng 32 hợp đồng, số tiền, tài nguyên, ủy quyền và quy trình được lưu tại [MILESTONE_5_DATA.md](MILESTONE_5_DATA.md).

- Script `contracts-finance.ts` dựng 16 Reservations completed, 32 contracts, 160 invoices, 176 payments, 16 refunds, 1 template, 4 signing authorizations; chỉ Q2–Q5. Dùng lại pháp nhân active Công Ty TNHH Storage Hub.
- Mỗi cơ sở: HĐ 01/04/07/08 từ Reservation (2 phòng, 2 kệ); HĐ 02/03/05/06 walk-in. Cọc gồm 16 reservation_deposit + 16 contract_deposit; hợp đồng Reservation tham chiếu Payment cọc đã thu, không tạo lần thu thứ hai. Tổng tiền giữ nguyên.
- Không reset; 405 bản ghi mới và 52 resource updates cùng 458 audit SYSTEM/simulated/checkpoint trong transaction; đối soát ngay trước commit. Không gọi API nghiệp vụ hiện tại để tạo lịch sử từ tháng 4.
- Tổng tiền thuê/tiện ích 2.500.000đ; cọc thu 276.000đ, cọc hoàn 112.000đ, cọc giữ 164.000đ. Phí một lần chỉ ở hóa đơn đầu. Hóa đơn settlement 0đ không có Payment 0đ.
- Có pipeline 52 tài liệu PNG qua Cloudinary, manifest/hash để resume; backup và restore thử trước mọi upload/insert. Network ngoài transaction; không email, queue, SePay hay chuyển tiền thật.
- Điều kiện apply bắt buộc: M4 complete, giá/tài nguyên/stock khớp, nhóm active chưa hết hạn, Render floor numeric và map cả 5 cơ sở có warehouse floor=1. Không có cờ bỏ qua điều kiện hoặc reset. Rerun complete không ghi đè sửa đổi của người dùng.
- Người dùng đã duyệt phương án thêm Reservation và yêu cầu tiếp tục M5. Đã apply lúc 18:51 ngày 18/11/2026, đối soát DB/service/Render/tài liệu và rerun không trùng; chi tiết trong PROGRESS.md. Chờ người dùng kiểm tra M5, chưa triển khai M6.

## Dữ liệu đã thống nhất cho các milestone sau

- Account: 1 admin, 1 ops, 5 quản lý `qlq1`–`qlq5`, 25 staff `nv1q1`–`nv5q5`, 5 khách `kh1`–`kh5`; email `@example.com`, mật khẩu test `Password123@`, local/active/email verified. Gán manager và staff đúng facility; mỗi user có profile giả lập, chưa tạo giấy tờ. Đồng bộ `facility.managerId` với `user.assignedFacilityId`.
- Facility: mã Q1–Q5, tên Kho Quận 1–5, TP.HCM, địa chỉ/liên hệ giả lập, active, giờ 07:00–21:00. Milestone 2 để `legalEntityId` trống vì schema cho phép.
- Q1 chỉ có dữ liệu nền, không có hợp đồng, tồn kho hoặc lịch ra vào; khách Q1 để thao tác thủ công.
- Locker/small/large: 6 phòng mỗi loại mỗi cơ sở, 3 ở floor=1 và 3 ở floor=2. Warehouse floor=1: 10 kệ, zone Economy/Standard/Prime = 4/4/2, mỗi kệ 4 tầng.
- Giá tháng locker/small/large = 5.000/8.000/10.000đ; kệ Economy/Standard/Prime = 5.000/8.000/10.000đ/kệ. Áp dụng như nhau cho 5 cơ sở; giữ cấu hình cọc một kỳ và tối thiểu 30 ngày từ seed hiện có.
- Tiện ích: máy lạnh 8.000đ/tháng, camera 5.000đ/tháng, carton 5.000đ/lần, ổ khóa 5.000đ/lần, bốc xếp 10.000đ/lần. Bốc xếp là SERVICE, còn lại PHYSICAL. Không dùng enum SECURITY không tồn tại.
- Mỗi cơ sở có 7 ca 2 giờ từ 07:00–21:00, sức chứa theo master seed hiện tại (4/4/3/4/4/3/2); sức chứa tính theo số lịch, không theo số người.
- Mỗi Q2–Q5: 3 hợp đồng phòng + 1 hợp đồng thuê 1 kệ đã hoàn thành (locker/small bắt đầu 01/04, large/kệ bắt đầu 01/05, kỳ hạn 3 tháng); 3 hợp đồng phòng + 1 hợp đồng thuê 2 kệ còn hiệu lực (bắt đầu 01/06, kỳ hạn 6 tháng). Tổng 16 COMPLETED + 16 ACTIVE.
- Hợp đồng RESERVATION/WALK_IN có snapshot, chữ ký, pháp nhân/mẫu/quyền ký theo cấu hình và đủ hóa đơn/thanh toán/quyết toán; ngày kết thúc, tiền và cọc theo logic hiện có. Module phụ trợ pháp lý triển khai cùng milestone 5 trước hợp đồng.
- Mỗi hợp đồng kệ có 3 lịch đã hoàn thành, số người 5/8/10, đúng nhân viên và thời gian. Nhập 10 đơn vị rồi dời tầng; hợp đồng hoàn thành xuất hết, hợp đồng hiệu lực xuất 4 còn 6. Khách là người thao tác hàng; hợp đồng 2 kệ có hàng trên cả hai kệ.
- Chưa seed sự cố, hỗ trợ hoặc phê duyệt ngoài dữ liệu phụ trợ bắt buộc. Không gửi email/thu tiền thật.

## Kiểm thử

- Test trên replica set tạm: dry-run không thay đổi nguồn, chặn reset/apply/milestone khác, snapshot giữ cả collection rỗng và metadata, mã hóa đọc lại đúng, ciphertext hỏng bị chặn, checksum hỏng bị chặn, restore raw BSON/index/options khớp, view không được bỏ sót.
- Kiểm tra TypeScript riêng cho scripts/tests vì `tsconfig.json` chính chỉ include `src`.
- Chạy `npm run check`, `npm run build`; báo riêng lỗi ngoài phạm vi nếu có.
