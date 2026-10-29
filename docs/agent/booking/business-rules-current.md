Mô tả do con người viết, nếu khác code thì báo lại, code mới là sự thật.

Business rules của reservation hiện tại:

I. Danh mục trạng thái trong vòng đời đơn đặt chỗ

Trạng thái đơn (status):

PENDING_PAYMENT: Khách vừa tạo đơn, hệ thống đang khóa giữ phòng kho và tiện ích tạm thời để chờ thanh toán cọc.
PAYMENT_SUCCESSFUL: Khách đã chuyển khoản đủ 100% tiền cọc, đang chờ cơ sở kiểm tra và xác nhận.
CONFIRMED: Cơ sở đã xác nhận đơn chính thức và phân công nhân viên đón tiếp khách check-in.
OVERDUE: Đã qua ngày hẹn check-in mà khách chưa đến nhận kho; đơn đang trong thời gian ân hạn giữ kho thêm 24 giờ.
COMPLETED: Khách đã đến cơ sở, ký hợp đồng thuê kho và hoàn tất thủ tục nhận bàn giao phòng (check-in).
EXPIRED: Quá thời gian giữ chỗ thanh toán (15 phút) mà khách chưa hoàn tất đóng cọc.
CANCELLED: Đơn bị hủy (do khách hủy, cơ sở hủy trước khi xác nhận, hoặc hệ thống tự động hủy).

Trạng thái hoàn tiền cọc (refundStatus):

NONE: Không phát sinh hoàn tiền (chưa đóng cọc, đã hoàn tất nhận kho, hoặc bị tịch thu cọc).
PENDING: Đơn có khoản tiền cần hoàn trả cho khách, đang chờ cơ sở giải ngân.
REFUNDED: Cơ sở đã hoàn tất chi trả tiền cọc lại cho khách hàng.

Các chỉ số tài chính trên đơn:

depositAmount / totalAmount: Số tiền cọc khách cần thanh toán ngay để giữ kho.
paidAmount: Số tiền thực tế khách đã chuyển khoản thành công.
refundAmount: Số tiền cọc khách được hoàn lại khi hủy đơn hoặc chuyển khoản muộn.
forfeitedAmount: Số tiền cọc bị tịch thu (ghi nhận doanh thu phạt cọc cho cơ sở khi khách hủy sát giờ hoặc bỏ hẹn No-show).
II. Chi tiết luồng nghiệp vụ qua 7 giai đoạn
Giai đoạn 1: Khách hàng tạo đơn đặt chỗ & Khóa giữ kho (POST /reservations)
Kiểm tra điều kiện hợp lệ:
Tài khoản khách hàng và Cơ sở (Facility) phải đang ở trạng thái hoạt động (ACTIVE).
Chống spam/đầu cơ giữ kho: Mỗi khách hàng chỉ được có tối đa 03 đơn đang chờ thanh toán (PENDING_PAYMENT) và tối đa 05 đơn đang hoạt động cùng lúc (PENDING_PAYMENT, PAYMENT_SUCCESSFUL, CONFIRMED, OVERDUE). Nếu vượt ngưỡng, hệ thống từ chối tạo đơn mới.
Kiểm tra ngày nhận kho (checkInDate): Không được nhỏ hơn ngày hiện tại (tính theo múi giờ Việt Nam UTC+7) và không được đặt trước quá 30 ngày. Ngày bắt đầu thuê (startDate) phải lớn hơn hoặc bằng ngày nhận kho.
Kiểm tra khung giờ hẹn (checkInTimeSlot): Khung giờ phải tồn tại và đang mở tại cơ sở đó. Nếu khách đặt lịch check-in ngay trong ngày hôm nay, khung giờ chọn không được phép đã trôi qua so với giờ hiện tại. Đồng thời, số lượng đơn đặt vào khung giờ đó trong ngày chưa vượt quá sức chứa tối đa (maxCapacity) của khung giờ.
Kiểm tra gói giá (FacilityUnitTypeOffering) và phòng kho (StorageUnit): Gói giá phải đang hoạt động tại cơ sở, khớp đúng loại kho (unitTypeId) với phòng kho vật lý mà khách chọn. Thời gian đăng ký thuê (rentalDuration) phải đạt số ngày thuê tối thiểu (minRentalDays) của gói.
Khóa tài nguyên nguyên tử (Atomic Lock trong Transaction):
Hệ thống chuyển trạng thái phòng kho vật lý từ AVAILABLE sang RESERVED. Nếu phòng vừa bị người khác đặt trước một tích tắc, hệ thống báo lỗi ngay lập tức (đồng thời có thêm Partial Unique Index dưới cơ sở dữ liệu chặn tuyệt đối việc 2 đơn đang hoạt động cùng giữ 1 phòng).
Đối với các tiện ích đi kèm (amenities): Nếu là tiện ích vật lý (khác loại dịch vụ service), hệ thống cộng tăng số lượng đang sử dụng (inUseQuantity). Nếu kho không đủ số lượng tiện ích trống, giao dịch sẽ dừng lại và báo lỗi.
Tính toán số tiền thanh toán:
Tiền cọc = basePrice * depositMultiplier.
Tổng tiền cần thanh toán ngay của đơn đặt chỗ (totalAmount) chính bằng depositAmount. (Chi phí thuê kho định kỳ và phí tiện ích được lưu bản chụp trên đơn để chuyển sang tính toán khi lập Hợp đồng thuê).
Khởi tạo bộ đếm giữ chỗ:
Đơn được tạo với trạng thái PENDING_PAYMENT, thời점 hết hạn expiresAt = thời điểm tạo + 15 phút.
Hệ thống lập lịch một tác vụ trễ (delayed job) trên hàng đợi BullMQ đúng 15 phút sau để kiểm tra tự động.
Giai đoạn 2: Thanh toán tiền cọc hoặc Hết hạn giữ chỗ 15 phút
Trường hợp 1 — Khách thanh toán đúng hạn:
Khách tạo phiếu thanh toán (Payment) để lấy mã VietQR và chuyển khoản.
Khi nhận biến động số dư qua Webhook SePay:
Nếu khách chuyển thiếu (paidAmount < depositAmount): Phiếu thanh toán ghi nhận PARTIALLY_PAID, đơn đặt chỗ vẫn giữ ở PENDING_PAYMENT chờ khách chuyển nốt phần thiếu.
Khi tổng số tiền chuyển đạt đủ depositAmount và đơn chưa hết hạn: Hệ thống tự động cập nhật đơn sang PAYMENT_SUCCESSFUL, ghi nhận số tiền đã đóng, thời điểm đóng và hủy bỏ tác vụ đếm ngược 15 phút trên BullMQ. Gửi thông báo cho khách và Quản lý cơ sở.
Trường hợp 2 — Quá 15 phút khách không thanh toán (hoặc chưa chuyển đủ):
Đúng mốc 15 phút, BullMQ worker kích hoạt (hoặc khi chạy API quét hết hạn):
Nếu đơn vẫn ở PENDING_PAYMENT, hệ thống lập tức chuyển đơn sang EXPIRED (không có thời gian ân hạn ở bước này).
Phòng kho được giải phóng ngay về AVAILABLE, số lượng tiện ích được hoàn trả lại kho, và phiếu Payment đang chờ bị hủy.
Trường hợp 3 — Khách chuyển khoản muộn sau khi đơn đã hết hạn hoặc đã hủy (Xử lý tiền mồ côi):
Nếu đơn đã chuyển sang EXPIRED hoặc CANCELLED (phòng kho đã nhả ra) nhưng khách vẫn lưu ảnh mã QR cũ và chuyển tiền vào:
Hệ thống không tự động khôi phục lại đơn (để tránh xung đột nếu phòng kho đó đã được khách khác đặt mua).
Thay vào đó, Webhook ghi nhận giao dịch ở trạng thái LATE, tự động cộng số tiền khách vừa chuyển vào trường refundAmount của đơn đặt chỗ và bật trạng thái refundStatus = PENDING, đồng thời gửi thông báo cho Quản lý cơ sở và khách hàng để thực hiện hoàn trả lại khoản tiền chuyển muộn này.
Giai đoạn 3: Cơ sở xác nhận đơn & Phân công nhân sự (POST /reservations/:id/confirm)
Khi đơn ở trạng thái PAYMENT_SUCCESSFUL, Nhân viên hoặc Quản lý của cơ sở thực hiện xác nhận đơn:
Ràng buộc thời gian: Nếu ngày hẹn nhận kho (checkInDate) đã trôi qua so với ngày hiện tại, hệ thống chặn không cho xác nhận (báo lỗi quá ngày check-in), để đơn đó cho tiến trình tự động hủy và hoàn cọc 100% cho khách.
Ràng buộc nhân sự: Nhân viên được gán đón tiếp (assignedStaffId) phải đang hoạt động (ACTIVE), có vai trò Nhân viên hoặc Quản lý cơ sở và trực thuộc đúng cơ sở của đơn hàng.
Kết quả: Đơn chuyển từ PAYMENT_SUCCESSFUL sang CONFIRMED, lưu thông tin người xác nhận, thời gian xác nhận và nhân viên phụ trách. Hệ thống gửi thông báo xác nhận chính thức cho khách và giao việc cho nhân viên.
Nếu cần thay đổi nhân viên đón tiếp sau khi đã xác nhận, Quản lý có thể gọi thao tác phân công lại nhân sự (POST /reservations/:id/assign-staff).
Giai đoạn 4: Đổi phòng kho khi gặp sự cố (POST /reservations/:id/reassign-unit)
Khi nào sử dụng: Áp dụng cho các đơn đang ở trạng thái PAYMENT_SUCCESSFUL, CONFIRMED, hoặc đang trong thời gian ân hạn OVERDUE mà phòng kho khách đặt bị hư hỏng, ẩm mốc hoặc cần bảo trì đột xuất. Do cơ sở không được phép hủy đơn sau khi đã CONFIRMED, cơ sở phải dùng chức năng này để bố trí phòng kho thay thế cho khách.
Quy tắc nghiệp vụ khi đổi phòng:
Phòng kho mới phải nằm trong cùng cơ sở và đang trống (AVAILABLE
→
→ khóa sang RESERVED).
Chỉ cho phép đổi ngang hạng hoặc nâng hạng miễn phí (Free Upgrade): Gói giá của phòng mới phải đang hoạt động và có đơn giá thuê (pricePerUnit) lớn hơn hoặc bằng đơn giá basePrice của đơn đặt chỗ ban đầu. Hệ thống nghiêm cấm đổi sang phòng có mức giá thấp hơn.
Đồng bộ dữ liệu: Hệ thống cập nhật storageUnitId sang phòng mới và cập nhật facilityUnitTypeOfferingId sang gói của phòng mới (để khi tạo Hợp đồng sẽ lấy đúng thông tin loại phòng thực tế), nhưng giữ nguyên basePrice và depositAmount cũ để khách hàng không phải trả thêm bất kỳ chi phí chênh lệch nào.
Phòng kho cũ được giải phóng và chuyển sang trạng thái UNDER_MAINTENANCE (mặc định để sửa chữa) hoặc AVAILABLE tùy Quản lý chỉ định.
Lịch sử đổi phòng (từ phòng nào, sang phòng nào, lý do, người đổi, thời điểm đổi) được ghi nhận đầy đủ vào danh sách unitChangeHistory.
Giai đoạn 5: Khách đến nhận phòng (Check-in), Ân hạn 24 giờ & Xử lý bỏ hẹn (No-show)
Trường hợp 1 — Khách đến nhận kho đúng hẹn (hoặc trong thời gian ân hạn):
Nhân viên cơ sở khởi tạo Hợp đồng thuê (Contract ở trạng thái DRAFT) liên kết từ đơn đặt chỗ (hệ thống cho phép tạo hợp đồng từ đơn đang CONFIRMED hoặc OVERDUE).
Khi hai bên ký kết và nhân viên xác nhận bàn giao kho (check-in bên Hợp đồng): Hợp đồng chuyển sang ACTIVE, phòng kho chuyển từ RESERVED sang OCCUPIED, và đơn đặt chỗ tự động chuyển sang trạng thái kết thúc thành công COMPLETED.
Trường hợp 2 — Quá ngày hẹn Check-in & Kích hoạt ân hạn 24 giờ:
Hệ thống có tiến trình ngầm quét định kỳ mỗi 15 phút:
Nếu đơn đang CONFIRMED mà đã bước sang ngày hôm sau của checkInDate (theo giờ VN) nhưng khách vẫn chưa hoàn tất check-in: Đơn tự động chuyển sang trạng thái OVERDUE.
Hệ thống thiết lập hạn chót ân hạn graceExpiresAt = 23:59:59 của ngày hẹn check-in + 24 giờ (tức hỗ trợ giữ kho thêm trọn 01 ngày tiếp theo). Hệ thống gửi thông báo nhắc nhở khẩn cho khách.
Trong suốt 24 giờ ân hạn này, phòng kho vẫn được giữ; khách đến muộn vẫn được tạo hợp đồng và check-in bình thường.
Trường hợp 3 — Quá 24 giờ ân hạn mà khách vẫn không đến (No-show):
Khi thời gian hiện tại vượt quá graceExpiresAt của đơn OVERDUE:
Hệ thống tự động hủy đơn (status = CANCELLED, nguồn hủy SYSTEM).
Tịch thu cọc: Khách hàng mất 100% tiền cọc do bỏ hẹn (refundAmount = 0, forfeitedAmount = depositAmount, refundStatus = NONE).
Giải phóng kho: Phòng kho được nhả về AVAILABLE và số lượng tiện ích được hoàn trả về kho để kinh doanh tiếp.
Trường hợp 4 — Đơn đã đóng cọc (PAYMENT_SUCCESSFUL) nhưng qua ngày checkInDate mà cơ sở quên không xác nhận:
Khi bước sang ngày hôm sau của checkInDate mà đơn vẫn nằm ở PAYMENT_SUCCESSFUL (chưa được cơ sở bấm confirm):
Do lỗi chậm trễ thuộc về phía cơ sở, hệ thống tự động hủy đơn (status = CANCELLED, nguồn hủy SYSTEM), giải phóng phòng kho và tiện ích.
Hoàn cọc 100%: Toàn bộ tiền cọc được mở trạng thái chờ hoàn trả lại cho khách (refundAmount = depositAmount, forfeitedAmount = 0, refundStatus = PENDING).
Giai đoạn 6: Chủ động hủy đơn (POST /reservations/:id/cancel) & Chính sách khấu trừ cọc
Ràng buộc an toàn với Hợp đồng thuê:
Nếu đơn đặt chỗ đã được nhân viên lập thành một Hợp đồng thuê (đang ở trạng thái DRAFT, ACTIVE, v.v. — tức chưa bị hủy), hệ thống sẽ chặn không cho phép hủy đơn đặt chỗ trực tiếp. Nếu khách đổi ý không ký nữa tại quầy, nhân viên phải thực hiện hủy bản nháp Hợp đồng (khi hủy Hợp đồng DRAFT, hệ thống sẽ tự động hủy đơn đặt chỗ liên kết và giải phóng kho).
Chính sách khi Khách hàng chủ động hủy đơn:
Khi đơn đang PENDING_PAYMENT (chưa đóng cọc): Hủy thành công ngay, giải phóng kho và tiện ích (refundAmount = 0, forfeitedAmount = 0, refundStatus = NONE).
Khi đơn đang PAYMENT_SUCCESSFUL hoặc CONFIRMED (áp dụng chung bậc thang 24 giờ):
Hủy sớm (còn từ 24 giờ trở lên trước mốc checkInDate): Khách hàng được hoàn lại 100% tiền cọc (refundAmount = depositAmount, forfeitedAmount = 0, refundStatus = PENDING).
Hủy sát giờ (còn dưới 24 giờ trước mốc checkInDate): Khách hàng bị khấu trừ 100% tiền cọc (refundAmount = 0, forfeitedAmount = depositAmount, refundStatus = NONE).
Khi đơn đang ở trạng thái trễ hẹn OVERDUE: Khách hủy trong giai đoạn ân hạn luôn bị khấu trừ 100% tiền cọc (refundAmount = 0, forfeitedAmount = depositAmount, refundStatus = NONE).
Chính sách khi Cơ sở (Quản lý / Admin) chủ động hủy đơn:
Khi đơn đang PENDING_PAYMENT: Cơ sở được phép hủy để thu hồi kho trống, không phát sinh hoàn tiền.
Khi đơn đang PAYMENT_SUCCESSFUL (chưa xác nhận): Cơ sở từ chối tiếp nhận đơn trước khi xác nhận chính thức
→
→ Khách hàng được hoàn lại 100% tiền cọc (refundAmount = depositAmount, forfeitedAmount = 0, refundStatus = PENDING).
Khi đơn đã CONFIRMED hoặc OVERDUE: Nghiêm cấm cơ sở hủy đơn dưới mọi hình thức. Khi đã xác nhận giữ chỗ cho khách, nếu phòng kho gặp sự cố thì cơ sở bắt buộc phải dùng chức năng Đổi phòng kho (reassign-unit).
Giai đoạn 7: Xác nhận hoàn trả tiền cọc (POST /reservations/:id/confirm-refund)
Đối tượng áp dụng: Chỉ thực hiện được trên các đơn có trạng thái CANCELLED hoặc EXPIRED đang mang refundStatus = PENDING (bao gồm: khách hủy sớm trước 24h, cơ sở hủy đơn trước khi confirm, hệ thống tự hủy do cơ sở quên confirm, hoặc khách chuyển khoản muộn vào đơn đã hết hạn).
Thao tác: Quản lý cơ sở hoặc Admin sau khi hoàn tiền cho khách (hoặc bấm xác nhận mô phỏng trong lúc demo) sẽ gọi API này kèm mã tham chiếu giao dịch (referenceCode) và ghi chú (notes).
Kết quả: Đơn chuyển refundStatus từ PENDING sang REFUNDED, lưu lại thời điểm hoàn tiền (refundedAt), người thực hiện (refundedBy), ghi nhận vào Audit Log và gửi thông báo xác nhận đã hoàn tiền cho khách hàng.
III. Quy tắc phân quyền & Bảo mật dữ liệu giữa các cơ sở
Khách hàng (CUSTOMER): Chỉ được đặt chỗ, xem danh sách, xem chi tiết và hủy các đơn đặt chỗ của chính mình. Không thể xem hoặc thao tác trên đơn của khách hàng khác.
Nhân viên & Quản lý cơ sở (FACILITY_STAFF, FACILITY_MANAGER):
Tài khoản bắt buộc phải được gán vào một cơ sở cụ thể (assignedFacilityId). Nếu tài khoản chưa được gán cơ sở, mọi truy vấn danh sách hoặc thao tác trên đơn đặt chỗ đều bị từ chối (403 Forbidden) để ngăn lộ lọt dữ liệu.
Chỉ được nhìn thấy và xử lý các đơn đặt chỗ thuộc đúng cơ sở mình đang quản lý.
Quản lý vận hành & Quản trị hệ thống (BUSINESS_OPS_MANAGER, SYSTEM_ADMIN): Có quyền xem và điều phối đơn đặt chỗ trên phạm vi toàn hệ thống.

