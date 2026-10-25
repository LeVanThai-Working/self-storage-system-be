import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
} from './helpers/db.helper.ts';
import {
  seedTestUsers,
  TEST_USERS,
  TEST_FACILITY_A_ID,
} from './helpers/auth.helper.ts';
import {
  calculateOverdueDaysVN,
  calculateContractOverdueFee,
} from '../src/utils/contractFee.util.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { StorageUnitRepository } from '../src/modules/storageUnit/storageUnit.repository.ts';
import { FacilityAmenityOffering } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.model.ts';
import { FacilityAmenityOfferingRepository } from '../src/modules/facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import { FacilityUnitTypeOffering } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.model.ts';
import { FacilityUnitTypeOfferingRepository } from '../src/modules/facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { FacilityRepository } from '../src/modules/facility/facility.repository.ts';
import { UserRepository } from '../src/modules/user/user.repository.ts';
import { User } from '../src/modules/user/user.model.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import {
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { RefundReasonEnum } from '../src/common/enums/refundRequest.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';

describe('T1.7: Overdue Fee Calculation Pure Function & Integration [OPEN D8]', () => {
  describe('Pure Function: calculateOverdueDaysVN & calculateContractOverdueFee', () => {
    const baseRentalPriceMonth = 1_000_000;

    it('Case 1: Check-out before endDate -> overdueDays = 0, overdueFee = 0', () => {
      const result = calculateContractOverdueFee({
        endDate: '2026-10-20',
        actualCheckOutDate: '2026-10-18T10:00:00.000+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(false);
      expect(result.overdueDays).toBe(0);
      expect(result.overdueFee).toBe(0);
    });

    it('Case 2: Check-out on same day as endDate (morning 09:00 VN) -> overdueDays = 0 (endDate inclusive)', () => {
      const result = calculateContractOverdueFee({
        endDate: '2026-10-20',
        actualCheckOutDate: '2026-10-20T09:00:00.000+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(false);
      expect(result.overdueDays).toBe(0);
      expect(result.overdueFee).toBe(0);
    });

    it('Case 3: Check-out on same day as endDate (late night 23:59:59.999 VN) -> overdueDays = 0 (endDate inclusive)', () => {
      const result = calculateContractOverdueFee({
        endDate: '2026-10-20',
        actualCheckOutDate: '2026-10-20T23:59:59.999+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(false);
      expect(result.overdueDays).toBe(0);
      expect(result.overdueFee).toBe(0);
    });

    it('Case 4: Check-out exactly at midnight on endDate + 1 (00:00:00 VN) -> overdueDays = 1', () => {
      const overdueDays = calculateOverdueDaysVN(
        '2026-10-20',
        '2026-10-21T00:00:00.000+07:00'
      );
      expect(overdueDays).toBe(1);

      const result = calculateContractOverdueFee({
        endDate: '2026-10-20',
        actualCheckOutDate: '2026-10-21T00:00:00.000+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(true);
      expect(result.overdueDays).toBe(1);
      // dailyRate = Math.round(1_000_000 / 30) = 33_333
      // penaltyDailyRate = Math.round(33_333 * 1.5) = 50_000
      expect(result.dailyRate).toBe(33_333);
      expect(result.penaltyDailyRate).toBe(50_000);
      expect(result.overdueFee).toBe(50_000);
    });

    it('Case 5: Check-out 1 hour past midnight on endDate + 1 (01:00:00 VN) -> overdueDays = 1', () => {
      const overdueDays = calculateOverdueDaysVN(
        '2026-10-20',
        '2026-10-21T01:00:00.000+07:00'
      );
      expect(overdueDays).toBe(1);

      const result = calculateContractOverdueFee({
        endDate: '2026-10-20',
        actualCheckOutDate: '2026-10-21T01:00:00.000+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(true);
      expect(result.overdueDays).toBe(1);
      expect(result.overdueFee).toBe(50_000);
    });

    it('Case 6: Check-out at end of first overdue day (23:59:59 VN) -> overdueDays = 1', () => {
      const overdueDays = calculateOverdueDaysVN(
        '2026-10-20',
        '2026-10-21T23:59:59.000+07:00'
      );
      expect(overdueDays).toBe(1);

      const result = calculateContractOverdueFee({
        endDate: '2026-10-20',
        actualCheckOutDate: '2026-10-21T23:59:59.000+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(true);
      expect(result.overdueDays).toBe(1);
      expect(result.overdueFee).toBe(50_000);
    });

    it('Case 7: Check-out ticking into second overdue day (00:00:00 VN on endDate + 2) -> overdueDays = 2', () => {
      const overdueDays = calculateOverdueDaysVN(
        '2026-10-20',
        '2026-10-22T00:00:00.000+07:00'
      );
      expect(overdueDays).toBe(2);

      const result = calculateContractOverdueFee({
        endDate: '2026-10-20',
        actualCheckOutDate: '2026-10-22T00:00:00.000+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(true);
      expect(result.overdueDays).toBe(2);
      expect(result.overdueFee).toBe(100_000);
    });

    it('Case 8: Month boundary 28-day month (Feb 2026) -> endDate 28/02, checkout 01/03 -> overdueDays = 1', () => {
      const overdueDays = calculateOverdueDaysVN(
        '2026-02-28',
        '2026-03-01T00:00:00.000+07:00'
      );
      expect(overdueDays).toBe(1);

      const result = calculateContractOverdueFee({
        endDate: '2026-02-28',
        actualCheckOutDate: '2026-03-01T15:00:00.000+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(true);
      expect(result.overdueDays).toBe(1);
      expect(result.overdueFee).toBe(50_000);
    });

    it('Case 9: Month boundary 31-day month (Jan 2026) -> endDate 31/01, checkout 01/02 -> overdueDays = 1', () => {
      const overdueDays = calculateOverdueDaysVN(
        '2026-01-31',
        '2026-02-01T00:00:00.000+07:00'
      );
      expect(overdueDays).toBe(1);

      const result = calculateContractOverdueFee({
        endDate: '2026-01-31',
        actualCheckOutDate: '2026-02-01T10:00:00.000+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(true);
      expect(result.overdueDays).toBe(1);
      expect(result.overdueFee).toBe(50_000);
    });

    it('Case 10: Leap year boundary 29-day month (Feb 2028) -> endDate 29/02, checkout 01/03 -> overdueDays = 1', () => {
      const overdueDays = calculateOverdueDaysVN(
        '2028-02-29',
        '2028-03-01T00:00:00.000+07:00'
      );
      expect(overdueDays).toBe(1);

      const result = calculateContractOverdueFee({
        endDate: '2028-02-29',
        actualCheckOutDate: '2028-03-01T08:00:00.000+07:00',
        rentalPrice: baseRentalPriceMonth,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(true);
      expect(result.overdueDays).toBe(1);
      expect(result.overdueFee).toBe(50_000);
    });

    it('Case 11: BillingUnitEnum.DAY -> dailyRate = rentalPrice, penaltyDailyRate = 1.5 * rentalPrice', () => {
      const result = calculateContractOverdueFee({
        endDate: '2026-05-10',
        actualCheckOutDate: '2026-05-13T10:00:00.000+07:00', // 3 days overdue
        rentalPrice: 60_000,
        billingUnit: BillingUnitEnum.DAY,
      });

      expect(result.isOverdue).toBe(true);
      expect(result.overdueDays).toBe(3);
      expect(result.dailyRate).toBe(60_000);
      expect(result.penaltyDailyRate).toBe(90_000);
      expect(result.overdueFee).toBe(270_000); // 3 * 90_000
    });

    it('Case 12: Decimal rounding for integer VND -> Math.round on dailyRate & penalty', () => {
      // 1,100,000 / 30 = 36,666.666... -> Math.round = 36,667
      // 36,667 * 1.5 = 55,000.5 -> Math.round = 55,001
      const result = calculateContractOverdueFee({
        endDate: '2026-06-15',
        actualCheckOutDate: '2026-06-16T12:00:00.000+07:00',
        rentalPrice: 1_100_000,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.dailyRate).toBe(36_667);
      expect(result.penaltyDailyRate).toBe(55_001);
      expect(result.overdueFee).toBe(55_001);
    });

    it('Case 13: Zero rentalPrice -> overdueFee = 0', () => {
      const result = calculateContractOverdueFee({
        endDate: '2026-01-01',
        actualCheckOutDate: '2026-01-05',
        rentalPrice: 0,
        billingUnit: BillingUnitEnum.MONTH,
      });

      expect(result.isOverdue).toBe(false);
      expect(result.overdueFee).toBe(0);
    });
  });

  describe('Integration with ContractService.checkOutContract', () => {
    let contractRepo: ContractRepository;
    let contractService: ContractService;
    let refundRequestRepo: RefundRequestRepository;
    let refundRequestService: RefundRequestService;
    let reservationRepo: ReservationRepository;
    let storageUnitRepo: StorageUnitRepository;
    let amenityOfferingRepo: FacilityAmenityOfferingRepository;
    let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
    let facilityRepo: FacilityRepository;
    let userRepo: UserRepository;

    const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
    const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
    const storageUnitId = new Types.ObjectId('65c000000000000000000001');
    const offeringId = new Types.ObjectId('65d000000000000000000001');

    beforeAll(async () => {
      await setupTestDB();

      contractRepo = new ContractRepository(Contract);
      reservationRepo = new ReservationRepository(Reservation);
      storageUnitRepo = new StorageUnitRepository(StorageUnit);
      amenityOfferingRepo = new FacilityAmenityOfferingRepository(
        FacilityAmenityOffering
      );
      unitTypeOfferingRepo = new FacilityUnitTypeOfferingRepository(
        FacilityUnitTypeOffering
      );
      facilityRepo = new FacilityRepository(Facility);
      userRepo = new UserRepository(User);

      refundRequestRepo = new RefundRequestRepository(RefundRequest);
      refundRequestService = new RefundRequestService(
        refundRequestRepo,
        userRepo,
        reservationRepo,
        contractRepo
      );

      contractService = new ContractService(
        contractRepo,
        reservationRepo,
        storageUnitRepo,
        amenityOfferingRepo,
        unitTypeOfferingRepo,
        facilityRepo,
        userRepo,
        undefined, // auditLogService
        refundRequestService
      );
    });

    afterAll(async () => {
      await teardownTestDB();
    });

    beforeEach(async () => {
      await clearTestDB();
      await seedTestUsers();

      await Facility.create({
        _id: facilityId,
        name: 'Facility Alpha',
        address: '123 Test Street',
        city: 'Ho Chi Minh',
        status: 'active',
      });

      const unitTypeId = new Types.ObjectId();
      await StorageUnit.create({
        _id: storageUnitId,
        facilityId,
        unitTypeId,
        unitNumber: 'A101',
        floor: 1,
        status: StorageUnitStatusEnum.RENTED,
      });
    });

    it('Case 14: Overdue check-out (2 days overdue) -> assesses overdueFee, deducts from deposit, creates partial RefundRequest', async () => {
      // Contract: 1,500,000 / month, deposit 1,500,000, endDate = 2026-02-01
      const contract = await Contract.create({
        contractCode: `CTR-OVERDUE-1`,
        source: ContractSourceEnum.WALK_IN,
        customerId,
        facilityId,
        storageUnitId,
        facilityUnitTypeOfferingId: offeringId,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1_500_000,
        depositAmount: 1_500_000,
        depositPaidAt: new Date('2026-01-01'),
        totalPeriodicPrice: 1_500_000,
        status: ContractStatusEnum.OVERDUE,
        depositStatus: ContractDepositStatusEnum.HELD,
        termsAccepted: true,
        customerSigned: true,
        staffSigned: true,
      });

      // Checkout at 2026-02-03 (2 days overdue: 02/02 & 03/02)
      // dailyRate = 1,500,000 / 30 = 50,000
      // penaltyDailyRate = 50,000 * 1.5 = 75,000
      // overdueFee = 2 * 75,000 = 150,000
      // damageFee = 50,000
      // totalDeductions = 200,000
      // refundAmount = 1,500,000 - 200,000 = 1,300,000
      const res = await contractService.checkOutContract(
        String(contract._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          damageFee: 50_000,
          inspectionNotes: 'Tre han 2 ngay va hu hai nhe',
          actualCheckOutDate: '2026-02-03T10:00:00.000+07:00',
        }
      );

      expect(res.status).toBe(ContractStatusEnum.COMPLETED);
      expect(res.overdueFee).toBe(150_000);
      expect(res.damageFee).toBe(50_000);
      expect(res.refundAmount).toBe(1_300_000);
      expect(res.additionalPaymentRequired).toBe(0);
      expect(res.depositStatus).toBe(
        ContractDepositStatusEnum.PARTIALLY_REFUNDED
      );

      // Verify RefundRequest created with reason DEPOSIT_SETTLEMENT
      const refunds = await RefundRequest.find({ contractId: contract._id });
      expect(refunds).toHaveLength(1);
      expect(refunds[0].amount).toBe(1_300_000);
      expect(refunds[0].reason).toBe(RefundReasonEnum.DEPOSIT_SETTLEMENT);
    });

    it('Case 15: Overdue check-out where deductions exceed deposit -> APPLIED depositStatus, additionalPaymentRequired > 0, no RefundRequest', async () => {
      // Contract: 1,500,000 / month, deposit 500,000, endDate = 2026-02-01
      const contract = await Contract.create({
        contractCode: `CTR-OVERDUE-2`,
        source: ContractSourceEnum.WALK_IN,
        customerId,
        facilityId,
        storageUnitId,
        facilityUnitTypeOfferingId: offeringId,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        billingUnit: BillingUnitEnum.MONTH,
        rentalPrice: 1_500_000,
        depositAmount: 500_000,
        depositPaidAt: new Date('2026-01-01'),
        totalPeriodicPrice: 1_500_000,
        status: ContractStatusEnum.OVERDUE,
        depositStatus: ContractDepositStatusEnum.HELD,
        termsAccepted: true,
        customerSigned: true,
        staffSigned: true,
      });

      // Checkout at 2026-02-11 (10 days overdue)
      // dailyRate = 50,000, penaltyDailyRate = 75,000
      // overdueFee = 10 * 75,000 = 750,000
      // damageFee = 200,000
      // totalDeductions = 950,000
      // depositAmount = 500,000
      // refundAmount = 0
      // additionalPaymentRequired = 950,000 - 500,000 = 450,000
      const res = await contractService.checkOutContract(
        String(contract._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          damageFee: 200_000,
          inspectionNotes: 'Tre han 10 ngay va hu hong',
          actualCheckOutDate: '2026-02-11T14:00:00.000+07:00',
        }
      );

      expect(res.status).toBe(ContractStatusEnum.COMPLETED);
      expect(res.overdueFee).toBe(750_000);
      expect(res.damageFee).toBe(200_000);
      expect(res.refundAmount).toBe(0);
      expect(res.additionalPaymentRequired).toBe(450_000);
      expect(res.depositStatus).toBe(ContractDepositStatusEnum.APPLIED);

      const refunds = await RefundRequest.find({ contractId: contract._id });
      expect(refunds).toHaveLength(0);
    });
  });
});
