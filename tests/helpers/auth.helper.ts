import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
  RoleEnum,
  AuthProviderEnum,
  UserStatusEnum,
} from '../../src/common/enums/user.enum.ts';
import { User } from '../../src/modules/user/user.model.ts';

export interface TestUser {
  id: string;
  role: RoleEnum;
  email: string;
  name: string;
  assignedFacilityId?: string;
}

export const TEST_FACILITY_A_ID = '65b000000000000000000001';
export const TEST_FACILITY_B_ID = '65b000000000000000000002';

export const TEST_USERS: Record<string, TestUser> = {
  customer1: {
    id: '65a000000000000000000001',
    role: RoleEnum.CUSTOMER,
    email: 'customer1@test.com',
    name: 'Customer One',
  },
  customer2: {
    id: '65a000000000000000000002',
    role: RoleEnum.CUSTOMER,
    email: 'customer2@test.com',
    name: 'Customer Two',
  },
  staffFacilityA: {
    id: '65a000000000000000000011',
    role: RoleEnum.FACILITY_STAFF,
    email: 'staffA@test.com',
    name: 'Staff Facility A',
    assignedFacilityId: TEST_FACILITY_A_ID,
  },
  staffFacilityB: {
    id: '65a000000000000000000012',
    role: RoleEnum.FACILITY_STAFF,
    email: 'staffB@test.com',
    name: 'Staff Facility B',
    assignedFacilityId: TEST_FACILITY_B_ID,
  },
  managerFacilityA: {
    id: '65a000000000000000000021',
    role: RoleEnum.FACILITY_MANAGER,
    email: 'managerA@test.com',
    name: 'Manager Facility A',
    assignedFacilityId: TEST_FACILITY_A_ID,
  },
  managerFacilityB: {
    id: '65a000000000000000000022',
    role: RoleEnum.FACILITY_MANAGER,
    email: 'managerB@test.com',
    name: 'Manager Facility B',
    assignedFacilityId: TEST_FACILITY_B_ID,
  },
  opsManager: {
    id: '65a000000000000000000031',
    role: RoleEnum.BUSINESS_OPS_MANAGER,
    email: 'ops@test.com',
    name: 'Business Ops Manager',
  },
  systemAdmin: {
    id: '65a000000000000000000041',
    role: RoleEnum.SYSTEM_ADMIN,
    email: 'admin@test.com',
    name: 'System Admin',
  },
};

/**
 * Generates an Authorization header with a signed JWT token and caller fallback headers.
 */
export function getAuthHeaders(user: TestUser): Record<string, string> {
  const secret =
    process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_key_123456';
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      email: user.email,
    },
    secret,
    { expiresIn: '1h' }
  );

  return {
    Authorization: `Bearer ${token}`,
    'x-user-id': user.id,
    'x-user-role': user.role,
  };
}

/**
 * Seeds test users into the database so repository lookups (e.g. assertFacilityAccess) find them.
 */
export async function seedTestUsers(): Promise<void> {
  for (const user of Object.values(TEST_USERS)) {
    await User.findByIdAndUpdate(
      user.id,
      {
        _id: new mongoose.Types.ObjectId(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: AuthProviderEnum.LOCAL,
        status: UserStatusEnum.ACTIVE,
        isEmailVerified: true,
        assignedFacilityId: user.assignedFacilityId
          ? new mongoose.Types.ObjectId(user.assignedFacilityId)
          : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}
