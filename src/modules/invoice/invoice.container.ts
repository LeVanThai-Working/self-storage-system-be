import { Invoice } from './invoice.model.ts';
import { InvoiceRepository } from './invoice.repository.ts';
import { InvoiceService } from './invoice.service.ts';
import { InvoiceController } from './invoice.controller.ts';
import {
  contractRepository,
  setInvoiceServiceForContract,
} from '../contract/contract.container.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';
import { notificationService } from '../notification/notification.container.ts';
import type { PaymentService } from '../payment/payment.service.ts';
import { InvoicePdfService } from './services/invoicePdf.service.ts';

import { Payment, PaymentTransaction } from '../payment/payment.model.ts';
import { PaymentRepository } from '../payment/payment.repository.ts';

export const invoiceRepository = new InvoiceRepository(Invoice);
const userRepository = new UserRepository(User);
const paymentRepository = new PaymentRepository(Payment, PaymentTransaction);
export const invoicePdfService = new InvoicePdfService();

export const invoiceService = new InvoiceService(
  invoiceRepository,
  contractRepository,
  userRepository,
  auditLogService,
  paymentRepository,
  notificationService,
  invoicePdfService
);

setInvoiceServiceForContract(invoiceService);

let paymentServiceInstance: PaymentService | undefined;

export const setPaymentServiceForInvoice = (service: PaymentService): void => {
  paymentServiceInstance = service;
};

export const getPaymentServiceForInvoice = (): PaymentService | undefined => {
  return paymentServiceInstance;
};

export const invoiceController = new InvoiceController(
  invoiceService,
  getPaymentServiceForInvoice
);
