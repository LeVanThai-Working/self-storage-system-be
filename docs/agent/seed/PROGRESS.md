# Seed milestone progress

**Yêu cầu hiện tại (cập nhật 18/11/2026): mọi kho có floor số nguyên dương; warehouse floor=1.** Người dùng đã sửa DB và yêu cầu đồng bộ logic. Các ghi chú floor=null bên dưới là lịch sử trước khi đổi yêu cầu, không còn là quy tắc hiện hành.

| Milestone | Nội dung                            | Trạng thái                                                                 |
| --------- | ----------------------------------- | -------------------------------------------------------------------------- |
| 1         | Chuẩn bị script và backup           | DONE — chờ người dùng kiểm tra; quality gate có 1 test cũ lỗi ngày cố định |
| 2         | Account + Facility                  | DONE — đã seed và đối soát DB thật; chờ người dùng kiểm tra                |
| 3         | Danh mục + Offering + Timeslot      | DONE — đã seed và đối soát DB thật; chờ người dùng kiểm tra                |
| 4         | Phòng + Kệ + Tầng kệ                | DONE — đã seed và đối soát DB thật; chờ người dùng kiểm tra                |
| 5         | Reservation + Hợp đồng + Tài chính  | DONE — đã seed/đối soát DB thật; chờ người dùng kiểm tra trước M6          |
| 6         | Lịch đến + SKU + Tồn kho + Movement | NOT_STARTED                                                                |
| 7         | Đối soát và bàn giao                | NOT_STARTED                                                                |

## Milestone 1 — 18/11/2026

- DB nguồn: `self-storage-db`, replica set; snapshot 33 collections, 2.510 documents.
- Captured: `2026-11-18T06:23:10.733Z` (13:23 giờ Việt Nam).
- Restore verified: `2026-11-18T06:23:42.054Z`; dữ liệu raw BSON, options và indexes đối soát thành công trên replica set tạm, đã dọn DB tạm.
- Đã chạy lại lệnh `--verify-backup` trên file đã lưu bằng phiên bản script cuối: đạt lúc `2026-11-18T06:26:22.103Z` (13:26 giờ Việt Nam).
- Backup stem: `.agents/memory/backups/seed-m1-2026-11-18T06-23-12-943Z-236826c3-c558-485e-9529-224d55298121` (gitignored; cần cả `.bson.enc` và `.key`).
- Báo cáo kiểm tra: thêm đuôi `.verified.json` vào stem. Không chứa nội dung tài liệu hoặc khóa.
- Chưa reset/seed DB nguồn; chưa dừng hoặc thay đổi API/worker/Redis.
- Script chặn apply/reset và milestone 2–7, dừng sau chuẩn bị.
- 7/7 test chuyên biệt đã pass; TypeScript scripts/tests và ESLint scoped đã pass.
- `npm run check`: typecheck, lint và format:check đều pass; test tổng thể **688 passed / 1 failed**, tổng 689 tests / 69 files. Test lỗi thuộc Reservation, ngoài phạm vi milestone 1 (chi tiết bên dưới).
- `npm run build`: PASS. Không đổi API/schema nghiệp vụ; không commit/push.

## Milestone 2 — 18/11/2026

