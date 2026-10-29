Kế hoạch nghiệp vụ và task cho Agent: Hệ thống thuê kho
Tổng hợp từ toàn bộ thông tin bạn đã cung cấp (Reservation, Contract, Addendum, Payment) và hai vòng review trước. Ngày 17/10/2026. Đây là kiến thức thiết kế hệ thống và nghiệp vụ chung, không phải tư vấn pháp lý.

1. Mục tiêu và cách đọc tài liệu
   Mục tiêu: vá các lỗ hổng nghiệp vụ đã tìm thấy mà không phá hành vi đang chạy đúng. Tài liệu gồm: quy tắc làm việc cho Agent (mục 2), các quyết định business cần chốt (mục 3), backlog task theo giai đoạn (mục 4), ma trận quyền và ma trận hoàn/mất cọc mục tiêu (mục 5, 6), thay đổi dữ liệu và state (mục 7), Definition of Done (mục 8), thứ tự phụ thuộc (mục 9), thông tin tôi còn cần (mục 10) và mẫu brief giao cho Agent (mục 11).
   Quy ước nhãn:
   • P0: bảo mật, phân quyền, nguy cơ mất tiền. Làm ngay, không cần chờ business.
   • P1: toàn vẹn tiền và chính sách, phần lớn cần quyết định ở mục 3.
   • P2: độ tin cậy, pháp lý, trải nghiệm.
   • [OPEN Dx]: task bị chặn bởi quyết định Dx. Agent không tự chọn, chỉ triển khai theo giá trị mặc định đề xuất, đặt sau config hoặc feature flag, và ghi rõ giả định trong PR.
2. Quy tắc làm việc cho Agent
3. Khảo sát trước khi sửa. Mỗi task bắt đầu bằng báo cáo ngắn về hiện trạng code (file, hàm, endpoint liên quan) và những chỗ khác với mô tả trong tài liệu này. Tài liệu dựa trên thông tin do con người cung cấp, code mới là sự thật.
4. Một task một PR nhỏ, revert được độc lập. Không gộp refactor với đổi hành vi.
5. Test trước hoặc cùng lúc: viết test tái hiện lỗi rồi mới sửa.
6. Không tự quyết chính sách. Số tiền, thời hạn, tỷ lệ hoàn/phạt lấy từ config hoặc snapshot, không hardcode.
7. Mọi đổi trạng thái dùng conditional update (findOneAndUpdate kèm trạng thái mong đợi) và nằm trong @Transactional(). Mọi thứ ngoài DB (notification, Socket.IO, BullMQ) đưa vào afterCommitHooks.
8. Mọi thao tác tiền và đổi trạng thái quan trọng ghi AuditLog: ai, khi nào, từ gì sang gì, lý do.
9. Migration tương thích ngược: trường mới có default, có script backfill và cách rollback. Giữ trường cũ (refundAmount, refundStatus, staffSigned) ở dạng alias cho đến khi FE chuyển xong.
10. Không đụng ngoài phạm vi. Phát hiện lỗi ngoài task thì ghi vào danh sách phát hiện thêm, không tự sửa.
11. Nộp kèm mỗi task: danh sách file đổi, giả định, test đã thêm, rủi ro còn lại.
12. Quyết định business cần chốt
    Cột giữa là giá trị mặc định để Agent chạy được trong lúc chờ quyết định. Đây là đề xuất của tôi, không phải chính sách đã được duyệt.
    Đã chốt: thanh toán một lần, đúng số tiền cọc. Giao dịch thiếu hoặc thừa không được nhận; hệ thống hoàn toàn bộ số đã chuyển (xem T1.2, T1.3, T1.8).
    ID
    Câu hỏi
    Mặc định đề xuất
    Chặn
    D1
    Mốc hủy miễn phí tính từ đâu
    24h trước giờ bắt đầu checkInTimeSlot, cấu hình qua cancellationPolicy.mode (phương án còn lại: mốc theo ngày lịch)
    T2.1
    D2
    Cho startDate khác checkInDate không, lệch tối đa
    Tối đa 3 ngày, đặt trong config
    T2.7
    D3
    Bản chất pháp lý của cọc đặt chỗ và mức bồi thường khi cơ sở từ chối giao kho (Điều 328 BLDS 2015)
    [ĐÃ CHỐT] Hoàn 100% cọc qua RefundRequest + gửi thư xin lỗi (email + notification); hệ số bồi thường thêm = 0 cho đến khi pháp chế yêu cầu
    T2.4
    D4
    Giá khi nâng hạng kho và khi gia hạn
    [ĐÃ CHỐT] Khách đồng ý nâng hạng thì tính tiền theo loại kho upgrade (không free upgrade vĩnh viễn tránh khách giữ kho giá hời); nếu không đồng ý thì hủy đơn hoàn cọc 100%
    T2.9, T4.5
    D5
    Hoàn tiền: tài khoản nhận, SLA, ngưỡng duyệt
    Tài khoản do khách khai ở trường riêng; mọi refund do Manager duyệt; ngưỡng cần OPS là refund.opsApprovalThreshold (chưa có số); SLA 3 ngày làm việc chỉ để hiển thị
    T1.1, T1.4
    D6
    Thu tiền thuê kỳ đầu và ngày bắt đầu tính tiền
    Thu kỳ đầu trước khi Manager ký check-in; startDate chốt lại theo ngày check-in thực tế nếu check-in trễ
    T1.6
    D7
    Terminate xử lý cọc thế nào
    Trừ công nợ thực tế rồi hoàn phần dư; tịch thu toàn bộ chỉ khi có lý do bắt buộc và OPS duyệt
    T1.5
    D8
    Công thức phí trễ hạn
    Giữ 1.5×, coi là tổng phải trả mỗi ngày quá hạn (đã gồm tiền thuê ngày đó); endDate inclusive; ngày quá hạn tính theo lịch VN; VND làm tròn số nguyên theo một quy tắc
    T1.7
    D9
    Webhook đến trễ so với mốc 15 phút; có khôi phục đơn không
    So mốc theo transactionDate cộng đệm 2 phút; vẫn hoàn tiền thay vì khôi phục đơn
    T1.3
    D10
    Walk-in: KYC và cách ký
    Tạo tài khoản kèm xác minh email hoặc SĐT; lưu CCCD mã hóa và ảnh; khách đăng nhập trên thiết bị tại quầy để ký
    T4.2, T4.6
    D11
    Hình thức ký
    [ĐÃ CHỐT] Ký tay trên bản hợp đồng giấy in từ PDF nháp + Quản lý upload bản scan/ảnh hợp đồng đã ký 2 bên để kích hoạt; bỏ ký điện tử qua CA bên thứ 3
    T4.3
    D12
    Pháp nhân: một cho cả chuỗi hay mỗi cơ sở; ai có ủy quyền ký
    Mỗi Facility trỏ tới một LegalEntity (nhiều cơ sở có thể dùng chung)
    T4.1
    D13
    POST /contracts/:id/renew còn tồn tại không
    [ĐÃ CHỐT] Vô hiệu hóa và trả lỗi 400 MESSAGE_CODE_416; toàn bộ gia hạn thực hiện qua phụ lục RENEW
    T0.6
    D14
    Terminate hoặc check-out khi đồ còn trong kho
    [ĐÃ CHỐT] Kho vào PENDING_CLEARANCE; Terminate bắt buộc >= 1 biên bản + >= 1 ảnh bằng chứng, phân loại MUTUAL, CUSTOMER_REQUEST, VIOLATION; validate nợ > 5 ngày với OVERDUE_PAYMENT
    T2.10
