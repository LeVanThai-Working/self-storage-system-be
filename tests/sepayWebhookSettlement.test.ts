import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import {
  seedTestUsers,
  TEST_USERS,
  TEST_FACILITY_A_ID,
  TEST_FACILITY_B_ID,
} from './helpers/auth.helper.ts';
import { RegisterRoutes } from '../src/routes/routes.ts';
import { errorMiddleware } from '../src/middlewares/error.middleware.ts';
import {
  Payment,
  PaymentTransaction,
} from '../src/modules/payment/payment.model.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import {
  PaymentStatusEnum,
  PaymentTransactionResultEnum,
  PaymentPurposeEnum,
  PaymentMethodEnum,
} from '../src/common/enums/payment.enum.ts';
import {
  ReservationStatusEnum,
  RefundStatusEnum,
} from '../src/common/enums/reservation.enum.ts';
import {
  RefundReasonEnum,
  RefundRequestStatusEnum,
} from '../src/common/enums/refundRequest.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { runPartiallyPaidMigration } from '../scripts/migrate-partially-paid-payments.ts';

describe('T1.2, T1.3, T1.8: SePay Webhook Settlement & Single Payment Invariant', () => {
  let app: Express;
  const apiKey =
    process.env.SEPAY_WEBHOOK_API_KEY || 'test_sepay_api_key_123456';
  const bankAccount = process.env.SEPAY_ACCOUNT_NUMBER || '0123456789';

  beforeAll(async () => {
    await setupTestDB();
    process.env.SEPAY_WEBHOOK_API_KEY = apiKey;
    process.env.SEPAY_ACCOUNT_NUMBER = bankAccount;
    process.env.ALLOW_INSECURE_CALLER_FALLBACK = 'true';

    app = express();
    app.use(express.json());
    RegisterRoutes(app);
    app.use(errorMiddleware);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    // Ensure models are registered in Mongoose
    void StorageUnit.modelName;
    void FacilityUnitTypeOffering.modelName;
    void Contract.modelName;

    await Facility.create([
      {
        _id: new mongoose.Types.ObjectId(TEST_FACILITY_A_ID),
        name: 'Facility A - District 1',
        address: '123 Facility A Road',
        city: 'Ho Chi Minh',
        status: 'active',
      },
      {
        _id: new mongoose.Types.ObjectId(TEST_FACILITY_B_ID),
        name: 'Facility B - District 7',
        address: '456 Facility B Road',
        city: 'Ho Chi Minh',
        status: 'active',
      },
    ]);
  });

  function getVnTransactionDate(date: Date = new Date()): string {
    const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toISOString().replace('T', ' ').slice(0, 19);
  }

  // Helper to create test reservation and payment
  async function createTestReservationAndPayment(options?: {
    depositAmount?: number;
    paymentCode?: string;
    expiresAt?: Date;
    reservationStatus?: ReservationStatusEnum;
  }) {
    const depositAmount = options?.depositAmount ?? 500000;
    const paymentCode = options?.paymentCode ?? 'SSM99901';
    const expiresAt =
      options?.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000);
    const reservationStatus =
      options?.reservationStatus ?? ReservationStatusEnum.PENDING_PAYMENT;

    const reservationId = new Types.ObjectId();
    const paymentId = new Types.ObjectId();

    await Reservation.collection.insertOne({
      _id: reservationId,
      reservationCode: `RES-${paymentCode}`,
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      storageUnitId: new Types.ObjectId(),
      status: reservationStatus,
      depositAmount,
      totalPeriodicPrice: 1000000,
      totalAmount: 1000000,
      paymentId,
      startDate: new Date(),
      rentalDuration: 1,
      billingUnit: 'month',
      basePrice: 1000000,
      refundStatus: RefundStatusEnum.NOT_APPLICABLE,
      refundAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
    });

    await Payment.collection.insertOne({
      _id: paymentId,
      paymentCode,
      reservationId,
      facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
      customerId: new Types.ObjectId(TEST_USERS.customer1.id),
      purpose: PaymentPurposeEnum.RESERVATION_DEPOSIT,
      method: PaymentMethodEnum.BANK_TRANSFER,
      amount: depositAmount,
      paidAmount: 0,
      status: PaymentStatusEnum.PENDING,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
    });

    return { reservationId, paymentId, paymentCode, depositAmount };
  }

  describe('Part 1: Webhook Underpayment (T1.2 & T1.8)', () => {
    it('should reject underpayment, keep payment PENDING without accumulating paidAmount, and generate RefundRequest', async () => {
      const { paymentId, reservationId, paymentCode } =
        await createTestReservationAndPayment({
          depositAmount: 500000,
          paymentCode: 'SSM_UNDER_01',
        });

      const sepayPayload = {
        id: 70001,
        gateway: 'Vietcombank',
        transactionDate: getVnTransactionDate(),
        accountNumber: bankAccount,
        code: paymentCode,
        content: `Thanh toan coc ${paymentCode}`,
        transferType: 'in',
        transferAmount: 300000, // Underpayment: 300k vs 500k required
      };

      const res = await request(app)
        .post('/payments/sepay/webhook')
        .set('Authorization', `Apikey ${apiKey}`)
        .send(sepayPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify transaction recorded with AMOUNT_MISMATCH
      const transaction = await PaymentTransaction.findOne({ sepayId: 70001 });
      expect(transaction).not.toBeNull();
      expect(transaction?.result).toBe(
        PaymentTransactionResultEnum.AMOUNT_MISMATCH
      );
      expect(transaction?.transferAmount).toBe(300000);
      expect(transaction?.matchedPaymentId?.toString()).toBe(
        paymentId.toString()
      );

      // Verify payment is still PENDING and paidAmount is NOT accumulated
      const payment = await Payment.findById(paymentId);
      expect(payment?.status).toBe(PaymentStatusEnum.PENDING);
      expect(payment?.paidAmount).toBe(0);

      // Verify reservation is still PENDING_PAYMENT
      const reservation = await Reservation.findById(reservationId);
      expect(reservation?.status).toBe(ReservationStatusEnum.PENDING_PAYMENT);

      // Verify RefundRequest created for 300,000 VND
      const refund = await RefundRequest.findOne({
        paymentId,
        reason: RefundReasonEnum.AMOUNT_MISMATCH,
      });
      expect(refund).not.toBeNull();
      expect(refund?.amount).toBe(300000);
      expect(refund?.status).toBe(RefundRequestStatusEnum.PENDING_APPROVAL);
      expect(refund?.customerId.toString()).toBe(TEST_USERS.customer1.id);
      expect(refund?.facilityId.toString()).toBe(TEST_FACILITY_A_ID);
    });
  });

  describe('Part 2: Webhook Overpayment (T1.2 & T1.8)', () => {
    it('should reject overpayment, keep payment PENDING, and create RefundRequest for the entire transferred amount', async () => {
      const { paymentId, reservationId, paymentCode } =
        await createTestReservationAndPayment({
          depositAmount: 500000,
          paymentCode: 'SSM_OVER_01',
        });

      const sepayPayload = {
        id: 70002,
        gateway: 'Vietcombank',
        transactionDate: getVnTransactionDate(),
        accountNumber: bankAccount,
        code: paymentCode,
        content: `Thanh toan coc ${paymentCode}`,
        transferType: 'in',
        transferAmount: 600000, // Overpayment: 600k vs 500k required
      };

      const res = await request(app)
        .post('/payments/sepay/webhook')
        .set('Authorization', `Apikey ${apiKey}`)
        .send(sepayPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const transaction = await PaymentTransaction.findOne({ sepayId: 70002 });
      expect(transaction?.result).toBe(
        PaymentTransactionResultEnum.AMOUNT_MISMATCH
      );
      expect(transaction?.transferAmount).toBe(600000);

      const payment = await Payment.findById(paymentId);
      expect(payment?.status).toBe(PaymentStatusEnum.PENDING);
      expect(payment?.paidAmount).toBe(0);

      const reservation = await Reservation.findById(reservationId);
      expect(reservation?.status).toBe(ReservationStatusEnum.PENDING_PAYMENT);

      // Entire 600,000 VND must be queued for refund
      const refund = await RefundRequest.findOne({
        paymentId,
        reason: RefundReasonEnum.AMOUNT_MISMATCH,
      });
      expect(refund).not.toBeNull();
      expect(refund?.amount).toBe(600000);
      expect(refund?.status).toBe(RefundRequestStatusEnum.PENDING_APPROVAL);
    });
  });

  describe('Part 3: Webhook Exact Payment (T1.3 & T1.8)', () => {
    it('should settle payment successfully when exact amount is transferred', async () => {
      const { paymentId, reservationId, paymentCode } =
        await createTestReservationAndPayment({
          depositAmount: 500000,
          paymentCode: 'SSM_EXACT_01',
        });

      const sepayPayload = {
        id: 70003,
        gateway: 'Vietcombank',
        transactionDate: getVnTransactionDate(),
        accountNumber: bankAccount,
        code: paymentCode,
        content: `Thanh toan coc ${paymentCode}`,
        transferType: 'in',
        transferAmount: 500000, // Exact 500,000 VND
      };

      const res = await request(app)
        .post('/payments/sepay/webhook')
        .set('Authorization', `Apikey ${apiKey}`)
        .send(sepayPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const transaction = await PaymentTransaction.findOne({ sepayId: 70003 });
      expect(transaction?.result).toBe(PaymentTransactionResultEnum.MATCHED);
      expect(transaction?.transferAmount).toBe(500000);

      const payment = await Payment.findById(paymentId);
      expect(payment?.status).toBe(PaymentStatusEnum.PAID);
      expect(payment?.paidAmount).toBe(500000);
      expect(payment?.paidAt).toBeDefined();

      const reservation = await Reservation.findById(reservationId);
      expect(reservation?.status).toBe(
        ReservationStatusEnum.PAYMENT_SUCCESSFUL
      );

      // No refund should be created for exact matched payment
      const refund = await RefundRequest.findOne({ paymentId });
      expect(refund).toBeNull();
    });
  });

  describe('Part 4: Webhook Late Payment & Grace Period ([OPEN D9] & T1.2)', () => {
    it('should mark transaction as LATE and create RefundRequest if transferred after expiration plus grace period', async () => {
      // Expired 10 minutes ago
      const expiredDate = new Date(Date.now() - 10 * 60 * 1000);
      const { paymentId, paymentCode } = await createTestReservationAndPayment({
        depositAmount: 500000,
        paymentCode: 'SSM_LATE_01',
        expiresAt: expiredDate,
      });

      const sepayPayload = {
        id: 70004,
        gateway: 'Vietcombank',
        transactionDate: getVnTransactionDate(new Date()),
        accountNumber: bankAccount,
        code: paymentCode,
        content: `Thanh toan tre ${paymentCode}`,
        transferType: 'in',
        transferAmount: 500000,
      };

      const res = await request(app)
        .post('/payments/sepay/webhook')
        .set('Authorization', `Apikey ${apiKey}`)
        .send(sepayPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const transaction = await PaymentTransaction.findOne({ sepayId: 70004 });
      expect(transaction?.result).toBe(PaymentTransactionResultEnum.LATE);

      const payment = await Payment.findById(paymentId);
      expect(payment?.status).not.toBe(PaymentStatusEnum.PAID);

      const refund = await RefundRequest.findOne({
        paymentId,
        reason: RefundReasonEnum.LATE_PAYMENT,
      });
      expect(refund).not.toBeNull();
      expect(refund?.amount).toBe(500000);
      expect(refund?.status).toBe(RefundRequestStatusEnum.PENDING_APPROVAL);
    });

    it('should accept payment if within grace period of 2 minutes after expiration', async () => {
      // Expired only 30 seconds ago (well within lateGraceMinutes = 2)
      const justExpiredDate = new Date(Date.now() - 30 * 1000);
      const { paymentId, reservationId, paymentCode } =
        await createTestReservationAndPayment({
          depositAmount: 500000,
          paymentCode: 'SSM_GRACE_01',
          expiresAt: justExpiredDate,
        });

      const sepayPayload = {
        id: 70005,
        gateway: 'Vietcombank',
        transactionDate: getVnTransactionDate(new Date()),
        accountNumber: bankAccount,
        code: paymentCode,
        content: `Thanh toan trong grace period ${paymentCode}`,
        transferType: 'in',
        transferAmount: 500000,
      };

      const res = await request(app)
        .post('/payments/sepay/webhook')
        .set('Authorization', `Apikey ${apiKey}`)
        .send(sepayPayload);

      expect(res.status).toBe(200);

      const transaction = await PaymentTransaction.findOne({ sepayId: 70005 });
      expect(transaction?.result).toBe(PaymentTransactionResultEnum.MATCHED);

      const payment = await Payment.findById(paymentId);
      expect(payment?.status).toBe(PaymentStatusEnum.PAID);

      const reservation = await Reservation.findById(reservationId);
      expect(reservation?.status).toBe(
        ReservationStatusEnum.PAYMENT_SUCCESSFUL
      );
    });
  });

  describe('Part 5: Idempotency by sepayId (T1.3)', () => {
    it('should handle duplicate webhook deliveries safely without duplicating transactions or refunds', async () => {
      const { paymentCode } = await createTestReservationAndPayment({
        depositAmount: 500000,
        paymentCode: 'SSM_IDEMP_01',
      });

      const sepayPayload = {
        id: 70006,
        gateway: 'Vietcombank',
        transactionDate: getVnTransactionDate(),
        accountNumber: bankAccount,
        code: paymentCode,
        content: `Thanh toan coc ${paymentCode}`,
        transferType: 'in',
        transferAmount: 300000, // Underpayment
      };

      // 1st invocation
      const res1 = await request(app)
        .post('/payments/sepay/webhook')
        .set('Authorization', `Apikey ${apiKey}`)
        .send(sepayPayload);
      expect(res1.status).toBe(200);

      // 2nd invocation (duplicate webhook)
      const res2 = await request(app)
        .post('/payments/sepay/webhook')
        .set('Authorization', `Apikey ${apiKey}`)
        .send(sepayPayload);
      expect(res2.status).toBe(200);

      // Check count in database
      const txCount = await PaymentTransaction.countDocuments({
        sepayId: 70006,
      });
      expect(txCount).toBe(1);

      const refundCount = await RefundRequest.countDocuments({
        reason: RefundReasonEnum.AMOUNT_MISMATCH,
      });
      expect(refundCount).toBe(1);
    });
  });

  describe('Part 6: Unmatched Transactions & Manual Assignment API (T1.3)', () => {
    it('should allow manager to list unmatched transactions filtered by facility', async () => {
      // Seed an unmatched transaction
      await PaymentTransaction.create({
        sepayId: 70007,
        gateway: 'Vietcombank',
        transactionDate: new Date(),
        accountNumber: bankAccount,
        transferType: 'in',
        transferAmount: 400000,
        code: 'UNKNOWN_CODE',
        content: 'Chuyen khoan khong ma',
        result: PaymentTransactionResultEnum.UNMATCHED,
      });

      const res = await request(app)
        .get('/payments/transactions/unmatched?result=unmatched')
        .set('x-user-id', TEST_USERS.managerFacilityA.id)
        .set('x-user-role', TEST_USERS.managerFacilityA.role);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].sepayId).toBe(70007);
    });

    it('should reject manual assignment if transaction amount does not match payment amount', async () => {
      const { paymentCode } = await createTestReservationAndPayment({
        depositAmount: 500000,
        paymentCode: 'SSM_MANUAL_01',
      });

      const transaction = await PaymentTransaction.create({
        sepayId: 70008,
        gateway: 'Vietcombank',
        transactionDate: new Date(),
        accountNumber: bankAccount,
        transferType: 'in',
        transferAmount: 450000, // Different from 500,000
        code: 'UNKNOWN_01',
        content: 'Chuyen 450k',
        result: PaymentTransactionResultEnum.UNMATCHED,
      });

      const res = await request(app)
        .post(`/payments/transactions/${transaction._id}/assign`)
        .set('x-user-id', TEST_USERS.managerFacilityA.id)
        .set('x-user-role', TEST_USERS.managerFacilityA.role)
        .send({
          paymentCode,
        });

      expect(res.status).toBe(400);
      expect(res.body.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_518);
    });

    it('should successfully assign unmatched transaction to payment when amounts match', async () => {
      const { paymentId, reservationId, paymentCode } =
        await createTestReservationAndPayment({
          depositAmount: 500000,
          paymentCode: 'SSM_MANUAL_02',
        });

      const transaction = await PaymentTransaction.create({
        sepayId: 70009,
        gateway: 'Vietcombank',
        transactionDate: new Date(),
        accountNumber: bankAccount,
        transferType: 'in',
        transferAmount: 500000, // Exact amount match
        code: 'WRONG_DES_TYPO',
        content: 'Chuyen nham ky tu SSM MANUAL 02',
        result: PaymentTransactionResultEnum.UNMATCHED,
      });

      const res = await request(app)
        .post(`/payments/transactions/${transaction._id}/assign`)
        .set('x-user-id', TEST_USERS.managerFacilityA.id)
        .set('x-user-role', TEST_USERS.managerFacilityA.role)
        .send({
          paymentCode,
        });

      if (res.status !== 200) {
        console.log('DEBUG ASSIGN 500 ERROR:', JSON.stringify(res.body));
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify transaction updated
      const updatedTx = await PaymentTransaction.findById(transaction._id);
      expect(updatedTx?.result).toBe(PaymentTransactionResultEnum.MATCHED);
      expect(updatedTx?.matchedPaymentId?.toString()).toBe(
        paymentId.toString()
      );

      // Verify payment updated to PAID
      const updatedPayment = await Payment.findById(paymentId);
      expect(updatedPayment?.status).toBe(PaymentStatusEnum.PAID);
      expect(updatedPayment?.paidAmount).toBe(500000);

      // Verify reservation updated to PAYMENT_SUCCESSFUL
      const updatedReservation = await Reservation.findById(reservationId);
      expect(updatedReservation?.status).toBe(
        ReservationStatusEnum.PAYMENT_SUCCESSFUL
      );
    });
  });

  describe('Part 7: Migration Script (T1.8)', () => {
    it('should migrate legacy PARTIALLY_PAID payments to CANCELLED and create RefundRequests', async () => {
      const paymentId = new Types.ObjectId();
      const reservationId = new Types.ObjectId();

      await Payment.collection.insertOne({
        _id: paymentId,
        paymentCode: 'SSM_LEGACY_01',
        reservationId,
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        purpose: PaymentPurposeEnum.RESERVATION_DEPOSIT,
        method: PaymentMethodEnum.BANK_TRANSFER,
        amount: 500000,
        paidAmount: 200000, // Partially paid 200k
        status: 'partially_paid',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
      });

      // Run migration
      const result = await runPartiallyPaidMigration();
      expect(result.migrated).toBe(1);

      // Check payment status
      const payment = await Payment.findById(paymentId);
      expect(payment?.status).toBe(PaymentStatusEnum.CANCELLED);

      // Check RefundRequest created
      const refund = await RefundRequest.findOne({
        paymentId,
        reason: RefundReasonEnum.AMOUNT_MISMATCH,
      });
      expect(refund).not.toBeNull();
      expect(refund?.amount).toBe(200000);
      expect(refund?.status).toBe(RefundRequestStatusEnum.PENDING_APPROVAL);

      // Idempotency: run again and expect 0 migrated
      const secondRun = await runPartiallyPaidMigration();
      expect(secondRun.migrated).toBe(0);
    });
  });
});