- Người dùng đã cho phép reset và seed Account + Facility; không cần hỏi lại quyền chạy.
- Đã chạy `npm run db:seed:milestone -- --milestone 2 --reset --apply --database self-storage-db`.
- Lúc capture trước chạy, DB đích đã trống (0 collection / 0 documents). Không khôi phục dữ liệu cũ. Backup M1 có 33 collections / 2.510 documents vẫn được giữ.
- Backup mới đã restore thử thành công: `.agents/memory/backups/seed-m1-2026-11-18T06-51-00-763Z-0a84f516-894f-434d-91af-967ada0c6eed` (đuôi `.bson.enc`, `.key`, `.verified.json`). Prefix `seed-m1` là tên công cụ backup, không phải đã chạy lại mốc dữ liệu.
- Commit seed: `2026-11-18T06:51:07.598Z` (13:51 giờ Việt Nam); checkpoint `module-seed-v1:2` đã complete.
- DB hiện có **37 users, 37 profiles, 5 facilities**, cùng audit và 1 checkpoint. Role counts: admin 1, ops 1, manager 5, staff 25, customer 5. Mỗi cơ sở đúng 1 manager + 5 staff.
- DB đã bị drop nên cần dựng mới index. Đã tạo index User/Profile/Facility/AuditLog; sửa duy nhất điều kiện partial index Facility `$ne:true` thành `$in:[false,null]` vì MongoDB từ chối `$ne`. Test kiểm tra unique code và soft-deleted đã đạt. Không đổi API.
- Dọn đúng 5 queue ứng dụng; không có API/worker local đang chạy, không khởi động app tự động. Đã dọn thêm **56 khóa session của 10 user cũ** còn trong Redis do MongoDB đã trống. Không dùng FLUSHALL, không xóa key ngoài phạm vi.
- Đối soát thực tế: users 37 (3 indexes), profiles 37 (2 indexes), facilities 5 (2 indexes), auditlogs 82 (5 indexes), seedmilestones 1 (1 index). Không có dữ liệu các module sau.
- Chạy lại cùng lệnh sau khi complete: `alreadyApplied: true`, `resetPerformed: false`, số lượng và phân công giữ nguyên.
- Báo cáo kết quả: `<backup-stem>.milestone-2.json` (gitignored); gồm counts, phân công, cleanup và thời điểm xác minh index.
- 15/15 test seed (2 files), TypeScript scripts/tests, ESLint scoped và format đạt. `npm run build`: PASS. `npm run check`: typecheck/lint/format PASS; bộ test tổng thể **696 passed / 1 failed**, tổng 697 tests / 70 files. Test Reservation ngày cố định lỗi như trước, không thuộc phần seed và không sửa trong task này.
- Tài khoản: email `admin`, `ops`, `qlq1`–`qlq5`, `nv1q1`–`nv5q5`, `kh1`–`kh5` tại `@example.com`. Mật khẩu test chung `Password123@`.

## Milestone 3 — 18/11/2026

- Người dùng đã xem plan dữ liệu và duyệt thực hiện; yêu cầu xem plan trước khi viết/chạy mọi milestone tiếp theo được giữ lại.
- Đã chạy `npm run db:seed:milestone -- --milestone 3 --apply --database self-storage-db` thành công lúc `2026-11-18T07:15:18.213Z` (14:15 giờ Việt Nam), resetPerformed=false, namesUpdated=37.
- Tên mới đầy đủ: Quản trị viên hệ thống, Quản lý vận hành, Quản lý Quận 1–5, Nhân viên [số] Quận [số], Khách hàng 1–5. Email và các khóa liên kết giữ nguyên; factory Account cũng đã cập nhật để seed DB mới không dùng tên viết tắt.
- Đã thêm 4 unittypes, 5 amenities, 20 facilityunittypeofferings, 25 facilityamenityofferings, 35 facilitytimeslots theo bảng đã duyệt trong PLAN.md.
- Warehouse mặc định 10 kệ × 4 tầng; tầng 2,5 × 1,2 × 0,9m, 800kg. Chưa tạo phòng, kệ hay hợp đồng (storageunits/storageracks/contracts đều 0).
- Backup trước chạy: 5 collections / 162 documents; đã restore thử thành công. Stem: `.agents/memory/backups/seed-m1-2026-11-18T07-15-09-965Z-bed9880d-3eef-46d3-b6a6-b6cdad8014ce` (gitignored, có `.bson.enc`, `.key`, `.verified.json`, `.milestone-3.json`).
- Đối chiếu DB thật với backup: 37 tài khoản giữ nguyên ID/email/password/phone/role/authProvider/status/isEmailVerified/assignedFacilityId/createdAt; profile và facility giữ nguyên checksum raw BSON. DB vẫn có 37 users, 37 profiles, 5 facilities. Checkpoint milestone 2 và 3 đều complete.
- Sửa partial unique index Timeslot `$ne:true` → `$in:[false,null]` để tạo được index trên MongoDB, cùng cách với Facility. Không đổi API.
- 23/23 test seed (3 files), TypeScript scripts/tests, ESLint và format đã đạt; `npm run build` PASS. Full check: typecheck/lint/format PASS, tổng **704 passed / 1 failed**, 705 tests / 71 files; chỉ lỗi Reservation dùng ngày cố định 15/11 như trước.
- Đã chạy lại cùng lệnh trên DB thật: alreadyApplied=true, resetPerformed=false, counts giữ nguyên 4/5/20/25/35; không thêm bản ghi trùng hoặc đổi tên lại. Báo cáo cuối xác minh lúc `2026-11-18T07:19:31.115Z`.

