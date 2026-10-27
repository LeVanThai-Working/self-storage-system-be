import { Types, type ClientSession } from 'mongoose';
import { SupportTicketRepository } from './supportTicket.repository.ts';
import type { ContractRepository } from '../contract/contract.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { NotificationService } from '../notification/notification.service.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import {
  SupportTicketPriorityEnum,
  SupportTicketStatusEnum,
} from '../../common/enums/supportTicket.enum.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import {
  NotificationTypeEnum,
  NotificationPriorityEnum,
  NotificationChannelEnum,
} from '../../common/enums/notification.enum.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  supportTicketResponseSchema,
  paginatedSupportTicketResponseSchema,
  type SupportTicketResponse,
  type PaginatedSupportTicketResponse,
} from './schemas/supportTicket.response.schema.ts';
import type {
  CreateSupportTicketRequest,
  ProcessSupportTicketRequest,
  CompleteSupportTicketRequest,
  CancelSupportTicketRequest,
  SupportTicketQuery,
} from './schemas/supportTicket.request.schema.ts';

export interface CallerContext {
  id: string;
  role?: string;
  assignedFacilityId?: string;
}

function toId(ref: unknown): string {
  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    return String((ref as { _id: unknown })._id);
  }
  return String(ref || '');
}

export class SupportTicketService {
  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly contractRepository?: ContractRepository,
    private readonly facilityRepository?: FacilityRepository,
    private readonly userRepository?: UserRepository,
    private readonly notificationService?: NotificationService,
    private readonly auditLogService?: AuditLogService
  ) {}

  private async resolveCallerAssignedFacilityId(
    caller: CallerContext
  ): Promise<string | undefined> {
    if (caller.assignedFacilityId) {
      return caller.assignedFacilityId;
    }
    if (
      (caller.role === RoleEnum.FACILITY_STAFF ||
        caller.role === RoleEnum.FACILITY_MANAGER) &&
      this.userRepository
    ) {
      const user = await this.userRepository.findById(caller.id);
      if (user?.assignedFacilityId) {
        caller.assignedFacilityId = String(user.assignedFacilityId);
        return caller.assignedFacilityId;
      }
    }
    return undefined;
  }

  private async generateTicketCode(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePrefix = `SUP-${yy}${mm}${dd}`;

    const todayCount = await this.supportTicketRepository.countTicketsToday();
    const seq = String(todayCount + 1).padStart(4, '0');
    return `${datePrefix}-${seq}`;
  }

  private formatTicket(doc: unknown): unknown {
    if (!doc) return doc;
    const raw =
      typeof (doc as { toObject?: () => unknown }).toObject === 'function'
        ? (doc as { toObject: () => Record<string, unknown> }).toObject()
        : (doc as Record<string, unknown>);

    const id = String(raw._id || raw.id || '');

    const customer =
      raw.customerId && typeof raw.customerId === 'object'
        ? {
            id: toId(raw.customerId),
            name: (raw.customerId as { name?: string }).name,
            email: (raw.customerId as { email?: string }).email,
            phoneNumber: (raw.customerId as { phoneNumber?: string })
              .phoneNumber,
            role: (raw.customerId as { role?: string }).role,
          }
        : String(raw.customerId || '');

    let facility: unknown = null;
    if (raw.facilityId) {
      facility =
        typeof raw.facilityId === 'object'
          ? {
              id: toId(raw.facilityId),
              code: (raw.facilityId as { code?: string }).code,
              name: (raw.facilityId as { name?: string }).name,
              address: (raw.facilityId as { address?: string }).address,
            }
          : String(raw.facilityId);
    }

    let contract: unknown = null;
    if (raw.contractId) {
      contract =
        typeof raw.contractId === 'object'
          ? {
              id: toId(raw.contractId),
              contractCode: (raw.contractId as { contractCode?: string })
                .contractCode,
              status: (raw.contractId as { status?: string }).status,
              startDate: (raw.contractId as { startDate?: Date }).startDate
                ? new Date(
                    (raw.contractId as { startDate?: Date }).startDate!
                  ).toISOString()
                : undefined,
              endDate: (raw.contractId as { endDate?: Date }).endDate
                ? new Date(
                    (raw.contractId as { endDate?: Date }).endDate!
                  ).toISOString()
                : undefined,
            }
          : String(raw.contractId);
    }

    let assignedStaff: unknown = null;
    if (raw.assignedStaffId) {
      assignedStaff =
        typeof raw.assignedStaffId === 'object'
          ? {
              id: toId(raw.assignedStaffId),
              name: (raw.assignedStaffId as { name?: string }).name,
              email: (raw.assignedStaffId as { email?: string }).email,
              phoneNumber: (raw.assignedStaffId as { phoneNumber?: string })
                .phoneNumber,
              role: (raw.assignedStaffId as { role?: string }).role,
            }
          : String(raw.assignedStaffId);
    }

    let staffResponse: unknown = null;
    if (raw.staffResponse) {
      const resp = raw.staffResponse as {
        responseMessage: string;
        attachments: string[];
        respondedBy: unknown;
        respondedAt: Date;
      };
      staffResponse = {
        responseMessage: resp.responseMessage,
        attachments: resp.attachments || [],
        respondedBy:
          typeof resp.respondedBy === 'object' && resp.respondedBy !== null
            ? {
                id: toId(resp.respondedBy),
                name: (resp.respondedBy as { name?: string }).name,
                email: (resp.respondedBy as { email?: string }).email,
                phoneNumber: (resp.respondedBy as { phoneNumber?: string })
                  .phoneNumber,
                role: (resp.respondedBy as { role?: string }).role,
              }
            : String(resp.respondedBy || ''),
        respondedAt: resp.respondedAt
          ? new Date(resp.respondedAt).toISOString()
          : new Date().toISOString(),
      };
    }

    return {
      id,
      ticketCode: raw.ticketCode,
      customer,
      facility,
      contract,
      category: raw.category,
      priority: raw.priority,
      title: raw.title,
      description: raw.description,
      attachments: raw.attachments || [],
      status: raw.status,
      assignedStaff,
      staffResponse,
      completedAt: raw.completedAt
        ? new Date(raw.completedAt as Date).toISOString()
        : null,
      cancelledAt: raw.cancelledAt
        ? new Date(raw.cancelledAt as Date).toISOString()
        : null,
      cancellationReason: raw.cancellationReason || null,
      createdAt: raw.createdAt
        ? new Date(raw.createdAt as Date).toISOString()
        : new Date().toISOString(),
      updatedAt: raw.updatedAt
        ? new Date(raw.updatedAt as Date).toISOString()
        : new Date().toISOString(),
    };
  }

  async createTicket(
    data: CreateSupportTicketRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<SupportTicketResponse> {
    if (!caller.id) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    let facilityId = data.facilityId;

    // Validate Contract if provided
    if (data.contractId) {
      if (!this.contractRepository) {
        throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
          'ContractRepository not configured',
        ]);
      }
      const contract = await this.contractRepository.findById(
        data.contractId,
        session
      );
      if (!contract || contract.deleted) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
      }
      if (toId(contract.customerId) !== caller.id) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_724);
      }
      // If facilityId was not explicitly provided, use the contract's facility
      if (!facilityId && contract.facilityId) {
        facilityId = toId(contract.facilityId);
      }
    }

    // Validate Facility if provided
    if (facilityId) {
      if (this.facilityRepository) {
        const facility = await this.facilityRepository.findById(facilityId);
        if (!facility || facility.deleted) {
          throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
        }
      }
    }

    const ticketCode = await this.generateTicketCode();
    const createdTicket = await this.supportTicketRepository.create(
      {
        ticketCode,
        customerId: new Types.ObjectId(caller.id),
        facilityId: facilityId ? new Types.ObjectId(facilityId) : undefined,
        contractId: data.contractId
          ? new Types.ObjectId(data.contractId)
          : undefined,
        category: data.category,
        priority: data.priority || SupportTicketPriorityEnum.MEDIUM,
        title: data.title,
        description: data.description,
        attachments: data.attachments || [],
        status: SupportTicketStatusEnum.PENDING,
      },
      session
    );

    // Record Audit Log
    this.auditLogService?.record({
      action: AuditActionEnum.CREATE_SUPPORT_TICKET,
      resourceType: AuditResourceEnum.SUPPORT_TICKET,
      resourceId: String(createdTicket._id),
      after: createdTicket,
    });

    // Notify Facility Staff / Manager
    if (facilityId && this.notificationService && this.userRepository) {
      this.userRepository
        .findStaffsByFacilityId(facilityId, { limit: 100 })
        .then((staffPaginated) => {
          const staffIds = staffPaginated.items.map((staff) =>
            String(staff._id)
          );
          if (staffIds.length > 0) {
            this.notificationService?.sendNotificationToUsers(staffIds, {
              facilityId,
              title: `[Hỗ trợ khách hàng] ${data.title}`,
              content: `Khách hàng vừa gửi yêu cầu hỗ trợ mã ${ticketCode}. Vui lòng tiếp nhận và xử lý.`,
              type: NotificationTypeEnum.SUPPORT_TICKET,
              priority:
                data.priority === SupportTicketPriorityEnum.URGENT ||
                data.priority === SupportTicketPriorityEnum.HIGH
                  ? NotificationPriorityEnum.HIGH
                  : NotificationPriorityEnum.NORMAL,
              channels: [NotificationChannelEnum.IN_APP],
              metadata: {
                ticketId: String(createdTicket._id),
                ticketCode,
              },
            });
          }
        })
        .catch((err: unknown) => {
          console.warn('Failed to dispatch support ticket notification:', err);
        });
    }

    const fullDoc = await this.supportTicketRepository.findById(
      createdTicket._id,
      session
    );
    return validateResponse(
      supportTicketResponseSchema,
      this.formatTicket(fullDoc)
    );
  }

  async findTickets(
    query: SupportTicketQuery,
    caller: CallerContext
  ): Promise<PaginatedSupportTicketResponse> {
    if (!caller.id) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const callerRole = caller.role || RoleEnum.CUSTOMER;
    const filterQuery: typeof query = { ...query };

    if (callerRole === RoleEnum.CUSTOMER) {
      filterQuery.customerId = caller.id;
    } else if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER
    ) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (!assignedFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
      }
      filterQuery.facilityId = assignedFacilityId;
    }
    // OPS & ADMIN can view across facilities

    const result =
      await this.supportTicketRepository.findPaginated(filterQuery);
    const formattedItems = result.items.map((item) => this.formatTicket(item));

    return validateResponse(paginatedSupportTicketResponseSchema, {
      items: formattedItems,
      pagination: result.pagination,
    });
  }

  async getTicketById(
    id: string,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<SupportTicketResponse> {
    if (!caller.id) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const ticket = await this.supportTicketRepository.findById(id, session);
    if (!ticket || ticket.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_720);
    }

    const callerRole = caller.role || RoleEnum.CUSTOMER;
    if (callerRole === RoleEnum.CUSTOMER) {
      if (toId(ticket.customerId) !== caller.id) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER
    ) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (
        ticket.facilityId &&
        (!assignedFacilityId || assignedFacilityId !== toId(ticket.facilityId))
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_725);
      }
    }

    return validateResponse(
      supportTicketResponseSchema,
      this.formatTicket(ticket)
    );
  }

  async processTicket(
    id: string,
    request: ProcessSupportTicketRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<SupportTicketResponse> {
    if (!caller.id) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const callerRole = caller.role || RoleEnum.CUSTOMER;
    if (callerRole === RoleEnum.CUSTOMER) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const ticket = await this.supportTicketRepository.findById(id, session);
    if (!ticket || ticket.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_720);
    }

    if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER
    ) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (
        ticket.facilityId &&
        (!assignedFacilityId || assignedFacilityId !== toId(ticket.facilityId))
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_725);
      }
    }

    let targetStaffId: Types.ObjectId | undefined;
    if (request.assignedStaffId) {
      if (this.userRepository) {
        const staff = await this.userRepository.findById(
          request.assignedStaffId
        );
        if (!staff || staff.deleted) {
          throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Staff']);
        }
        if (
          ticket.facilityId &&
          toId(staff.assignedFacilityId) !== toId(ticket.facilityId)
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_726);
        }
      }
      targetStaffId = new Types.ObjectId(request.assignedStaffId);
    } else if (callerRole === RoleEnum.FACILITY_STAFF) {
      targetStaffId = new Types.ObjectId(caller.id);
    }

    const updated = await this.supportTicketRepository.atomicUpdateStatus(
      id,
      [SupportTicketStatusEnum.PENDING, SupportTicketStatusEnum.PROCESSING],
      {
        status: SupportTicketStatusEnum.PROCESSING,
        assignedStaffId: targetStaffId || ticket.assignedStaffId,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_721);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.PROCESS_SUPPORT_TICKET,
      resourceType: AuditResourceEnum.SUPPORT_TICKET,
      resourceId: String(updated._id),
      before: ticket,
      after: updated,
    });

    // Notify Customer that ticket is now being processed
    if (this.notificationService) {
      this.notificationService.sendNotificationToUsers(
        [toId(ticket.customerId)],
        {
          facilityId: ticket.facilityId ? toId(ticket.facilityId) : undefined,
          title: `[Cập nhật yêu cầu] Mã ${ticket.ticketCode} đang được xử lý`,
          content: `Nhân viên đã tiếp nhận yêu cầu hỗ trợ "${ticket.title}" của bạn.`,
          type: NotificationTypeEnum.SUPPORT_TICKET,
          priority: NotificationPriorityEnum.NORMAL,
          channels: [NotificationChannelEnum.IN_APP],
          metadata: {
            ticketId: String(updated._id),
            ticketCode: ticket.ticketCode,
          },
        }
      );
    }

    return validateResponse(
      supportTicketResponseSchema,
      this.formatTicket(updated)
    );
  }

  async completeTicket(
    id: string,
    request: CompleteSupportTicketRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<SupportTicketResponse> {
    if (!caller.id) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const callerRole = caller.role || RoleEnum.CUSTOMER;
    if (callerRole === RoleEnum.CUSTOMER) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const ticket = await this.supportTicketRepository.findById(id, session);
    if (!ticket || ticket.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_720);
    }

    if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER
    ) {
      const assignedFacilityId =
        await this.resolveCallerAssignedFacilityId(caller);
      if (
        ticket.facilityId &&
        (!assignedFacilityId || assignedFacilityId !== toId(ticket.facilityId))
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_725);
      }
    }

    const staffResponse = {
      responseMessage: request.responseMessage,
      attachments: request.attachments || [],
      respondedBy: new Types.ObjectId(caller.id),
      respondedAt: new Date(),
    };

    const updated = await this.supportTicketRepository.atomicUpdateStatus(
      id,
      [SupportTicketStatusEnum.PENDING, SupportTicketStatusEnum.PROCESSING],
      {
        status: SupportTicketStatusEnum.COMPLETED,
        staffResponse,
        completedAt: new Date(),
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_721);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.COMPLETE_SUPPORT_TICKET,
      resourceType: AuditResourceEnum.SUPPORT_TICKET,
      resourceId: String(updated._id),
      before: ticket,
      after: updated,
    });

    // Notify Customer with resolution content via In-app + Email
    if (this.notificationService) {
      this.notificationService.sendNotificationToUsers(
        [toId(ticket.customerId)],
        {
          facilityId: ticket.facilityId ? toId(ticket.facilityId) : undefined,
          title: `[Hoàn tất yêu cầu] ${ticket.ticketCode}`,
          content: `Yêu cầu hỗ trợ "${ticket.title}" đã được nhân viên giải quyết: "${request.responseMessage}".`,
          type: NotificationTypeEnum.SUPPORT_TICKET,
          priority: NotificationPriorityEnum.HIGH,
          channels: [
            NotificationChannelEnum.IN_APP,
            NotificationChannelEnum.EMAIL,
          ],
          metadata: {
            ticketId: String(updated._id),
            ticketCode: ticket.ticketCode,
            resolution: request.responseMessage,
          },
        }
      );
    }

    return validateResponse(
      supportTicketResponseSchema,
      this.formatTicket(updated)
    );
  }

  async cancelTicket(
    id: string,
    request: CancelSupportTicketRequest,
    caller: CallerContext,
    session?: ClientSession
  ): Promise<SupportTicketResponse> {
    if (!caller.id) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const ticket = await this.supportTicketRepository.findById(id, session);
    if (!ticket || ticket.deleted) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_720);
    }

    const callerRole = caller.role || RoleEnum.CUSTOMER;
    if (callerRole === RoleEnum.CUSTOMER) {
      if (toId(ticket.customerId) !== caller.id) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    const updated = await this.supportTicketRepository.atomicUpdateStatus(
      id,
      SupportTicketStatusEnum.PENDING,
      {
        status: SupportTicketStatusEnum.CANCELLED,
        cancellationReason: request.cancellationReason || null,
        cancelledAt: new Date(),
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_722);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL_SUPPORT_TICKET,
      resourceType: AuditResourceEnum.SUPPORT_TICKET,
      resourceId: String(updated._id),
      before: ticket,
      after: updated,
    });

    return validateResponse(
      supportTicketResponseSchema,
      this.formatTicket(updated)
    );
  }
}
