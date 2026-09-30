export const MESSAGE_CODE = {
  // Operation Successful
  MESSAGE_CODE_001: 'MESSAGE_CODE_001',
  // {0} Created Successfully
  MESSAGE_CODE_002: 'MESSAGE_CODE_002',
  // {0} Updated Successfully
  MESSAGE_CODE_003: 'MESSAGE_CODE_003',
  // {0} Deleted Successfully
  MESSAGE_CODE_004: 'MESSAGE_CODE_004',

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
  // NHÓM XÉT VAI TRÒ (ROLE & PERMISSION)
  // ==========================================
  // {0} Role Is Invalid (VD: User Role Is Invalid)
  MESSAGE_CODE_107: 'MESSAGE_CODE_107',
  // User Must Have Role {0} (VD: User Must Have Role facility_manager)
  MESSAGE_CODE_108: 'MESSAGE_CODE_108',
  // You Do Not Have Permission To Manage {0}
  MESSAGE_CODE_109: 'MESSAGE_CODE_109',

  // ==========================================
  // NHÓM XÉT TRẠNG THÁI TÀI KHOẢN (ACCOUNT STATUS)
  // ==========================================
  // {0} Is Inactive (VD: Manager Account Is Inactive)
  MESSAGE_CODE_110: 'MESSAGE_CODE_110',
  // {0} Is Banned Or Locked
  MESSAGE_CODE_111: 'MESSAGE_CODE_111',
  // {0} Has Been Deleted
  MESSAGE_CODE_112: 'MESSAGE_CODE_112',
  // {0} Email Is Not Verified
  MESSAGE_CODE_113: 'MESSAGE_CODE_113',

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
  // Invalid request
  MESSAGE_CODE_101: 'Invalid Request',
  MESSAGE_CODE_102: 'Unauthorized Access',
  MESSAGE_CODE_103: 'Access Denied',
  MESSAGE_CODE_104: '{0} Not Found',
  MESSAGE_CODE_105: '{0} Already Exists',
  MESSAGE_CODE_106: 'Internal Server Error',
  // Role
  MESSAGE_CODE_107: '{0} Role Is Invalid',
  MESSAGE_CODE_108: 'User Must Have Role {0}',
  MESSAGE_CODE_109: 'You Do Not Have Permission To Manage {0}',
  // Account
  MESSAGE_CODE_110: '{0} Is Inactive',
  MESSAGE_CODE_111: '{0} Is Banned Or Locked',
  MESSAGE_CODE_112: '{0} Has Been Deleted',
  MESSAGE_CODE_113: '{0} Email Is Not Verified',
  // Validation
  MESSAGE_CODE_200: '{0} Is Required',
  MESSAGE_CODE_201: 'Invalid Token',
};