## Milestone 4 — 18/11/2026

- Đã chạy `npm run db:seed:milestone -- --milestone 4 --apply --database self-storage-db` thành công lúc `2026-11-18T07:49:52.376Z` (14:49 giờ Việt Nam), không reset DB. Checkpoint `module-seed-v1:4` complete.
- Đã thêm **95 storageunits, 50 storageracks, 200 racktiers**. Mỗi cơ sở Quận 1–5 có 6 tủ đồ, 6 phòng nhỏ, 6 phòng lớn và 1 kho kệ; mỗi loại phòng chia 3 tầng 1 + 3 tầng 2. Tổng floor: 45 tầng 1, 45 tầng 2, **5 kho có `floor=null`**.
- Mỗi kho đúng **10 kệ × 4 tầng**; phân vùng 4 Economy / 4 Standard / 2 Prime. Tầng kệ 2,5 × 1,2 × 0,9m, thể tích 2,7m³, tải trọng 800kg. Tất cả available; chưa có contract, customer inventory hoặc movement.
- Backup trước chạy đã restore thử và đối soát thành công: 33 collections / 392 documents. Stem `.agents/memory/backups/seed-m1-2026-11-18T07-49-40-610Z-756e509c-ecba-4437-a4dc-aad0a35bfd13` (gitignored), gồm `.bson.enc`, `.key`, `.verified.json`, `.milestone-4.json`.
- Toàn bộ 345 bản ghi layout, audit tương ứng và checkpoint seeded được ghi cùng transaction; đánh dấu complete sau đối soát. Đã chạy lại cùng lệnh: `alreadyApplied=true`, `resetPerformed=false`, số lượng giữ nguyên; verified lúc `2026-11-18T07:54:22.347Z`. Rerun không đặt lại trạng thái, người thuê hoặc giá đã chỉnh sau checkpoint complete.
- Đối chiếu backup: account, profile, facility, amenity, offerings, timeslots và dữ liệu nghiệp vụ trước đó giữ nguyên. Giữ các kích thước UnitType người dùng đã sửa trước M4 (phòng lớn rộng 3,4m, kho rộng 6,3m). Hai UnitType được cập nhật ảnh sau khi seed hoàn tất; giữ nguyên ảnh người dùng, không khôi phục dữ liệu catalog cũ.
- Đọc qua service API trên DB thật: danh sách đủ 95; Quận 1 available/map đều 19; chi tiết 5 kho có floor=null và rackCapacity 10/10 available, occupied=0, availablePercentage=100.
- API create/update và response StorageUnit, snapshot Contract/Reservation, StorageRack, Incident đã hỗ trợ floor nullable. Kho từ chối floor số (607); phòng thường yêu cầu số nguyên dương (608), mặc định 1 khi tạo và bỏ trống. Chuyển kho sang phòng thường phải truyền floor rõ ràng. Bộ lọc floor vẫn chỉ nhận số.
- Bật `compilerOptions.strictNullChecks` trong `tsoa.json` để mã route/OpenAPI giữ kiểu null từ Zod, đồng nhất với TypeScript dự án. Việc sinh mã đồng thời thể hiện chính xác các trường nullable có sẵn ở module khác. Test dùng validator TSOA thực với metadata từ routes sinh ra xác nhận POST/PATCH giữ floor=null; OpenAPI khai báo nullable.
- Sửa partial unique index StorageUnit và RackTier `$ne:true` → `$in:[false,null]`, kiểm tra chặn trùng bản ghi active và cho phép bản ghi soft-delete.
- Bàn giao FE tại [FE_PROMPT_STORAGE_FLOOR.md](FE_PROMPT_STORAGE_FLOOR.md). Không thay đổi source frontend, không commit/push.
- Kiểm tra cuối: typecheck, ESLint, Prettier, TypeScript riêng scripts/tests và build đều PASS. **41/41 tests** của 5 files seed/floor PASS; bộ test tổng thể **722 passed / 1 failed**, 723 tests / 73 files. Chỉ còn lỗi Reservation ngày cố định 15/11 như mục ngoài phạm vi; log cuối tại `.agents/memory/milestone-4-final-tests.log` (gitignored). Một lần chạy test cùng build đọc file routes đang được sinh lại; đã chạy lại tuần tự sau build và lỗi này không còn.

