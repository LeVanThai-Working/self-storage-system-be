# Tiến độ task — Phân hệ Chăm Sóc Khách Hàng & Yêu Cầu Hỗ Trợ (`support`)

> File này được cập nhật bởi `/remember` và được commit lên Git.
> Phản ánh trạng thái thực tế của các tasks thuộc phân hệ `support`.

---

## Bảng Theo dõi Tiến độ Task

|    ID    | Tên Task                                                                 | Trạng thái  | Phụ thuộc | PR / Commit | Ghi chú & Phạm vi                                                                                                                                                                                                                                                                                                                           |
| :------: | :----------------------------------------------------------------------- | :---------: | :-------: | :---------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **5B.1** | **Enums, Data Model & Repository (`SupportTicket` & Persistence)**       | ✅ **DONE** |     —     |  `6fde4a9`  | 27/10/2026: Model `SupportTicket`, enum `Category`, `Priority`, `Status`, subdocument `staffResponse`, Partial Unique Index `ticketCode` dạng `SUP-YYMMDD-XXXX`, Repository với `findPaginated` và `atomicUpdateStatus` (`returnDocument: 'after'`).                                                                                        |
| **5B.2** | **Validation Schemas & Message Codes (`supportTicket.schemas` & codes)** | ✅ **DONE** |   5B.1    |  `6fde4a9`  | 27/10/2026: Message codes `MESSAGE_CODE_720` đến `MESSAGE_CODE_726`; Zod request & response schemas cho 6 RESTful endpoints.                                                                                                                                                                                                                |
| **5B.3** | **Service Logic, Phân quyền 2 Lớp & Notifications**                      | ✅ **DONE** |   5B.2    |  `6fde4a9`  | 27/10/2026: Service nghiệp vụ với vòng đời 4 trạng thái (`PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` & `PENDING` $\rightarrow$ `CANCELLED`), kiểm tra hợp đồng cơ sở, phân quyền 2 lớp (Rule 14), Audit Log 4 actions, tích hợp Socket.IO & Email notifications.                                                         |
| **5B.4** | **Controller, RESTful Endpoints & TSOA Integration**                     | ✅ **DONE** |   5B.3    |  `6fde4a9`  | 27/10/2026: 6 RESTful endpoints chuẩn tsoa, helper `extractCaller` an toàn theo Rule 14, Swagger OpenAPI sync, đăng ký IoC trong `src/ioc.ts`.                                                                                                                                                                                              |
| **5B.5** | **Integration Tests & Verification**                                     | ✅ **DONE** |   5B.4    |  `6fde4a9`  | 27/10/2026: Kịch bản kiểm thử toàn diện `scratch/test_support_ticket_flow.ts`: khởi tạo ticket chung & hợp đồng, Scoped Query theo Role & Facility, chặn chéo cơ sở/khách hàng, phân công nhân viên, giải đáp hoàn tất, chặn hủy khi đang xử lý, khách tự hủy. **24/24 test cases PASS 100%**. `npm run check` & `npm run build` PASS 100%. |

---

## Danh sách Quyết định Nghiệp vụ (`[OPEN Dx]`)

|    ID     | Vấn đề / Quyết định                | Giá trị đang áp dụng                                                                                                                                               | Trạng thái | Ghi chú                                                                                    |
| :-------: | :--------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------: | :----------------------------------------------------------------------------------------- |
| **D5B.1** | Mô hình tương tác & xử lý CSKH     | Mô hình Request — Resolution Note & Hướng dẫn (Không dùng live chat nhiều tầng, không đánh giá sao rating)                                                         |  **CHỐT**  | Tinh gọn, minh bạch, có phản hồi chính thức từ nhân viên                                   |
| **D5B.2** | Vòng đời trạng thái tối giản       | 4 trạng thái: `PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` (và `PENDING` $\rightarrow$ `CANCELLED`)                                              |  **CHỐT**  | Dễ hiểu, sát thực tế quầy hỗ trợ CSKH                                                      |
| **D5B.3** | Phân cấp điều phối Ticket          | Ticket gắn cơ sở (`facilityId`) do FM/Staff cơ sở phụ trách. Ticket chung toàn hệ thống (không có `facilityId`) do Ops/Admin điều phối.                            |  **CHỐT**  | Đảm bảo mọi thắc mắc đều có người tiếp nhận rõ ràng                                        |
| **D5B.4** | Tự động suy luận cơ sở từ Hợp đồng | Nếu khách hàng chọn hợp đồng cụ thể mà không truyền `facilityId`, hệ thống tự động suy luận cơ sở từ hợp đồng (`facilityId = contract.facilityId`)                 |  **CHỐT**  | Tối ưu trải nghiệm cho khách hàng, tránh sai sót                                           |
| **D5B.5** | Bảo vệ hủy yêu cầu (`CANCELLED`)   | Khách hàng chỉ được phép hủy yêu cầu khi còn ở trạng thái `PENDING`. Một khi nhân viên đã tiếp nhận (`PROCESSING`) hoặc hoàn tất (`COMPLETED`) thì không được hủy. |  **CHỐT**  | Chống race condition và giữ tính toàn vẹn lịch sử xử lý của nhân viên (`MESSAGE_CODE_722`) |

---

## Giả định đã dùng

| Task      | Giả định                                                      | Đặt ở đâu (config / flag)                                   |
| :-------- | :------------------------------------------------------------ | :---------------------------------------------------------- |
| 5B.1–5B.5 | Mã ticket có tiền tố `SUP-YYMMDD-XXXX` sinh tuần tự theo ngày | `SupportTicketService.generateTicketCode`                   |
| 5B.1–5B.5 | Tối đa 5 file/ảnh đính kèm cho mỗi yêu cầu                    | `createSupportTicketSchema` & `completeSupportTicketSchema` |

---

## Phát hiện thêm ngoài phạm vi (Out of Scope Findings)

- Chưa có gì phát hiện thêm.
