import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { RegisterRoutes } from '../../src/routes/routes.ts';
import { errorMiddleware } from '../../src/middlewares/error.middleware.ts';
import { setupTestDB, teardownTestDB } from '../helpers/db.helper.ts';
import {
  seedTestUsers,
  TEST_USERS,
  TEST_FACILITY_A_ID,
  TEST_FACILITY_B_ID,
  getAuthHeaders,
} from '../helpers/auth.helper.ts';
import {
  PERMISSION_MATRIX,
  type MatrixRuleContext,
} from './permission.matrix.ts';
import { Facility } from '../../src/modules/facility/facility.model.ts';
import { Reservation } from '../../src/modules/reservation/reservation.model.ts';
import { Contract } from '../../src/modules/contract/contract.model.ts';
import { Payment } from '../../src/modules/payment/payment.model.ts';
import { FacilityStatusEnum } from '../../src/common/enums/facility.enum.ts';
import { ReservationStatusEnum } from '../../src/common/enums/reservation.enum.ts';
import { BillingUnitEnum } from '../../src/common/enums/billing.enum.ts';
import {
  ContractStatusEnum,
  ContractSourceEnum,
} from '../../src/common/enums/contract.enum.ts';
import {
  PaymentMethodEnum,
  PaymentPurposeEnum,
  PaymentStatusEnum,
} from '../../src/common/enums/payment.enum.ts';
import { MESSAGE_CODE } from '../../src/common/consts/messageCode.const.ts';

