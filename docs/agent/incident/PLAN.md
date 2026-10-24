# Kế Hoạch Triển Khai: Phân Hệ 5A — Quản Lý Sự Cố Kho Bãi (`incident`)

> **Căn cứ:**
>
> - [AGENTS.md](file:///c:/NgocTuyen/selfStorageManagementSystem/self-storage-system-be/.agents/rules/AGENTS.md)
> - Thống nhất kiến trúc: Module độc lập, không chat, nhúng Subdocument `resolution`, chuỗi điều phối Customer -> FM -> Staff -> Done.

---

## 1. Mục Tiêu & Phạm Vi

1. Cho phép Khách hàng (`CUSTOMER`) báo cáo sự cố hư hỏng phòng kho đang thuê (`contract.customerId === caller.userId`).
2. Cho phép Quản lý chi nhánh (`FACILITY_MANAGER`) tiếp nhận và phân công nhân viên kỹ thuật (`FACILITY_STAFF`) thuộc cơ sở mình.
3. Cho phép Nhân viên kỹ thuật khảo sát hiện trường, ghi nhận `investigationNotes`, đưa kho trống sang `UNDER_MAINTENANCE` nếu cần.
4. Cho phép Nhân viên kỹ thuật hoàn tất sửa chữa, sinh biên bản giám định nhúng `resolution` (kèm ảnh đối chứng, chi phí sửa, trách nhiệm bên gây hỏng, tiền phạt cọc `damageFee`).
5. Cho phép Khách hàng hoặc FM nghiệm thu đóng hồ sơ sự cố (`CLOSED`).

---

## 2. Thiết Kế Dữ Liệu (Mongoose Model)

### Model `Incident` (`src/modules/incident/incident.model.ts`)

```ts
export interface IIncidentResolution {
  investigationNotes?: string;
  staffEvidenceImages: string[];
  resolutionNotes: string;
  repairCost: number;
  liableParty: IncidentLiablePartyEnum;
  damageFee: number;
  resolvedBy: Types.ObjectId;
  resolvedAt: Date;
}

export interface IIncident extends SoftDeleteDocument {
  incidentCode: string;
  facilityId: Types.ObjectId;
  storageUnitId?: Types.ObjectId;
  storageRackId?: Types.ObjectId;
  rackTierId?: Types.ObjectId;
  contractId?: Types.ObjectId;
  reporterId: Types.ObjectId;
  reporterRole: RoleEnum;
  category: IncidentCategoryEnum;
  severity: IncidentSeverityEnum;
  title: string;
  description: string;
  images: string[];
  status: IncidentStatusEnum;
  assignedStaffId?: Types.ObjectId;
  putUnitUnderMaintenance: boolean;
  resolution?: IIncidentResolution;
  closedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}
```

---

## 3. Vòng Đời Trạng Thái (State Machine)

- `REPORTED`: Mới tạo, chờ FM tiếp nhận và phân công.
- `ASSIGNED` / `INVESTIGATING`: Đã phân công cho Staff, Staff tiếp nhận khảo sát.
- `IN_PROGRESS`: Đang tiến hành sửa chữa.
- `RESOLVED`: Sửa xong, nhúng biên bản `resolution`, kho hoàn trả `AVAILABLE`.
- `CLOSED`: Nghiệm thu hoàn tất.
- `CANCELLED`: Báo nhầm/trùng lặp.

---

## 4. Danh Sách APIs Cần Triển Khai

1. `POST /incidents` — Báo cáo sự cố mới.
2. `GET /incidents` — Tra cứu danh sách có phân trang & lọc đa tiêu chí.
3. `GET /incidents/:id` — Chi tiết 1 sự cố kèm biên bản nhúng `resolution`.
4. `POST /incidents/:id/assign` — FM phân công nhân viên sửa chữa.
5. `POST /incidents/:id/investigate` — Nhân viên tiếp nhận khảo sát, tùy chọn đưa kho vào bảo trì.
6. `POST /incidents/:id/resolve` — Hoàn thành sửa chữa, nhúng biên bản `resolution`.
7. `POST /incidents/:id/close` — Khách hàng/FM nghiệm thu đóng sự cố.
8. `POST /incidents/:id/cancel` — Hủy sự cố báo nhầm.

---

## 5. Quy Trình Các Task Triển Khai

- [ ] **Task 5A.1:** Enums (`incident.enum.ts`), cập nhật `auditLog.enum.ts` & `messageCode.const.ts`, tạo model `Incident` với subdocument `resolution`.
- [ ] **Task 5A.2:** Repository `incident.repository.ts` & Request/Response Zod Schemas.
- [ ] **Task 5A.3:** Service `incident.service.ts` (phân quyền 2 lớp, điều phối FM -> Staff, bọc `@Transactional()`, Audit Log).
- [ ] **Task 5A.4:** Controller `incident.controller.ts`, Container wiring & đăng ký vào `ioc.ts`.
- [ ] **Task 5A.5:** Integration Tests `scratch/test_incident_api.ts` kiểm thử toàn diện các kịch bản.
