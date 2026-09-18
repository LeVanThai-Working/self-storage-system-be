export enum RoleEnum {
  CUSTOMER = 'customer',
  SYSTEM_ADMIN = 'system_admin',
  FACILITY_STAFF = 'facility_staff',
  FACILITY_MANAGER = 'facility_manager',
  BUSINESS_OPS_MANAGER = 'business_ops_manager',
}

export enum UserStatusEnum {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  BANNED = 'banned',
  DELETED = 'deleted',
}

export enum AuthProviderEnum {
  LOCAL = 'local',
  GOOGLE = 'google',
}