13. Backlog task
    Phase 0: bảo mật và phân quyền (P0)
    T0.1 Siết phân quyền Contract
    • Làm: customer-sign yêu cầu role CUSTOMER và caller.userId === String(contract.customerId). check-in chỉ FACILITY_MANAGER của cơ sở (assertFacilityAccess), OPS hoặc ADMIN, chặn FACILITY_STAFF, bắt buộc customerSigned === true. Tạo hợp đồng, cancel, check-out, terminate theo ma trận mục 5. GET danh sách và chi tiết lọc theo user.assignedFacilityId (403 nếu chưa gán cơ sở). process-overdue chỉ Manager trở lên.
    • Done khi: mỗi cặp endpoint × role có test dương và âm, gồm test chéo cơ sở và chéo khách hàng.
    T0.2 Kiểm tra và siết phân quyền Addendum
    • Làm: khảo sát hiện trạng trước (tôi chưa biết phần này đã triển khai chưa). Áp dụng mục 5: UNIT_CHANGE chỉ Manager trở lên; approve, reject, staff-sign chỉ Manager đúng cơ sở; customer-sign chỉ chủ hợp đồng; cancel theo cơ sở hoặc chủ hợp đồng.
    • Done khi: như T0.1.
    T0.3 Siết xác nhận thu và hoàn tiền
    • Làm: confirm-refund chỉ FACILITY_MANAGER trở lên đúng cơ sở. confirm-manual bắt buộc proofImageUrl cho tiền mặt và chuyển khoản tay. Người xác nhận thu khác người xác nhận hoàn trên cùng đơn (maker-checker). Chức năng xác nhận hoàn tiền mô phỏng cho demo nằm sau feature flag, tắt cứng khi NODE_ENV=production.
    • Done khi: có test chứng minh chuỗi confirm-manual → hủy → confirm-refund bởi cùng một staff bị chặn ở ít nhất một bước.
    T0.4 An toàn môi trường production
    • Làm: tắt fallback chạy không session khi thiếu replica set ở production; kiểm tra replica set lúc khởi động và fail-fast; rà soát xác thực webhook SePay (API key hoặc chữ ký, chỉ nhận từ nguồn hợp lệ) và báo cáo kết quả.
    • Done khi: production không có replica set thì dừng với lỗi rõ ràng; webhook không hợp lệ bị từ chối có test.
    T0.5 Bộ test phân quyền dùng chung
    • Làm: helper tạo user theo role và cơ sở; ma trận test tự sinh từ bảng mục 5 để endpoint mới không bị bỏ sót.
    T0.6 Dọn mâu thuẫn endpoint [ĐÃ HOÀN THÀNH]
    • Làm: Vô hiệu hóa POST /contracts/:id/renew (trả về 400 MESSAGE_CODE_416, đánh dấu @deprecated), chuyển toàn bộ luồng gia hạn sang Phụ lục RENEW (POST /contracts/:id/addendums). Thống nhất quyền Confirm Reservation: cả FACILITY_STAFF và FACILITY_MANAGER cùng cơ sở đều được phép xác nhận đơn.
    Phase 1: toàn vẹn tiền (P1)
    T1.1 Entity RefundRequest [OPEN D5]
    • Trường: paymentId, reservationId hoặc contractId, amount, reason (CUSTOMER_CANCEL, FACILITY_CANCEL, SYSTEM_CANCEL, LATE_PAYMENT, AMOUNT_MISMATCH, DEPOSIT_SETTLEMENT, FACILITY_FAULT), status (PENDING_APPROVAL → APPROVED → PAID, hoặc REJECTED / CANCELLED), tài khoản nhận (mã hóa), referenceCode, proofImageUrl, requestedBy, approvedBy, paidBy và các mốc thời gian.
    • Rule: tổng refund hợp lệ ≤ tổng đã thu − tiền tịch thu hợp lệ; requestedBy ≠ approvedBy; PAID bắt buộc referenceCode; một đơn có nhiều refund và refund đã PAID không bao giờ bị bật lại PENDING.
    • API: tạo, duyệt, từ chối, xác nhận đã chi, danh sách lọc theo trạng thái và cơ sở. Giữ refundAmount và refundStatus trên Reservation như dữ liệu dẫn xuất để FE cũ không vỡ.
    • Done khi: có migration backfill từ các đơn đang PENDING hoặc REFUNDED và test bất biến tổng tiền.
    T1.2 Mọi nguồn tiền hoàn đều vào RefundRequest
    • Làm: mọi giao dịch có số tiền khác depositAmount (thiếu hoặc thừa) thì không nhận đơn, ghi giao dịch với kết quả AMOUNT_MISMATCH và tạo RefundRequest hoàn toàn bộ số đã chuyển, hiển thị ngay trong hàng đợi hoàn tiền. Khoản chuyển muộn sau EXPIRED hoặc CANCELLED cũng thành RefundRequest riêng, nhiều lần chuyển thì nhiều refund.
    T1.3 Webhook SePay [OPEN D9]
    • Làm: bỏ logic cộng dồn nhiều lần chuyển; đơn chỉ sang PAYMENT_SUCCESSFUL khi một giao dịch khớp đúng depositAmount. Xác định LATE theo transactionDate cộng đệm (config). Danh sách giao dịch UNMATCHED và thao tác gán thủ công có audit. Giữ idempotency theo sepayId.
    T1.4 Tài khoản nhận hoàn tiền [OPEN D5]
    • Làm: thêm refundBankName, refundAccountNumber, refundAccountHolder (tùy chọn) ở request hủy và bước tạo refund. Mã hóa khi lưu, che khi hiển thị (ví dụ ****1234), phân quyền xem (Nghị định 13/2023). Không lấy từ notes.
    T1.5 Vòng đời cọc của Contract [OPEN D7]
    • Làm: thêm depositStatus (HELD, APPLIED, PARTIALLY_REFUNDED, REFUNDED, FORFEITED). Check-out tạo RefundRequest DEPOSIT_SETTLEMENT cho phần dư. Terminate bắt buộc terminationReason và ghi khoản trừ hoặc tịch thu. damageFee kèm inspectionNotes và ảnh (Cloudinary); khách xác nhận số quyết toán, không đồng ý thì trạng thái DISPUTED. Cọc không đủ thì additionalPaymentRequired thành khoản phải thu có trạng thái.
    T1.6 Thu tiền thuê kỳ đầu [OPEN D6]
    • Làm: loại payment mới RENT_FIRST_PERIOD (số tiền = totalPeriodicPrice), áp dụng cùng nguyên tắc thanh toán một lần và đúng số tiền như cọc. Điều kiện check-in: kỳ đầu đã thanh toán. Chốt startDate và endDate lúc check-in. Phát event cho billing sau này.
    T1.7 Phí trễ hạn [OPEN D8]
    • Làm: gom công thức vào một hàm thuần có test. endDate inclusive, ngày lịch VN, VND làm tròn số nguyên. Quy tắc dailyRate cho đơn vị MONTH theo quyết định (hiện là rentalPrice / 30). Test ca biên: quá 1 giờ, đúng nửa đêm, tháng 28 và 31 ngày.
    T1.8 Gỡ thanh toán thiếu và cộng dồn
    • Làm: bỏ trạng thái PARTIALLY_PAID (Payment) và PARTIALLY_MATCHED (giao dịch), bỏ cộng dồn paidAmount qua nhiều lần chuyển, bỏ overpaidAmount. Thêm kết quả giao dịch AMOUNT_MISMATCH. Migration: Payment đang PARTIALLY_PAID chuyển thành hủy kèm RefundRequest hoàn số đã chuyển.
    • Done khi: có test chuyển thiếu, chuyển thừa và chuyển đúng (đơn chỉ lên PAYMENT_SUCCESSFUL ở trường hợp đúng); test hai webhook trùng sepayId; mã QR luôn mang đúng số tiền cọc.
    Phase 2: chính sách Reservation và Contract (P1)
    T2.1 Mốc hủy [OPEN D1]
    • Làm: chuẩn hóa checkInDate về startOfDayVN khi nhận và khi lưu. Hàm thuần computeCancellationOutcome(reservation, now) đọc policy từ snapshot (T2.2).
    • Done khi: test các ca biên 23:59, 00:00 và lệch UTC 7 tiếng.
    T2.2 Snapshot chính sách và đồng ý điều khoản
    • Làm: thêm termsAccepted (bắt buộc true ở API), policyVersion, acceptedAt, acceptedIp. Snapshot freeCancelHours, quy tắc tịch thu và hạn no-show vào Reservation lúc tạo. Các luồng hủy và no-show đọc từ snapshot. Đơn cũ backfill chính sách hiện hành.
    T2.3 Tách VOID và CANCEL cho hợp đồng DRAFT
    • Làm: VOID (nhân viên nhập nhầm) đặt cancellationType = VOID, đơn về CONFIRMED, không mất cọc, bắt buộc lý do. CANCEL hủy đơn kèm áp chính sách Reservation, không còn tịch thu 100% cố định. Chỉ cho tạo DRAFT trong ngày hẹn hoặc khi khách đã tới (arrivedAt).
    T2.4 Force Cancel do cơ sở không giao được kho [ĐÃ CHỐT D3]
    • Làm: Manager đề xuất khi không còn kho trống để đổi hoặc khách từ chối upgrade. Bắt buộc lý do và biên bản sự cố đính kèm. cancellationSource = FACILITY_FAULT, hoàn 100% cọc qua RefundRequest, giải phóng kho cũ về UNDER_MAINTENANCE. Tự động gửi thư xin lỗi qua Email và Notification. Có audit trail chi tiết.
    T2.5 arrivedAt và hạn check-in
    • Làm: nhân viên bấm khách đã tới thì tạm dừng no-show cho đơn đó. Manager gia hạn ân hạn kèm lý do và audit. Hạn check-in luôn tính trực tiếp từ endOfDayVN(checkInDate) + 24h tại thời điểm kiểm tra, không phụ thuộc graceExpiresAt do job set. Có khoảng đệm cho ca khách ký xong sát giờ.
    T2.6 Thời gian tối thiểu khi đặt trong ngày
    • Làm: giờ bắt đầu slot ≥ now + leadMinutes (config, mặc định 120 phút). Đặt dưới 24h hiển thị cảnh báo mất cọc nếu hủy.
    T2.7 Giới hạn startDate [OPEN D2]
    • Làm: ràng buộc startDate − checkInDate ≤ max. Lúc check-in chốt lại startDate và endDate; nếu khác DRAFT thì reset chữ ký khách và lưu lịch sử chữ ký.
    T2.8 Cờ check-in sớm hoặc ngoài khung giờ
    • Làm: không chặn cứng; ghi earlyCheckIn và outOfSlot kèm lý do vào audit. operatingHours là cảnh báo mềm. Ký hợp đồng ngoài giờ có audit rõ.
    T2.9 Mở rộng reassign-unit [ĐÃ CHỐT D4]
    • Làm: Quy trình đổi kho/upgrade do lỗi cơ sở ở giai đoạn CONFIRMED:
    1. Manager đề xuất kho mới (kho mới khóa tạm RESERVED). Gửi thông báo chi tiết (lý do, loại kho mới, đơn giá mới) qua Email + Notification cho khách.
    2. Khách hàng xác nhận (Accept / Reject):
       - Nếu đồng ý: Lưu lịch sử unitChangeHistory (kho ban đầu, kho được đổi, trạng thái đồng ý, ngày giờ). Khách trả thêm tiền chênh lệch theo giá kho mới khi tạo/check-in hợp đồng (không áp dụng free upgrade vĩnh viễn tránh khách giữ kho giá hời). Hợp đồng thuê tạo theo kho mới cuối cùng.
       - Nếu từ chối: Hủy đơn đặt chỗ (cancellationSource = FACILITY_FAULT), giải phóng kho mới tạm giữ, hoàn cọc 100% qua RefundRequest kèm thư xin lỗi qua Email + Notification.
         T2.10 Chấm dứt và trả kho an toàn [ĐÃ CHỐT D14]
         • Làm:
    3. Quy tắc cốt lõi: Hợp đồng chỉ chuyển sang TERMINATED khi đã upload đủ biên bản (reportFileUrls, tối thiểu 1 file) và ảnh bằng chứng hiện trường (evidenceFileUrls, tối thiểu 1 file).
    4. API POST /contracts/:id/terminate nhận thêm:
       - terminationType: MUTUAL, CUSTOMER_REQUEST hoặc VIOLATION
       - violationCategory (bắt buộc nếu VIOLATION): PROHIBITED_GOODS, OVERDUE_PAYMENT hoặc PROPERTY_DAMAGE
       - reason: text giải trình
       - reportFileUrls[]: biên bản thanh lý / sự cố, tối thiểu 1 file
       - evidenceFileUrls[]: ảnh bằng chứng hiện trường / niêm phong, tối thiểu 1 file
    5. Validation: Thiếu biên bản hoặc ảnh bằng chứng: từ chối. VIOLATION thiếu violationCategory: từ chối. OVERDUE_PAYMENT: bắt buộc kiểm tra hợp đồng có hóa đơn nợ quá hạn > 5 ngày (chống lạm quyền). File upload lưu kèm hash và thời điểm.
    6. Lưu vết: Append-only terminationHistory (ai chấm dứt, lúc nào, loại gì, lý do, files đính kèm).
    7. Kho & Cọc: Phòng kho chuyển sang PENDING_CLEARANCE trước khi dọn dẹp vệ sinh. Cọc tịch thu 100% với mọi loại chấm dứt không do lỗi cơ sở.
       Phase 3: độ tin cậy của job và transaction (P1, P2)
       T3.1 process-overdue xử lý từng đơn riêng
       • Làm: mỗi đơn chạy trong transaction riêng (hoặc batch 20–50), bắt lỗi từng bản ghi rồi đi tiếp, ghi log lỗi kèm alert. Truy vấn quét có limit và phân trang. Giữ atomicUpdateStatus để cron và thao tác tay không xử lý kép.
       • Done khi: test một bản ghi lỗi không chặn các đơn còn lại; test hai tiến trình chạy song song không double-release kho.
       T3.2 Side effect chỉ chạy sau commit
       • Làm: rà toàn bộ ReservationService, ContractService, PaymentService; chuyển notification, Socket.IO emit và BullMQ job vào afterCommitHooks.
       • Done khi: test mô phỏng transaction retry hoặc rollback không phát sinh thông báo trùng hay thông báo sai.
       T3.3 Job OVERDUE cho Contract và nhắc hạn
       • Làm: BullMQ repeatable job cho Contract (tương tự Reservation) chuyển ACTIVE sang OVERDUE khi quá endDate. Nhắc trước hạn ở các mốc 30, 7 và 1 ngày; nhắc khi quá hạn và khi phí trễ hạn tăng. Giữ POST /contracts/process-overdue để chạy tay.
       T3.4 Notification cho Contract và nhắc lịch Reservation
       • Làm: gắn thông báo cho ContractService ở các mốc: tạo hợp đồng, khách ký, check-in, OVERDUE, check-out, terminate và từng bước của phụ lục. Reservation: nhắc khách trước ngày hẹn; nhắc cơ sở về đơn PAYMENT_SUCCESSFUL chưa confirm trước hạn; nhắc trước khi hết ân hạn. Kênh hiện có là IN_APP, EMAIL chỉ khi bật.
       T3.5 TTL và job đối soát
       • Làm: thêm expiresAt cho hợp đồng WALK_IN ở DRAFT và phụ lục PENDING_APPROVAL hoặc DRAFT; hết hạn thì tự hủy với source SYSTEM và nhả kho (kể cả kho mới của UNIT_CHANGE). Job đối soát: kho ở RESERVED mà không có Reservation hoặc Contract nào còn hoạt động giữ nó thì báo động hoặc tự nhả (có audit). Chặn đặt kho thành INACTIVE hoặc UNDER_MAINTENANCE khi còn đơn hay hợp đồng gắn với kho.
       T3.6 Ràng buộc DB và idempotency
       • Làm: partial unique index cho một hợp đồng DRAFT hoặc ACTIVE trên mỗi reservationId, và cho một hợp đồng đang giữ mỗi storageUnitId. check-in dùng conditional update kèm customerSigned = true và storageUnitId đúng. Idempotency key cho POST /contracts và các thao tác thanh toán.
       Phase 4: pháp lý, chữ ký, PDF (P2, nhiều phần cần pháp chế)
       T4.1 LegalEntity, SigningAuthorization và snapshot [OPEN D12]
       • Làm: LegalEntity (companyName, taxCode, địa chỉ đăng ký, người đại diện pháp luật, chức vụ, tài khoản nhận tiền); Facility trỏ tới legalEntityId. SigningAuthorization (authorizedUserId, số và ngày văn bản ủy quyền, phạm vi, validFrom, validTo, file). check-in và facility-sign chỉ cho phép khi người ký là người đại diện hoặc có ủy quyền còn hiệu lực. Snapshot pháp nhân và ủy quyền vào Contract lúc ký.
       T4.2 Danh tính khách [OPEN D10]
       • Làm: bắt buộc dateOfBirth và kiểm tra ≥ 18 tuổi khi tạo hợp đồng. Snapshot thông tin khách (tên, SĐT, email, địa chỉ) vào Contract lúc ký. Lưu số CCCD (mã hóa) và ảnh giấy tờ khi check-in tại quầy. Luồng kích hoạt tài khoản walk-in, xác minh email hoặc SĐT.
       T4.3 Ký hợp đồng giấy số hóa và lưu trữ bằng chứng ký [ĐÃ CHỐT D11]
       • Làm: Bỏ quy trình ký điện tử CA bên thứ 3. Chuyển sang mô hình Hợp đồng giấy số hóa (Digitized Paper Contract):
    8. Khách hàng ký giấy vật lý tại quầy -> bấm nút xác nhận trên hệ thống (POST /contracts/:id/customer-sign).
    9. Quản lý cơ sở ký giấy, đóng dấu cơ sở -> chụp ảnh/scan đầy đủ các trang hợp đồng có chữ ký sống 2 bên.
    10. Quản lý gọi check-in (POST /contracts/:id/check-in), bắt buộc đính kèm signedContractFileUrls[] (tối thiểu 1 file). Thiếu file bị từ chối 400. Sau khi upload đủ mới kích hoạt ACTIVE.
    11. Lưu vết audit: actor, thời điểm, IP, hash các file hợp đồng đã upload.
        T4.4 Template hợp đồng và xuất PDF bản nháp
        • Làm: Xây dựng mẫu HTML/EJS và engine xuất file PDF bản nháp (ContractTemplate, variablesSchema). File PDF nháp được tạo khi hợp đồng ở DRAFT (chưa có chữ ký) để nhân viên in ra giấy A4 tại quầy cho 2 bên ký tay.
        • Preview / Download PDF tức thời qua GET /contracts/:id/draft-pdf.
        T4.5 Rule phụ lục và ký tay phụ lục
        • RENEW: Chỉ CUSTOMER được quyền tạo yêu cầu RENEW (hoặc Manager tạo thay có ủy quyền). newEndDate hợp lệ.
        • UNIT_CHANGE: So sánh giá và kích thước kho mới; khóa kho mới RESERVED; hủy phụ lục nhả kho mới về AVAILABLE.
        • Quy trình ký tay phụ lục: Phụ lục ở DRAFT được xuất PDF nháp để in ra giấy -> hai bên ký tay -> Quản lý cơ sở upload bản scan/ảnh phụ lục đã ký (signedAddendumFileUrls[], tối thiểu 1 file) tại bước staff-sign để kích hoạt ACTIVE. Phụ lục đã ký trở thành tài liệu đính kèm (Annex) của hợp đồng gốc.
        T4.6 Walk-in tại quầy
        • Làm: luồng khách đăng nhập và ký trên thiết bị tại quầy; tài khoản được kích hoạt sau (T4.2).
        T4.7 Đồ bỏ lại và nợ (chỉ thiết kế)
        • Làm: chỉ viết tài liệu thiết kế (thông báo, thời hạn, khóa ra vào, thanh lý, biên bản). Không lập trình trước khi pháp chế duyệt.
