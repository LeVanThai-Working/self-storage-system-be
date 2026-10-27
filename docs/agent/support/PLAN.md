# Kế Hoạch Triển Khai: Phân Hệ 5B — Chăm Sóc Khách Hàng & Yêu Cầu Hỗ Trợ (`support`)

> **Căn cứ:**
>
> - [AGENTS.md](file:///c:/NgocTuyen/selfStorageManagementSystem/self-storage-system-be/.agents/rules/AGENTS.md)
> - Thống nhất kiến trúc: Module độc lập, mô hình Request — Resolution Note (không live chat, không đánh giá sao rating), vòng đời 4 trạng thái tối giản (`PENDING` -> `PROCESSING` -> `COMPLETED`, `PENDING` -> `CANCELLED`).

---

## 1. Mục Tiêu & Phạm Vi

1. Cho phép Khách hàng (`CUSTOMER`) gửi yêu cầu hỗ trợ hoặc thắc mắc (đổi kho, quên mã PIN truy cập, hóa đơn, thắc mắc hợp đồng, hỗ trợ thủ tục, yêu cầu chung).
2. Cho phép Quản lý chi nhánh (`FACILITY_MANAGER`) hoặc Ban vận hành (`BUSINESS_OPS_MANAGER`) tiếp nhận và phân công nhân viên (`FACILITY_STAFF`) thuộc cơ sở giải quyết.
3. Cho phép Nhân viên / Quản lý xử lý, phản hồi kết luận giải đáp `staffResponse` và hoàn tất ticket (`COMPLETED`).
4. Cho phép Khách hàng tự hủy yêu cầu hỗ trợ khi còn ở trạng thái `PENDING` (`CANCELLED`).
5. Gửi thông báo realtime Socket.IO và Email qua `NotificationService` cho khách và nhân viên.

---

## 2. Thiết Kế Dữ Liệu (Mongoose Model)

### Model `SupportTicket` (`src/modules/support/supportTicket.model.ts`)

```ts
export interface ISupportTicketStaffResponse {
  responseMessage: string;
  attachments: string[];
  respondedBy: Types.ObjectId;
  respondedAt: Date;
}

export interface ISupportTicket extends SoftDeleteDocument {
  ticketCode: string; // Format: SUP-YYMMDD-XXXX (Partial unique index)
  customerId: Types.ObjectId;
  facilityId?: Types.ObjectId;
  contractId?: Types.ObjectId;
  category: SupportTicketCategoryEnum;
  priority: SupportTicketPriorityEnum;
  title: string;
  description: string;
  attachments: string[];
  status: SupportTicketStatusEnum; // PENDING | PROCESSING | COMPLETED | CANCELLED
  assignedStaffId?: Types.ObjectId;
  staffResponse?: ISupportTicketStaffResponse;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Danh Sách Tasks Triển Khai

| Task ID  | Tên Task                                            | Mô tả & Trách nhiệm                                                                 | Trạng thái  |
| :------: | :-------------------------------------------------- | :---------------------------------------------------------------------------------- | :---------: |
| **5B.1** | **Enums, Data Model & Repository**                  | Enums `Category`, `Priority`, `Status`; Model `SupportTicket`; Repository nguyên tử | ✅ **DONE** |
| **5B.2** | **Contract Layer & Validation Schemas**             | Message codes 720–726; Zod schemas cho input & output                               | ✅ **DONE** |
| **5B.3** | **Service Logic, Phân quyền 2 Lớp & Notifications** | Logic nghiệp vụ, Scoped Query, atomic updates, notification, audit log              | ✅ **DONE** |
| **5B.4** | **Controller RESTful Endpoints & Wiring**           | 6 RESTful endpoints tsoa, `extractCaller`, Swagger docs, `src/ioc.ts`               | ✅ **DONE** |
| **5B.5** | **Integration Tests & Quality Verification**        | 24/24 integration tests PASS 100%, `npm run check` & `npm run build`                | ✅ **DONE** |