## Milestone 5 — 18/11/2026

- Người dùng đã duyệt và yêu cầu thực hiện plan. Dữ liệu chi tiết tại [MILESTONE_5_DATA.md](MILESTONE_5_DATA.md): 32 contracts (16 completed, 16 active), 160 invoices, 176 payments, 16 refunds, 1 template và 4 signing authorizations. Q1/user/profile giữ nguyên.
- Đã viết module seed và CLI milestone 5, dựng fixture bằng model validation, kiểm tra ngày/giá/tài nguyên/stock. Dùng lại pháp nhân Công Ty TNHH Storage Hub, chặn xung đột với hợp đồng thủ công kể cả khi unit bị đánh dấu available sai.
- Transaction ghi 389 bản ghi mới + 52 resource updates + audit SYSTEM/simulated và checkpoint complete; đối soát hash trước commit. Rerun chỉ kiểm tra ID đã seed, giữ chỉnh sửa về trạng thái, giá, kho và quyền ký; vẫn rerun được khi qua 27/11.
- Pipeline 52 tài liệu SVG→PNG qua Cloudinary có manifest, kiểm tra URL/MIME/PNG/checksum, resume bằng publicId và không upload trùng. **Chưa upload tài liệu thật** vì Render chưa đạt điều kiện apply.
- Dry-run đã chạy trên DB thật, dự kiến tổng thuê/tiện ích 2.500.000đ; cọc thu 276.000đ, hoàn 112.000đ, giữ 164.000đ; `resetPerformed=false`. Log gitignored `.agents/memory/milestone-5-dry-run.log`.
- Lượt dry-run ban đầu xác nhận Swagger Render chưa nullable (`RENDER_FLOOR_NOT_NULLABLE`). Đối soát mới nhất phát hiện cả 5 warehouse trong DB đã có floor=1, khác kết quả M4 trước đó; hiện map Q1 trên Render trả 200 nhưng warehouse cũng floor=1. Người dùng xác nhận lại **giữ plan floor=null**. Chưa ghi đè dữ liệu này; cần đưa bản nullable lên Render trước khi khôi phục null để tránh làm API lỗi lại. Dry-run/apply M5 hiện chặn sớm bằng `FINANCE_WAREHOUSE_FLOOR_INVALID`, trước backup/upload/index/ghi DB. **Chưa apply M5 trên DB thật; contracts=0, không có checkpoint M5.**
- 16 tests M5 trên replica set tạm đã PASS: tiền/ngày, phí một lần, rollback, dependency/date/price/resource, bảo toàn dữ liệu, rerun, đọc Contract/Invoice qua service thật và phân quyền chéo. Các test tài liệu/Render dùng mock network; cloud upload và UI Render còn cần kiểm chứng khi hết điều kiện chặn.
- Theo yêu cầu bổ sung của người dùng, đã sửa test Reservation dùng ngày cố định: chỉ fake Date trong test normalize, phục hồi ở finally, kiểm tra cả UTC→ngày Việt Nam kế tiếp. Toàn bộ file Reservation 19/19 PASS; không đổi logic backend hoặc data seed.
- `npm run check` đã PASS toàn bộ: typecheck, lint, format và **740/740 tests, 74/74 files**. Sau đó đồng bộ fixture cũ trong file Reservation với constructor/enum/request type hiện tại (khởi tạo reservationRepo trước refund service, truyền userRepo đúng vị trí, category SMALL và amenities=[]); kiểm tra TypeScript riêng scripts/tests và ESLint scoped đều PASS. Không cài package mới.
- Kiểm tra cuối sau đồng bộ fixture: **35/35 tests** (Reservation + seed M5), Prettier scoped, `git diff --check` và `npm run build` đều PASS. Full-check log gitignored `.agents/memory/milestone-5-quality.log`.
- Đã thử lệnh apply M5 sau kiểm tra: dừng đúng tại preflight `FINANCE_WAREHOUSE_FLOOR_INVALID`, chưa tạo backup/upload/index hoặc ghi transaction. Đối soát `2026-11-18T11:14:41.329Z`: contracts/invoices/refunds/template=0, không checkpoint M5, không manifest asset. DB đang có 38 users/38 profiles, 6 payments và 5 signing authorizations ngoài M5; giữ nguyên các bản ghi này. Báo cáo gitignored `.agents/memory/milestone-5-preflight-result.json`.