14. Ma trận quyền mục tiêu
    Ghi chú: “cơ sở” nghĩa là chỉ trong cơ sở được gán (assertFacilityAccess). “chủ HĐ” là chủ hợp đồng. Các ô đánh dấu (cần chốt) là chỗ tài liệu và ma trận hiện tại đang mâu thuẫn.
    Hành động
    CUSTOMER
    STAFF
    MANAGER
    OPS
    ADMIN
    Tạo Reservation
    ✓
    ✗
    ✗
    ✗
    ✗
    Xem Reservation, Contract
    ✓ của mình
    ✓ cơ sở
    ✓ cơ sở
    ✓ tất cả
    ✓ tất cả
    Confirm Reservation
    ✗
    ✓ cơ sở
    ✓ cơ sở
    ✓
    ✓
    Assign-staff, reassign-unit
    ✗
    ✗
    ✓ cơ sở
    ✓
    ✓
    Hủy Reservation
    ✓ của mình
    ✓ cơ sở, chỉ trước CONFIRMED
    ✓ cơ sở, chỉ trước CONFIRMED
    ✓
    ✓
    Force Cancel (FACILITY_FAULT)
    ✗
    ✗
    Đề xuất
    Duyệt
    Duyệt
    Confirm-manual thanh toán
    ✗
    ✓ cơ sở, bắt buộc chứng từ
    ✓ cơ sở
    ✓
    ✓
    Duyệt refund
    ✗
    ✗
    ✓ cơ sở
    ✓ (vượt ngưỡng)
    ✓
    Xác nhận đã chi refund
    ✗
    ✗
    ✓ cơ sở
    ✓
    ✓
    Tạo Contract
    ✗
    ✓ cơ sở
    ✓ cơ sở
    ✓
    ✓
    customer-sign
    ✓ chủ HĐ
    ✗
    ✗
    ✗
    ✗
    facility-sign (check-in)
    ✗
    ✗
    ✓ cơ sở, có ủy quyền
    ✓
    ✗ (đề xuất bỏ, vai trò kỹ thuật)
    VOID hoặc CANCEL Contract DRAFT
    ✓ chủ HĐ
    ✓ cơ sở
    ✓ cơ sở
    ✓
    ✓
    Check-out
    ✗
    ✓ cơ sở
    ✓ cơ sở
    ✓
    ✓
    Terminate
    ✗
    ✗
    ✓ cơ sở
    ✓
    ✓
    Process-overdue thủ công
    ✗
    ✗
    ✓
    ✓
    ✓
    Tạo phụ lục RENEW
    ✓ chủ HĐ (chờ duyệt)
    ✓ cơ sở (chờ duyệt)
    ✓ cơ sở (thẳng DRAFT, vượt ngưỡng cần OPS)
    ✓
    ✓
    Tạo phụ lục UNIT_CHANGE
    ✗
    ✗
    ✓ cơ sở
    ✓
    ✓
    Duyệt hoặc từ chối phụ lục
    ✗
    ✗
    ✓ cơ sở, khác người tạo
    ✓
    ✓
    customer-sign phụ lục
    ✓ chủ HĐ
    ✗
    ✗
    ✗
    ✗
    facility-sign phụ lục
    ✗
    ✗
    ✓ cơ sở, có ủy quyền
    ✓
    ✗
    Hủy phụ lục
    ✓ chủ HĐ
    ✓ cơ sở
    ✓ cơ sở
    ✓
    ✓