Các thông tin bạn yêu cầu cung cấp:

Mốc freeCancelHours = 24 tính từ 00:00 của checkInDate hay từ giờ bắt đầu của checkInTimeSlot? Hiện trạng trong hệ thống: Đang tính khoảng cách từ thời điểm khách bấm hủy (Date.now()) đến mốc checkInDate (new Date(reservation.checkInDate).getTime(), thông thường được gửi lên dưới dạng đầu ngày 00:00), chưa ghép giờ bắt đầu của checkInTimeSlot (ví dụ 14:00 - 16:00) vào để tính. Hệ quả thực tế: Nếu khách đặt lịch check-in vào khung giờ chiều (15:00 ngày mai) nhưng bấm hủy vào lúc 09:00 sáng hôm nay: Nếu tính theo giờ bắt đầu của khung giờ (15:00 ngày mai): khách vẫn còn 30 tiếng ( ≥ 24 h ≥24h). Nhưng vì hệ thống đang so với mốc đầu ngày checkInDate, khoảng cách sẽ nhỏ hơn 24 tiếng và khách bị tính là hủy sát giờ (mất cọc). Hướng khuyến nghị: Quy định theo mốc đầu ngày 00:00 của ngày nhận kho rất phổ biến trong ngành lưu trú/kho bãi (dễ truyền thông trên UI: "Hủy trước ngày nhận kho ít nhất 1 ngày để được hoàn cọc 100%"). Tuy nhiên, nếu bạn muốn tính chính xác từng giờ theo giờ mở đầu của checkInTimeSlot (ví dụ tách "14:00" từ "14:00 - 16:00" cộng vào checkInDate), hệ thống chỉ cần cập nhật thêm 5 dòng xử lý chuỗi giờ.
Trường hợp startDate > checkInDate dùng cho tình huống nào, cho lệch tối đa bao nhiêu ngày, kho có bị giữ RESERVED suốt khoảng đó không, và tính tiền từ ngày nào? Tình huống sử dụng: Mặc định nếu khách không truyền startDate, hệ thống tự gán startDate = checkInDate (nhận kho ngày nào tính tiền thuê từ ngày đó). Trường hợp startDate > checkInDate phục vụ tình huống khách muốn đến cơ sở làm thủ tục ký hợp đồng, nhận chìa khóa/thẻ từ trước vài ngày, nhưng ngày chính thức bắt đầu kỳ thuê (startDate) để chuyển đồ vào là một ngày sau đó. Độ lệch tối đa: Hiện tại hệ thống chỉ ràng buộc startDate >= checkInDate và chưa khóa cứng số ngày lệch tối đa giữa startDate và checkInDate. Trạng thái giữ kho & Tính tiền: Ngay từ lúc tạo đơn đặt chỗ, phòng kho đã bị khóa sang RESERVED (không ai khác đặt được). Khi khách đến làm thủ tục check-in tại quầy, phòng kho chuyển sang OCCUPIED. Khi tạo Hợp đồng (Contract) từ đơn đặt chỗ, kỳ hạn hợp đồng sẽ lấy mốc bắt đầu từ reservation.startDate và kết thúc tại startDate + rentalDuration. Do đó, tiền thuê định kỳ được tính từ startDate. Lưu ý vận hành: Nếu không giới hạn khoảng cách giữa checkInDate và startDate, khách có thể lách luật bằng cách đặt checkInDate là ngày mai nhưng startDate cách đó 1 tháng (giữ kho miễn phí). Nếu bạn không có nhu cầu tách ngày làm thủ tục và ngày bắt đầu tính tiền, tốt nhất nên ràng buộc startDate = checkInDate (hoặc chỉ cho lệch tối đa 1–3 ngày).
Khách có được check-in sớm hơn ngày hẹn hoặc ngoài khung giờ không, và operatingHours có được enforce ở đâu không? Check-in sớm hơn ngày hẹn hoặc ngoài khung giờ: Được phép. Ở bước nhân viên tạo Hợp đồng (POST /contracts) và xác nhận bàn giao kho (POST /contracts/:id/check-in), hệ thống chỉ kiểm tra đơn đặt chỗ đã ở trạng thái CONFIRMED (hoặc OVERDUE trong hạn 24h) hay chưa, không chặn nếu thời điểm bấm check-in sớm hơn checkInDate hoặc lệch khỏi checkInTimeSlot. Lý do thiết kế: checkInDate và checkInTimeSlot có vai trò điều phối năng lực phục vụ tại quầy (tránh quá tải nhân sự cùng một lúc) và làm mốc tính quá hạn No-show. Nếu khách đến sớm hơn hẹn mà phòng kho đã sẵn sàng (RESERVED sẵn cho khách đó) và có nhân viên rảnh tiếp đón, nhân viên hoàn toàn có thể bấm check-in linh hoạt cho khách; hệ thống sẽ ghi nhận thời điểm thực tế vào trường actualCheckInDate trên Hợp đồng. Việc kiểm tra operatingHours (Giờ mở cửa của cơ sở): Hiện tại trường operatingHours: { open, close } trên Facility chỉ mang tính hiển thị thông tin (và làm cơ sở khi cấu hình các khung giờ FacilityTimeSlot). Hệ thống Backend không chặn cứng việc gọi API theo operatingHours để tránh khóa tay nhân viên khi họ cần xử lý nghiệp vụ ngoài giờ hành chính.
Khi cơ sở không giao được kho sau CONFIRMED (và không còn kho nào trống để thay thế reassign-unit) thì vận hành xử lý thế nào? [CHỐT D3 - ĐÃ TRIỂN KHAI]: Hệ thống cung cấp endpoint khẩn cấp POST /reservations/:id/force-cancel cho phép FACILITY_MANAGER (thuộc đúng cơ sở được phân công), BUSINESS_OPS_MANAGER, và SYSTEM_ADMIN thực hiện Force Cancel với chính sách hoàn 100% tiền cọc cho khách hàng. Quy trình tự động: (1) Kiểm tra trạng thái: chỉ cho phép CONFIRMED, PAYMENT_SUCCESSFUL, hoặc OVERDUE (chặn 400 MESSAGE_CODE_324 nếu sai); (2) Bắt buộc biên bản sự cố: truyền incidentId hợp lệ thuộc cơ sở hoặc truyền incidentDetails (tự động tạo Incident mới với status: REPORTED, putUnitUnderMaintenance: true); (3) Tự động vô hiệu hóa (VOID) hợp đồng nháp DRAFT liên kết trong cùng transaction (status = CANCELLED, cancellationType = VOID, forfeitedAmount = 0); (4) Đưa phòng kho sang UNDER_MAINTENANCE và giải phóng toàn bộ tiện ích liên quan; (5) Tạo RefundRequest lý do FACILITY_FAULT hoàn trả 100% cọc; (6) Gửi notification và Email xin lỗi khách hàng độ ưu tiên cao (NotificationPriorityEnum.HIGH); (7) Ghi AuditLog FORCE_CANCEL. Nút hủy thường (POST /reservations/:id/cancel) từ phía cơ sở vẫn khóa cứng 400 MESSAGE_CODE_312 sau khi CONFIRMED.
Quy trình hoàn tiền thực hiện thế nào, lấy tài khoản nhận ở đâu, có SLA không? Và "Manual confirm" thanh toán dùng cho trường hợp nào, ai được phép? Về quy trình Hoàn tiền (confirm-refund): Cách thực hiện & Người chuyển: Hệ thống không tự động gọi API ngân hàng để bắn tiền đi (SePay chỉ nhận biến động chiều tiền vào, không hỗ trợ chi hộ tự động). Khi đơn có refundStatus = PENDING, Quản lý cơ sở (FACILITY_MANAGER) hoặc Kế toán/Admin thực hiện chuyển khoản thủ công (hoặc trả tiền mặt tại quầy) cho khách, sau đó gọi POST /reservations/:id/confirm-refund kèm mã giao dịch ngân hàng (referenceCode) và ghi chú (notes) để đổi trạng thái sang REFUNDED. Lấy số tài khoản nhận tiền hoàn ở đâu: Hiện tại trong Schema Reservation, CancelReservationRequest và Profile chưa có trường lưu Số tài khoản / Ngân hàng nhận hoàn tiền của khách. Trong thực tế vận hành hiện tại, nhân viên sẽ liên hệ qua số điện thoại/email của khách (đã có trong snapshot customer) hoặc khách ghi thông tin tài khoản ngân hàng vào ô cancellationReason / notes khi bấm hủy. (Nếu muốn chặt chẽ hơn trên UI, có thể thêm các trường tùy chọn refundBankName, refundAccountNumber, refundAccountHolder vào body khi khách bấm hủy đơn). SLA hoàn tiền: Hệ thống không đặt bộ đếm thời gian tự động cho việc hoàn tiền; SLA hoàn tiền (ví dụ: hoàn tiền trong vòng 1–3 ngày làm việc) là cam kết quy trình vận hành của cơ sở, quản lý theo dõi qua bộ lọc GET /reservations?refundStatus=pending. Về "Manual Confirm" thanh toán (POST /payments/:id/confirm-manual): Dùng cho trường hợp nào: Dùng khi khách đóng tiền cọc trực tiếp bằng tiền mặt tại quầy (CASH) hoặc chuyển khoản ngân hàng thủ công (BANK_TRANSFER) nhưng quên ghi mã thanh toán paymentCode khiến Webhook SePay không tự khớp lệnh được. Bắt buộc chứng từ: Khi gọi API này, nhân viên bắt buộc phải truyền phương thức (cash hoặc bank_transfer), ghi chú xác minh (note), và có thể đính kèm mã tham chiếu (referenceCode) cùng ảnh chụp biên lai/màn hình chuyển khoản (proofImageUrl). Ai được phép thực hiện: Chỉ dành cho nhân sự nội bộ gồm FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, và SYSTEM_ADMIN (Khách hàng tuyệt đối không gọi được). Mọi thao tác đều lưu lại confirmedBy, confirmedAt và ghi vào Audit Log.
Lúc tạo Reservation, khách có tick đồng ý chính sách hủy & mất cọc không, và có lưu phiên bản điều khoản không? Hiện trạng trong hệ thống: Ở phân hệ Contract (Hợp đồng): Đã có trường termsAccepted: boolean bắt buộc phải bằng true khi ký nhận kho (MESSAGE_CODE_411). Ở phân hệ Reservation (Đặt chỗ): Trong createReservationSchema và Reservation model hiện chưa có trường termsAccepted cũng như chưa lưu phiên bản điều khoản (policyVersion). Việc tick chọn đồng ý chính sách đặt cọc/mất cọc hiện đang do tầng Frontend kiểm soát trên form đặt chỗ trước khi cho bấm nút gửi request.
Webhook SePay xử lý Idempotency thế nào? Chuyển thiếu, chuyển thừa, chuyển từ người khác thì sao? Cơ chế chống trùng lặp (Idempotency): Mỗi giao dịch từ SePay gửi sang đều có một mã định danh duy nhất id (sepayId, kiểu số). Trong bảng PaymentTransaction, trường sepayId được đánh Unique Index. Ngay khi nhận Webhook, hệ thống kiểm tra findTransactionBySepayId(payload.id). Nếu giao dịch đó đã tồn tại và có kết quả là MATCHED, IGNORED, hoặc LATE, hệ thống trả về 200 OK (Transaction already processed) ngay lập tức mà không cộng tiền lần hai. Nếu có 2 request Webhook đến cùng một mili-giây gây đụng độ Unique Index, khối try/catch sẽ bắt lại và đọc bản ghi đã tạo. Kiểm tra chiều giao dịch & Số tài khoản đích: Chỉ xử lý giao dịch tiền vào (transferType === 'in'), bỏ qua tiền ra (IGNORED). Kiểm tra số tài khoản nhận tiền (payload.accountNumber) phải khớp với tài khoản cấu hình của hệ thống; nếu lệch hoặc không tìm thấy mã paymentCode trong nội dung chuyển khoản sẽ đánh dấu UNMATCHED. Xử lý Chuyển thiếu (Underpayment): Hệ thống cộng dồn số tiền của các lần chuyển vào paidAmount = currentPaid + payload.transferAmount. Nếu newPaidAmount < payment.amount: Phiếu thanh toán chuyển sang trạng thái PARTIALLY_PAID (thanh toán một phần), giao dịch ghi nhận PARTIALLY_MATCHED. Đơn đặt chỗ vẫn giữ nguyên ở PENDING_PAYMENT (chưa được xác nhận đóng cọc). Khi khách chuyển thêm phần còn thiếu trước khi hết hạn 15 phút sao cho tổng newPaidAmount >= payment.amount, đơn mới chuyển sang PAYMENT_SUCCESSFUL. (Lưu ý nhỏ: Nếu khách chuyển thiếu 1 phần rồi để quá 15 phút hết hạn, đơn hết hạn nhưng khoản tiền chuyển thiếu đó hiện chưa tự động đẩy sang flagOrphanedPayment như trường hợp chuyển muộn sau khi đã hết hạn — đây là một edge case rất nhỏ). Xử lý Chuyển thừa (Overpayment): Nếu newPaidAmount > payment.amount: Đơn đặt chỗ vẫn được kích hoạt thành công sang PAYMENT_SUCCESSFUL. Phần tiền thừa được tính tự động và lưu rõ vào trường overpaidAmount = newPaidAmount - payment.amount trên bản ghi Payment để bộ phận kế toán đối soát và hoàn trả phần dư. Xử lý Chuyển từ tài khoản ngân hàng của người khác: Hệ thống khớp lệnh hoàn toàn dựa trên mã thanh toán (paymentCode) nằm trong nội dung chuyển khoản (quét từ mã VietQR của đơn đó). Do đó, khách hàng nhờ người thân, bạn bè hoặc dùng tài khoản ngân hàng bất kỳ quét mã QR đều được hệ thống chấp nhận và gạch nợ bình thường.
Tiến trình process-overdue chạy nhiều bước trong một lần, có lock hay batch không, và nếu một bước lỗi giữa chừng thì ghi nhận thế nào? Cơ chế chạy 3 bước trong 1 Transaction: Hàm processOverdueReservations() được gắn decorator @Transactional(), nghĩa là cả 3 bước quét: Chuyển CONFIRMED quá ngày hẹn sang OVERDUE (cấp 24h ân hạn), Hủy các đơn OVERDUE đã quá 24h ân hạn (No-show), Hủy & hoàn cọc các đơn PAYMENT_SUCCESSFUL quá ngày hẹn mà cơ sở quên xác nhận, đều chạy chung trong một phiên giao dịch MongoDB (MongoDB ClientSession Transaction) duy nhất. Nếu một bước bị lỗi giữa chừng: Do nằm chung trong một @Transactional(), nếu có bất kỳ bản ghi nào ở bước 2 hoặc bước 3 gặp lỗi hệ thống (exception), toàn bộ các thay đổi của cả 3 bước trong lần chạy đó sẽ bị Rollback sạch sẽ (bao gồm cả việc hủy bỏ các bản ghi Audit Log đang nằm trong bộ đệm), và BullMQ sẽ báo job failed để chờ chu kỳ quét tiếp theo (15 phút sau). Về Concurrency Lock & Batching: Mỗi bản ghi khi cập nhật trạng thái đều dùng lệnh nguyên tử atomicUpdateStatus(id, expectedCurrentStatus, payload) (tức findOneAndUpdate({ _id: id, status: expectedCurrentStatus })). Nhờ vậy, nếu cron job của BullMQ và thao tác bấm tay của Admin (POST /reservations/process-overdue) vô tình chạy song song cùng lúc, chỉ có 1 tiến trình cập nhật thành công trạng thái, tiến trình còn lại nhận null và tự bỏ qua, không bao giờ xảy ra lỗi xử lý kép (double-release kho hoặc gửi thông báo 2 lần). Hiện tại truy vấn quét lấy toàn bộ các đơn quá hạn trong DB (find() không giới hạn limit). Với quy mô dữ liệu vừa và nhỏ, chạy mỗi 15 phút chỉ có vài chục đơn nên rất nhẹ; tuy nhiên nếu dữ liệu lên tới hàng nghìn đơn quá hạn cùng lúc thì một transaction lớn có thể chạm giới hạn thời gian của MongoDB.
Model Facility có lưu thông tin pháp nhân (tên công ty, MST, người đại diện) không? Cần cho xuất PDF và ủy quyền ký. Hiện trạng trong hệ thống: Hiện tại trong src/modules/facility/facility.model.ts, bảng Facility mới chỉ lưu các thông tin vận hành địa điểm gồm: name (Tên cơ sở/chi nhánh) address, city (Địa chỉ, Thành phố) phone, email (Số điện thoại, Email liên hệ) description, images, status, operatingHours managerId (Liên kết tới tài khoản Quản lý cơ sở — có tên, email, SĐT của quản lý). Chưa có các trường thông tin pháp nhân doanh nghiệp để in lên tiêu đề Hợp đồng PDF như: Tên pháp nhân công ty (companyName), Mã số thuế (taxCode), Người đại diện theo pháp luật (legalRepresentative), Chức vụ (representativeTitle), hay Số văn bản ủy quyền ký kết (authorizationNumber).

