import { NotificationController } from './notification.controller.ts';
import { NotificationService } from './notification.service.ts';
import { NotificationRepository } from './notification.repository.ts';
import { Notification } from './notification.model.ts';
import { MailUtil } from '../../utils/mail.util.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';

const notificationRepository = new NotificationRepository(Notification);
const userRepository = new UserRepository(User);
const mailUtil = new MailUtil();
const notificationService = new NotificationService(
  notificationRepository,
  mailUtil,
  auditLogService,
  userRepository
);

export const notificationController = new NotificationController(
  notificationService
);
export { notificationService, notificationRepository };
