import { NotificationController } from './notification.controller.ts';
import { NotificationService } from './notification.service.ts';
import { NotificationRepository } from './notification.repository.ts';
import { Notification } from './notification.model.ts';
import { MailUtil } from '../../utils/mail.util.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

const notificationRepository = new NotificationRepository(Notification);
const mailUtil = new MailUtil();
const notificationService = new NotificationService(
  notificationRepository,
  mailUtil,
  auditLogService
);

export const notificationController = new NotificationController(
  notificationService
);
export { notificationService, notificationRepository };