Business rule hiện tại của Contract:
State Machine hiện tại (Enum & Chuyển trạng thái) A. ReservationStatusEnum (reservation.enum.ts) Các giá trị Enum: PENDING_PAYMENT, PAYMENT_SUCCESSFUL, CONFIRMED, OVERDUE, COMPLETED, CANCELLED, EXPIRED. Các luồng chuyển trạng thái hiện tại: Tạo đơn (POST /reservations): ➔ PENDING_PAYMENT (khóa kho RESERVED, giữ chỗ 15 phút). Thanh toán cọc thành công (SePay Webhook / Manual confirm): PENDING_PAYMENT ➔ PAYMENT_SUCCESSFUL. Quá 15 phút chưa thanh toán (BullMQ delayed job / process-expired): PENDING_PAYMENT ➔ EXPIRED (nhả kho về AVAILABLE). Cơ sở xác nhận đơn (POST /reservations/:id/confirm): PAYMENT_SUCCESSFUL ➔ CONFIRMED (chỉ khi checkInDate >= startOfDayVN()). Quá ngày checkInDate mà cơ sở chưa confirm (process-overdue bước 3): PAYMENT_SUCCESSFUL ➔ CANCELLED (mở hoàn cọc 100% refundStatus = PENDING). Quá ngày checkInDate của đơn đã confirm (process-overdue bước 1): CONFIRMED ➔ OVERDUE (cấp graceExpiresAt = endOfDayVN(checkInDate) + 24h). Quá hạn ân hạn 24h (process-overdue bước 2 — No-show): OVERDUE ➔ CANCELLED (tịch thu 100% cọc, nhả kho về AVAILABLE). Hủy đơn (POST /reservations/:id/cancel hoặc hủy dây chuyền từ Contract DRAFT): PENDING_PAYMENT / PAYMENT_SUCCESSFUL / CONFIRMED / OVERDUE ➔ CANCELLED. Hoàn tất nhận kho (khi Contract đủ chữ ký 2 bên): CONFIRMED / OVERDUE ➔ COMPLETED. B. ContractStatusEnum (contract.enum.ts) & Định nghĩa OVERDUE của Hợp đồng Các giá trị Enum: DRAFT, ACTIVE, OVERDUE, COMPLETED, CANCELLED, TERMINATED. Các luồng chuyển trạng thái hiện tại: Tạo hợp đồng (POST /contracts từ RESERVATION hoặc WALK_IN): ➔ DRAFT. Ký 2 bên (customer-sign + check-in): khi cả customerSigned và staffSigned đều true ➔ DRAFT chuyển sang ACTIVE. Hủy bản nháp (POST /contracts/:id/cancel): DRAFT ➔ CANCELLED. Quét quá hạn hợp đồng (POST /contracts/process-overdue): ACTIVE ➔ OVERDUE. Gia hạn hợp đồng (POST /contracts/:id/renew): ACTIVE hoặc OVERDUE ➔ ACTIVE (cập nhật endDate = newEndDate). Nghiệm thu trả kho (POST /contracts/:id/check-out): ACTIVE hoặc OVERDUE ➔ COMPLETED. Chấm dứt trước hạn do vi phạm (POST /contracts/:id/terminate): ACTIVE hoặc OVERDUE ➔ TERMINATED. Định nghĩa OVERDUE của Hợp đồng hiện tại: Hợp đồng đang ACTIVE nhưng đã vượt quá ngày kết thúc kỳ thuê (endDate < now tại contract.repository.ts dòng 218-221) mà khách hàng chưa gia hạn và chưa làm thủ tục trả kho (check-out). Lưu ý: Khác với OVERDUE của Reservation (trễ hẹn đến nhận kho lần đầu), OVERDUE của Contract là quá hạn trả kho khi hết hạn hợp đồng (chiếm dụng kho quá hạn endDate, bị tính phí phạt trễ hạn overdueFee = 1.5 × đơn giá ngày × số ngày quá hạn khi check-out). C. ContractAddendumStatusEnum (contract.enum.ts) Các giá trị Enum: PENDING_APPROVAL, DRAFT, ACTIVE, REJECTED, CANCELLED. Chuyển trạng thái hiện tại: Tạo phụ lục (POST /contracts/:id/addendums): ➔ PENDING_APPROVAL. Quản lý duyệt (approve): PENDING_APPROVAL ➔ DRAFT. Quản lý từ chối (reject): PENDING_APPROVAL ➔ REJECTED. Hủy phụ lục (cancel hoặc tự động hủy khi check-out / terminate hợp đồng): PENDING_APPROVAL hoặc DRAFT ➔ CANCELLED. Ký 2 bên (customer-sign + staff-sign trên phụ lục): khi cả 2 cùng true ➔ DRAFT chuyển sang ACTIVE. D. StorageUnitStatusEnum (storageUnit.enum.ts) Các giá trị Enum: AVAILABLE, RESERVED, OCCUPIED, UNDER_MAINTENANCE, INACTIVE. Chuyển trạng thái: Đặt chỗ Reservation hoặc tạo Contract WALK_IN: AVAILABLE ➔ RESERVED. Hủy/Hết hạn Reservation hoặc Hủy Contract DRAFT: RESERVED ➔ AVAILABLE. Đổi kho reassign-unit: Kho mới AVAILABLE ➔ RESERVED; Kho cũ RESERVED ➔ UNDER_MAINTENANCE (hoặc AVAILABLE). Kích hoạt Contract (ACTIVE): RESERVED ➔ OCCUPIED. Trả kho (check-out) hoặc Chấm dứt (terminate): OCCUPIED ➔ UNDER_MAINTENANCE. Nhân viên bật/tắt bảo trì (PATCH /storage-units/:id/maintenance): AVAILABLE ↔ UNDER_MAINTENANCE.
Chính sách Tiền (Cọc, Tiền thuê kỳ đầu, Pro-rata, Phí trễ hạn) Cách tính tiền cọc (depositAmount): depositAmount = basePrice × depositMultiplier (cấu hình trên FacilityUnitTypeOffering, mặc định depositMultiplier = 1). Hoàn / Mất cọc theo từng nguyên nhân hiện tại: Khách hủy Reservation ở PENDING_PAYMENT (chưa đóng tiền): refundAmount = 0, forfeitedAmount = 0, refundStatus = NONE. Khách hủy Reservation ở PAYMENT_SUCCESSFUL hoặc CONFIRMED: Trước checkInDate ≥ ≥ 24 giờ (freeCancelHours = 24): Hoàn 100% cọc (refundAmount = depositAmount, refundStatus = PENDING). Trước checkInDate < 24 giờ: Mất 100% cọc (forfeitedAmount = depositAmount, refundAmount = 0, refundStatus = NONE). Cơ sở hủy Reservation ở PAYMENT_SUCCESSFUL hoặc Hệ thống tự hủy do quá ngày checkInDate mà cơ sở không confirm: Hoàn 100% cọc (refundAmount = depositAmount, refundStatus = PENDING). (Sau khi CONFIRMED, cơ sở bị chặn không được hủy đơn). Khách chuyển khoản muộn vào đơn đã EXPIRED / CANCELLED (Orphaned/Late payment qua SePay Webhook): Hệ thống tự động mở hoàn tiền 100% số tiền chuyển muộn (refundAmount += paidAmount, refundStatus = PENDING). Khách hủy khi Reservation đang OVERDUE hoặc bị hệ thống hủy No-show (quá 24h ân hạn): Mất 100% cọc (forfeitedAmount = depositAmount, refundAmount = 0). Hủy Contract DRAFT (POST /contracts/:id/cancel): Mất 100% cọc (refundAmount = 0). Thanh lý trả kho (POST /contracts/:id/check-out): Khấu trừ hư hại & trễ hạn vào tiền cọc: totalDeductions = damageFee + overdueFee. Hoàn lại phần dư: refundAmount = Math.max(0, depositAmount - totalDeductions). Nếu tiền cọc không đủ bù: additionalPaymentRequired = Math.max(0, totalDeductions - depositAmount). Chấm dứt hợp đồng do vi phạm (POST /contracts/:id/terminate): Hiện tại code chỉ đóng hợp đồng sang TERMINATED, chưa ghi nhận forfeitedAmount = depositAmount (mặc định refundAmount = 0). Tiền thuê kỳ đầu thu khi nào? Có trả trước không? Có pro-rata không? Hiện tại module Payment chỉ mới thu Tiền cọc (RESERVATION_DEPOSIT hoặc CONTRACT_DEPOSIT, totalAmount = depositAmount). Chưa thu tiền thuê kỳ đầu lúc tạo đơn hay check-in, chưa có tính năng trả trước nhiều kỳ và chưa có công thức tính lẻ ngày (pro-rata). Giá thuê định kỳ (rentalPrice và totalPeriodicPrice) hiện chỉ được lưu trên Contract để chờ module invoice/billing sau này. Phí trễ hạn hợp đồng (overdueFee): Tính tại thời điểm check-out nếu actualCheckOutDate > endDate: overdueDays = Math.ceil((actualCheckOutDate - endDate) / 1 ngày). Đơn giá ngày: nếu billingUnit === MONTH thì dailyRate = Math.round(rentalPrice / 30); nếu DAY thì dailyRate = rentalPrice. Phạt 150%: overdueFee = overdueDays × Math.round(dailyRate × 1.5).
Module Reservation (Hủy trước check-in, Đổi lịch hẹn, checkInTimeSlot, startDate vs checkInDate) Khách hủy trước check-in hoàn bao nhiêu? Như mục 2: Nếu hủy khi còn ≥ ≥ 24 giờ trước mốc checkInDate (config.freeCancelHours = 24) thì hoàn 100% cọc (refundStatus = PENDING, chờ quản lý giải ngân và gọi confirm-refund); nếu còn < 24 giờ thì mất 100% cọc. Có đổi lịch hẹn (reschedule) không? Không. Endpoint PATCH /reservations/:id đã bị loại bỏ từ phiên 2026-10-15. Khách không thể tự đổi ngày hẹn sau khi tạo đơn. checkInTimeSlot dùng để làm gì? Liên kết với module facilityTimeSlot (facilityTimeSlot.model.ts): mỗi cơ sở chia các ca tiếp đón trong ngày (ví dụ "09:00 - 11:00", có maxCapacity mặc định 2 khách/khung giờ) để tránh quá tải nhân viên tại quầy. Khi tạo Reservation, hệ thống kiểm tra khung giờ đó có tồn tại/active ở cơ sở không, nếu đặt cho ngày hôm nay thì giờ bắt đầu ca đã trôi qua chưa (isSlotPassedTodayVN), và số đơn đặt cùng ngày + cùng khung giờ đã vượt maxCapacity chưa (MESSAGE_CODE_310). startDate và checkInDate có phải là một không? Trong Model tồn tại thành 2 trường riêng, nhưng tại reservation.service.ts (dòng 657-662): nếu khách không truyền startDate thì startDate = checkInDate; nếu có truyền thì bắt buộc startDate >= checkInDate. Khi tạo Contract từ Reservation, contract.startDate đang lấy theo reservation.startDate.
Quy trình Hết hạn, Nợ, Bỏ đồ (Abandoned Goods) Hiện trạng trong codebase: Chưa có quy trình xử lý bỏ đồ / thanh lý tài sản tồn đọng. Hệ thống hiện tại chỉ có: Chuyển hợp đồng quá endDate sang OVERDUE. Tính phí phạt overdueFee (1.5x/ngày) khi khách đến check-out. Hoặc quản lý gọi POST /contracts/:id/terminate (nhập terminationReason) để chấm dứt hợp đồng và chuyển kho về UNDER_MAINTENANCE. Chưa có trạng thái khóa cưỡng chế (lockout/lien), thông báo ân hạn thanh lý tài sản hay biên bản xử lý đồ bỏ quên.
Khách hàng (Cá nhân/Doanh nghiệp, KYC, Tài khoản Walk-in) Cá nhân hay Doanh nghiệp? Hiện chỉ hỗ trợ Khách hàng cá nhân. User (user.model.ts) và Profile (profile.model.ts) chỉ có: name, email, phoneNumber, avatarUrl, dateOfBirth, address, gender. Chưa có trường mã số thuế, tên công ty, người đại diện pháp luật. Có KYC (CCCD/CMND) không? Không có. Không có trường số CCCD/Hộ chiếu hay ảnh chụp giấy tờ tùy thân trong User / Profile / Contract. Walk-in có tạo tài khoản tại quầy không? POST /contracts (với source = WALK_IN) bắt buộc truyền customerId (ObjectId của User đã tồn tại trong DB). Nếu khách vãng lai chưa có tài khoản, nhân viên phải tạo tài khoản user trước (POST /users) rồi mới lấy customerId để tạo hợp đồng walk-in.
Hình thức Ký hiện tại & Xuất PDF Hình thức ký: Chỉ là Click-to-sign (tick đồng ý điều khoản termsAccepted: true rồi gọi API bấm ký). Hệ thống lưu cờ boolean (customerSigned = true, customerSignedAt = Date, staffSigned = true, staffSignedAt = Date). Không có xác thực OTP lúc ký, không có chữ ký ảnh vẽ tay (canvas signature), và không tích hợp chữ ký số CA bên thứ ba. Có xuất PDF hợp đồng và phụ lục không? Không. Trong package.json chưa có thư viện sinh PDF (pdfkit, puppeteer, jspdf...) và chưa có endpoint xuất file PDF. Dữ liệu hợp đồng và phụ lục chỉ trả về dưới dạng JSON.
Ma trận Quyền (Role × Action) hiện tại
PHẦN 1: PHÂN HỆ ĐẶT CHỖ (RESERVATION)