describe('Shared Permission Matrix Suite (T0.5)', () => {
  let app: Express;
  let ruleContext: MatrixRuleContext;

  const resId = new mongoose.Types.ObjectId().toString();
  const conId = new mongoose.Types.ObjectId().toString();
  const payId = new mongoose.Types.ObjectId().toString();
  const offeringId = new mongoose.Types.ObjectId().toString();
  const unitId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await setupTestDB();
    await seedTestUsers();

    app = express();
    app.use(express.json());
    RegisterRoutes(app);
    app.use(errorMiddleware);

    // Seed Facilities
    await Facility.create([
      {
        _id: new mongoose.Types.ObjectId(TEST_FACILITY_A_ID),
        name: 'Facility A - District 1',
        address: '123 Nguyen Hue',
        city: 'Ho Chi Minh',
        status: FacilityStatusEnum.ACTIVE,
        managerId: new mongoose.Types.ObjectId(TEST_USERS.managerFacilityA.id),
      },
      {
        _id: new mongoose.Types.ObjectId(TEST_FACILITY_B_ID),
        name: 'Facility B - District 7',
        address: '456 Nguyen Thi Thap',
        city: 'Ho Chi Minh',
        status: FacilityStatusEnum.ACTIVE,
        managerId: new mongoose.Types.ObjectId(TEST_USERS.managerFacilityB.id),
      },
    ]);

    // Seed Reservation (Facility A, Customer 1)
    await Reservation.create({
      _id: new mongoose.Types.ObjectId(resId),
      reservationCode: 'RES-MATRIX-001',
      customerId: new mongoose.Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new mongoose.Types.ObjectId(TEST_FACILITY_A_ID),
      facilityUnitTypeOfferingId: new mongoose.Types.ObjectId(offeringId),
      storageUnitId: new mongoose.Types.ObjectId(unitId),
      startDate: new Date('2026-11-01'),
      checkInDate: new Date('2026-11-01'),
      checkInTimeSlot: '09:00 - 11:00',
      rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      basePrice: 1000000,
      depositAmount: 500000,
      amenities: [],
      totalAmount: 1500000,
      status: ReservationStatusEnum.PAYMENT_SUCCESSFUL,
    });

    // Seed Contract (Facility A, Customer 1)
    await Contract.create({
      _id: new mongoose.Types.ObjectId(conId),
      contractCode: 'CON-MATRIX-001',
      customerId: new mongoose.Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new mongoose.Types.ObjectId(TEST_FACILITY_A_ID),
      facilityUnitTypeOfferingId: new mongoose.Types.ObjectId(offeringId),
      storageUnitId: new mongoose.Types.ObjectId(unitId),
      source: ContractSourceEnum.RESERVATION,
      reservationId: new mongoose.Types.ObjectId(resId),
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-12-01'),
      // rentalDuration: 1,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 1000000,
      depositAmount: 500000,
      totalPeriodicPrice: 1000000,
      status: ContractStatusEnum.DRAFT,
      customerSigned: false,
      staffSigned: false,
    });

    // Seed Payment (Facility A, Customer 1)
    await Payment.create({
      _id: new mongoose.Types.ObjectId(payId),
      paymentCode: 'PAY-MATRIX-001',
      purpose: PaymentPurposeEnum.RESERVATION_DEPOSIT,
      reservationId: new mongoose.Types.ObjectId(resId),
      customerId: new mongoose.Types.ObjectId(TEST_USERS.customer1.id),
      facilityId: new mongoose.Types.ObjectId(TEST_FACILITY_A_ID),
      amount: 500000,
      paidAmount: 0,
      overpaidAmount: 0,
      method: PaymentMethodEnum.CASH,
      status: PaymentStatusEnum.PENDING,
    });

    ruleContext = {
      reservationId: resId,
      contractId: conId,
      paymentId: payId,
      facilityAId: TEST_FACILITY_A_ID,
      facilityBId: TEST_FACILITY_B_ID,
      customer1Id: TEST_USERS.customer1.id,
      customer2Id: TEST_USERS.customer2.id,
      offeringId,
      unitId,
    };
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  // Data-driven generation of tests from PERMISSION_MATRIX
  for (const item of PERMISSION_MATRIX) {
    describe(`${item.name} (${item.method} ${item.id})`, () => {
      const getTestUrl = () => item.getPath(ruleContext);

      it('should reject unauthenticated request with 401', async () => {
        const req = request(app);
        const url = getTestUrl();

        let res: request.Response;
        if (item.method === 'GET') {
          res = await req.get(url);
        } else if (item.method === 'POST') {
          res = await req.post(url).send(item.getBody?.(ruleContext) || {});
        } else if (item.method === 'PATCH') {
          res = await req.patch(url).send(item.getBody?.(ruleContext) || {});
        } else {
          res = await req.delete(url);
        }

        expect(res.status).toBe(401);
      });

      for (const disallowedRole of item.disallowedRoles) {
        it(`should reject disallowed role ${disallowedRole} with 403`, async () => {
          // Find test user for this disallowed role
          const user = Object.values(TEST_USERS).find(
            (u) => u.role === disallowedRole
          );
          if (!user) return;

          const authHeaders = getAuthHeaders(user);
          const req = request(app);
          const url = getTestUrl();

          let res: request.Response;
          if (item.method === 'GET') {
            res = await req.get(url).set(authHeaders);
          } else if (item.method === 'POST') {
            res = await req
              .post(url)
              .set(authHeaders)
              .send(item.getBody?.(ruleContext) || {});
          } else if (item.method === 'PATCH') {
            res = await req
              .patch(url)
              .set(authHeaders)
              .send(item.getBody?.(ruleContext) || {});
          } else {
            res = await req.delete(url).set(authHeaders);
          }

          // Must be rejected at authorization barrier (403 Role/Facility Denied or 400 validation if role checked in handler)
          expect([400, 403]).toContain(res.status);
          if (res.status === 403) {
            expect([
              MESSAGE_CODE.MESSAGE_CODE_103,
              MESSAGE_CODE.MESSAGE_CODE_121,
              MESSAGE_CODE.MESSAGE_CODE_122,
            ]).toContain(res.body.messageCode);
          }
        });
      }

      if (item.requiresFacilityMatch) {
        it('should reject cross-facility access (Staff/Manager of Facility B calling Facility A resource) with 403', async () => {
          // Facility B staff or manager
          const crossStaff = TEST_USERS.staffFacilityB;
          const crossManager = TEST_USERS.managerFacilityB;

          for (const user of [crossStaff, crossManager]) {
            if (!item.allowedRoles.includes(user.role)) continue;

            const authHeaders = getAuthHeaders(user);
            const req = request(app);
            const url = getTestUrl();

            let res: request.Response;
            if (item.method === 'GET') {
              res = await req.get(url).set(authHeaders);
            } else if (item.method === 'POST') {
              res = await req
                .post(url)
                .set(authHeaders)
                .send(item.getBody?.(ruleContext) || {});
            } else if (item.method === 'PATCH') {
              res = await req
                .patch(url)
                .set(authHeaders)
                .send(item.getBody?.(ruleContext) || {});
            } else {
              res = await req.delete(url).set(authHeaders);
            }

            expect(res.status).toBe(403);
            expect(res.body.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_122);
          }
        });
      }

      if (item.requiresCustomerOwnership) {
        it('should reject cross-customer access (Customer 2 accessing Customer 1 resource) with 403 or 404', async () => {
          const crossCustomer = TEST_USERS.customer2;
          const authHeaders = getAuthHeaders(crossCustomer);
          const req = request(app);
          const url = getTestUrl();

          let res: request.Response;
          if (item.method === 'GET') {
            res = await req.get(url).set(authHeaders);
          } else if (item.method === 'POST') {
            res = await req
              .post(url)
              .set(authHeaders)
              .send(item.getBody?.(ruleContext) || {});
          } else if (item.method === 'PATCH') {
            res = await req
              .patch(url)
              .set(authHeaders)
              .send(item.getBody?.(ruleContext) || {});
          } else {
            res = await req.delete(url).set(authHeaders);
          }

          // Customer 2 cannot access Customer 1's entity
          expect([403, 404]).toContain(res.status);
        });
      }
    });
  }
});
