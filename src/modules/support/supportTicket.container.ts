import { SupportTicket } from './supportTicket.model.ts';
import { SupportTicketRepository } from './supportTicket.repository.ts';
import { SupportTicketService } from './supportTicket.service.ts';
import { SupportTicketController } from './supportTicket.controller.ts';
import { contractRepository } from '../contract/contract.container.ts';
import { facilityRepository } from '../facility/facility.container.ts';
import { userRepository } from '../user/user.container.ts';
import { notificationService } from '../notification/notification.container.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

export const supportTicketRepository = new SupportTicketRepository(
  SupportTicket
);

export const supportTicketService = new SupportTicketService(
  supportTicketRepository,
  contractRepository,
  facilityRepository,
  userRepository,
  notificationService,
  auditLogService
);

export const supportTicketController = new SupportTicketController(
  supportTicketService
);
