import { Payment, PaymentTransaction } from './payment.model.ts';
import { PaymentRepository } from './payment.repository.ts';
import { SepayService } from './sepay.service.ts';
import { PaymentService } from './payment.service.ts';
import { PaymentController } from './payment.controller.ts';
import { getSepayConfig } from '../../config/sepay.config.ts';
import {
  reservationRepository,
  reservationService,
} from '../reservation/reservation.container.ts';
import {
  contractRepository,
  contractService,
} from '../contract/contract.container.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';

export const paymentRepository = new PaymentRepository(
  Payment,
  PaymentTransaction
);
export const sepayService = new SepayService(getSepayConfig());
const userRepository = new UserRepository(User);

export const paymentService = new PaymentService(
  paymentRepository,
  sepayService,
  reservationRepository,
  contractRepository,
  reservationService,
  contractService,
  auditLogService,
  userRepository
);

export const paymentController = new PaymentController(
  paymentService,
  sepayService
);