## Cập nhật numeric floor — 18/11/2026

- Người dùng thay yêu cầu warehouse null bằng floor=1 và đã sửa dữ liệu. Đồng bộ model/request/response/service cho mọi loại kho: floor nguyên >=1, create bỏ tầng mặc định 1, PATCH bỏ tầng giữ nguyên, đổi Unit Type không xóa hoặc đặt lại tầng. Không còn lỗi warehouse gửi tầng số; mã 607 chỉ giữ tương thích, không phát mới.
- Snapshot/ref Contract, Reservation, StorageRack, Incident và CustomerInventory không nhận floor=null. Đồng bộ routes/OpenAPI và tài liệu FE. Không nới nullable của các trường khác, không reset DB.
- Seed layout tạo warehouse floor=1, tổng 50 units ở tầng 1 và 45 tầng 2. M5 preflight kiểm tra warehouse=1; Render gate kiểm tra schema numeric và tầng hợp lệ trên map của đủ 5 cơ sở. Không yêu cầu deploy nullable nữa.
- 34/34 tests liên quan (floor + layout + finance) đã PASS; typecheck và TypeScript scoped cũng PASS. Test mới đã fail trên logic cũ trước khi sửa, bao gồm model validation, route validation và giữ tầng khi đổi loại kho.
- Đối soát chỉ đọc lúc `2026-11-18T11:24:55.493Z`: cả 5 warehouse floor=1, Render readiness=true, dry-run M5 đạt. Hash foundation trước/sau giống nhau, không upload hoặc apply M5. Log gitignored `.agents/memory/warehouse-floor-update-verification.json`.
- Đề xuất thêm Reservation vào M5 chưa được triển khai hoặc seed; không thay source hợp đồng hoặc số tiền trong task sửa floor. Cần trình lại phân bổ Reservation/hợp đồng trước khi chạy M5.
- Kiểm tra cuối của thay đổi floor: `npm run check` PASS toàn bộ **740/740 tests, 74/74 files**, `npm run build` PASS; TypeScript scoped cho scripts/tests và `git diff --check` PASS. Log gitignored `.agents/memory/warehouse-floor-quality.log`. Đọc service thật: đủ 95 units với tầng nguyên dương; map Q1–Q5 đều 19 units, warehouse/detail đều floor=1, filter floor=1 đúng. Kiểm tra 21 schema floor trong OpenAPI đều numeric/non-nullable. Giữ nguyên DB, không upload hoặc apply M5 trong task này.

## Bổ sung Reservation cho M5 — 18/11/2026