Tạo đơn đặt chỗ (POST /reservations)

Role được phép: Chỉ CUSTOMER.
Phạm vi & Kiểm tra: Hệ thống kiểm tra tài khoản người gọi phải có role CUSTOMER và đang ACTIVE.

Xem danh sách & Chi tiết đơn đặt chỗ (GET /reservations, GET /reservations/:id)

Role được phép: Tất cả các role đã đăng nhập (CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN).
Phạm vi & Kiểm tra:
CUSTOMER: Chỉ xem được các đơn đặt chỗ của chính mình (customerId === caller.userId).
FACILITY_STAFF và FACILITY_MANAGER: Chỉ xem được đơn thuộc cơ sở mình được phân công (facilityId === user.assignedFacilityId). Nếu tài khoản nhân viên/quản lý chưa được gán cơ sở thì bị chặn (lỗi 403).
BUSINESS_OPS_MANAGER và SYSTEM_ADMIN: Xem được đơn của toàn bộ các cơ sở.

Xác nhận đơn đặt chỗ sau khi khách đóng cọc (POST /reservations/:id/confirm)

Role được phép: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN.
Phạm vi & Kiểm tra: Nhân viên/Quản lý cơ sở chỉ xác nhận được đơn thuộc cơ sở của mình (assertFacilityAccess), đồng thời chọn gán nhân viên tiếp đón (assignedStaffId) thuộc cùng cơ sở.