15. Ma trận hoàn và mất cọc mục tiêu
    Cột “Đề xuất” là hướng tôi khuyến nghị, cần business và pháp chế xác nhận. Mọi khoản hoàn đều đi qua RefundRequest (T1.1).
    Tình huống
    Hiện tại
    Đề xuất
    Khách hủy ở PENDING_PAYMENT, chưa chuyển tiền
    Không hoàn, không mất
    Giữ nguyên
    Chuyển sai số tiền (thiếu hoặc thừa)
    Thiếu: chờ chuyển nốt; thừa: nhận đơn và ghi overpaidAmount
    Không nhận đơn, hoàn toàn bộ số đã chuyển qua RefundRequest AMOUNT_MISMATCH
    Khách hủy ở PAYMENT_SUCCESSFUL hoặc CONFIRMED, trước mốc free-cancel
    Hoàn 100%
    Giữ, mốc theo D1 và snapshot chính sách
    Khách hủy sau mốc free-cancel
    Mất 100%
    Giữ, nhưng chỉ khi khách đã đồng ý điều khoản (T2.2)
    Khách hủy khi OVERDUE
    Mất 100%
    Giữ, trừ khi lỗi do cơ sở hoặc khách đã tới (arrivedAt)
    No-show quá ân hạn
    Mất 100%
    Giữ, trừ khi đã có arrivedAt hoặc Manager miễn có lý do và audit
    Cơ sở hủy ở PAYMENT_SUCCESSFUL
    Hoàn 100%
    Giữ nguyên
    Hệ thống hủy vì cơ sở quên confirm
    Hoàn 100%
    Giữ nguyên
    Cơ sở không giao được kho sau CONFIRMED
    Không có đường xử lý
    Force Cancel, hoàn 100%, bồi thường theo D3
    Hủy hợp đồng DRAFT do nhân viên nhập nhầm
    Mất 100%
    VOID: không mất cọc, đơn về CONFIRMED
    Hủy hợp đồng DRAFT vì khách đổi ý
    Mất 100% (bỏ qua bậc thang 24h)
    CANCEL: áp chính sách Reservation
    Check-out
    Trừ damageFee và overdueFee, hoàn phần dư
    Giữ, thêm xác nhận của khách, tranh chấp và RefundRequest
    Terminate
    Chỉ đóng hợp đồng
    Theo D7: trừ công nợ rồi hoàn phần dư, tịch thu cần lý do và duyệt
    Chuyển khoản muộn (sau EXPIRED hoặc CANCELLED)
    Cộng vào refundAmount
    Một RefundRequest riêng cho mỗi khoản
    Chuyển đúng hạn nhưng webhook đến trễ
    Bị tính LATE
    Tính theo transactionDate cộng đệm (D9)
