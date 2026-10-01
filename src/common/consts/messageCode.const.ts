export const MESSAGE_CODE = {
  // ==========================================
  // NHÓM THÀNH CÔNG (SUCCESS 001 - 004)
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
  // NHÓM LỖI CHUNG (GENERAL ERRORS 101 - 106)
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
  // NHÓM XÁC THỰC & ĐĂNG NHẬP (AUTH & CREDENTIALS 107 - 109)
  // ==========================================
  // Invalid Email Or Password
  MESSAGE_CODE_107: 'MESSAGE_CODE_107',
  // {0} Email Is Not Verified
  MESSAGE_CODE_108: 'MESSAGE_CODE_108',
  // Invalid Or Expired OTP
  MESSAGE_CODE_109: 'MESSAGE_CODE_109',

  // ==========================================
  // NHÓM TRẠNG THÁI TÀI KHOẢN & THỰC THỂ (STATUS 110 - 113)
  // ==========================================
  // {0} Is Inactive (VD: Facility Is Inactive, Unit Type Is Inactive, Manager Account Is Inactive)
  MESSAGE_CODE_110: 'MESSAGE_CODE_110',
  // {0} Is Banned Or Locked
  MESSAGE_CODE_111: 'MESSAGE_CODE_111',
  // {0} Has Been Deleted
  MESSAGE_CODE_112: 'MESSAGE_CODE_112',

  // ==========================================
  // NHÓM XÉT VAI TRÒ & PHÂN QUYỀN (ROLE & PERMISSIONS 120 - 122)
  // ==========================================
  // {0} Role Is Invalid (VD: User Role Is Invalid)
  MESSAGE_CODE_120: 'MESSAGE_CODE_120',
  // User Must Have Role {0} (VD: User Must Have Role facility_manager)
  MESSAGE_CODE_121: 'MESSAGE_CODE_121',
  // You Do Not Have Permission To Manage {0}
  MESSAGE_CODE_122: 'MESSAGE_CODE_122',

  // ==========================================
  // NHÓM VALIDATION & TOKEN (VALIDATION & TOKEN 200 - 201)
  // ==========================================
  // {0} Is Required
  MESSAGE_CODE_200: 'MESSAGE_CODE_200',
  // Invalid Token
  MESSAGE_CODE_201: 'MESSAGE_CODE_201',
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
};
