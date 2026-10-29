import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
import {
  encryptText,
  decryptText,
  maskAccountNumber,
} from '../src/utils/encryption.util.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { Payment } from '../src/modules/payment/payment.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import {
  RefundReasonEnum,
  RefundRequestStatusEnum,
} from '../src/common/enums/refundRequest.enum.ts';
import {
  RefundStatusEnum,
  ReservationStatusEnum,
} from '../src/common/enums/reservation.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { AppError } from '../src/common/errors/appError.error.ts';
import { runRefundRequestMigration } from '../scripts/migrate-to-refund-requests.ts';

describe('T1.1 & T1.4: RefundRequest & Bank Account Encryption Test Suite', () => {
  let refundRequestRepo: RefundRequestRepository;
  let reservationRepo: ReservationRepository;
  let userRepo: UserRepository;
  let refundRequestService: RefundRequestService;

  beforeAll(async () => {
    await setupTestDB();
    refundRequestRepo = new RefundRequestRepository(RefundRequest);
    reservationRepo = new ReservationRepository(Reservation);
    userRepo = new UserRepository(User);
    refundRequestService = new RefundRequestService(
      refundRequestRepo,
      userRepo,
      reservationRepo
    );
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();
    // Ensure all referenced models are registered
    void StorageUnit.modelName;
    void FacilityUnitTypeOffering.modelName;
    void Contract.modelName;
    void Payment.modelName;
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

  describe('Part 1: Encryption Utility (AES-256-GCM) & Masking', () => {
    it('should encrypt plain text and decrypt it back accurately', () => {
      const originalAccount = '012345678999';
      const encrypted = encryptText(originalAccount);

      expect(encrypted).not.toBe(originalAccount);
      expect(encrypted.split(':')).toHaveLength(3); // iv:tag:ciphertext

      const decrypted = decryptText(encrypted);
      expect(decrypted).toBe(originalAccount);
    });

    it('should mask bank account number properly (Nghị định 13/2023)', () => {
      expect(maskAccountNumber('1234567890')).toBe('******7890');
      expect(maskAccountNumber('12345')).toBe('****2345');
      expect(maskAccountNumber('12')).toBe('****');
      expect(maskAccountNumber('')).toBe('');
    });

    it('should throw error when decrypting tampered or invalid ciphertext', () => {
      expect(() => decryptText('invalid:ciphertext')).toThrow();
      expect(() => decryptText('bad:tag:ciphertext')).toThrow();
    });
  });

  describe('Part 2: RefundRequest Invariants & Creation', () => {
    it('should prevent refund amount exceeding total deposit net of forfeiture (Invariant check)', async () => {
      // Create a mock reservation with depositAmount = 1,000,000, forfeitedAmount = 200,000
      const reservationId = new Types.ObjectId();
      await Reservation.collection.insertOne({
        _id: reservationId,
        reservationCode: 'RES-INV-001',
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        storageUnitId: new Types.ObjectId(),
        status: ReservationStatusEnum.CANCELLED,
        depositAmount: 1000000,
        forfeitedAmount: 200000,
        refundAmount: 800000,
        refundStatus: RefundStatusEnum.PENDING,
        checkInDate: new Date(),
        rentalDuration: 1,
        totalAmount: 1000000,
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Net settled = 1,000,000 - 200,000 = 800,000 VND
      // Trying to request 900,000 VND should fail invariant check
      await expect(
        refundRequestService.createRefundRequest(
          TEST_USERS.managerFacilityA.id,
          RoleEnum.FACILITY_MANAGER,
          {
            reservationId: reservationId.toString(),
            facilityId: TEST_FACILITY_A_ID,
            customerId: TEST_USERS.customer1.id,
            amount: 900000,
            reason: RefundReasonEnum.CUSTOMER_CANCEL,
            refundBankName: 'Vietcombank',
            refundAccountNumber: '0123456789',
            refundAccountHolder: 'NGUYEN VAN A',
          }
        )
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.messageCode === MESSAGE_CODE.MESSAGE_CODE_513
        );
      });
    });

    it('should successfully create refund request and store encrypted bank account', async () => {
      const reservationId = new Types.ObjectId();
      await Reservation.collection.insertOne({
        _id: reservationId,
        reservationCode: 'RES-OK-001',
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        storageUnitId: new Types.ObjectId(),
        status: ReservationStatusEnum.CANCELLED,
        depositAmount: 1000000,
        forfeitedAmount: 0,
        refundAmount: 1000000,
        refundStatus: RefundStatusEnum.PENDING,
        checkInDate: new Date(),
        rentalDuration: 1,
        totalAmount: 1000000,
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await refundRequestService.createRefundRequest(
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          reservationId: reservationId.toString(),
          facilityId: TEST_FACILITY_A_ID,
          customerId: TEST_USERS.customer1.id,
          amount: 500000,
          reason: RefundReasonEnum.CUSTOMER_CANCEL,
          refundBankName: 'Vietcombank',
          refundAccountNumber: '0987654321',
          refundAccountHolder: 'NGUYEN VAN B',
        }
      );

      expect(res.id).toBeDefined();
      expect(res.amount).toBe(500000);
      expect(res.status).toBe(RefundRequestStatusEnum.PENDING_APPROVAL);
      expect(res.refundAccountNumberMasked).toBe('******4321');

      // Verify in DB that account number is encrypted, not plain text
      const rawDoc = await RefundRequest.findById(res.id);
      expect(rawDoc).not.toBeNull();
      expect(rawDoc?.refundAccountNumberEncrypted).toBeDefined();
      expect(rawDoc?.refundAccountNumberEncrypted).not.toBe('0987654321');
      expect(decryptText(rawDoc!.refundAccountNumberEncrypted!)).toBe(
        '0987654321'
      );
    });
  });

  describe('Part 3: Maker-Checker & Role Authorization Matrix', () => {
    it('should reject approval when requester tries to approve their own request (Maker-Checker)', async () => {
      const reservationId = new Types.ObjectId();
      await Reservation.collection.insertOne({
        _id: reservationId,
        reservationCode: 'RES-MC-001',
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        status: ReservationStatusEnum.CANCELLED,
        depositAmount: 2000000,
        forfeitedAmount: 0,
        refundAmount: 2000000,
        refundStatus: RefundStatusEnum.PENDING,
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Manager A creates the request
      const refund = await refundRequestService.createRefundRequest(
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          reservationId: reservationId.toString(),
          facilityId: TEST_FACILITY_A_ID,
          customerId: TEST_USERS.customer1.id,
          amount: 1000000,
          reason: RefundReasonEnum.CUSTOMER_CANCEL,
        }
      );

      // Manager A attempts to approve their own request -> Must be rejected (Maker-Checker)
      await expect(
        refundRequestService.approveRefundRequest(
          refund.id,
          TEST_USERS.managerFacilityA.id,
          RoleEnum.FACILITY_MANAGER,
          { note: 'Self approve attempt' }
        )
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof AppError &&
          err.statusCode === 403 &&
          err.messageCode === MESSAGE_CODE.MESSAGE_CODE_514
        );
      });
    });

    it('should reject approval from manager of a different facility (Cross-facility check)', async () => {
      // Created for Facility A
      const refund = await refundRequestService.createRefundRequest(
        TEST_USERS.opsManager.id,
        RoleEnum.BUSINESS_OPS_MANAGER,
        {
          facilityId: TEST_FACILITY_A_ID,
          customerId: TEST_USERS.customer1.id,
          amount: 500000,
          reason: RefundReasonEnum.CUSTOMER_CANCEL,
        }
      );

      // Manager of Facility B attempts to approve request of Facility A
      await expect(
        refundRequestService.approveRefundRequest(
          refund.id,
          TEST_USERS.managerFacilityB.id,
          RoleEnum.FACILITY_MANAGER,
          { note: 'Cross facility approve' }
        )
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof AppError &&
          err.statusCode === 403 &&
          err.messageCode === MESSAGE_CODE.MESSAGE_CODE_122
        );
      });
    });

    it('should reject approval by Facility Manager if amount exceeds opsApprovalThreshold (10,000,000 VND)', async () => {
      const highAmount = 15000000; // 15 million VND > threshold 10 million

      const refund = await refundRequestService.createRefundRequest(
        TEST_USERS.opsManager.id,
        RoleEnum.BUSINESS_OPS_MANAGER,
        {
          facilityId: TEST_FACILITY_A_ID,
          customerId: TEST_USERS.customer1.id,
          amount: highAmount,
          reason: RefundReasonEnum.CUSTOMER_CANCEL,
        }
      );

      // Manager of Facility A tries to approve 15 million VND -> must be rejected
      await expect(
        refundRequestService.approveRefundRequest(
          refund.id,
          TEST_USERS.managerFacilityA.id,
          RoleEnum.FACILITY_MANAGER,
          { note: 'Facility manager approval' }
        )
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof AppError &&
          err.statusCode === 403 &&
          err.messageCode === MESSAGE_CODE.MESSAGE_CODE_121
        );
      });

      // System Admin or Business Ops Manager CAN approve it
      const approved = await refundRequestService.approveRefundRequest(
        refund.id,
        TEST_USERS.systemAdmin.id,
        RoleEnum.SYSTEM_ADMIN,
        { note: 'Admin approval for high value refund' }
      );

      expect(approved.status).toBe(RefundRequestStatusEnum.APPROVED);
      expect(approved.approvedBy?.id).toBe(TEST_USERS.systemAdmin.id);
    });
  });

  describe('Part 4: Confirm Paid & Invariance of PAID State', () => {
    it('should transition to PAID, update linked Reservation, and require referenceCode', async () => {
      const reservationId = new Types.ObjectId();
      await Reservation.collection.insertOne({
        _id: reservationId,
        reservationCode: 'RES-PAID-001',
        facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
        customerId: new Types.ObjectId(TEST_USERS.customer1.id),
        status: ReservationStatusEnum.CANCELLED,
        depositAmount: 2000000,
        forfeitedAmount: 0,
        refundAmount: 2000000,
        refundStatus: RefundStatusEnum.PENDING,
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create by Ops Manager
      const created = await refundRequestService.createRefundRequest(
        TEST_USERS.opsManager.id,
        RoleEnum.BUSINESS_OPS_MANAGER,
        {
          reservationId: reservationId.toString(),
          facilityId: TEST_FACILITY_A_ID,
          customerId: TEST_USERS.customer1.id,
          amount: 2000000,
          reason: RefundReasonEnum.CUSTOMER_CANCEL,
        }
      );

      // Approve by Manager A
      await refundRequestService.approveRefundRequest(
        created.id,
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        { note: 'Approved for payout' }
      );

      // Try confirm-paid without referenceCode -> Must fail
      await expect(
        refundRequestService.confirmPaidRefundRequest(
          created.id,
          TEST_USERS.staffFacilityA.id,
          RoleEnum.FACILITY_STAFF,
          { referenceCode: '' }
        )
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.messageCode === MESSAGE_CODE.MESSAGE_CODE_515
        );
      });

      // Confirm paid with valid referenceCode
      const paid = await refundRequestService.confirmPaidRefundRequest(
        created.id,
        TEST_USERS.staffFacilityA.id,
        RoleEnum.FACILITY_STAFF,
        {
          referenceCode: 'FT24010199999',
          note: 'Bank transfer completed',
        }
      );

      expect(paid.status).toBe(RefundRequestStatusEnum.PAID);
      expect(paid.referenceCode).toBe('FT24010199999');
      expect(paid.paidBy?.id).toBe(TEST_USERS.staffFacilityA.id);

      // Verify linked Reservation refundStatus updated to REFUNDED
      const updatedRes = await Reservation.findById(reservationId);
      expect(updatedRes?.refundStatus).toBe(RefundStatusEnum.REFUNDED);
    });

    it('should NEVER allow a PAID refund request to be modified, rejected, or re-paid (Invariance of PAID)', async () => {
      const refund = await refundRequestService.createRefundRequest(
        TEST_USERS.opsManager.id,
        RoleEnum.BUSINESS_OPS_MANAGER,
        {
          facilityId: TEST_FACILITY_A_ID,
          customerId: TEST_USERS.customer1.id,
          amount: 1000000,
          reason: RefundReasonEnum.CUSTOMER_CANCEL,
        }
      );

      await refundRequestService.approveRefundRequest(
        refund.id,
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        { note: 'Approved' }
      );

      await refundRequestService.confirmPaidRefundRequest(
        refund.id,
        TEST_USERS.staffFacilityA.id,
        RoleEnum.FACILITY_STAFF,
        { referenceCode: 'REF-PAID-IMMUTABLE' }
      );

      // Attempting to re-pay -> Must be rejected with MESSAGE_CODE_516
      await expect(
        refundRequestService.confirmPaidRefundRequest(
          refund.id,
          TEST_USERS.systemAdmin.id,
          RoleEnum.SYSTEM_ADMIN,
          { referenceCode: 'ANOTHER-CODE' }
        )
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.messageCode === MESSAGE_CODE.MESSAGE_CODE_516
        );
      });

      // Attempting to reject -> Must be rejected with MESSAGE_CODE_516
      await expect(
        refundRequestService.rejectRefundRequest(
          refund.id,
          TEST_USERS.systemAdmin.id,
          RoleEnum.SYSTEM_ADMIN,
          { rejectionReason: 'Cannot reject a paid refund' }
        )
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.messageCode === MESSAGE_CODE.MESSAGE_CODE_516
        );
      });
    });
  });

  describe('Part 5: Migration Script Backfill Test', () => {
    it('should backfill legacy reservations into RefundRequest entities idempotently', async () => {
      // 1. Seed legacy reservations
      const resPending = new Types.ObjectId();
      const resRefunded = new Types.ObjectId();

      await Reservation.collection.insertMany([
        {
          _id: resPending,
          reservationCode: 'RES-LEGACY-01',
          facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
          customerId: new Types.ObjectId(TEST_USERS.customer1.id),
          status: ReservationStatusEnum.CANCELLED,
          depositAmount: 1500000,
          refundAmount: 1500000,
          refundStatus: RefundStatusEnum.PENDING,
          cancellationSource: 'customer',
          deleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: resRefunded,
          reservationCode: 'RES-LEGACY-02',
          facilityId: new Types.ObjectId(TEST_FACILITY_A_ID),
          customerId: new Types.ObjectId(TEST_USERS.customer2.id),
          status: ReservationStatusEnum.CANCELLED,
          depositAmount: 2500000,
          refundAmount: 2500000,
          refundStatus: RefundStatusEnum.REFUNDED,
          refundReference: 'LEGACY-REF-999',
          cancellationSource: 'facility',
          deleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // 2. Run migration
      const firstRun = await runRefundRequestMigration();
      expect(firstRun.scanned).toBe(2);
      expect(firstRun.migrated).toBe(2);
      expect(firstRun.skipped).toBe(0);

      // Verify created docs in DB
      const pendingRefundDoc = await RefundRequest.findOne({
        reservationId: resPending,
      });
      expect(pendingRefundDoc).not.toBeNull();
      expect(pendingRefundDoc?.status).toBe(
        RefundRequestStatusEnum.PENDING_APPROVAL
      );
      expect(pendingRefundDoc?.amount).toBe(1500000);

      const refundedRefundDoc = await RefundRequest.findOne({
        reservationId: resRefunded,
      });
      expect(refundedRefundDoc).not.toBeNull();
      expect(refundedRefundDoc?.status).toBe(RefundRequestStatusEnum.PAID);
      expect(refundedRefundDoc?.referenceCode).toBe('LEGACY-REF-999');
      expect(refundedRefundDoc?.amount).toBe(2500000);

      // 3. Test Idempotency: Run migration second time -> All should be skipped
      const secondRun = await runRefundRequestMigration();
      expect(secondRun.scanned).toBe(2);
      expect(secondRun.migrated).toBe(0);
      expect(secondRun.skipped).toBe(2);
    });
  });
});