Phân công / Đổi nhân viên hỗ trợ tiếp đón check-in (POST /reservations/:id/assign-staff)

Role được phép: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (Không cho phép CUSTOMER và FACILITY_STAFF).
Phạm vi & Kiểm tra: Quản lý cơ sở chỉ được phân công trên đơn thuộc cơ sở của mình; nhân viên được gán phải có role FACILITY_STAFF hoặc FACILITY_MANAGER thuộc cùng cơ sở đó.

Đổi phòng kho sự cố trước khi nhận kho (POST /reservations/:id/reassign-unit & POST /reservations/:id/respond-reassign) [CHỐT D4]

1. Đề xuất đổi kho (POST /reservations/:id/reassign-unit):

- Role được phép: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (Không cho phép CUSTOMER và FACILITY_STAFF).
- Phạm vi & Trạng thái: Quản lý cơ sở chỉ đổi kho cho đơn thuộc cơ sở của mình khi đơn đang ở trạng thái PAYMENT_SUCCESSFUL, CONFIRMED, hoặc OVERDUE.
- Quy tắc chọn kho: Kho mới phải có trạng thái AVAILABLE, cùng cơ sở, và thuộc loại kho cùng bậc hoặc cao cấp hơn (không cho phép hạ cấp kho, chặn 400 MESSAGE_CODE_316). Nếu có hợp đồng DRAFT liên kết, kho mới sẽ đồng bộ cập nhật sang hợp đồng DRAFT.
- Khóa tạm & Đề xuất (2 bước): Hệ thống khóa kho mới sang RESERVED, giữ nguyên kho cũ ở RESERVED, lưu thông tin đề xuất vào `reservation.pendingUnitChange` (kèm newStorageUnitId, newFacilityUnitTypeOfferingId, newBasePrice, reason, proposedBy), lưu lịch sử `unitChangeHistory` với trạng thái `pending`, và gửi thông báo + email cho khách hàng.
- Chế độ tức thì (customerAgreed: true): Nếu quản lý đã trao đổi trực tiếp và khách đồng ý ngay tại quầy, cờ `customerAgreed: true` cho phép đề xuất và áp dụng đổi kho thành công trong cùng một transaction.

2. Phản hồi đề xuất đổi kho (POST /reservations/:id/respond-reassign):

- Role được phép: CUSTOMER (chủ đơn) hoặc FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (thuộc cơ sở của đơn, đại diện thao tác theo xác nhận của khách).
- Trường hợp Đồng ý (action: 'accept'):
  - Áp dụng kho mới cho đơn (storageUnitId = pending.newStorageUnitId, facilityUnitTypeOfferingId = pending.newFacilityUnitTypeOfferingId).
  - Cập nhật đơn giá `basePrice = newOffering.pricePerUnit` theo loại kho mới ([CHỐT D4] — khách thanh toán theo loại kho nâng cấp trong các kỳ thuê sau).
  - Giải phóng kho cũ sang UNDER_MAINTENANCE (hoặc AVAILABLE tùy cấu hình oldUnitMaintenanceStatus).
  - Xóa `pendingUnitChange = null`, cập nhật lịch sử `unitChangeHistory` sang status: 'accepted'.
  - Nếu có hợp đồng DRAFT liên kết, đồng bộ kho mới, đơn giá mới và reset chữ ký của khách để ký lại bản nháp đã cập nhật.
- Trường hợp Từ chối (action: 'reject'):
  - Giải phóng kho mới đang khóa tạm về AVAILABLE.
  - Đưa kho cũ gặp sự cố sang UNDER_MAINTENANCE.
  - Hủy đơn đặt chỗ với nguồn hủy do lỗi cơ sở (`cancellationSource: FACILITY_FAULT`, reason: rejectReason).
  - Tự động tạo yêu cầu hoàn cọc 100% qua `RefundRequest` với lý do `FACILITY_FAULT` (hoàn trả toàn bộ depositAmount).
  - Xóa `pendingUnitChange = null`, cập nhật lịch sử `unitChangeHistory` sang status: 'rejected'.
  - Vô hiệu hóa (VOID) hợp đồng DRAFT liên kết nếu có.
- Cơ chế giải phóng khóa mồ côi (Orphaned lock prevention): Khi đơn đặt chỗ bị hủy (cancelReservation), tự hủy No-show/quên confirm (expireSingleReservation/processOverdue), hoặc Force Cancel, nếu đơn đang có `pendingUnitChange` thì kho mới đang khóa tạm sẽ tự động được giải phóng về AVAILABLE.

Hủy đơn đặt chỗ (POST /reservations/:id/cancel)

Role được phép: CUSTOMER, FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN.
Phạm vi & Kiểm tra:
CUSTOMER: Chỉ được hủy đơn của chính mình (khi đơn ở PENDING_PAYMENT, PAYMENT_SUCCESSFUL, CONFIRMED, hoặc OVERDUE, và chưa có hợp đồng đang kích hoạt).
FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN: Chỉ được hủy đơn thuộc cơ sở của mình khi đơn chưa được xác nhận (PENDING_PAYMENT hoặc PAYMENT_SUCCESSFUL). Sau khi đơn đã CONFIRMED hoặc OVERDUE, phía cơ sở bị cấm hủy đơn (bắt buộc phải dùng tính năng đổi kho nếu kho gặp sự cố).

Xác nhận đã hoàn tiền cọc cho khách (POST /reservations/:id/confirm-refund)

Role được phép: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN.
Phạm vi & Kiểm tra: Nhân viên/Quản lý thuộc cơ sở của đơn xác nhận đã giải ngân tiền hoàn cọc cho các đơn CANCELLED hoặc EXPIRED đang có refundStatus = PENDING.

Quét đơn hết hạn thanh toán & Quét đơn quá hạn check-in (POST /reservations/process-expired, POST /reservations/process-overdue)

Role được phép: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (hoặc tiến trình ngầm BullMQ Worker tự động chạy mỗi 15 phút).
PHẦN 2: PHÂN HỆ HỢP ĐỒNG THUÊ KHO (CONTRACT)

Khởi tạo hợp đồng nháp (POST /contracts — Nguồn RESERVATION hoặc WALK_IN)

Role được phép: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (Không cho phép CUSTOMER tự tạo hợp đồng).
Hiện trạng vs Cập nhật P0:
Hiện tại: Code mới chỉ ghi comment TODO, chưa chặn CUSTOMER và chưa kiểm tra cơ sở trong Service.
Cập nhật P0: Chặn CUSTOMER; bắt buộc FACILITY_STAFF và FACILITY_MANAGER phải thuộc đúng cơ sở của đơn đặt chỗ hoặc cơ sở tạo walk-in (assertFacilityAccess).

Xem danh sách & Chi tiết hợp đồng (GET /contracts, GET /contracts/:id)

Role được phép: Tất cả các role đã đăng nhập.
Hiện trạng vs Cập nhật P0:
Hiện tại: Mới chỉ giới hạn CUSTOMER xem hợp đồng của mình; FACILITY_STAFF và FACILITY_MANAGER đang xem được hợp đồng của toàn hệ thống.
Cập nhật P0: Ép buộc FACILITY_STAFF và FACILITY_MANAGER chỉ xem được hợp đồng thuộc user.assignedFacilityId (nếu chưa được gán cơ sở thì chặn lỗi 403, đồng nhất với Reservation). BUSINESS_OPS_MANAGER và SYSTEM_ADMIN xem được toàn hệ thống.

Khách hàng ký hợp đồng — Bước ký thứ nhất (POST /contracts/:id/customer-sign)

Role được phép: Chỉ CUSTOMER.
Hiện trạng vs Cập nhật P0:
Hiện tại: Chưa kiểm tra actorId có đúng là chủ hợp đồng contract.customerId hay không.
Cập nhật P0: Bắt buộc người gọi có role CUSTOMER và caller.userId === String(contract.customerId). Khách hàng phải ký trước khi Quản lý cơ sở ký. Sau khi khách ký, hợp đồng vẫn giữ trạng thái DRAFT.

Quản lý cơ sở ký hợp đồng & Bàn giao kho — Bước ký thứ hai (POST /contracts/:id/check-in)

