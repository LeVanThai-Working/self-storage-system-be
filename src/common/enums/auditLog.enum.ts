export enum AuditActionEnum {
  // Auth
  REGISTER = 'register',
  LOGIN = 'login',
  LOGIN_GOOGLE = 'login_google',
  LOGOUT = 'logout',
  SEND_OTP = 'send_otp',
  FORGOT_PASSWORD = 'forgot_password',
  RESET_PASSWORD = 'reset_password',
  CHANGE_PASSWORD = 'change_password',

  // Generic CRUD
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',

  // Domain specific
  ASSIGN_MANAGER = 'assign_manager',
  TOGGLE_MAINTENANCE = 'toggle_maintenance',
}

export enum AuditResourceEnum {
  AUTH = 'auth',
  USER = 'user',
  PROFILE = 'profile',
  FACILITY = 'facility',
  UNIT_TYPE = 'unit_type',
  AMENITY = 'amenity',
  FACILITY_UNIT_TYPE_OFFERING = 'facility_unit_type_offering',
  FACILITY_AMENITY_OFFERING = 'facility_amenity_offering',
  STORAGE_UNIT = 'storage_unit',
  RESERVATION = 'reservation',
}

export enum AuditStatusEnum {
  SUCCESS = 'success',
  FAILURE = 'failure',
}
