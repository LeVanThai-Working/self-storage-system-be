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
  APPROVE = 'approve',
  REJECT = 'reject',
  CANCEL = 'cancel',
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
  RENEW = 'renew',
  TERMINATE = 'terminate',
  ADD_AMENITY = 'add_amenity',
  REMOVE_AMENITY = 'remove_amenity',
  CONFIRM_PAYMENT = 'confirm_payment',
  RECEIVE_PAYMENT = 'receive_payment',
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
  APPROVAL_REQUEST = 'approval_request',
  CONTRACT = 'contract',
  PAYMENT = 'payment',
  NOTIFICATION = 'notification',
}

export enum AuditStatusEnum {
  SUCCESS = 'success',
  FAILURE = 'failure',
}
