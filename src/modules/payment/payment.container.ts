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

export const paymentRepository = new PaymentRepository(
  Payment,
  PaymentTransaction
);
export const sepayService = new SepayService(getSepayConfig());

export const paymentService = new PaymentService(
  paymentRepository,
  sepayService,
  reservationRepository,
  contractRepository,
  reservationService,
  contractService,
  auditLogService
);

export const paymentController = new PaymentController(
  paymentService,
  sepayService
);
