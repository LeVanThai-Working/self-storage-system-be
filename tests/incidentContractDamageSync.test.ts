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
  TEST_FACILITY_B_ID,
} from './helpers/auth.helper.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';
import { UnitType } from '../src/modules/unitType/unitType.model.ts';
import { StorageUnit } from '../src/modules/storageUnit/storageUnit.model.ts';
import { CustomerInventory } from '../src/modules/customerInventory/customerInventory.model.ts';
import '../src/modules/storageRack/storageRack.model.ts';
import '../src/modules/storageRack/rackTier.model.ts';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { RefundRequest } from '../src/modules/refundRequest/refundRequest.model.ts';
import { AuditLog } from '../src/modules/auditLog/auditLog.model.ts';
import { contractService } from '../src/modules/contract/contract.container.ts';
import { incidentService } from '../src/modules/incident/incident.container.ts';
import { FacilityStatusEnum } from '../src/common/enums/facility.enum.ts';
import { UnitTypeCategoryEnum } from '../src/common/enums/unitType.enum.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';
import { BillingUnitEnum } from '../src/common/enums/billing.enum.ts';
import {
  IncidentCategoryEnum,
  IncidentLiablePartyEnum,
  IncidentSeverityEnum,
  IncidentStatusEnum,
} from '../src/common/enums/incident.enum.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../src/common/enums/auditLog.enum.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { AppError } from '../src/common/errors/appError.error.ts';