Role được phép: Chỉ FACILITY_MANAGER (cùng BUSINESS_OPS_MANAGER, SYSTEM_ADMIN). Không cho phép FACILITY_STAFF và CUSTOMER ký hợp đồng.
Hiện trạng vs Cập nhật P0:
Hiện tại: Đang cho phép cả FACILITY_STAFF gọi và cho phép ký trước cả khách hàng.
Cập nhật P0:
Nhân viên FACILITY_STAFF (assignedStaffId) chỉ đóng vai trò người hỗ trợ kiểm tra/bàn giao kho tại hiện trường, không có quyền ký pháp lý.
Chỉ FACILITY_MANAGER được phân công quản lý cơ sở đó (assertFacilityAccess) mới được ký.
Bắt buộc khách hàng phải đã ký trước (contract.customerSigned === true). Khi FACILITY_MANAGER ký xong, hợp đồng chuyển ngay sang ACTIVE, kho sang OCCUPIED, và đơn đặt chỗ sang COMPLETED.

Hủy hoặc Hủy vô hiệu hợp đồng nháp (POST /contracts/:id/cancel khi đang DRAFT)

Role được phép:

- Với `cancellationType = 'cancel'` (mặc định): CUSTOMER (chủ hợp đồng), FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN.
- Với `cancellationType = 'void'`: Chỉ FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (CUSTOMER bị từ chối 403 `MESSAGE_CODE_103`).

Quy tắc chi tiết (Tách VOID vs CANCEL - T2.3):

1. **Luồng CANCEL (`cancellationType = 'cancel'`):**
   - Áp dụng khi khách đổi ý không muốn thuê nữa.
   - Nếu hợp đồng sinh từ Đặt chỗ (source = RESERVATION):
     - Tính tiền hoàn/phạt theo `policySnapshot` của đơn đặt chỗ qua hàm thuần `computeCancellationOutcome`.
     - Hủy luôn đơn đặt chỗ (`status = CANCELLED`, `cancellationSource` ghi nhận theo vai trò người gọi: `CUSTOMER` hoặc `FACILITY`).
     - Nhả phòng kho về `AVAILABLE` và nhả tiện ích `inUseQuantity`.
     - Tự động tạo `RefundRequest` nếu còn số tiền hoàn hợp lệ.
     - Cập nhật hợp đồng: `status = CANCELLED`, `cancellationType = 'cancel'`, `refundAmount`, `forfeitedAmount`, `depositStatus` (`REFUNDED` nếu hủy miễn phí, `PARTIALLY_REFUNDED`, hoặc `FORFEITED`).
   - Nếu hợp đồng vãng lai (source = WALK_IN):
     - Mất 100% tiền cọc nếu đã đóng cọc (`forfeitedAmount = depositAmount`, `depositStatus = FORFEITED`). Nếu chưa đóng cọc thì phạt 0.
     - Nhả phòng kho về `AVAILABLE` và nhả tiện ích.

2. **Luồng VOID (`cancellationType = 'void'`):**
   - Áp dụng khi nhân viên quầy tạo nhầm bản nháp hợp đồng (sai giá thuê, sai kỳ hạn, nhầm phòng, nhầm tiện ích) và cần lập lại bản nháp mới cho khách.
   - Bắt buộc nhập lý do `cancellationReason` tối thiểu 3 ký tự.
   - Nếu hợp đồng sinh từ Đặt chỗ (source = RESERVATION):
     - Đơn đặt chỗ liên kết bắt buộc phải đang ở trạng thái `CONFIRMED` hoặc `OVERDUE` (nếu đã bị hủy hoặc hoàn tất từ trước thì từ chối 400 `MESSAGE_CODE_422`).
     - Đơn đặt chỗ được **bảo toàn nguyên vẹn** (giữ nguyên trạng thái `CONFIRMED` hoặc `OVERDUE`, không cấp thêm thời gian ân hạn, không tính hoàn/phạt, không nhả cọc).
     - Phòng kho và tiện ích tiếp tục được giữ nguyên (`RESERVED` / `inUse`) cho đơn đặt chỗ của khách.
     - Hợp đồng nháp sai bị đóng sang `CANCELLED` với `cancellationType = 'void'`, `forfeitedAmount = 0`, `refundAmount = 0`, `depositStatus = HELD`.
     - Nhân viên có thể lập tức tạo lại bản nháp hợp đồng mới từ đơn đặt chỗ đó.
   - Nếu hợp đồng vãng lai (source = WALK_IN):
     - Nhả phòng kho về `AVAILABLE` và nhả tiện ích.
     - Nếu khách đã đóng cọc tại quầy, hoàn trả 100% tiền cọc thông qua `RefundRequest` với lý do `FACILITY_CANCEL` (`refundAmount = depositAmount`, `depositStatus = REFUNDED`).

Nghiệm thu trả kho & Thanh lý hợp đồng (POST /contracts/:id/check-out)

Role được phép: FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (Không cho phép CUSTOMER tự nghiệm thu trả kho).
Hiện trạng vs Cập nhật P0:
Hiện tại: Chưa kiểm tra cơ sở trong Service.
Cập nhật P0: Chặn CUSTOMER; bắt buộc FACILITY_STAFF và FACILITY_MANAGER phải thuộc cơ sở của hợp đồng (assertFacilityAccess).

Chấm dứt hợp đồng trước hạn do vi phạm (POST /contracts/:id/terminate)

Role được phép: Chỉ FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (Không cho phép CUSTOMER và FACILITY_STAFF tự ý chấm dứt hợp đồng đang hoạt động).
Hiện trạng vs Cập nhật P0:
Hiện tại: Chưa kiểm tra role và cơ sở trong Service.
Cập nhật P0: Chặn CUSTOMER và FACILITY_STAFF; chỉ FACILITY_MANAGER của cơ sở đó (hoặc cấp cao hơn) mới được thực hiện.

Quét hợp đồng quá hạn trả kho (POST /contracts/process-overdue)

Role được phép: FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN.
PHẦN 3: PHỤ LỤC HỢP ĐỒNG (CONTRACT ADDENDUM — GIA HẠN RENEW & ĐỔI KHO SỰ CỐ UNIT_CHANGE)

Tạo yêu cầu phụ lục (POST /contracts/:id/addendums)

Với Phụ lục Gia hạn (type = RENEW):
Role được phép: CUSTOMER (chủ hợp đồng), FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN.
Hành vi: Nếu CUSTOMER hoặc FACILITY_STAFF tạo thì phụ lục ở trạng thái PENDING_APPROVAL (chờ Quản lý duyệt). Nếu FACILITY_MANAGER trực tiếp tạo thì phụ lục vào thẳng trạng thái DRAFT (chờ khách hàng ký).
Với Phụ lục Đổi kho sự cố trong kỳ thuê (type = UNIT_CHANGE):
Role được phép: Chỉ FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (vì đây là nghiệp vụ điều chuyển kho sự cố của quản lý cơ sở).
Hành vi: Khóa kho mới sang RESERVED và tạo phụ lục ở trạng thái DRAFT để chờ khách hàng ký chấp thuận.

Duyệt hoặc Từ chối yêu cầu phụ lục (POST /contracts/:id/addendums/:addendumId/approve, POST /contracts/:id/addendums/:addendumId/reject)

Role được phép: Chỉ FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (thuộc cơ sở của hợp đồng).
Hành vi: Chuyển phụ lục từ PENDING_APPROVAL sang DRAFT (khi duyệt) hoặc sang REJECTED (khi từ chối).

Khách hàng ký phụ lục — Bước ký thứ nhất (POST /contracts/:id/addendums/:addendumId/customer-sign)

Role được phép: Chỉ CUSTOMER là chủ hợp đồng (caller.userId === String(contract.customerId)).
Hành vi: Khi phụ lục đang ở trạng thái DRAFT, khách hàng ký trước (customerSigned = true). Phụ lục vẫn giữ trạng thái DRAFT chờ Quản lý cơ sở ký.

Quản lý cơ sở ký phụ lục & Áp dụng hiệu lực — Bước ký thứ hai (POST /contracts/:id/addendums/:addendumId/staff-sign)

Role được phép: Chỉ FACILITY_MANAGER của cơ sở đó (cùng BUSINESS_OPS_MANAGER, SYSTEM_ADMIN). Không cho phép FACILITY_STAFF ký phụ lục.
Hành vi: Bắt buộc khách hàng phải đã ký phụ lục trước (addendum.customerSigned === true). Khi FACILITY_MANAGER ký xong, phụ lục chuyển sang ACTIVE và tự động cập nhật hạn mới (với RENEW) hoặc chuyển đổi kho cũ/mới (với UNIT_CHANGE) trên hợp đồng chính.

Hủy phụ lục đang chờ duyệt hoặc đang nháp (POST /contracts/:id/addendums/:addendumId/cancel)

Role được phép: CUSTOMER (chủ hợp đồng), FACILITY_STAFF, FACILITY_MANAGER, BUSINESS_OPS_MANAGER, SYSTEM_ADMIN (thuộc cơ sở của hợp đồng).
Hành vi: Chỉ hủy được khi phụ lục đang ở PENDING_APPROVAL hoặc DRAFT. Nếu là phụ lục UNIT_CHANGE, hệ thống tự động giải phóng phòng kho mới đang giữ chỗ (RESERVED ➔ AVAILABLE).

