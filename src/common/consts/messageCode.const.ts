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
  // Storage Unit Has Just Been Booked By Another Customer
  MESSAGE_CODE_309: 'MESSAGE_CODE_309',
  // Time Slot Has Reached Maximum Capacity
  MESSAGE_CODE_310: 'MESSAGE_CODE_310',
  // Invalid Or Inactive Check-in Time Slot
  MESSAGE_CODE_311: 'MESSAGE_CODE_311',
  // Facility Cannot Cancel A Confirmed Reservation
  MESSAGE_CODE_312: 'MESSAGE_CODE_312',
  // Check-in Date Is Too Far In The Future
  MESSAGE_CODE_313: 'MESSAGE_CODE_313',
  // Too Many Pending Reservations
  MESSAGE_CODE_314: 'MESSAGE_CODE_314',
  // Check-in Time Slot Has Already Passed
  MESSAGE_CODE_315: 'MESSAGE_CODE_315',
  // Replacement Unit Tier Is Lower Than Reserved
  MESSAGE_CODE_316: 'MESSAGE_CODE_316',
  // Refund Is Not Pending
  MESSAGE_CODE_317: 'MESSAGE_CODE_317',
  // Reservation Has An Active Linked Contract
  MESSAGE_CODE_318: 'MESSAGE_CODE_318',
  // Check-in Date Has Already Passed
  MESSAGE_CODE_319: 'MESSAGE_CODE_319',

  // ==========================================
  // CONTRACT (400 - 408)
  // ==========================================
  // Contract Not Found
  MESSAGE_CODE_400: 'MESSAGE_CODE_400',
  // Invalid Contract Status Transition
  MESSAGE_CODE_401: 'MESSAGE_CODE_401',
  // Storage Unit Is Not Available For Contract
  MESSAGE_CODE_402: 'MESSAGE_CODE_402',
  // Contract Has Already Been Checked In
  MESSAGE_CODE_403: 'MESSAGE_CODE_403',
  // Contract Extension Date Must Be Greater Than Current End Date
  MESSAGE_CODE_404: 'MESSAGE_CODE_404',
  // Cannot Delete Entity With Active Contracts
  MESSAGE_CODE_405: 'MESSAGE_CODE_405',
  // Reservation Must Be Confirmed Or Completed To Create Contract
  MESSAGE_CODE_406: 'MESSAGE_CODE_406',
  // Storage Unit Facility Mismatch
  MESSAGE_CODE_407: 'MESSAGE_CODE_407',
  // Insufficient Amenity Quantity For Contract
  MESSAGE_CODE_408: 'MESSAGE_CODE_408',
  // Contract Addendum Not Found
  MESSAGE_CODE_409: 'MESSAGE_CODE_409',
  // Invalid Contract Addendum Status Transition
  MESSAGE_CODE_410: 'MESSAGE_CODE_410',
  // Contract Terms Must Be Accepted
  MESSAGE_CODE_411: 'MESSAGE_CODE_411',
  // Party Has Already Signed
  MESSAGE_CODE_412: 'MESSAGE_CODE_412',
  // Insufficient Contracted Amenity Quantity To Remove
  MESSAGE_CODE_413: 'MESSAGE_CODE_413',

  // ==========================================
  // PAYMENT (500 - 508)
  // ==========================================
  // Payment Not Found
  MESSAGE_CODE_500: 'MESSAGE_CODE_500',
  // Invalid Payment Status Transition
  MESSAGE_CODE_501: 'MESSAGE_CODE_501',
  // Payment Has Expired
  MESSAGE_CODE_502: 'MESSAGE_CODE_502',
  // Invalid SePay Webhook Authentication
  MESSAGE_CODE_503: 'MESSAGE_CODE_503',
  // Payment Amount Insufficient
  MESSAGE_CODE_504: 'MESSAGE_CODE_504',
  // Order Is Not Awaiting Payment
  MESSAGE_CODE_505: 'MESSAGE_CODE_505',
  // Contract Deposit Not Paid
  MESSAGE_CODE_506: 'MESSAGE_CODE_506',
  // Payment Already Settled
  MESSAGE_CODE_507: 'MESSAGE_CODE_507',
  // Payment Account Mismatch
  MESSAGE_CODE_508: 'MESSAGE_CODE_508',

  // ==========================================
  // STORAGE RACK & TIER (600 - 603)
  // ==========================================
  // Storage Rack Not Found
  MESSAGE_CODE_600: 'MESSAGE_CODE_600',
  // Rack Tier Not Found
  MESSAGE_CODE_601: 'MESSAGE_CODE_601',
  // Invalid Storage Rack Status Transition
  MESSAGE_CODE_602: 'MESSAGE_CODE_602',
  // Storage Rack Code Already Exists
  MESSAGE_CODE_603: 'MESSAGE_CODE_603',
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
  MESSAGE_CODE_309: 'Storage Unit Has Just Been Booked By Another Customer',
  MESSAGE_CODE_310: 'Time Slot Has Reached Maximum Capacity',
  MESSAGE_CODE_311: 'Invalid Or Inactive Check-in Time Slot',
  MESSAGE_CODE_312: 'Facility Cannot Cancel A Confirmed Reservation',
  MESSAGE_CODE_313: 'Check-in Date Is Too Far In The Future',
  MESSAGE_CODE_314: 'Too Many Pending Reservations',
  MESSAGE_CODE_315: 'Check-in Time Slot Has Already Passed',
  MESSAGE_CODE_316: 'Replacement Unit Tier Is Lower Than Reserved',
  MESSAGE_CODE_317: 'Refund Is Not Pending',
  MESSAGE_CODE_318: 'Reservation Has An Active Linked Contract',
  MESSAGE_CODE_319:
    'Check-in Date Has Already Passed, Cannot Confirm Reservation',

  // Contract
  MESSAGE_CODE_400: 'Contract Not Found',
  MESSAGE_CODE_401: 'Invalid Contract Status Transition',
  MESSAGE_CODE_402: 'Storage Unit Is Not Available For Contract',
  MESSAGE_CODE_403: 'Contract Has Already Been Checked In',
  MESSAGE_CODE_404:
    'Contract Extension Date Must Be Greater Than Current End Date',
  MESSAGE_CODE_405: 'Cannot Delete Entity With Active Contracts',
  MESSAGE_CODE_406:
    'Reservation Must Be Confirmed Or Completed To Create Contract',
  MESSAGE_CODE_407: 'Storage Unit Facility Mismatch',
  MESSAGE_CODE_408: 'Insufficient Amenity Quantity For Contract',
  MESSAGE_CODE_409: 'Contract Addendum Not Found',
  MESSAGE_CODE_410: 'Invalid Contract Addendum Status Transition',
  MESSAGE_CODE_411: 'Contract Terms Must Be Accepted',
  MESSAGE_CODE_412: 'Party Has Already Signed',
  MESSAGE_CODE_413: 'Insufficient Contracted Amenity Quantity To Remove',

  // Payment
  MESSAGE_CODE_500: 'Payment Not Found',
  MESSAGE_CODE_501: 'Invalid Payment Status Transition',
  MESSAGE_CODE_502: 'Payment Has Expired',
  MESSAGE_CODE_503: 'Invalid SePay Webhook Authentication',
  MESSAGE_CODE_504: 'Payment Amount Insufficient',
  MESSAGE_CODE_505: 'Order Is Not Awaiting Payment',
  MESSAGE_CODE_506: 'Contract Deposit Not Paid',
  MESSAGE_CODE_507: 'Payment Already Settled',
  MESSAGE_CODE_508: 'Payment Account Mismatch',

  // Storage Rack & Tier
  MESSAGE_CODE_600: 'Storage Rack Not Found',
  MESSAGE_CODE_601: 'Rack Tier Not Found',
  MESSAGE_CODE_602: 'Invalid Storage Rack Status Transition',
  MESSAGE_CODE_603: 'Storage Rack Code Already Exists',
};
