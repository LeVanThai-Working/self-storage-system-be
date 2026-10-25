import { RoleEnum } from '../../src/common/enums/user.enum.ts';
import {
  ContractSourceEnum,
  ContractAddendumTypeEnum,
} from '../../src/common/enums/contract.enum.ts';

export interface MatrixRuleContext {
  reservationId: string;
  contractId: string;
  paymentId: string;
  facilityAId: string;
  facilityBId: string;
  customer1Id: string;
  customer2Id: string;
  offeringId: string;
  unitId: string;
}

export interface PermissionMatrixItem {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  getPath: (ctx: MatrixRuleContext) => string;
  allowedRoles: RoleEnum[];
  disallowedRoles: RoleEnum[];
  requiresFacilityMatch?: boolean;
  requiresCustomerOwnership?: boolean;
  getBody?: (ctx: MatrixRuleContext) => unknown;
}

/**
 * Shared Authorization Matrix covering Booking endpoints (PLAN.md Section 14).
 * Ensures newly added endpoints or modified permissions are automatically tested
 * for role gate, facility boundary, and customer ownership.
 */
export const PERMISSION_MATRIX: PermissionMatrixItem[] = [
  // 1. Reservation
  {
    id: 'reservation_create',
    name: 'Create Reservation',
    method: 'POST',
    getPath: () => '/reservations',
    allowedRoles: [RoleEnum.CUSTOMER],
    disallowedRoles: [
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    getBody: (ctx) => ({
      facilityId: ctx.facilityAId,
      facilityUnitTypeOfferingId: ctx.offeringId,
      storageUnitId: ctx.unitId,
      startDate: '2026-11-01',
      checkInDate: '2026-11-01',
      checkInTimeSlot: '09:00 - 11:00',
      rentalDuration: 1,
      billingUnit: 'month',
      basePrice: 1000000,
      depositAmount: 500000,
    }),
  },
  {
    id: 'reservation_get_detail',
    name: 'Get Reservation Detail',
    method: 'GET',
    getPath: (ctx) => `/reservations/${ctx.reservationId}`,
    allowedRoles: [
      RoleEnum.CUSTOMER,
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [],
    requiresFacilityMatch: true,
    requiresCustomerOwnership: true,
  },
  {
    id: 'reservation_confirm',
    name: 'Confirm Reservation',
    method: 'POST',
    getPath: (ctx) => `/reservations/${ctx.reservationId}/confirm`,
    allowedRoles: [
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.CUSTOMER],
    requiresFacilityMatch: true,
    getBody: (ctx) => ({
      assignedStaffId: ctx.customer1Id,
    }),
  },
  {
    id: 'reservation_assign_staff',
    name: 'Assign Staff to Reservation',
    method: 'POST',
    getPath: (ctx) => `/reservations/${ctx.reservationId}/assign-staff`,
    allowedRoles: [
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.CUSTOMER, RoleEnum.FACILITY_STAFF],
    requiresFacilityMatch: true,
    getBody: (ctx) => ({
      staffId: ctx.customer1Id,
    }),
  },
  {
    id: 'reservation_reassign_unit',
    name: 'Reassign Storage Unit',
    method: 'POST',
    getPath: (ctx) => `/reservations/${ctx.reservationId}/reassign-unit`,
    allowedRoles: [
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.CUSTOMER, RoleEnum.FACILITY_STAFF],
    requiresFacilityMatch: true,
    getBody: (ctx) => ({
      newStorageUnitId: ctx.unitId,
      reason: 'Upgrading unit size',
    }),
  },
  {
    id: 'reservation_confirm_refund',
    name: 'Confirm Reservation Refund',
    method: 'POST',
    getPath: (ctx) => `/reservations/${ctx.reservationId}/confirm-refund`,
    allowedRoles: [
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.CUSTOMER, RoleEnum.FACILITY_STAFF],
    requiresFacilityMatch: true,
  },

  // 2. Contract
  {
    id: 'contract_create',
    name: 'Create Contract',
    method: 'POST',
    getPath: () => '/contracts',
    allowedRoles: [
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.CUSTOMER],
    getBody: (ctx) => ({
      source: ContractSourceEnum.RESERVATION,
      reservationId: ctx.reservationId,
      customerId: ctx.customer1Id,
      facilityId: ctx.facilityAId,
      facilityUnitTypeOfferingId: ctx.offeringId,
      storageUnitId: ctx.unitId,
      startDate: '2026-11-01',
      endDate: '2026-12-01',
      rentalDuration: 1,
      billingUnit: 'month',
      rentalPrice: 1000000,
      depositAmount: 500000,
      totalPeriodicPrice: 1000000,
    }),
  },
  {
    id: 'contract_get_detail',
    name: 'Get Contract Detail',
    method: 'GET',
    getPath: (ctx) => `/contracts/${ctx.contractId}`,
    allowedRoles: [
      RoleEnum.CUSTOMER,
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [],
    requiresFacilityMatch: true,
    requiresCustomerOwnership: true,
  },
  {
    id: 'contract_customer_sign',
    name: 'Customer Sign Contract',
    method: 'POST',
    getPath: (ctx) => `/contracts/${ctx.contractId}/customer-sign`,
    allowedRoles: [RoleEnum.CUSTOMER],
    disallowedRoles: [
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    requiresCustomerOwnership: true,
    getBody: () => ({
      agreedToTerms: true,
    }),
  },
  {
    id: 'contract_check_in',
    name: 'Staff Check-In (Facility Sign) Contract',
    method: 'POST',
    getPath: (ctx) => `/contracts/${ctx.contractId}/check-in`,
    allowedRoles: [RoleEnum.FACILITY_MANAGER, RoleEnum.BUSINESS_OPS_MANAGER],
    disallowedRoles: [RoleEnum.CUSTOMER, RoleEnum.FACILITY_STAFF],
    requiresFacilityMatch: true,
  },
  {
    id: 'contract_check_out',
    name: 'Check Out Contract',
    method: 'POST',
    getPath: (ctx) => `/contracts/${ctx.contractId}/check-out`,
    allowedRoles: [
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.CUSTOMER],
    requiresFacilityMatch: true,
  },
  {
    id: 'contract_terminate',
    name: 'Terminate Contract',
    method: 'POST',
    getPath: (ctx) => `/contracts/${ctx.contractId}/terminate`,
    allowedRoles: [
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.CUSTOMER, RoleEnum.FACILITY_STAFF],
    requiresFacilityMatch: true,
    getBody: () => ({
      terminationReason: 'Customer requested early termination due to moving',
    }),
  },

  // 3. Contract Addendum (POST /contracts/:id/addendums)
  {
    id: 'addendum_create_renew',
    name: 'Create Renew Addendum',
    method: 'POST',
    getPath: (ctx) => `/contracts/${ctx.contractId}/addendums`,
    allowedRoles: [
      RoleEnum.CUSTOMER,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.FACILITY_STAFF],
    requiresFacilityMatch: true,
    getBody: () => ({
      type: ContractAddendumTypeEnum.RENEW,
      newEndDate: '2027-01-01',
    }),
  },
  {
    id: 'addendum_create_unit_change',
    name: 'Create Unit Change Addendum',
    method: 'POST',
    getPath: (ctx) => `/contracts/${ctx.contractId}/addendums`,
    allowedRoles: [
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.CUSTOMER, RoleEnum.FACILITY_STAFF],
    requiresFacilityMatch: true,
    getBody: (ctx) => ({
      type: ContractAddendumTypeEnum.UNIT_CHANGE,
      newStorageUnitId: ctx.unitId,
    }),
  },

  // 4. Payment
  {
    id: 'payment_confirm_manual',
    name: 'Confirm Manual Payment',
    method: 'POST',
    getPath: (ctx) => `/payments/${ctx.paymentId}/confirm-manual`,
    allowedRoles: [
      RoleEnum.FACILITY_STAFF,
      RoleEnum.FACILITY_MANAGER,
      RoleEnum.BUSINESS_OPS_MANAGER,
      RoleEnum.SYSTEM_ADMIN,
    ],
    disallowedRoles: [RoleEnum.CUSTOMER],
    requiresFacilityMatch: true,
    getBody: () => ({
      proofImageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      note: 'Payment received in cash at front counter',
    }),
  },
];