16. Thay đổi dữ liệu và state đề xuất
    • Reservation: termsAccepted, policyVersion, acceptedAt, acceptedIp, policySnapshot, arrivedAt, cancellationSource (CUSTOMER, FACILITY, SYSTEM, FACILITY_FAULT). refundAmount và refundStatus trở thành dữ liệu dẫn xuất từ RefundRequest.
    • Contract: depositStatus, cancellationType (VOID hoặc CANCEL), facilitySigned (alias staffSigned), tham chiếu lịch sử chữ ký, snapshot khách, pháp nhân và ủy quyền, templateVersionId, documents[], startDate và endDate chốt lúc check-in, cờ earlyCheckIn và outOfSlot, firstPeriodPaidAt.
    • Addendum: expiresAt, trạng thái hết hạn (EXPIRED hoặc CANCELLED với source SYSTEM), facilitySigned, priceSourceOfferingId.
    • StorageUnit: thêm PENDING_CLEARANCE (D14); chặn INACTIVE và UNDER_MAINTENANCE khi còn đơn hoặc hợp đồng gắn.
    • Payment: bỏ PARTIALLY_PAID, PARTIALLY_MATCHED và overpaidAmount, thêm kết quả giao dịch AMOUNT_MISMATCH; loại RENT_FIRST_PERIOD; proofImageUrl bắt buộc cho confirm-manual.
    • Entity mới: RefundRequest, LegalEntity, SigningAuthorization, SignatureEvent, ContractTemplate, ContractTemplateVersion, ContractDocument.
    • Ghi chú cho báo cáo và FE: COMPLETED của Reservation nghĩa là “đã nhận kho”, COMPLETED của Contract nghĩa là “đã trả kho”.