describe('X5: Incident resolution.damageFee <-> Contract.damageFee & checkOutContract Sync', () => {
  const facilityId = new Types.ObjectId(TEST_FACILITY_A_ID);
  const facilityBId = new Types.ObjectId(TEST_FACILITY_B_ID);
  const customerId = new Types.ObjectId(TEST_USERS.customer1.id);
  const otherCustomerId = new Types.ObjectId(TEST_USERS.customer2.id);
  const staffId = new Types.ObjectId(TEST_USERS.staffFacilityA.id);
  const managerId = new Types.ObjectId(TEST_USERS.managerFacilityA.id);
  const managerBId = new Types.ObjectId(TEST_USERS.managerFacilityB.id);
  const offeringId = new Types.ObjectId('65d000000000000000000025');
  let storageUnitId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedTestUsers();

    await Facility.create([
      {
        _id: facilityId,
        name: 'X5 Facility A',
        code: 'FAC-X5-A',
        address: '123 X5 St',
        city: 'Ho Chi Minh',
        status: FacilityStatusEnum.ACTIVE,
      },
      {
        _id: facilityBId,
        name: 'X5 Facility B',
        code: 'FAC-X5-B',
        address: '456 X5 St',
        city: 'Ha Noi',
        status: FacilityStatusEnum.ACTIVE,
      },
    ]);

    const unitType = await UnitType.create({
      name: `X5 Standard Unit ${Date.now()}`,
      dimensions: { length: 3, width: 3, height: 3 },
      area: 9,
      volume: 27,
      category: UnitTypeCategoryEnum.MEDIUM,
    });

    const unit = await StorageUnit.create({
      unitNumber: 'UNIT-X5-101',
      facilityId,
      unitTypeId: unitType._id,
      floor: 1,
      status: StorageUnitStatusEnum.OCCUPIED,
    });
    storageUnitId = unit._id as Types.ObjectId;
  });

  async function seedContract(
    status: ContractStatusEnum = ContractStatusEnum.ACTIVE,
    depositAmount: number = 1000000
  ) {
    const startDate = new Date(Date.now() - 10 * 86400000);
    const endDate =
      status === ContractStatusEnum.OVERDUE
        ? new Date(Date.now() - 2 * 86400000)
        : new Date(Date.now() + 20 * 86400000);

    return Contract.create({
      contractCode: `CTR-X5-${Math.floor(100000 + Math.random() * 900000)}`,
      source: ContractSourceEnum.WALK_IN,
      customerId,
      facilityId,
      storageUnitId,
      facilityUnitTypeOfferingId: offeringId,
      startDate,
      endDate,
      actualCheckInDate: startDate,
      billingUnit: BillingUnitEnum.MONTH,
      rentalPrice: 2000000,
      totalPeriodicPrice: 2000000,
      depositAmount,
      depositPaidAt: startDate,
      firstPeriodPaidAt: startDate,
      depositStatus: ContractDepositStatusEnum.HELD,
      customerSigned: true,
      customerSignedAt: startDate,
      staffSigned: true,
      staffSignedAt: startDate,
      termsAccepted: true,
      status,
    });
  }

  async function createAndResolveIncident(params: {
    contractId: string;
    reporterId?: string;
    reporterRole?: RoleEnum;
    liableParty: IncidentLiablePartyEnum;
    damageFee: number;
    staffEvidenceImages?: string[];
  }) {
    const reported = await incidentService.reportIncident(
      {
        id: params.reporterId ?? String(customerId),
        role: params.reporterRole ?? RoleEnum.CUSTOMER,
      },
      {
        facilityId: String(facilityId),
        storageUnitId: String(storageUnitId),
        contractId: params.contractId,
        category: IncidentCategoryEnum.STRUCTURAL,
        severity: IncidentSeverityEnum.MEDIUM,
        title: 'Damaged door lock on unit',
        description: 'Door lock bent during loading.',
        images: ['https://res.cloudinary.com/demo/image/upload/report1.jpg'],
        putUnitUnderMaintenance: false,
        requiresRelocation: false,
      }
    );

    await incidentService.assignStaff(
      {
        id: String(managerId),
        role: RoleEnum.FACILITY_MANAGER,
        assignedFacilityId: String(facilityId),
      },
      reported.id,
      { assignedStaffId: String(staffId) }
    );

    const resolved = await incidentService.resolveIncident(
      {
        id: String(staffId),
        role: RoleEnum.FACILITY_STAFF,
        assignedFacilityId: String(facilityId),
      },
      reported.id,
      {
        staffEvidenceImages: params.staffEvidenceImages ?? [
          'https://res.cloudinary.com/demo/image/upload/evidence1.jpg',
        ],
        resolutionNotes: 'Replaced broken lock cylinder.',
        repairCost: 300000,
        liableParty: params.liableParty,
        damageFee: params.damageFee,
      }
    );

    return resolved;
  }

  it('1. accumulates resolution.damageFee & staffEvidenceImages into Contract when CUSTOMER-liable incident is CLOSED, and records CONTRACT AuditLog', async () => {
    const contract = await seedContract(ContractStatusEnum.ACTIVE);
    const resolved = await createAndResolveIncident({
      contractId: String(contract._id),
      liableParty: IncidentLiablePartyEnum.CUSTOMER,
      damageFee: 300000,
      staffEvidenceImages: [
        'https://res.cloudinary.com/demo/image/upload/inc_ev_1.jpg',
      ],
    });

    // While still RESOLVED, Contract.damageFee must remain 0
    const beforeClose = await Contract.findById(contract._id);
    expect(beforeClose?.damageFee).toBe(0);

    // Close incident as Customer
    const closed = await incidentService.closeIncident(
      { id: String(customerId), role: RoleEnum.CUSTOMER },
      resolved.id,
      { notes: 'Accepted damage fee assessment' }
    );
    expect(closed.status).toBe(IncidentStatusEnum.CLOSED);

    const afterClose = await Contract.findById(contract._id);
    expect(afterClose?.damageFee).toBe(300000);
    expect(afterClose?.inspectionPhotos).toEqual([
      'https://res.cloudinary.com/demo/image/upload/inc_ev_1.jpg',
    ]);

    await new Promise((r) => setTimeout(r, 80));
    const contractAudit = await AuditLog.findOne({
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: String(contract._id),
      action: AuditActionEnum.UPDATE,
    }).lean();
    expect(contractAudit).toBeTruthy();
    expect(
      (contractAudit?.metadata as { addedDamageFee?: number })?.addedDamageFee
    ).toBe(300000);
  });

  it('2. accumulates multiple closed CUSTOMER-liable incidents onto the same Contract without duplicating evidence images', async () => {
    const contract = await seedContract(ContractStatusEnum.ACTIVE);

    const inc1 = await createAndResolveIncident({
      contractId: String(contract._id),
      liableParty: IncidentLiablePartyEnum.CUSTOMER,
      damageFee: 200000,
      staffEvidenceImages: [
        'https://res.cloudinary.com/demo/image/upload/ev_a.jpg',
      ],
    });
    const inc2 = await createAndResolveIncident({
      contractId: String(contract._id),
      liableParty: IncidentLiablePartyEnum.CUSTOMER,
      damageFee: 350000,
      staffEvidenceImages: [
        'https://res.cloudinary.com/demo/image/upload/ev_a.jpg',
        'https://res.cloudinary.com/demo/image/upload/ev_b.jpg',
      ],
    });

    await incidentService.closeIncident(
      { id: String(customerId), role: RoleEnum.CUSTOMER },
      inc1.id
    );
    await incidentService.closeIncident(
      {
        id: String(managerId),
        role: RoleEnum.FACILITY_MANAGER,
        assignedFacilityId: String(facilityId),
      },
      inc2.id
    );

    const updatedContract = await Contract.findById(contract._id);
    expect(updatedContract?.damageFee).toBe(550000);
    expect(updatedContract?.inspectionPhotos).toEqual([
      'https://res.cloudinary.com/demo/image/upload/ev_a.jpg',
      'https://res.cloudinary.com/demo/image/upload/ev_b.jpg',
    ]);
  });

  it('3. does NOT add damageFee to Contract when liableParty is FACILITY or FORCE_MAJEURE', async () => {
    const contract = await seedContract(ContractStatusEnum.ACTIVE);
    const resolved = await createAndResolveIncident({
      contractId: String(contract._id),
      liableParty: IncidentLiablePartyEnum.FACILITY,
      damageFee: 500000,
    });

    await incidentService.closeIncident(
      { id: String(customerId), role: RoleEnum.CUSTOMER },
      resolved.id
    );

    const updatedContract = await Contract.findById(contract._id);
    expect(updatedContract?.damageFee).toBe(0);
    expect(updatedContract?.inspectionPhotos).toEqual([]);
  });

  it('4. prevents double-counting when two closeIncident calls race concurrently on the same incident', async () => {
    const contract = await seedContract(ContractStatusEnum.ACTIVE);
    const resolved = await createAndResolveIncident({
      contractId: String(contract._id),
      liableParty: IncidentLiablePartyEnum.CUSTOMER,
      damageFee: 400000,
    });

    const results = await Promise.allSettled([
      incidentService.closeIncident(
        { id: String(customerId), role: RoleEnum.CUSTOMER },
        resolved.id
      ),
      incidentService.closeIncident(
        {
          id: String(managerId),
          role: RoleEnum.FACILITY_MANAGER,
          assignedFacilityId: String(facilityId),
        },
        resolved.id
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0].reason as AppError).messageCode).toBe(
      MESSAGE_CODE.MESSAGE_CODE_701
    );

    const updatedContract = await Contract.findById(contract._id);
    expect(updatedContract?.damageFee).toBe(400000);
  });

  it('5. enforces RBAC and ownership on closeIncident (blocks FACILITY_STAFF, cross-customer, cross-facility FM; allows contract owner when reported by staff)', async () => {
    const contract = await seedContract(ContractStatusEnum.ACTIVE);

    // Staff reports incident on customer's contract
    const resolved = await createAndResolveIncident({
      contractId: String(contract._id),
      reporterId: String(staffId),
      reporterRole: RoleEnum.FACILITY_STAFF,
      liableParty: IncidentLiablePartyEnum.CUSTOMER,
      damageFee: 150000,
    });

    // 5a. FACILITY_STAFF cannot close incident (Maker-Checker violation)
    await expect(
      incidentService.closeIncident(
        {
          id: String(staffId),
          role: RoleEnum.FACILITY_STAFF,
          assignedFacilityId: String(facilityId),
        },
        resolved.id
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
    });

    // 5b. Unrelated customer cannot close incident
    await expect(
      incidentService.closeIncident(
        { id: String(otherCustomerId), role: RoleEnum.CUSTOMER },
        resolved.id
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_103,
    });

    // 5c. Facility Manager of another facility cannot close incident
    await expect(
      incidentService.closeIncident(
        {
          id: String(managerBId),
          role: RoleEnum.FACILITY_MANAGER,
          assignedFacilityId: String(facilityBId),
        },
        resolved.id
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_122,
    });

    // 5d. Contract owner (customer1) CAN close incident even though staff reported it
    const closed = await incidentService.closeIncident(
      { id: String(customerId), role: RoleEnum.CUSTOMER },
      resolved.id
    );
    expect(closed.status).toBe(IncidentStatusEnum.CLOSED);

    const updatedContract = await Contract.findById(contract._id);
    expect(updatedContract?.damageFee).toBe(150000);
  });

  it('6. rejects closeIncident with 400 MESSAGE_CODE_401 if linked Contract is already COMPLETED or TERMINATED and rolls back incident status', async () => {
    const contract = await seedContract(ContractStatusEnum.ACTIVE);
    const resolved = await createAndResolveIncident({
      contractId: String(contract._id),
      liableParty: IncidentLiablePartyEnum.CUSTOMER,
      damageFee: 250000,
    });

    // Force contract to TERMINATED in DB
    await Contract.findByIdAndUpdate(contract._id, {
      status: ContractStatusEnum.TERMINATED,
    });

    await expect(
      incidentService.closeIncident(
        { id: String(customerId), role: RoleEnum.CUSTOMER },
        resolved.id
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_401,
    });

    // Incident must remain RESOLVED (rolled back)
    const incidentAfter = await incidentService.getIncidentById(
      { id: String(customerId), role: RoleEnum.CUSTOMER },
      resolved.id
    );
    expect(incidentAfter.status).toBe(IncidentStatusEnum.RESOLVED);
  });

  it('7. blocks checkOutContract with 400 MESSAGE_CODE_421 while contract has an open (unclosed) Incident', async () => {
    const contract = await seedContract(ContractStatusEnum.ACTIVE);
    const resolved = await createAndResolveIncident({
      contractId: String(contract._id),
      liableParty: IncidentLiablePartyEnum.CUSTOMER,
      damageFee: 300000,
    });

    // Incident is RESOLVED (not yet CLOSED) -> checkOutContract must be blocked with 421
    await expect(
      contractService.checkOutContract(
        String(contract._id),
        String(staffId),
        RoleEnum.FACILITY_STAFF,
        { damageFee: 0, inspectionNotes: 'Attempt checkout with open incident' }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_421,
    });

    // Now close the incident -> checkOutContract succeeds
    await incidentService.closeIncident(
      { id: String(customerId), role: RoleEnum.CUSTOMER },
      resolved.id
    );

    const checkedOut = await contractService.checkOutContract(
      String(contract._id),
      String(staffId),
      RoleEnum.FACILITY_STAFF,
      { damageFee: 0, inspectionNotes: 'Checkout after incident closed' }
    );
    expect(checkedOut.status).toBe(ContractStatusEnum.COMPLETED);
    expect(checkedOut.damageFee).toBe(300000);
    expect(checkedOut.refundAmount).toBe(700000);
  });

  it('8. combines accumulated Incident damageFee + checkout inspection damageFee, merges inspectionPhotos, and creates exact DEPOSIT_SETTLEMENT RefundRequest', async () => {
    const contract = await seedContract(ContractStatusEnum.ACTIVE, 1000000);
    const resolved = await createAndResolveIncident({
      contractId: String(contract._id),
      liableParty: IncidentLiablePartyEnum.CUSTOMER,
      damageFee: 300000,
      staffEvidenceImages: [
        'https://res.cloudinary.com/demo/image/upload/incident_photo.jpg',
      ],
    });

    await incidentService.closeIncident(
      { id: String(customerId), role: RoleEnum.CUSTOMER },
      resolved.id
    );

    // At checkout, staff finds an additional 150,000 VND scratch and attaches checkout photo
    const checkedOut = await contractService.checkOutContract(
      String(contract._id),
      String(staffId),
      RoleEnum.FACILITY_STAFF,
      {
        damageFee: 150000,
        inspectionNotes: 'Additional wall scratch at checkout',
        inspectionPhotos: [
          'https://res.cloudinary.com/demo/image/upload/checkout_photo.jpg',
        ],
      }
    );

    expect(checkedOut.status).toBe(ContractStatusEnum.COMPLETED);
    expect(checkedOut.damageFee).toBe(450000);
    expect(checkedOut.refundAmount).toBe(550000);
    expect(checkedOut.depositStatus).toBe(
      ContractDepositStatusEnum.PARTIALLY_REFUNDED
    );
    expect(checkedOut.inspectionPhotos).toEqual([
      'https://res.cloudinary.com/demo/image/upload/incident_photo.jpg',
      'https://res.cloudinary.com/demo/image/upload/checkout_photo.jpg',
    ]);

    const refundReq = await RefundRequest.findOne({
      contractId: contract._id,
    }).lean();
    expect(refundReq).toBeTruthy();
    expect(refundReq?.amount).toBe(550000);
  });

  it('9. resolveIncident: blocks reopening unit from UNDER_MAINTENANCE to AVAILABLE with MESSAGE_CODE_629 if goods remain inside', async () => {
    await StorageUnit.findByIdAndUpdate(storageUnitId, {
      status: StorageUnitStatusEnum.UNDER_MAINTENANCE,
    });

    const incident = await incidentService.reportIncident(
      { id: String(customerId), role: RoleEnum.CUSTOMER },
      {
        facilityId: String(facilityId),
        storageUnitId: String(storageUnitId),
        category: IncidentCategoryEnum.STRUCTURAL,
        severity: IncidentSeverityEnum.MEDIUM,
        title: 'Leaking ceiling',
        description: 'Water drops near the back wall',
        images: ['https://res.cloudinary.com/demo/image/upload/leak.jpg'],
        putUnitUnderMaintenance: true,
      }
    );

    await incidentService.assignStaff(
      {
        id: String(managerId),
        role: RoleEnum.FACILITY_MANAGER,
        assignedFacilityId: String(facilityId),
      },
      incident.id,
      { assignedStaffId: String(staffId) }
    );

    const inv = await CustomerInventory.create({
      customerId,
      contractId: new Types.ObjectId(),
      facilityId,
      storageUnitId,
      skuId: new Types.ObjectId(),
      quantity: 3,
      lastMovementAt: new Date(),
    });

    await expect(
      incidentService.resolveIncident(
        {
          id: String(staffId),
          role: RoleEnum.FACILITY_STAFF,
          assignedFacilityId: String(facilityId),
        },
        incident.id,
        {
          resolutionNotes: 'Patched ceiling leak',
          repairCost: 0,
          liableParty: IncidentLiablePartyEnum.FACILITY,
          damageFee: 0,
          staffEvidenceImages: [
            'https://res.cloudinary.com/demo/image/upload/fix.jpg',
          ],
        }
      )
    ).rejects.toThrow(
      expect.objectContaining({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_629,
      })
    );

    await CustomerInventory.findByIdAndDelete(inv._id);

    const resolved = await incidentService.resolveIncident(
      {
        id: String(staffId),
        role: RoleEnum.FACILITY_STAFF,
        assignedFacilityId: String(facilityId),
      },
      incident.id,
      {
        resolutionNotes: 'Patched ceiling leak',
        repairCost: 0,
        liableParty: IncidentLiablePartyEnum.FACILITY,
        damageFee: 0,
        staffEvidenceImages: [
          'https://res.cloudinary.com/demo/image/upload/fix.jpg',
        ],
      }
    );

    expect(resolved.status).toBe(IncidentStatusEnum.RESOLVED);
    const updatedUnit = await StorageUnit.findById(storageUnitId).lean();
    expect(updatedUnit?.status).toBe(StorageUnitStatusEnum.AVAILABLE);
  });
});
