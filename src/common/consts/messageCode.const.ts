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
  // Maker-Checker Violation
  MESSAGE_CODE_320: 'MESSAGE_CODE_320',
  // Demo Refund Simulation Disabled
  MESSAGE_CODE_321: 'MESSAGE_CODE_321',
  // Reservation Terms Must Be Accepted
  MESSAGE_CODE_322: 'MESSAGE_CODE_322',
  // Force Cancellation Requires Incident Details Or Incident ID
  MESSAGE_CODE_323: 'MESSAGE_CODE_323',
  // Reservation Cannot Be Force Cancelled In Current Status
  MESSAGE_CODE_324: 'MESSAGE_CODE_324',
  // Reservation Cannot Be Marked As Arrived In Current Status
  MESSAGE_CODE_325: 'MESSAGE_CODE_325',
  // Customer Has Already Been Marked As Arrived
  MESSAGE_CODE_326: 'MESSAGE_CODE_326',
  // Reservation Grace Period Cannot Be Extended In Current Status
  MESSAGE_CODE_327: 'MESSAGE_CODE_327',
  // Check-in Time Slot Requires Preparation Lead Time
  MESSAGE_CODE_328: 'MESSAGE_CODE_328',
  // Start Date Cannot Exceed Check-in Date By More Than Limit
  MESSAGE_CODE_329: 'MESSAGE_CODE_329',
  // No Pending Unit Reassign Proposal Found
  MESSAGE_CODE_330: 'MESSAGE_CODE_330',
  // Another Unit Reassign Proposal Is Already Pending
  MESSAGE_CODE_331: 'MESSAGE_CODE_331',

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
  // Customer Must Sign Contract Before Check-In
  MESSAGE_CODE_414: 'MESSAGE_CODE_414',
  // Customer Must Sign Contract Addendum Before Staff Sign
  MESSAGE_CODE_415: 'MESSAGE_CODE_415',
  // Direct Contract Renewal Is Deprecated
  MESSAGE_CODE_416: 'MESSAGE_CODE_416',
  // Contract Deposit Settlement Disputed
  MESSAGE_CODE_417: 'MESSAGE_CODE_417',
  // Contract Inspection Photos Required For Damage Assessment
  MESSAGE_CODE_418: 'MESSAGE_CODE_418',
  // Deposit Settlement Already Confirmed
  MESSAGE_CODE_419: 'MESSAGE_CODE_419',
  // Cannot Check Out Contract While Customer Inventory Remains
  MESSAGE_CODE_420: 'MESSAGE_CODE_420',
  // Cannot Check Out Contract While Open Incidents Exist
  MESSAGE_CODE_421: 'MESSAGE_CODE_421',
  // Cannot Void Contract: Linked Reservation Is No Longer Active
  MESSAGE_CODE_422: 'MESSAGE_CODE_422',
  // Cannot Create Contract Draft Before Check-In Date Unless Customer Has Arrived
  MESSAGE_CODE_423: 'MESSAGE_CODE_423',
  // Reservation Check-In Deadline Has Expired
  MESSAGE_CODE_424: 'MESSAGE_CODE_424',
  // Contract Dates Shifted And Customer Must Resign Updated Draft
  MESSAGE_CODE_425: 'MESSAGE_CODE_425',
  // Contract Termination Requires Report File And Evidence Photos
  MESSAGE_CODE_426: 'MESSAGE_CODE_426',
  // Violation Termination Requires Violation Category
  MESSAGE_CODE_427: 'MESSAGE_CODE_427',
  // Overdue Payment Termination Requires Overdue Grace Period Exceeded
  MESSAGE_CODE_428: 'MESSAGE_CODE_428',

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
  // Proof Image Required For Manual Payment
  MESSAGE_CODE_509: 'MESSAGE_CODE_509',
  // Payment Transaction Not Found
  MESSAGE_CODE_510: 'MESSAGE_CODE_510',
  // Refund Request Not Found
  MESSAGE_CODE_511: 'MESSAGE_CODE_511',
  // Invalid Refund Request Status Transition
  MESSAGE_CODE_512: 'MESSAGE_CODE_512',
  // Total Refund Amount Exceeds Net Settled Amount
  MESSAGE_CODE_513: 'MESSAGE_CODE_513',
  // Refund Approver Cannot Be Requester
  MESSAGE_CODE_514: 'MESSAGE_CODE_514',
  // Reference Code Required For Paid Refund
  MESSAGE_CODE_515: 'MESSAGE_CODE_515',
  // Paid Refund Cannot Be Modified
  MESSAGE_CODE_516: 'MESSAGE_CODE_516',
  // Payment Transaction Already Assigned
  MESSAGE_CODE_517: 'MESSAGE_CODE_517',
  // Payment Transaction Amount Mismatch
  MESSAGE_CODE_518: 'MESSAGE_CODE_518',
  // Contract First Period Rent Not Paid
  MESSAGE_CODE_519: 'MESSAGE_CODE_519',
  // Contract Deposit Must Be Paid Before First Period Rent
  MESSAGE_CODE_520: 'MESSAGE_CODE_520',
  // Contract First Period Rent Already Paid
  MESSAGE_CODE_521: 'MESSAGE_CODE_521',

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
  // Storage Unit Does Not Support Rack Layout
  MESSAGE_CODE_604: 'MESSAGE_CODE_604',
  // Invalid Rack Zone Pricing Configuration
  MESSAGE_CODE_605: 'MESSAGE_CODE_605',

  // ==========================================
  // CUSTOMER SKU (610 - 614)
  // ==========================================
  // Customer SKU Not Found
  MESSAGE_CODE_610: 'MESSAGE_CODE_610',
  // Customer SKU Code Already Exists
  MESSAGE_CODE_611: 'MESSAGE_CODE_611',
  // Customer SKU Barcode Already Exists
  MESSAGE_CODE_612: 'MESSAGE_CODE_612',
  // Cannot Delete SKU With Active Inventory
  MESSAGE_CODE_613: 'MESSAGE_CODE_613',
  // Invalid Customer SKU Status Transition
  MESSAGE_CODE_614: 'MESSAGE_CODE_614',

  // ==========================================
  // CUSTOMER INVENTORY & MOVEMENT (620 - 629)
  // ==========================================
  // Inventory Record Not Found
  MESSAGE_CODE_620: 'MESSAGE_CODE_620',
  // Insufficient Inventory Quantity
  MESSAGE_CODE_621: 'MESSAGE_CODE_621',
  // Contract Must Be Active To Perform Inventory Operations
  MESSAGE_CODE_622: 'MESSAGE_CODE_622',
  // Storage Unit Does Not Belong To Contract
  MESSAGE_CODE_623: 'MESSAGE_CODE_623',
  // Rack Tier Does Not Belong To Storage Unit
  MESSAGE_CODE_624: 'MESSAGE_CODE_624',
  // Rack Tier Is Inactive Or Under Maintenance
  MESSAGE_CODE_625: 'MESSAGE_CODE_625',
  // Invalid Inventory Movement Quantity
  MESSAGE_CODE_626: 'MESSAGE_CODE_626',
  // Destination Tier Must Be Different From Source Tier
  MESSAGE_CODE_627: 'MESSAGE_CODE_627',
  // SKU Does Not Belong To Customer
  MESSAGE_CODE_628: 'MESSAGE_CODE_628',
  // Storage Unit Still Contains Customer Inventory
  MESSAGE_CODE_629: 'MESSAGE_CODE_629',

  // ==========================================
  // INVENTORY REQUEST - DUAL HANDSHAKE (630 - 644)
  // ==========================================
  // Inventory Request Not Found
  MESSAGE_CODE_630: 'MESSAGE_CODE_630',
  // Invalid Or Expired Pickup Code Or OTP
  MESSAGE_CODE_631: 'MESSAGE_CODE_631',
  // Invalid Inventory Request Status Transition
  MESSAGE_CODE_632: 'MESSAGE_CODE_632',
  // Evidence Images Required For Handover Or Delivery
  MESSAGE_CODE_633: 'MESSAGE_CODE_633',
  // Cannot Cancel Inventory Request Being Processed Or Completed
  MESSAGE_CODE_634: 'MESSAGE_CODE_634',
  // Storage Rack And Rack Tier Are Required In Warehouse Rack
  MESSAGE_CODE_635: 'MESSAGE_CODE_635',
  // Rack Tier Does Not Belong To Storage Rack
  MESSAGE_CODE_636: 'MESSAGE_CODE_636',
  // Storage Rack Is Not Rented By Contract
  MESSAGE_CODE_637: 'MESSAGE_CODE_637',
  // Source Rack Has No Active Inventory To Migrate
  MESSAGE_CODE_638: 'MESSAGE_CODE_638',
  // Destination Rack Must Be Empty And Available
  MESSAGE_CODE_639: 'MESSAGE_CODE_639',
  // Storage Rack Facility Mismatch
  MESSAGE_CODE_640: 'MESSAGE_CODE_640',
  // Legal Basis Or Emergency Reason Required For Rack Migration
  MESSAGE_CODE_641: 'MESSAGE_CODE_641',
  // Batch Rack Migration Requires Identical Rack Tier Count
  MESSAGE_CODE_642: 'MESSAGE_CODE_642',
  // Incident Not Eligible For Emergency Rack Migration
  MESSAGE_CODE_643: 'MESSAGE_CODE_643',
  // Contract Status Does Not Allow This Inventory Operation
  MESSAGE_CODE_644: 'MESSAGE_CODE_644',
  // Inventory Item Status Does Not Allow This Operation
  MESSAGE_CODE_645: 'MESSAGE_CODE_645',
  // Invalid Inventory Item Status Transition
  MESSAGE_CODE_646: 'MESSAGE_CODE_646',
  // Emergency Reason Or Incident Required For Evacuation
  MESSAGE_CODE_647: 'MESSAGE_CODE_647',

  // ==========================================
  // INCIDENT (700 - 709)
  // ==========================================
  // Incident Not Found
  MESSAGE_CODE_700: 'MESSAGE_CODE_700',
  // Invalid Incident Status Transition
  MESSAGE_CODE_701: 'MESSAGE_CODE_701',
  // Storage Unit Not Owned By Contract
  MESSAGE_CODE_702: 'MESSAGE_CODE_702',
  // Incident Has Already Been Assigned
  MESSAGE_CODE_703: 'MESSAGE_CODE_703',
  // Incident Must Be Assigned Before Investigation
  MESSAGE_CODE_704: 'MESSAGE_CODE_704',
  // Incident Resolution Details Required
  MESSAGE_CODE_705: 'MESSAGE_CODE_705',
  // Incident Cannot Be Cancelled In Current Status
  MESSAGE_CODE_706: 'MESSAGE_CODE_706',
  // Only Assignee Or Facility Manager Can Update Incident
  MESSAGE_CODE_707: 'MESSAGE_CODE_707',
  // Assigned Staff Does Not Belong To Facility
  MESSAGE_CODE_708: 'MESSAGE_CODE_708',
  // Storage Rack Or Tier Does Not Belong To Contract
  MESSAGE_CODE_709: 'MESSAGE_CODE_709',

  // ==========================================
  // SUPPORT TICKET (720 - 726)
  // ==========================================
  // Support Ticket Not Found
  MESSAGE_CODE_720: 'MESSAGE_CODE_720',
  // Invalid Support Ticket Status Transition
  MESSAGE_CODE_721: 'MESSAGE_CODE_721',
  // Support Ticket Cannot Be Cancelled In Current Status
  MESSAGE_CODE_722: 'MESSAGE_CODE_722',
  // Support Ticket Response Details Required
  MESSAGE_CODE_723: 'MESSAGE_CODE_723',
  // Contract Does Not Belong To Customer
  MESSAGE_CODE_724: 'MESSAGE_CODE_724',
  // Support Ticket Facility Mismatch
  MESSAGE_CODE_725: 'MESSAGE_CODE_725',
  // Assigned Staff Does Not Belong To Facility
  MESSAGE_CODE_726: 'MESSAGE_CODE_726',
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
  MESSAGE_CODE_320:
    'Refund Confirmer Must Be Different From Payment Confirmer (Maker-Checker Violation)',
  MESSAGE_CODE_321: 'Demo Refund Simulation Is Disabled In This Environment',
  MESSAGE_CODE_322: 'Reservation Terms Must Be Accepted',
  MESSAGE_CODE_323:
    'Force Cancellation Requires Incident Details Or Incident ID',
  MESSAGE_CODE_324: 'Reservation Cannot Be Force Cancelled In Current Status',
  MESSAGE_CODE_325: 'Reservation Cannot Be Marked As Arrived In Current Status',
  MESSAGE_CODE_326: 'Customer Has Already Been Marked As Arrived',
  MESSAGE_CODE_327:
    'Reservation Grace Period Cannot Be Extended In Current Status',
  MESSAGE_CODE_328:
    'Check-in time slot requires at least {0} minutes preparation lead time',
  MESSAGE_CODE_329: 'Start date cannot exceed {0} days after check-in date',
  MESSAGE_CODE_330: 'No Pending Unit Reassign Proposal Found',
  MESSAGE_CODE_331: 'Another Unit Reassign Proposal Is Already Pending',

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
  MESSAGE_CODE_414: 'Customer Must Sign Contract Before Check-In',
  MESSAGE_CODE_415: 'Customer Must Sign Contract Addendum Before Staff Sign',
  MESSAGE_CODE_416:
    'Direct Contract Renewal Is Deprecated. Please Use Contract Addendum (RENEW) via POST /contracts/{id}/addendums',
  MESSAGE_CODE_417: 'Contract Deposit Settlement Disputed',
  MESSAGE_CODE_418: 'Contract Inspection Photos Required For Damage Assessment',
  MESSAGE_CODE_419: 'Deposit Settlement Already Confirmed',
  MESSAGE_CODE_420:
    'Cannot Check Out Contract While Customer Inventory Remains',
  MESSAGE_CODE_421: 'Cannot Check Out Contract While Open Incidents Exist',
  MESSAGE_CODE_422:
    'Cannot Void Contract: Linked Reservation Is No Longer Active',
  MESSAGE_CODE_423:
    'Cannot Create Contract Draft Before Check-In Date Unless Customer Has Arrived',
  MESSAGE_CODE_424: 'Reservation Check-In Deadline Has Expired',
  MESSAGE_CODE_425:
    'Contract dates were adjusted. Customer must re-sign the updated draft before check-in',
  MESSAGE_CODE_426:
    'Contract Termination Requires At Least One Report File And One Evidence Photo',
  MESSAGE_CODE_427: 'Violation Termination Requires Violation Category',
  MESSAGE_CODE_428:
    'Overdue Payment Termination Requires Overdue Grace Period Exceeded (At Least 5 Days Overdue)',

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
  MESSAGE_CODE_509: 'Proof Image Is Required For Manual Payment Confirmation',
  MESSAGE_CODE_510: 'Payment Transaction Not Found',
  MESSAGE_CODE_511: 'Refund Request Not Found',
  MESSAGE_CODE_512: 'Invalid Refund Request Status Transition',
  MESSAGE_CODE_513: 'Total Refund Amount Exceeds Net Settled Amount',
  MESSAGE_CODE_514: 'Refund Approver Cannot Be Requester',
  MESSAGE_CODE_515: 'Reference Code Is Required For Paid Refund',
  MESSAGE_CODE_516: 'Paid Refund Cannot Be Modified',
  MESSAGE_CODE_517: 'Payment Transaction Already Assigned',
  MESSAGE_CODE_518: 'Payment Transaction Amount Mismatch',
  MESSAGE_CODE_519: 'Contract First Period Rent Not Paid',
  MESSAGE_CODE_520: 'Contract Deposit Must Be Paid Before First Period Rent',
  MESSAGE_CODE_521: 'Contract First Period Rent Already Paid',

  // Storage Rack & Tier
  MESSAGE_CODE_600: 'Storage Rack Not Found',
  MESSAGE_CODE_601: 'Rack Tier Not Found',
  MESSAGE_CODE_602: 'Invalid Storage Rack Status Transition',
  MESSAGE_CODE_603: 'Storage Rack Code Already Exists',
  MESSAGE_CODE_604: 'Storage Unit Does Not Support Rack Layout',
  MESSAGE_CODE_605: 'Invalid Rack Zone Pricing Configuration',

  // Customer SKU
  MESSAGE_CODE_610: 'Customer SKU Not Found',
  MESSAGE_CODE_611: 'Customer SKU Code Already Exists',
  MESSAGE_CODE_612: 'Customer SKU Barcode Already Exists',
  MESSAGE_CODE_613: 'Cannot Delete SKU With Active Inventory',
  MESSAGE_CODE_614: 'Invalid Customer SKU Status Transition',

  // Customer Inventory & Movement
  MESSAGE_CODE_620: 'Inventory Record Not Found',
  MESSAGE_CODE_621: 'Insufficient Inventory Quantity',
  MESSAGE_CODE_622: 'Contract Must Be Active To Perform Inventory Operations',
  MESSAGE_CODE_623: 'Storage Unit Does Not Belong To Contract',
  MESSAGE_CODE_624: 'Rack Tier Does Not Belong To Storage Unit',
  MESSAGE_CODE_625: 'Rack Tier Is Inactive Or Under Maintenance',
  MESSAGE_CODE_626: 'Invalid Inventory Movement Quantity',
  MESSAGE_CODE_627: 'Destination Tier Must Be Different From Source Tier',
  MESSAGE_CODE_628: 'SKU Does Not Belong To Customer',
  MESSAGE_CODE_629: 'Storage Unit Still Contains Customer Inventory',

  // Inventory Request (Task 7D Dual Handshake & Task 7E Batch Migration)
  MESSAGE_CODE_630: 'Inventory Request Not Found',
  MESSAGE_CODE_631: 'Invalid Or Expired Pickup Code Or OTP',
  MESSAGE_CODE_632: 'Invalid Inventory Request Status Transition',
  MESSAGE_CODE_633: 'Evidence Images Required For Handover Or Delivery',
  MESSAGE_CODE_634:
    'Cannot Cancel Inventory Request Being Processed Or Completed',
  MESSAGE_CODE_635: 'Storage Rack And Rack Tier Are Required In Warehouse Rack',
  MESSAGE_CODE_636: 'Rack Tier Does Not Belong To Storage Rack',
  MESSAGE_CODE_637: 'Storage Rack Is Not Rented By Contract',
  MESSAGE_CODE_638: 'Source Rack Has No Active Inventory To Migrate',
  MESSAGE_CODE_639: 'Destination Rack Must Be Empty And Available',
  MESSAGE_CODE_640: 'Storage Rack Facility Mismatch',
  MESSAGE_CODE_641:
    'Legal Basis, Incident Report Or Emergency Reason Required For Rack Migration',
  MESSAGE_CODE_642: 'Batch Rack Migration Requires Identical Rack Tier Count',
  MESSAGE_CODE_643: 'Incident Not Eligible For Emergency Rack Migration',
  MESSAGE_CODE_644: 'Contract Status Does Not Allow This Inventory Operation',
  MESSAGE_CODE_645: 'Inventory Item Status Does Not Allow This Operation',
  MESSAGE_CODE_646: 'Invalid Inventory Item Status Transition',
  MESSAGE_CODE_647: 'Emergency Reason Or Incident Required For Evacuation',

  // Incident
  MESSAGE_CODE_700: 'Incident Not Found',
  MESSAGE_CODE_701: 'Invalid Incident Status Transition',
  MESSAGE_CODE_702: 'Storage Unit Not Owned By Contract',
  MESSAGE_CODE_703: 'Incident Has Already Been Assigned',
  MESSAGE_CODE_704: 'Incident Must Be Assigned Before Investigation',
  MESSAGE_CODE_705: 'Incident Resolution Details Required',
  MESSAGE_CODE_706: 'Incident Cannot Be Cancelled In Current Status',
  MESSAGE_CODE_707: 'Only Assignee Or Facility Manager Can Update Incident',
  MESSAGE_CODE_708: 'Assigned Staff Does Not Belong To Facility',
  MESSAGE_CODE_709: 'Storage Rack Or Tier Does Not Belong To Contract',

  // Support Ticket
  MESSAGE_CODE_720: 'Support Ticket Not Found',
  MESSAGE_CODE_721: 'Invalid Support Ticket Status Transition',
  MESSAGE_CODE_722: 'Support Ticket Cannot Be Cancelled In Current Status',
  MESSAGE_CODE_723: 'Support Ticket Response Details Required',
  MESSAGE_CODE_724: 'Contract Does Not Belong To Customer',
  MESSAGE_CODE_725: 'Support Ticket Facility Mismatch',
  MESSAGE_CODE_726: 'Assigned Staff Does Not Belong To Facility',
};