17. Definition of Done chung
    • Có test đơn vị và test tích hợp trên MongoDB replica set (ví dụ mongodb-memory-server ở chế độ replSet), không dựa vào fallback không transaction.
    • Mỗi endpoint có test phân quyền theo ma trận mục 5 (dương, âm, chéo cơ sở, chéo khách).
    • Mọi đổi trạng thái dùng conditional update; có test chạy song song cho các thao tác tiền và kho.
    • Có AuditLog cho thao tác tiền và đổi trạng thái; side effect nằm trong afterCommitHooks.
    • Migration có backfill và rollback; không làm vỡ FE hiện tại (alias và trường dẫn xuất được giữ).
    • Số tiền lưu số nguyên VND, không dùng float; ngày tính theo giờ VN.
    • Có changelog API và cập nhật tài liệu nghiệp vụ này nếu hành vi thay đổi.
    • PR nêu rõ giả định đã dùng cho các quyết định [OPEN].
18. Thứ tự và phụ thuộc đề xuất
19. Phase 0 (T0.1–T0.6) chạy trước, các task độc lập nên làm song song được.
20. T3.2 (side effect sau commit) nên xong trước các task thêm notification (T3.4) và các task mới có side effect.
21. T1.1 (RefundRequest) là nền cho T1.2, T1.3, T1.4, T1.5, T2.4; T1.8 làm cùng T1.3.
22. T2.2 (snapshot chính sách) trước T2.1 và T2.3.
23. T4.1, T4.2, T4.3 trước T4.4 (PDF), vì PDF dựa trên snapshot pháp nhân, khách và bằng chứng ký.
24. T1.6 (thu kỳ đầu) và T1.7 (phí trễ hạn) cần chốt D6, D8 trước khi billing được xây.
25. T4.7 chỉ là thiết kế, đừng giao cho Agent lập trình.
26. Thông tin tôi còn cần
    Về hiện trạng code:
