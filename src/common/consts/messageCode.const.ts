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

export const ERROR_MESSAGE = {
  [MESSAGE_CODE.MESSAGE_CODE_101]: 'Request is invalid.',
  [MESSAGE_CODE.MESSAGE_CODE_102]: 'Authentication is required.',
  [MESSAGE_CODE.MESSAGE_CODE_103]: 'Access is denied.',
  [MESSAGE_CODE.MESSAGE_CODE_104]: '{0} was not found.',
  [MESSAGE_CODE.MESSAGE_CODE_105]: '{0} already exists.',
  [MESSAGE_CODE.MESSAGE_CODE_106]: 'An internal server error occurred.',
  [MESSAGE_CODE.MESSAGE_CODE_201]: 'The token is invalid or has expired.',
} as const;