- Người dùng đã duyệt phương án và yêu cầu tiếp tục. Đã bổ sung 16 Reservation completed cho Q2–Q5; mỗi cơ sở 4, liên kết HĐ 01/04/07/08 (2 phòng, 2 kệ). HĐ 02/03/05/06 vẫn walk-in; Q1 dành thao tác thủ công.
- Giữ 32 hợp đồng, 160 invoices, 176 payments, 16 refunds và tổng tiền cũ. 16 reservation_deposit chuyển nguyên Payment sang tham chiếu cọc của hợp đồng, không thu cọc hai lần; 16 contract_deposit cho walk-in. Tổng 405 records mới, 52 resource updates, 458 audit và 1 checkpoint trong transaction.
- Bổ sung snapshot chính sách/thời gian/ca 09:00–11:00, phân công nhân viên và lịch sử nhận kho. Chặn Reservation thủ công đang giữ cùng phòng/kệ, kiểm tra liên kết cọc trước mutation, kiểm tra phiên bản checkpoint. Sau upload đọc lại nền hiện tại rồi validate trước transaction.
- **19/19 tests M5 PASS** trên replica set: bảo toàn Reservation Q1 thủ công, đọc Reservation/Contract/Invoice qua service thật, chặn khách/cơ sở chéo, rollback và cọc không trùng. TypeScript scoped scripts/tests PASS. Đang kiểm tra tổng thể và chuẩn bị apply có backup/restore thử; chưa chạy M6.
- `npm run check` PASS **743/743 tests, 74/74 files**, typecheck/lint/format PASS; `npm run build` PASS. Lần apply đầu đã backup/restore thử nhưng dừng trước transaction vì Cloudinary Admin SDK bọc 404 trong `error.http_code`; chưa ghi dữ liệu M5. Thêm test tái hiện rồi sửa lookup cho cả lỗi trực tiếp/lồng nhau, vẫn chặn 401 và lỗi khác. Kiểm tra lại **20/20 tests M5**, TypeScript scoped/ESLint/Prettier PASS; chạy lại apply.
- **Đã apply thành công** bằng `npm run db:seed:milestone -- --milestone 5 --apply --database self-storage-db`; checkpoint complete lúc `2026-11-18T11:51:01.309Z` (18:51 giờ Việt Nam), resetPerformed=false. Đủ 405 records mới, 52 resource updates và 458 audit SYSTEM/simulated. Đối soát hash toàn bộ records/resources đạt, liên kết 16 Reservation/cọc hợp lệ.
- Backup trước apply: **33 collections / 1.236 documents**, restore thử raw BSON/index/options đạt. Stem gitignored `.agents/memory/backups/seed-m1-2026-11-18T11-47-33-303Z-d2b3e601-3fdc-41aa-a5b1-3365827c39b0`; có `.bson.enc`, `.key`, `.verified.json`, `.milestone-5.json`. 52 PNG Cloudinary xác minh checksum; mở mẫu ủy quyền/hợp đồng/hoàn cọc hiển thị đúng tiếng Việt. Manifest `.agents/memory/seed-m5-assets.json`.
- Đọc **32 Contract + 16 Reservation + 160 Invoice** qua service thật trên DB đích thành công. Render đủ 5 map đạt numeric floor/warehouse=1 sau seed. Chạy lại cùng lệnh: alreadyApplied=true, số lượng giữ nguyên, không upload/reset hoặc đổi dữ liệu.
- DB tổng: 38 users, 38 profiles, 5 facilities, 95 units, 50 racks, 200 tiers, **18 reservations / 33 contracts / 160 invoices / 184 payments / 16 refunds / 1 template / 9 signingauthorizations**. Phần ngoài M5 (2 reservations, 1 contract, 8 payments, 5 authorizations) được giữ lại.
- Đối chiếu 547 bản ghi có trước: 544 giữ nguyên ngoài các field được phép cập nhật; 3 bản ghi Quận 1 thay đổi trong lúc chạy (nhận kho, Reservation completed, hợp đồng có create/approve addendum). Đã đối chiếu backup/audit và xác nhận cả 3 không nằm trong ids/resources M5; không ghi đè thao tác thủ công. Báo cáo gitignored `.agents/memory/milestone-5-final-verification.json` và `m5-manual-q1-reconciliation.json`.
- Log kiểm tra: `.agents/memory/milestone-5-reservations-quality.log`, `milestone-5-reservations-build.log`, `m5-reservation-tests.log`, `milestone-5-reservations-apply.log`, `milestone-5-reservations-rerun.log`. Sau sửa Cloudinary và test rerun bảo toàn Reservation, **20/20 tests M5**, TypeScript scoped, ESLint và Prettier PASS. Không commit/push.

## Điểm dừng

M5 đã seed và đối soát backend/tài liệu. Dừng để người dùng kiểm tra dữ liệu/giao diện trong phiên của mình, rồi mới trình plan M6. Chưa seed Access Schedule, SKU, Inventory hoặc Movement (đều 0); không reset DB hoặc tự triển khai M6.

## Phát hiện ngoài phạm vi

- Master seed cũ thiếu một số collection trong danh sách xóa và có enum amenity SECURITY không hợp lệ. Chưa sửa/chạy master seed trong milestone 1.
- Working tree có thay đổi sẵn tại `docs/LATEST_MODULES_WORKFLOW_AND_ARCHITECTURE.md`; giữ nguyên.
- Lỗi lịch sử `tests/reservationCancellationDeadline.test.ts`: ngày 15/11/2026 đã qua nên backend chặn đúng tại `ReservationService.createReservation`. **Đã sửa test theo yêu cầu người dùng ngày 18/11/2026** bằng Date clock cố định và test biên ngày UTC/VN; 19/19 PASS. Các kết quả full-check trước M5 vẫn giữ nguyên như lịch sử kiểm tra; backend không bị nới quy tắc ngày quá khứ.