27. Các P0 phân quyền Contract đã được triển khai chưa? Phụ lục (Addendum) hiện kiểm tra quyền đến đâu?
28. POST /contracts/:id/renew còn tồn tại không (D13)?
29. confirm-refund hiện cho role nào, và xác nhận mô phỏng demo đang bật bằng cách nào?
30. Cấu trúc repo và test: framework test (Jest, Vitest?), có mongodb-memory-server replSet chưa, quy ước nhánh và PR, CI chạy gì.
31. Có dữ liệu production cần migration không, hay vẫn đang giai đoạn dev và demo?
32. FE đang gọi những endpoint nào và field nào, để biết alias nào cần giữ?
    Về business:
33. Ngưỡng số tiền cần OPS duyệt (refund, gia hạn giá thấp, nâng hạng miễn phí).
34. Các quyết định D1 đến D12 (hoặc đồng ý dùng mặc định đề xuất ở mục 3 cho từng quyết định).
35. Cấu trúc pháp nhân: một công ty cho cả chuỗi hay mỗi cơ sở một pháp nhân (D12).
36. FACILITY_STAFF có được confirm Reservation không, hay chỉ Manager?
    Về Agent:
37. Tôi không có thông tin về Gemini 4 Argon, nên các task được viết độc lập với model. Để chia task đúng cỡ, tôi cần biết: cửa sổ ngữ cảnh, Agent có truy cập trực tiếp repo, chạy lệnh và chạy test được không, có chạy song song nhiều task được không, và Agent có tự mở PR được không.
38. Mẫu brief giao cho Agent
    Dán mẫu này kèm đoạn task tương ứng ở mục 4, phần quy tắc ở mục 2 và Definition of Done ở mục 8:
    Bối cảnh: Hệ thống thuê kho (Node.js, Express, MongoDB/Mongoose, BullMQ, Socket.IO).
    Task: <ID và tên task, ví dụ T0.1 Siết phân quyền Contract>
    Phạm vi: <module và endpoint được phép sửa>. Không sửa ngoài phạm vi.
    Nghiệp vụ cần đảm bảo: <dán phần Làm của task>
    Tiêu chí hoàn thành: <dán phần Done khi + Definition of Done mục 8>
    Quyết định đang mở: <D? và giá trị mặc định được dùng, đặt sau config hoặc flag>
    Quy trình: (1) Khảo sát hiện trạng và báo cáo khác biệt so với mô tả. (2) Viết test thất bại. (3) Sửa. (4) Chạy toàn bộ test liên quan.
    Nộp: danh sách file đổi, giả định, test đã thêm, rủi ro còn lại, phát hiện ngoài phạm vi (không tự sửa).
    Không được: tự đổi chính sách tiền, hardcode số tiền hay thời hạn, bỏ conditional update, đặt side effect ngoài afterCommitHooks.
    Các điểm về đặt cọc, mức phạt, xử lý đồ bỏ lại, chữ ký điện tử và hạch toán doanh thu cần pháp chế và kế toán xác nhận. Tài liệu này không phải ý kiến pháp lý.
