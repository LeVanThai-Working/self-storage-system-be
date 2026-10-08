export const MESSAGE_CODE = {
  // ==========================================
  // SUCCESS (001 - 004)
  // ==========================================
  // Operation Successful
  MESSAGE_CODE_001: 'MESSAGE_CODE_001',
  // {0} Created Successfully
  MESSAGE_CODE_002: 'MESSAGE_CODE_002',
  // {0} Updated Successfully
  MESSAGE_CODE_003: 'MESSAGE_CODE_003',
  // {0} Deleted Successfully
  MESSAGE_CODE_004: 'MESSAGE_CODE_004',

  // ==========================================
  // GENERAL ERRORS (101 - 106)
  // ==========================================
  // Invalid Request
  MESSAGE_CODE_101: 'MESSAGE_CODE_101',
  // Unauthorized Access
  MESSAGE_CODE_102: 'MESSAGE_CODE_102',
  // Access Denied
  MESSAGE_CODE_103: 'MESSAGE_CODE_103',
  // {0} Not Found
  MESSAGE_CODE_104: 'MESSAGE_CODE_104',
  // {0} Already Exists
  MESSAGE_CODE_105: 'MESSAGE_CODE_105',
  // Internal Server Error
  MESSAGE_CODE_106: 'MESSAGE_CODE_106',

  // ==========================================
  // AUTH & CREDENTIALS (107 - 109)
  // ==========================================
  // Invalid Email Or Password
  MESSAGE_CODE_107: 'MESSAGE_CODE_107',
  // {0} Email Is Not Verified
  MESSAGE_CODE_108: 'MESSAGE_CODE_108',
  // Invalid Or Expired OTP
  MESSAGE_CODE_109: 'MESSAGE_CODE_109',

  // ==========================================
  // STATUS & ENTITY STATE (110 - 113)
  // ==========================================
  // {0} Is Inactive (e.g. Facility Is Inactive, Unit Type Is Inactive, Manager Account Is Inactive)
  MESSAGE_CODE_110: 'MESSAGE_CODE_110',
  // {0} Is Banned Or Locked
  MESSAGE_CODE_111: 'MESSAGE_CODE_111',
  // {0} Has Been Deleted
  MESSAGE_CODE_112: 'MESSAGE_CODE_112',

  // ==========================================
  // ROLE & PERMISSIONS (120 - 122)
  // ==========================================
  // {0} Role Is Invalid (e.g. User Role Is Invalid)
  MESSAGE_CODE_120: 'MESSAGE_CODE_120',
  // User Must Have Role {0} (e.g. User Must Have Role facility_manager)
  MESSAGE_CODE_121: 'MESSAGE_CODE_121',
  // You Do Not Have Permission To Manage {0}
  MESSAGE_CODE_122: 'MESSAGE_CODE_122',

  // ==========================================
  // VALIDATION & TOKEN (200 - 201)
  // ==========================================
  // {0} Is Required
  MESSAGE_CODE_200: 'MESSAGE_CODE_200',
  // Invalid Token
  MESSAGE_CODE_201: 'MESSAGE_CODE_201',

  // ==========================================
  // RESERVATION (300 - 308)
  // ==========================================
  // Reservation Not Found
  MESSAGE_CODE_300: 'MESSAGE_CODE_300',
  // Invalid Reservation Status Transition
  MESSAGE_CODE_301: 'MESSAGE_CODE_301',
  // Reservation Cannot Be Updated After Being Received
  MESSAGE_CODE_302: 'MESSAGE_CODE_302',
  // Reservation Cannot Be Cancelled
  MESSAGE_CODE_303: 'MESSAGE_CODE_303',
  // Reservation Has Expired
  MESSAGE_CODE_304: 'MESSAGE_CODE_304',
  // Storage Unit Is Not Available For Reservation
  MESSAGE_CODE_305: 'MESSAGE_CODE_305',
  // Storage Unit Does Not Match Reserved Offering
  MESSAGE_CODE_306: 'MESSAGE_CODE_306',
  // Insufficient Amenity Quantity For {0}
  MESSAGE_CODE_307: 'MESSAGE_CODE_307',
  // Reservation Holding Time Exceeded
  MESSAGE_CODE_308: 'MESSAGE_CODE_308',
} as const;

export const MESSAGE_DICTIONARY: Record<string, string> = {
  // Operation Successful
  MESSAGE_CODE_001: 'Operation Successful',
  MESSAGE_CODE_002: '{0} Created Successfully',
  MESSAGE_CODE_003: '{0} Updated Successfully',
  MESSAGE_CODE_004: '{0} Deleted Successfully',

  // General Errors
  MESSAGE_CODE_101: 'Invalid Request',
  MESSAGE_CODE_102: 'Unauthorized Access',
  MESSAGE_CODE_103: 'Access Denied',
  MESSAGE_CODE_104: '{0} Not Found',
  MESSAGE_CODE_105: '{0} Already Exists',
  MESSAGE_CODE_106: 'Internal Server Error',

  // Auth & Credentials
  MESSAGE_CODE_107: 'Invalid Email Or Password',
  MESSAGE_CODE_108: '{0} Email Is Not Verified',
  MESSAGE_CODE_109: 'Invalid Or Expired OTP',

  // Status
  MESSAGE_CODE_110: '{0} Is Inactive',
  MESSAGE_CODE_111: '{0} Is Banned Or Locked',
  MESSAGE_CODE_112: '{0} Has Been Deleted',

  // Role & Permissions
  MESSAGE_CODE_120: '{0} Role Is Invalid',
  MESSAGE_CODE_121: 'User Must Have Role {0}',
  MESSAGE_CODE_122: 'You Do Not Have Permission To Manage {0}',

  // Validation & Token
  MESSAGE_CODE_200: '{0} Is Required',
  MESSAGE_CODE_201: 'Invalid Token',

  // Reservation
  MESSAGE_CODE_300: 'Reservation Not Found',
  MESSAGE_CODE_301: 'Invalid Reservation Status Transition',
  MESSAGE_CODE_302: 'Reservation Cannot Be Updated After Being Received',
  MESSAGE_CODE_303: 'Reservation Cannot Be Cancelled',
  MESSAGE_CODE_304: 'Reservation Has Expired',
  MESSAGE_CODE_305: 'Storage Unit Is Not Available For Reservation',
  MESSAGE_CODE_306: 'Storage Unit Does Not Match Reserved Offering',
  MESSAGE_CODE_307: 'Insufficient Amenity Quantity For {0}',
  MESSAGE_CODE_308: 'Reservation Holding Time Exceeded',
};
