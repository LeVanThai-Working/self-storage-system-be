import { RefundRequest } from './refundRequest.model.ts';
import { RefundRequestRepository } from './refundRequest.repository.ts';
import { RefundRequestService } from './refundRequest.service.ts';
import { RefundRequestController } from './refundRequest.controller.ts';
import { Reservation } from '../reservation/reservation.model.ts';
import { ReservationRepository } from '../reservation/reservation.repository.ts';
import { Contract } from '../contract/contract.model.ts';
import { ContractRepository } from '../contract/contract.repository.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

export const refundRequestRepository = new RefundRequestRepository(
  RefundRequest
);
const userRepository = new UserRepository(User);
const reservationRepository = new ReservationRepository(Reservation);
const contractRepository = new ContractRepository(Contract);

export const refundRequestService = new RefundRequestService(
  refundRequestRepository,
  userRepository,
  reservationRepository,
  contractRepository,
  auditLogService
);

export const refundRequestController = new RefundRequestController(
  refundRequestService
);
