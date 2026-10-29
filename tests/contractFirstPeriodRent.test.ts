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
import { Contract } from '../src/modules/contract/contract.model.ts';
import { ContractRepository } from '../src/modules/contract/contract.repository.ts';
import { ContractService } from '../src/modules/contract/contract.service.ts';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { ReservationRepository } from '../src/modules/reservation/reservation.repository.ts';
import { ReservationService } from '../src/modules/reservation/reservation.service.ts';
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
import {
  Payment,
  PaymentTransaction,
} from '../src/modules/payment/payment.model.ts';
import { PaymentRepository } from '../src/modules/payment/payment.repository.ts';
import { PaymentService } from '../src/modules/payment/payment.service.ts';
import { SepayService } from '../src/modules/payment/sepay.service.ts';
import { getSepayConfig } from '../src/config/sepay.config.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { RefundRequestRepository } from '../src/modules/refundRequest/refundRequest.repository.ts';
import { RefundRequestService } from '../src/modules/refundRequest/refundRequest.service.ts';
import {
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import {
  PaymentMethodEnum,
  PaymentPurposeEnum,
  PaymentStatusEnum,
} from '../src/common/enums/payment.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { startOfDayVN } from '../src/utils/date.util.ts';

describe('T1.6: First Period Rent Collection & Late Check-in Date Adjustment [OPEN D6]', () => {
  let contractRepo: ContractRepository;
  let contractService: ContractService;
  let paymentRepo: PaymentRepository;
  let paymentService: PaymentService;
  let sepayService: SepayService;
  let reservationRepo: ReservationRepository;
  let reservationService: ReservationService;
  let storageUnitRepo: StorageUnitRepository;
  let amenityOfferingRepo: FacilityAmenityOfferingRepository;
  let unitTypeOfferingRepo: FacilityUnitTypeOfferingRepository;
  let facilityRepo: FacilityRepository;
  let userRepo: UserRepository;
  let refundRequestRepo: RefundRequestRepository;
  let refundRequestService: RefundRequestService;

  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const otherCustomerId = new Types.ObjectId(TEST_USERS.customer2.id);
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
      undefined,
      refundRequestService
    );

    reservationService = new ReservationService(
      reservationRepo,
      facilityRepo,
      unitTypeOfferingRepo,
      amenityOfferingRepo,
      storageUnitRepo,
      userRepo
    );

    sepayService = new SepayService(getSepayConfig());
    paymentRepo = new PaymentRepository(Payment, PaymentTransaction);
    paymentService = new PaymentService(
      paymentRepo,
      sepayService,
      reservationRepo,
      contractRepo,
      reservationService,
      contractService,
      undefined,
      userRepo,
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
      name: 'Facility A - District 1',
      address: '123 Facility A Road',
      city: 'Ho Chi Minh',
      phone: '0901111111',
      email: 'facilityA@ssm.com',
      status: 'active',
      location: { type: 'Point', coordinates: [106.69, 10.78] },
    });

    await StorageUnit.create({
      _id: storageUnitId,
      unitNumber: 'U-101',
      floor: 1,
      zone: 'Zone A',
      status: StorageUnitStatusEnum.RESERVED,
      facilityId,
      unitTypeId: new Types.ObjectId(),
    });

    await FacilityUnitTypeOffering.create({
      _id: offeringId,
      facilityId,
      unitTypeId: new Types.ObjectId(),
      billingUnit: BillingUnitEnum.MONTH,
      pricePerUnit: 1000000,
      depositMultiplier: 1,
      minRentalDays: 30,
      status: 'active',
    });
  });

  async function createDraftContract(customData: Record<string, unknown> = {}) {
    const startDate = new Date('2026-11-01T00:00:00.000Z');
    const endDate = new Date('2026-12-01T00:00:00.000Z'); // 30 days
    return Contract.create({
      contractCode: `CTR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      source: ContractSourceEnum.WALK_IN,
      customerId,
      facilityId,
      storageUnitId,
      facilityUnitTypeOfferingId: offeringId,
      startDate,
      endDate,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 1000000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.DRAFT,
      termsAccepted: true,
      customerSigned: true,
      customerSignedAt: new Date(),
      staffSigned: false,
      depositStatus: ContractDepositStatusEnum.HELD,
      depositPaidAt: new Date(),
      ...customData,
    });
  }

  it('should reject creating RENT_FIRST_PERIOD payment if contract deposit is not paid yet', async () => {
    const contract = await createDraftContract({
      depositPaidAt: null,
      depositStatus: null,
    });

    await expect(
      paymentService.createPayment(String(customerId), RoleEnum.CUSTOMER, {
        purpose: PaymentPurposeEnum.RENT_FIRST_PERIOD,
        contractId: String(contract._id),
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_520,
    });
  });

  it('should reject creating RENT_FIRST_PERIOD payment if caller is another customer', async () => {
    const contract = await createDraftContract();

    await expect(
      paymentService.createPayment(String(otherCustomerId), RoleEnum.CUSTOMER, {
        purpose: PaymentPurposeEnum.RENT_FIRST_PERIOD,
        contractId: String(contract._id),
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
    });
  });

  it('should successfully create RENT_FIRST_PERIOD payment with amount matching totalPeriodicPrice', async () => {
    const contract = await createDraftContract({
      totalPeriodicPrice: 1250000,
    });

    const payment = await paymentService.createPayment(
      String(customerId),
      RoleEnum.CUSTOMER,
      {
        purpose: PaymentPurposeEnum.RENT_FIRST_PERIOD,
        contractId: String(contract._id),
      }
    );

    expect(payment.purpose).toBe(PaymentPurposeEnum.RENT_FIRST_PERIOD);
    expect(payment.amount).toBe(1250000);
    expect(payment.status).toBe(PaymentStatusEnum.PENDING);
    expect(payment.contractId).toBe(String(contract._id));
  });

  it('should reject creating RENT_FIRST_PERIOD payment if first period rent is already paid', async () => {
    const contract = await createDraftContract({
      firstPeriodPaidAt: new Date(),
    });

    await expect(
      paymentService.createPayment(String(customerId), RoleEnum.CUSTOMER, {
        purpose: PaymentPurposeEnum.RENT_FIRST_PERIOD,
        contractId: String(contract._id),
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_521,
    });
  });

  it('should mark contract first period rent paid upon confirmManualPayment', async () => {
    const contract = await createDraftContract({
      totalPeriodicPrice: 1000000,
    });

    const payment = await paymentService.createPayment(
      String(customerId),
      RoleEnum.CUSTOMER,
      {
        purpose: PaymentPurposeEnum.RENT_FIRST_PERIOD,
        contractId: String(contract._id),
      }
    );

    await paymentService.confirmManualPayment(
      payment.id,
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        method: PaymentMethodEnum.CASH,
        proofImageUrl: 'https://cloudinary.com/proofs/rent1.jpg',
        note: 'Customer paid 1st month rent at counter',
      }
    );

    const updatedContract = await contractRepo.findById(String(contract._id));
    expect(updatedContract?.firstPeriodPaidAt).toBeDefined();
    expect(String(updatedContract?.firstPeriodPaymentId)).toBe(payment.id);
  });

  it('should reject check-in if first period rent has not been paid', async () => {
    const contract = await createDraftContract({
      firstPeriodPaidAt: null,
      firstPeriodPaymentId: null,
    });

    await expect(
      contractService.checkInContract(
        String(contract._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          actualCheckInDate: new Date(),
        }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_519,
    });
  });

  it('should check in on time and preserve scheduled startDate and endDate', async () => {
    const originalStartDate = new Date('2026-11-01T00:00:00.000Z');
    const originalEndDate = new Date('2026-12-01T00:00:00.000Z');
    const contract = await createDraftContract({
      startDate: originalStartDate,
      endDate: originalEndDate,
      firstPeriodPaidAt: new Date(),
    });

    // Check in on scheduled date
    const checkInDate = new Date('2026-11-01T09:00:00.000Z');
    const checkedIn = await contractService.checkInContract(
      String(contract._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        termsAccepted: true,
        actualCheckInDate: checkInDate,
      }
    );

    expect(checkedIn.status).toBe(ContractStatusEnum.ACTIVE);
    expect(new Date(checkedIn.startDate).getTime()).toBe(
      originalStartDate.getTime()
    );
    expect(new Date(checkedIn.endDate).getTime()).toBe(
      originalEndDate.getTime()
    );
  });

  it('should check in late and adjust startDate and endDate per [OPEN D6]', async () => {
    const originalStartDate = new Date('2026-11-01T00:00:00.000Z');
    const originalEndDate = new Date('2026-12-01T00:00:00.000Z');
    const durationMs = originalEndDate.getTime() - originalStartDate.getTime();

    const contract = await createDraftContract({
      startDate: originalStartDate,
      endDate: originalEndDate,
      firstPeriodPaidAt: new Date(),
    });

    // Check-in 4 days late: 2026-11-05
    const lateCheckIn = new Date('2026-11-05T14:30:00.000+07:00');
    const expectedStartDate = startOfDayVN(lateCheckIn);
    const expectedEndDate = new Date(expectedStartDate.getTime() + durationMs);

    // 1st attempt: check-in late triggers date adjustment and signature reset (MESSAGE_CODE_425) per T2.7 / OPEN D2
    await expect(
      contractService.checkInContract(
        String(contract._id),
        TEST_USERS.managerFacilityA.id,
        RoleEnum.FACILITY_MANAGER,
        {
          termsAccepted: true,
          actualCheckInDate: lateCheckIn,
        }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_425,
    });

    // Customer re-signs updated draft with new dates
    await contractService.customerSignContract(
      String(contract._id),
      String(customerId),
      RoleEnum.CUSTOMER,
      { termsAccepted: true }
    );

    // 2nd attempt: check-in succeeds now that customer has re-signed
    const checkedIn = await contractService.checkInContract(
      String(contract._id),
      TEST_USERS.managerFacilityA.id,
      RoleEnum.FACILITY_MANAGER,
      {
        termsAccepted: true,
        actualCheckInDate: lateCheckIn,
      }
    );

    expect(checkedIn.status).toBe(ContractStatusEnum.ACTIVE);
    expect(new Date(checkedIn.startDate).getTime()).toBe(
      expectedStartDate.getTime()
    );
    expect(new Date(checkedIn.endDate).getTime()).toBe(
      expectedEndDate.getTime()
    );
  });
});
