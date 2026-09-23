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
  // Internal Server
  MESSAGE_CODE_106: 'MESSAGE_CODE_106',

  // {0} Is Required
  MESSAGE_CODE_200: 'MESSAGE_CODE_200',
  // Invalid Token
  MESSAGE_CODE_201: 'MESSAGE_CODE_201',
} as const;

export const MESSAGE_DICTIONARY: Record<string, string> = {
  MESSAGE_CODE_001: 'Operation Successful',
  MESSAGE_CODE_002: '{0} Created Successfully',
  MESSAGE_CODE_003: '{0} Updated Successfully',
  MESSAGE_CODE_004: '{0} Deleted Successfully',
  MESSAGE_CODE_101: 'Invalid Request',
  MESSAGE_CODE_102: 'Unauthorized Access',
  MESSAGE_CODE_103: 'Access Denied',
  MESSAGE_CODE_104: '{0} Not Found',
  MESSAGE_CODE_105: '{0} Already Exists',
  MESSAGE_CODE_106: 'Internal Server Error',
  MESSAGE_CODE_200: '{0} Is Required',
  MESSAGE_CODE_201: 'Invalid Token',
};