Chính sách Giá (Khi gia hạn, Khuyến mãi/Voucher, Khi Offering đổi giá) Khi giá trong FacilityUnitTypeOffering thay đổi: Reservation và Contract đều dùng cơ chế Snapshot giá tại thời điểm tạo (reservation.basePrice, contract.rentalPrice, contract.depositAmount). Việc admin/manager sửa giá trên FacilityUnitTypeOffering không làm thay đổi các đơn đặt chỗ hoặc hợp đồng đã tạo trước đó. Giá khi gia hạn hợp đồng (renew): Hiện tại khi gia hạn chỉ kéo dài endDate sang newEndDate, giữ nguyên rentalPrice cũ trên hợp đồng (không lấy lại giá mới từ Offering và chưa điều chỉnh giá khi gia hạn). Khuyến mãi / Voucher / Chiết khấu: Chưa có. Không có module voucher, coupon hay trường discountAmount trong Reservation, Contract, hay Payment.
Tech Stack (Database, Transaction, Job Scheduler, Instance, Message Queue) Database: MongoDB (dùng mongoose ^9.10.1 + plugin soft-delete mongoose-delete ^1.0.7). Cách các thao tác nguyên tử chia sẻ Transaction: Sử dụng decorator @Transactional() (transactional.decorator.ts) kết hợp với AsyncLocalStorage (transactionScope.util.ts). Khi một hàm Service có @Transactional() được gọi, decorator tự động mở mongoose.startSession() và session.withTransaction(...), truyền session: ClientSession vào tham số cuối của hàm. Nếu hàm con bên trong cũng có @Transactional(), nó phát hiện existingScope trong AsyncLocalStorage và dùng chung transaction ngoài. Có cơ chế fallback: nếu môi trường dev chạy MongoDB standalone (không bật Replica Set), khối catch tự động bắt lỗi "Transaction numbers are only allowed on a replica set" và chạy lại hàm không dùng session để không làm gãy môi trường local. AuditLogService đăng ký vào scope.afterCommitHooks nên log chỉ được ghi xuống DB sau khi transaction commit thành công. Message Queue & Job Scheduler: Có Redis (ioredis ^6.0.0) và BullMQ (bullmq ^6.3.15). Hiện tại chỉ có reservation-queue (reservation.queue.ts & reservation.worker.ts) đang chạy 2 loại job: Delayed job expire_holding_reservation (hẹn giờ chính xác 15 phút cho từng đơn PENDING_PAYMENT). Repeatable cron job check_overdue_reservations (chạy định kỳ mỗi 15 phút */15 * * * * để quét đơn OVERDUE và No-show). Module Contract và Payment chưa có BullMQ queue/worker tự động (mới chỉ có API POST /contracts/process-overdue và POST /payments/process-expired để gọi tay). Số lượng Instance & Realtime: Chạy đơn tiến trình Node.js (src/app.ts khởi chạy cả Express HTTP server, Socket.IO server và BullMQ Worker). Tuy nhiên Socket.IO đã cấu hình sẵn @socket.io/redis-adapter nên hỗ trợ scale nhiều instance nếu tách worker.
Tích hợp bên ngoài Cổng thanh toán: Đã tích hợp SePay (src/modules/payment/sepay.service.ts) — Sinh mã thanh toán tự động (SSM...), tạo ảnh QR chuyển khoản động qua VietQR (https://qr.sepay.vn/img), và nhận Webhook đối soát giao dịch ngân hàng thời gian thực (POST /payments/sepay/webhook). Email & Lưu trữ ảnh: Đã tích hợp Nodemailer (gửi OTP) và Cloudinary (cloudinary trong package.json), cùng Google OAuth2 (passport-google-oauth2). Khóa thông minh (Smart Lock) / Thẻ ra vào / Mã PIN cửa kho: Chưa có. Camera giám sát (CCTV): Chưa có. Hóa đơn điện tử (E-invoice): Chưa có.
Thông báo (Kênh & Các mốc gửi hiện tại) Kênh thông báo (notification.enum.ts): Khai báo 2 kênh trong enum: IN_APP (lưu MongoDB + đẩy realtime qua Socket.IO) và EMAIL. Thực tế trong NotificationService hiện đang hoạt động chính trên kênh IN_APP (Database + Socket.IO). Không có SMS hay Firebase Push (FCM). Các mốc đang gửi thông báo tự động hiện tại: Trong ReservationService: Đã gắn đầy đủ ở mọi mốc (Tạo đơn giữ chỗ, Thanh toán cọc thành công, Cơ sở xác nhận đơn & phân công nhân viên, Đổi phòng kho sự cố, Hủy đơn bởi khách/cơ sở, Xác nhận đã hoàn tiền cọc, Cảnh báo chuyển sang OVERDUE, Thông báo tự động hủy No-show, Cảnh báo tiền chuyển khoản muộn mồ côi). Trong ContractService: Hiện tại chưa gắn lệnh gọi notificationService nào (mọi thao tác tạo hợp đồng, ký hợp đồng, check-in, quá hạn, check-out, phụ lục chưa bắn notification).
Nội dung Điều khoản / T&C hiện hành Hiện trạng trong Backend: Backend không lưu trữ văn bản Điều khoản & Điều kiện (Terms & Conditions) trong Database hay template, mà chỉ lưu cờ xác nhận termsAccepted: boolean khi khách và nhân viên ký. Các quy tắc chế tài đang được mã hóa trực tiếp (hardcode) thành logic trong Service: Hủy đơn đặt chỗ trong vòng < 24h trước checkInDate hoặc quá hạn ân hạn 24h (No-show): khấu trừ 100% tiền cọc. Hủy hợp đồng DRAFT: khấu trừ 100% tiền cọc. Trả kho quá hạn endDate: phạt 1.5 × đơn giá ngày cho mỗi ngày quá hạn, trừ trực tiếp vào tiền cọc. Hư hại kho/thiết bị khi trả kho: nhân viên kiểm tra nhập số tiền damageFee và ghi chú inspectionNotes, trừ trực tiếp vào tiền cọc. Quy định về danh mục hàng cấm và giới hạn trách nhiệm bồi thường hiện chưa có bảng dữ liệu hay trường lưu trữ ở Backend (do văn bản tĩnh phía Frontend hiển thị).
Giờ hoạt động cơ sở & Quy mô hệ thống Giờ hoạt động cơ sở: Trong Facility (facility.model.ts) có trường operatingHours: { open: string, close: string } (ví dụ "08:00", "20:00"). Trong FacilityTimeSlot (facilityTimeSlot.model.ts) chia các ca check-in trong ngày kèm giới hạn maxCapacity (mặc định 2 khách/ca). Giới hạn đặt chỗ của mỗi khách hàng (reservation.config.ts): tối đa 3 đơn đang chờ thanh toán (maxPendingPerCustomer = 3), tối đa 5 đơn đang hoạt động cùng lúc (maxActivePerCustomer = 5), đặt trước tối đa 30 ngày (maxAdvanceDays = 30). Quy mô thiết kế: Mô hình chuỗi nhiều cơ sở (Multi-facility), mỗi cơ sở có 1 FACILITY_MANAGER và nhiều FACILITY_STAFF (user.assignedFacilityId). Phân trang giới hạn tối đa 100 bản ghi/trang.

## T2.5: Quy tắc ghi nhận khách đến (arrivedAt) & Hạn chót check-in

1. **Ghi nhận khách đến hiện trường (`POST /reservations/:id/mark-arrived`):**
   - **Role được phép:** `FACILITY_STAFF`, `FACILITY_MANAGER` (thuộc đúng cơ sở qua `assertFacilityAccess`), `BUSINESS_OPS_MANAGER`, `SYSTEM_ADMIN`. Không cho phép `CUSTOMER`.
   - **Điều kiện:** Đơn đặt chỗ ở trạng thái `CONFIRMED` hoặc `OVERDUE`. Nếu chưa đến hạn hoặc đã hủy/hoàn thành, ném lỗi 400 `MESSAGE_CODE_325`. Nếu đã được ghi nhận trước đó (`arrivedAt != null`), ném lỗi 400 `MESSAGE_CODE_326`.
   - **Hành vi:** Lưu `arrivedAt = new Date()`, `arrivedBy = caller.userId`, ghi audit log `MARK_ARRIVED`.

2. **Chặn tự động hủy No-show khi khách đã đến:**
   - Trong cron job quét No-show (`processOverdueReservations` Step 2), truy vấn quét tìm các đơn quá hạn có thêm điều kiện `{ arrivedAt: null }`.
   - Đơn đã có `arrivedAt` sẽ **không bao giờ bị hệ thống tự động hủy No-show** và tịch thu cọc, giúp bảo vệ quyền lợi của khách hàng khi đã có mặt tại kho nhưng thủ tục bàn giao/làm hợp đồng bị chậm trễ.

3. **Gia hạn thời gian check-in (`POST /reservations/:id/extend-grace`):**
   - **Role được phép:** Chỉ `FACILITY_MANAGER` (thuộc cơ sở qua `assertFacilityAccess`), `BUSINESS_OPS_MANAGER`, `SYSTEM_ADMIN`. Nhân viên thường (`FACILITY_STAFF`) và khách hàng (`CUSTOMER`) bị từ chối với lỗi 403 `MESSAGE_CODE_103`.
   - **Điều kiện:** Đơn ở trạng thái `CONFIRMED` hoặc `OVERDUE`. Bắt buộc truyền `additionalHours` (1 - 72 giờ) và `reason` (tối thiểu 10 ký tự, tối đa 500 ký tự).
   - **Hành vi:**
     - Tính mốc gốc = `Math.max(now, reservation.graceExpiresAt ?? calculateCheckInDeadlineVN(reservation))` rồi cộng thêm `additionalHours`.
     - Cập nhật `graceExpiresAt`, `graceExtendedAt = new Date()`, `graceExtendedBy = caller.userId`, `graceExtensionReason = reason`.
     - Ghi AuditLog hành động `EXTEND_GRACE`.
     - Bảo toàn giá trị: Khi cron job quét chuyển đơn từ `CONFIRMED -> OVERDUE` (Step 1), hệ thống không đè mốc mặc định (24h) nếu Manager đã gia hạn `graceExpiresAt`.

4. **Cổng kiểm soát tạo bản nháp hợp đồng từ đơn đặt chỗ (`ContractService.createContract`):**
   - **Chặn tạo sớm:** Không cho phép tạo hợp đồng DRAFT trước ngày check-in (`now < startOfDayVN(checkInDate)`) nếu khách **chưa đến** (`arrivedAt === null`), trả lỗi 400 `MESSAGE_CODE_423`. Khách đã đến (`arrivedAt != null`) được phép tạo hợp đồng sớm.
   - **Chặn tạo muộn:** Không cho phép tạo hợp đồng DRAFT nếu đã quá hạn check-in (tính cả thời gian đệm ký hợp đồng `checkInSigningBufferMinutes`, mặc định 30 phút) và khách **chưa đến**, trả lỗi 400 `MESSAGE_CODE_424`.

## T2.6: Thời gian tối thiểu khi đặt trong ngày & Cảnh báo hủy mất cọc ngay

1. **Thời gian chuẩn bị tối thiểu khi đặt trong ngày (`sameDayLeadMinutes`):**
   - Áp dụng khi khách hàng đặt chỗ check-in ngay trong ngày (`isSameDayVN(checkInDate, todayVN)`).
   - Bắt buộc giờ bắt đầu của ca check-in (`slotStartTime`) phải cách thời điểm đặt ít nhất `sameDayLeadMinutes` (mặc định 120 phút, cấu hình qua biến môi trường `RESERVATION_SAME_DAY_LEAD_MINUTES`).
   - Nếu không thỏa mãn, hệ thống từ chối tạo đơn với lỗi 400 `MESSAGE_CODE_328` ("Check-in time slot requires at least {0} minutes preparation lead time").
   - Các đơn đặt cho ngày tương lai không bị ràng buộc bởi `sameDayLeadMinutes`.

2. **Cảnh báo mất cọc ngay lập tức (`immediateForfeitWarning`):**
   - Khi đơn đặt chỗ được tạo trong vòng 24 giờ trước giờ check-in (`now > freeCancelDeadline`), hệ thống tự động đánh dấu cờ `immediateForfeitWarning = true` lưu vào Database và trả về trong phản hồi API.
   - Cờ này giúp giao diện Frontend cảnh báo rõ ràng cho khách hàng rằng đơn đặt trong khoảng thời gian này nếu thanh toán và hủy thì sẽ bị trừ 100% tiền cọc ngay lập tức (không có khoảng thời gian hủy miễn phí).
   - Đơn đặt trước > 24 giờ được đánh dấu `immediateForfeitWarning = false`.

## T2.7: Giới hạn ngày bắt đầu hợp đồng & Cơ chế ký lại hợp đồng khi đổi ngày check-in

1. **Giới hạn khoảng cách `startDate` so với `checkInDate` (`maxStartDateOffsetDays`):**
   - Ngày bắt đầu tính tiền thuê kho (`startDate`) không được vượt quá `checkInDate + maxStartDateOffsetDays` (mặc định 3 ngày, cấu hình qua biến môi trường `RESERVATION_MAX_START_DATE_OFFSET_DAYS`).
   - Đồng thời `startDate` không được sớm hơn `checkInDate`.
   - Nếu `startDate > checkInDate + maxStartDateOffsetDays`, hệ thống từ chối tạo đơn với lỗi 400 `MESSAGE_CODE_329` ("Start date cannot exceed {0} days after check-in date").

2. **Cơ chế hủy chữ ký cũ & bắt buộc ký lại khi check-in trễ làm trượt ngày hợp đồng [CHỐT OPEN D2]:**
   - Khi Quản lý cơ sở gọi `POST /contracts/:id/check-in` với `actualCheckInDate` trễ hơn ngày bắt đầu hợp đồng dự kiến (`startOfDayVN(actualCheckInDate) > startOfDayVN(contract.startDate)`):
     - Hệ thống tính toán lại ngày bắt đầu và kết thúc mới (`finalStartDate = startOfDayVN(actualCheckInDate)`, `finalEndDate = finalStartDate + leaseDurationMs`).
     - Nếu khách hàng **đã ký bản nháp hợp đồng trước đó** (`contract.customerSigned === true`), chữ ký cũ trên bản nháp với ngày thuê cũ không còn giá trị pháp lý.
     - Hệ thống tự động:
       1. Lưu lại thông tin chữ ký cũ vào mảng lịch sử `signatureHistory` trên hợp đồng (`party: 'customer'`, `signedAt`, `previousStartDate`, `previousEndDate`, `resetAt`, `resetReason`).
       2. Cập nhật `startDate = finalStartDate`, `endDate = finalEndDate`.
       3. Thu hồi chữ ký: đặt lại `customerSigned = false`, `customerSignedAt = null`.
       4. Từ chối hoàn tất check-in, trả lỗi 400 `MESSAGE_CODE_425` ("Contract dates were adjusted. Customer must re-sign the updated draft before check-in").
     - **Quy trình tiếp theo:** Khách hàng tiến hành ký lại bản nháp đã cập nhật ngày (trên ứng dụng hoặc Quản lý in bản PDF mới để khách ký tay rồi kích hoạt).
     - Sau khi khách hàng ký lại (`customerSigned = true`), Quản lý cơ sở gọi lại `POST /contracts/:id/check-in` để hoàn tất kích hoạt hợp đồng sang `ACTIVE` và phòng kho sang `OCCUPIED`.

## T2.8: Cờ check-in sớm, ngoài khung giờ & Giờ hoạt động cơ sở (Soft Warning & Audit Logging)

1. **Nguyên tắc cốt lõi (Chỉ cảnh báo mềm - Tuyệt đối không chặn 400):**
   - Khách hàng có quyền đến cơ sở sớm hơn lịch hẹn hoặc ngoài khung giờ đã đặt trước (thậm chí ngoài giờ mở cửa thông thường nếu có nhân viên trực hỗ trợ). Hệ thống **không được phép chặn cứng HTTP 400** gây cản trở trải nghiệm nhận kho thực tế của khách hàng.
   - Thay vào đó, hệ thống tự động đánh giá và gắn cờ cảnh báo mềm (`earlyCheckIn`, `outOfSlot`) trên bản ghi dữ liệu, đồng thời ghi nhận chi tiết vào `AuditLog` để phục vụ công tác giám sát vận hành.

2. **Cờ `earlyCheckIn`:**
   - Được đánh giá khi thực hiện check-in hợp đồng (`POST /contracts/:id/check-in`) hoặc nhân viên ghi nhận khách đến (`POST /reservations/:id/mark-arrived`).
   - `earlyCheckIn = true` nếu ngày thực tế check-in sớm hơn ngày hẹn check-in theo lịch Việt Nam (`startOfDayVN(actualDate) < startOfDayVN(reservation.checkInDate)`).
   - Ngược lại `earlyCheckIn = false`. Nếu hợp đồng vãng lai (`WALK_IN` không có đơn đặt chỗ), `earlyCheckIn = null`.
   - Cờ được lưu trên cả `Contract` và `Reservation` liên kết, trả về trong `ContractResponse` và `ReservationResponse`.

3. **Cờ `outOfSlot`:**
   - Được đánh giá khi thời điểm check-in thực tế nằm ngoài khung giờ đã đăng ký (`reservation.checkInTimeSlot`, ví dụ: `"09:00 - 11:00"`).
   - `outOfSlot = true` nếu thời điểm check-in sớm hơn giờ bắt đầu của khung giờ, muộn hơn giờ kết thúc của khung giờ, hoặc khác ngày lịch hẹn.
   - Ngược lại `outOfSlot = false`. Nếu hợp đồng vãng lai (`WALK_IN`), `outOfSlot = null`.

4. **Kiểm tra giờ mở cửa cơ sở (`Facility.operatingHours`) & Ký hợp đồng:**
   - Giờ hoạt động của cơ sở được cấu hình trong `Facility.operatingHours` (`{ open: "HH:mm", close: "HH:mm" }`).
   - Khi khách hàng ký hợp đồng (`POST /contracts/:id/customer-sign`) hoặc nhân viên hoàn tất check-in (`POST /contracts/:id/check-in`), hệ thống kiểm tra đối chiếu với giờ mở cửa:
     - Nếu ngoài giờ mở cửa: hệ thống vẫn cho phép thực hiện thành công (không chặn lỗi), nhưng tự động ghi cờ `outsideOperatingHours = true` và `operatingHours` cơ sở vào `metadata` của `AuditLog` (`SIGN_CONTRACT` hoặc `CHECK_IN`).
     - Hỗ trợ cả trường hợp giờ hoạt động qua đêm (overnight, e.g. `20:00 -> 06:00`).

5. **Ghi nhận khách đến sớm tại quầy (`POST /reservations/:id/mark-arrived`):**
   - Cho phép nhân viên/quản lý truyền thêm trường ghi chú tuỳ chọn `{ notes?: string }` (ví dụ: "Khách đến sớm 1 ngày cùng xe tải chở đồ").
   - Ghi nhận `arrivedAt`, `arrivedBy`, `earlyCheckIn`, `outOfSlot`, `notes` vào đơn đặt chỗ và `metadata` của `AuditLog` (`MARK_ARRIVED`).

## T2.10: Chấm dứt hợp đồng an toàn & Vòng đời dọn dẹp phòng kho (PENDING_CLEARANCE) [CHỐT D14]

1. **Quy tắc cốt lõi khi chấm dứt hợp đồng (`POST /contracts/:id/terminate`):**
   - **Role được phép:** `FACILITY_MANAGER` (thuộc đúng cơ sở qua `assertFacilityAccess`), `BUSINESS_OPS_MANAGER`, `SYSTEM_ADMIN`. Nghiêm cấm `CUSTOMER` và `FACILITY_STAFF`.
   - **Trạng thái hợp đồng hợp lệ:** Chỉ được thực hiện khi hợp đồng đang ở trạng thái `ACTIVE` hoặc `OVERDUE`.
   - **Bắt buộc biên bản và ảnh bằng chứng:**
     - Phải đính kèm tối thiểu 1 URL file biên bản thanh lý/sự cố (`reportFileUrls.length >= 1`).
     - Phải đính kèm tối thiểu 1 URL ảnh bằng chứng hiện trường/niêm phong (`evidenceFileUrls.length >= 1`).
     - Nếu thiếu hoặc mảng rỗng: từ chối 400 (`MESSAGE_CODE_426`).
   - **Phân loại chấm dứt (`terminationType`):**
     - Bắt buộc chọn một trong 3 loại: `MUTUAL` (thỏa thuận hai bên), `CUSTOMER_REQUEST` (khách hàng yêu cầu chấm dứt sớm), `VIOLATION` (vi phạm điều khoản).
     - Nếu `terminationType = 'violation'`: bắt buộc truyền thêm `violationCategory` (`PROHIBITED_GOODS`, `OVERDUE_PAYMENT`, `PROPERTY_DAMAGE`). Nếu thiếu: từ chối 400 (`MESSAGE_CODE_427`).
   - **Rào chắn chống lạm quyền đối với lý do nợ (`OVERDUE_PAYMENT`):**
     - Chỉ được phép chấm dứt với lý do `OVERDUE_PAYMENT` khi hợp đồng đã ở trạng thái `OVERDUE` và ngày kết thúc `contract.endDate` đã trôi qua ít nhất 5 ngày (`now - endDate >= contractConfig.overdueTerminationGraceDays * 86400000`, mặc định 5 ngày).
     - Nếu hợp đồng đang `ACTIVE` (chưa trễ hạn) hoặc `OVERDUE` chưa đủ 5 ngày mà quản lý cố tình chọn lý do nợ quá hạn: từ chối 400 (`MESSAGE_CODE_428`).

2. **Lưu vết tính toàn vẹn tài liệu (File Hash & Append-only History):**
   - Mỗi file biên bản và ảnh bằng chứng được hệ thống băm SHA-256 (`fileHash`) kèm thời điểm `uploadedAt` để lưu vết bất biến chống chỉnh sửa/giả mạo chứng từ sau này.
   - Bản ghi chấm dứt được append vào lịch sử `contract.terminationHistory` (gồm: người thực hiện, thời gian, loại chấm dứt, lý do, files biên bản/bằng chứng kèm hash, trạng thái kho lúc chấm dứt, trạng thái cọc và số tiền tịch thu).

3. **Chính sách Tiền cọc khi chấm dứt hợp đồng:**
   - Cọc bị tịch thu 100% đối với mọi loại chấm dứt không do lỗi cơ sở (`depositStatus = ContractDepositStatusEnum.FORFEITED`, `forfeitedAmount = contract.depositAmount`, `refundAmount = 0`).

4. **Vòng đời phòng kho & Trạng thái `PENDING_CLEARANCE`:**
   - Khi hợp đồng bị chấm dứt (hoặc khi trả kho mà đồ khách vẫn còn bỏ lại), phòng kho chuyển ngay từ `OCCUPIED` sang trạng thái `PENDING_CLEARANCE` (chờ thanh lý / dọn dẹp hàng bỏ lại / xử lý niêm phong tài sản).
   - **Rào chắn dọn dẹp:**
     - Tuyệt đối không cho phép chuyển thẳng từ `PENDING_CLEARANCE` sang `AVAILABLE`.
     - Trong thao tác bật bảo trì (`PATCH /storage-units/:id/maintenance` với `isUnderMaintenance: true`): nếu kho đang ở `PENDING_CLEARANCE` mà hàng tồn kho của khách vẫn còn trong kho (`countRemainingByStorageUnit > 0`), hệ thống **chặn không cho chuyển sang bảo trì** (trả 400 `MESSAGE_CODE_629`).
     - Chỉ khi toàn bộ đồ đạc của khách đã được dọn sạch khỏi kho (`countRemainingByStorageUnit === 0`), nhân viên mới được chuyển kho sang `UNDER_MAINTENANCE` để bắt đầu quy trình vệ sinh, khử khuẩn và bảo trì kỹ thuật trước khi nhả về `AVAILABLE` cho khách thuê mới.

## T3.1: Cô lập lỗi từng đơn và xử lý theo đợt cho `process-overdue` (Per-record Transaction Isolation & Batching)

1. **Transaction per-record và Fault Isolation:**
   - Hàm điều phối batch (`processOverdueReservations` và `processExpiredReservations`) không bọc toàn bộ bằng một transaction đơn nhất.
   - Mỗi đơn được xử lý độc lập trong một transaction riêng (`processSingleOverdueCheckIn`, `processSingleNoShow`, `processSingleUnconfirmed`, `expireSingleReservation`) được bọc `@Transactional()`.
   - Khi một đơn gặp sự cố hoặc ngoại lệ DB, chỉ riêng transaction của đơn đó bị rollback; hệ thống ghi log cảnh báo có cấu trúc `[ReservationService ALERT]` và tiếp tục xử lý các đơn còn lại trong danh sách, không làm dừng hay crash job ngầm.

2. **Cơ chế chống Race Condition & Chống Double-Release:**
   - Trong các luồng hủy do No-show, quá hạn check-in chưa xác nhận, hoặc hết hạn giữ chỗ:
     - Hệ thống **gọi `atomicUpdateStatus` trước** bằng conditional update (`findOneAndUpdate` với trạng thái mong đợi) để xác lập quyền sở hữu độc quyền đơn đó.
     - Nếu cập nhật trả về `null` (tiến trình khác hoặc thao tác người dùng đã thay đổi trạng thái trước), hệ thống lập tức thoát, **tuyệt đối không gọi `releaseHold`**.
     - Chỉ khi `atomicUpdateStatus` thành công, hệ thống mới tiến hành giải phóng phòng kho (`releaseReservedUnitAtomic`) và trừ số lượng tiện ích (`releaseAmenityQuantityAtomic`) trong cùng session.
   - Điều này triệt tiêu hoàn toàn nguy cơ chạy đồng thời giữa cron job và thao tác thủ công gây nhả kho 2 lần hoặc trừ âm số lượng tiện ích.

3. **Batching và giới hạn truy vấn:**
   - Các truy vấn quét đơn quá hạn và hết hạn (`findOverdueCheckIn`, `findNoShow`, `findPaidPastCheckIn`, `findExpired`) hỗ trợ tùy chọn `{ limit, skip }`.
   - Giới hạn kích thước mỗi đợt quét được kiểm soát qua `overdueBatchSize` trong `reservation.config.ts` (mặc định 50 đơn, cấu hình qua `RESERVATION_OVERDUE_BATCH_SIZE`).

4. **Phân quyền trên API kích hoạt thủ công (`POST /reservations/process-overdue`):**
   - Chỉ cho phép `SYSTEM_ADMIN` và `BUSINESS_OPS_MANAGER` kích hoạt vì API quét toàn hệ thống.
   - Nhân viên cơ sở (`FACILITY_STAFF`, `FACILITY_MANAGER`) và khách hàng (`CUSTOMER`) bị từ chối với mã lỗi 403 `MESSAGE_CODE_103`.
