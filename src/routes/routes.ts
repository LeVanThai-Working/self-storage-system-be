/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UserController } from './../modules/user/user.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AuthController } from './../modules/auth/auth.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ProfileController } from './../modules/profile/profile.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AuditLogController } from './../modules/auditLog/auditLog.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UploadController } from './../modules/upload/upload.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UnitTypeController } from './../modules/unitType/unitType.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { StorageUnitController } from './../modules/storageUnit/storageUnit.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { StorageRackController } from './../modules/storageRack/storageRack.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ReservationController } from './../modules/reservation/reservation.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PaymentController } from './../modules/payment/payment.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { NotificationController } from './../modules/notification/notification.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { IncidentController } from './../modules/incident/incident.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FacilityUnitTypeOfferingController } from './../modules/facilityUnitTypeOffering/facilityUnitTypeOffering.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FacilityTimeSlotController } from './../modules/facilityTimeSlot/facilityTimeSlot.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FacilityManagerController } from './../modules/facilityManager/facilityManager.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FacilityAmenityOfferingController } from './../modules/facilityAmenityOffering/facilityAmenityOffering.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FacilityController } from './../modules/facility/facility.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CustomerSkuController } from './../modules/customerSku/customerSku.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { InventoryRequestController } from './../modules/customerInventory/inventoryRequest.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CustomerInventoryController } from './../modules/customerInventory/customerInventory.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ContractController } from './../modules/contract/contract.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ApprovalRequestController } from './../modules/approvalRequest/approvalRequest.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AmenityController } from './../modules/amenity/amenity.controller.js';
import { expressAuthentication } from './../middlewares/auth.tsoa.js';
// @ts-ignore - no great way to install types from subpackage
import { iocContainer } from './../ioc.js';
import type { IocContainer, IocContainerFactory } from '@tsoa/runtime';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';

const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "RoleEnum": {
        "dataType": "refEnum",
        "enums": ["customer","system_admin","facility_staff","facility_manager","business_ops_manager"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthProviderEnum": {
        "dataType": "refEnum",
        "enums": ["local","google"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserStatusEnum": {
        "dataType": "refEnum",
        "enums": ["inactive","active","banned","deleted"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofuserResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"googleId":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"isEmailVerified":{"dataType":"boolean","required":true},"status":{"ref":"UserStatusEnum","required":true},"authProvider":{"ref":"AuthProviderEnum","required":true},"role":{"ref":"RoleEnum","required":true},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofuserResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginationMeta": {
        "dataType": "refObject",
        "properties": {
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "totalItems": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
            "hasNextPage": {"dataType":"boolean","required":true},
            "hasPrevPage": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_UserResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"UserResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_UserResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_UserResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "errors": {"dataType":"any"},
            "path": {"dataType":"string","required":true},
            "timestamp": {"dataType":"string","required":true},
            "stack": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofuserQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"sort":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]},{"dataType":"enum","enums":["a-z"]},{"dataType":"enum","enums":["z-a"]}]},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["email"]},{"dataType":"enum","enums":["role"]},{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofuserQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_UserResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"UserResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateUserSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"ref":"RoleEnum"},"phoneNumber":{"dataType":"string"},"password":{"dataType":"string","required":true},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateUserRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateUserSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateUserSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"UserStatusEnum"},"role":{"ref":"RoleEnum"},"phoneNumber":{"dataType":"string"},"name":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateUserSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_null_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"enum","enums":[null],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse__message-string__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofsendOtpSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"email":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SendOtpRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofsendOtpSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofauthLoginResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"tokens":{"dataType":"nestedObjectLiteral","nestedProperties":{"familyId":{"dataType":"string"},"refreshToken":{"dataType":"string","required":true},"accessToken":{"dataType":"string","required":true}},"required":true},"user":{"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"status":{"ref":"UserStatusEnum"},"authProvider":{"ref":"AuthProviderEnum"},"phoneNumber":{"dataType":"string"},"_id":{"dataType":"any"},"id":{"dataType":"string"},"role":{"ref":"RoleEnum","required":true},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}},"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthLoginResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofauthLoginResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_AuthLoginResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"AuthLoginResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofregisterSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"phoneNumber":{"dataType":"string"},"name":{"dataType":"string","required":true},"password":{"dataType":"string","required":true},"otp":{"dataType":"string","required":true},"email":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegisterRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofregisterSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofloginSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"password":{"dataType":"string","required":true},"email":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofloginSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofauthTokensSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"familyId":{"dataType":"string"},"refreshToken":{"dataType":"string","required":true},"accessToken":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthTokens": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofauthTokensSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_AuthTokens_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"AuthTokens","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RefreshTokenRequest": {
        "dataType": "refObject",
        "properties": {
            "refreshToken": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofauthUserResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"status":{"ref":"UserStatusEnum"},"authProvider":{"ref":"AuthProviderEnum"},"phoneNumber":{"dataType":"string"},"_id":{"dataType":"any"},"id":{"dataType":"string"},"role":{"ref":"RoleEnum","required":true},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthUserResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofauthUserResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_AuthUserResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"AuthUserResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofforgotPasswordSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"email":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ForgotPasswordRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofforgotPasswordSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofresetPasswordSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"newPassword":{"dataType":"string","required":true},"otp":{"dataType":"string","required":true},"email":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResetPasswordRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofresetPasswordSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofchangePasswordSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"newPassword":{"dataType":"string","required":true},"currentPassword":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChangePasswordRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofchangePasswordSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GenderEnum": {
        "dataType": "refEnum",
        "enums": ["male","female","other"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofprofileResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"gender":{"ref":"GenderEnum"},"address":{"dataType":"string"},"dateOfBirth":{"dataType":"string"},"avatarUrl":{"dataType":"string"},"userId":{"dataType":"string"},"id":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProfileResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofprofileResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_ProfileResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"ProfileResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateProfileSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"gender":{"ref":"GenderEnum"},"address":{"dataType":"string"},"dateOfBirth":{"dataType":"string"},"avatarUrl":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateProfileRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateProfileSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuditActionEnum": {
        "dataType": "refEnum",
        "enums": ["register","login","login_google","logout","send_otp","forgot_password","reset_password","change_password","create","update","delete","restore","assign_manager","toggle_maintenance","approve","reject","cancel","check_in","check_out","renew","terminate","add_amenity","remove_amenity","sign_contract","create_addendum","approve_addendum","reject_addendum","sign_addendum","cancel_addendum","confirm_payment","receive_payment","inventory_in","inventory_out","inventory_move","inventory_adjust","reassign_unit","expire","mark_overdue","refund","create_inventory_request","verify_pickup_code","complete_outbound_handover","confirm_inbound_request","dispute_inbound_request","putaway_inbound_request","cancel_inventory_request","batch_migrate_rack","report_incident","assign_incident","investigate_incident","resolve_incident","close_incident","cancel_incident"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuditResourceEnum": {
        "dataType": "refEnum",
        "enums": ["auth","user","profile","facility","unit_type","amenity","facility_unit_type_offering","facility_amenity_offering","storage_unit","reservation","approval_request","contract","payment","notification","storage_rack","rack_tier","customer_sku","customer_inventory","inventory_movement","inventory_request","incident"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuditStatusEnum": {
        "dataType": "refEnum",
        "enums": ["success","failure"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.unknown_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofauditLogResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"createdAt":{"dataType":"string"},"path":{"dataType":"string"},"method":{"dataType":"string"},"requestId":{"dataType":"string"},"userAgent":{"dataType":"string"},"ip":{"dataType":"string"},"metadata":{"ref":"Record_string.unknown_"},"changes":{"dataType":"nestedObjectLiteral","nestedProperties":{"after":{"ref":"Record_string.unknown_"},"before":{"ref":"Record_string.unknown_"}}},"resourceId":{"dataType":"string"},"actorEmail":{"dataType":"string"},"actorRole":{"dataType":"string"},"actorId":{"dataType":"string"},"status":{"ref":"AuditStatusEnum","required":true},"resourceType":{"ref":"AuditResourceEnum","required":true},"action":{"ref":"AuditActionEnum","required":true},"version":{"dataType":"double","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuditLogResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofauditLogResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_AuditLogResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"AuditLogResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_AuditLogResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_AuditLogResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofauditLogQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"to":{"dataType":"string"},"from":{"dataType":"string"},"status":{"ref":"AuditStatusEnum"},"resourceId":{"dataType":"string"},"resourceType":{"ref":"AuditResourceEnum"},"action":{"ref":"AuditActionEnum"},"actorId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["action"]},{"dataType":"enum","enums":["resourceType"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuditLogQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofauditLogQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_AuditLogResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"AuditLogResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcloudinarySignatureResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"folder":{"dataType":"string","required":true},"cloudName":{"dataType":"string","required":true},"apiKey":{"dataType":"string","required":true},"timestamp":{"dataType":"double","required":true},"signature":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CloudinarySignatureResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcloudinarySignatureResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_CloudinarySignatureResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"CloudinarySignatureResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcloudinarySignatureRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"folder":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CloudinarySignatureRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcloudinarySignatureRequestSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UnitTypeStatusEnum": {
        "dataType": "refEnum",
        "enums": ["active","inactive"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UnitTypeCategoryEnum": {
        "dataType": "refEnum",
        "enums": ["locker","small","large","warehouse_rack"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofunitTypeResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"features":{"dataType":"array","array":{"dataType":"string"}},"images":{"dataType":"array","array":{"dataType":"string"}},"imageUrl":{"dataType":"string"},"category":{"ref":"UnitTypeCategoryEnum"},"description":{"dataType":"string"},"status":{"ref":"UnitTypeStatusEnum","required":true},"volume":{"dataType":"double","required":true},"area":{"dataType":"double","required":true},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}},"required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UnitTypeResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofunitTypeResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_UnitTypeResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"UnitTypeResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_UnitTypeResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_UnitTypeResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofunitTypeQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"maxArea":{"dataType":"double"},"minArea":{"dataType":"double"},"category":{"ref":"UnitTypeCategoryEnum"},"status":{"ref":"UnitTypeStatusEnum"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["area"]},{"dataType":"enum","enums":["volume"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UnitTypeQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofunitTypeQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_UnitTypeResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"UnitTypeResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateUnitTypeSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"features":{"dataType":"array","array":{"dataType":"string"}},"images":{"dataType":"array","array":{"dataType":"string"}},"imageUrl":{"dataType":"string"},"category":{"ref":"UnitTypeCategoryEnum"},"description":{"dataType":"string"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}},"required":true},"name":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateUnitTypeRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateUnitTypeSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateUnitTypeSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"features":{"dataType":"array","array":{"dataType":"string"}},"images":{"dataType":"array","array":{"dataType":"string"}},"imageUrl":{"dataType":"string"},"status":{"ref":"UnitTypeStatusEnum"},"category":{"ref":"UnitTypeCategoryEnum"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"description":{"dataType":"string"},"name":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUnitTypeRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateUnitTypeSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StorageUnitStatusEnum": {
        "dataType": "refEnum",
        "enums": ["available","reserved","occupied","under_maintenance","inactive"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityStatusEnum": {
        "dataType": "refEnum",
        "enums": ["active","inactive","closed"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofstorageUnitResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"unitType":{"dataType":"nestedObjectLiteral","nestedProperties":{"category":{"ref":"UnitTypeCategoryEnum"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}},"required":true},"status":{"ref":"UnitTypeStatusEnum","required":true},"volume":{"dataType":"double","required":true},"area":{"dataType":"double","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"FacilityStatusEnum","required":true},"address":{"dataType":"string","required":true},"city":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"notes":{"dataType":"string"},"zone":{"dataType":"string"},"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"status":{"ref":"StorageUnitStatusEnum","required":true},"floor":{"dataType":"double","required":true},"unitNumber":{"dataType":"string","required":true},"unitTypeId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StorageUnitResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofstorageUnitResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_StorageUnitResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"StorageUnitResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_StorageUnitResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_StorageUnitResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofstorageUnitQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"unitNumber":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"status":{"ref":"StorageUnitStatusEnum"},"unitTypeId":{"dataType":"string"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["unitNumber"]},{"dataType":"enum","enums":["floor"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StorageUnitQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofstorageUnitQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_StorageUnitResponse-Array_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"array","array":{"dataType":"refAlias","ref":"StorageUnitResponse"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofavailableStorageUnitQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitTypeId":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AvailableStorageUnitQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofavailableStorageUnitQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_StorageUnitResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"StorageUnitResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StorageUnitStatusEnum.AVAILABLE": {
        "dataType": "refEnum",
        "enums": ["available"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StorageUnitStatusEnum.UNDER_MAINTENANCE": {
        "dataType": "refEnum",
        "enums": ["under_maintenance"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StorageUnitStatusEnum.INACTIVE": {
        "dataType": "refEnum",
        "enums": ["inactive"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateStorageUnitSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"images":{"dataType":"array","array":{"dataType":"string"}},"status":{"dataType":"union","subSchemas":[{"ref":"StorageUnitStatusEnum.AVAILABLE"},{"ref":"StorageUnitStatusEnum.UNDER_MAINTENANCE"},{"ref":"StorageUnitStatusEnum.INACTIVE"}]},"zone":{"dataType":"string"},"floor":{"dataType":"double","required":true},"unitNumber":{"dataType":"string","required":true},"unitTypeId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateStorageUnitRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateStorageUnitSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateStorageUnitSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"images":{"dataType":"array","array":{"dataType":"string"}},"status":{"dataType":"union","subSchemas":[{"ref":"StorageUnitStatusEnum.AVAILABLE"},{"ref":"StorageUnitStatusEnum.INACTIVE"}]},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitNumber":{"dataType":"string"},"unitTypeId":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateStorageUnitRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateStorageUnitSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeoftoggleMaintenanceSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"isUnderMaintenance":{"dataType":"boolean","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ToggleMaintenanceRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeoftoggleMaintenanceSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RackStatusEnum": {
        "dataType": "refEnum",
        "enums": ["available","reserved","rented","active","maintenance","inactive"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RackZoneEnum": {
        "dataType": "refEnum",
        "enums": ["PRIME","STANDARD","ECONOMY"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RackTierStatusEnum": {
        "dataType": "refEnum",
        "enums": ["available","occupied","maintenance","inactive"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofstorageRackResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"address":{"dataType":"string"},"city":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"tiers":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"notes":{"dataType":"string"},"volume":{"dataType":"double"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"maxWeightKg":{"dataType":"double"},"status":{"ref":"RackTierStatusEnum","required":true},"tierCode":{"dataType":"string","required":true},"tierNumber":{"dataType":"double","required":true},"storageRackId":{"dataType":"string","required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}}},"notes":{"dataType":"string"},"name":{"dataType":"string"},"currentCustomerId":{"dataType":"string"},"currentContractId":{"dataType":"string"},"customPrice":{"dataType":"double"},"zone":{"ref":"RackZoneEnum"},"bay":{"dataType":"double"},"aisle":{"dataType":"string"},"status":{"ref":"RackStatusEnum","required":true},"tierCount":{"dataType":"double","required":true},"rackCode":{"dataType":"string","required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StorageRackResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofstorageRackResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_StorageRackResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"StorageRackResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_StorageRackResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_StorageRackResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofstorageRackQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"zone":{"ref":"RackZoneEnum"},"aisle":{"dataType":"string"},"rackCode":{"dataType":"string"},"status":{"ref":"RackStatusEnum"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["rackCode"]},{"dataType":"enum","enums":["aisle"]},{"dataType":"enum","enums":["bay"]},{"dataType":"enum","enums":["tierCount"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StorageRackQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofstorageRackQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_StorageRackResponse-Array_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"array","array":{"dataType":"refAlias","ref":"StorageRackResponse"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_StorageRackResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"StorageRackResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateStorageRackSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"defaultTierDimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"defaultTierMaxWeightKg":{"dataType":"double"},"notes":{"dataType":"string"},"status":{"ref":"RackStatusEnum"},"name":{"dataType":"string"},"customPrice":{"dataType":"double"},"zone":{"ref":"RackZoneEnum"},"bay":{"dataType":"double"},"aisle":{"dataType":"string"},"tierCount":{"dataType":"double","required":true},"rackCode":{"dataType":"string","required":true},"storageUnitId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateStorageRackRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateStorageRackSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateStorageRackSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"status":{"ref":"RackStatusEnum"},"customPrice":{"dataType":"double"},"zone":{"ref":"RackZoneEnum"},"bay":{"dataType":"double"},"aisle":{"dataType":"string"},"name":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateStorageRackRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateStorageRackSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofrackTierResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"notes":{"dataType":"string"},"volume":{"dataType":"double"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"maxWeightKg":{"dataType":"double"},"status":{"ref":"RackTierStatusEnum","required":true},"tierCode":{"dataType":"string","required":true},"tierNumber":{"dataType":"double","required":true},"storageRackId":{"dataType":"string","required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RackTierResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofrackTierResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_RackTierResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"RackTierResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateRackTierSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"status":{"ref":"RackTierStatusEnum"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"maxWeightKg":{"dataType":"double"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateRackTierRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateRackTierSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BillingUnitEnum": {
        "dataType": "refEnum",
        "enums": ["day","month","one_time"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReservationStatusEnum": {
        "dataType": "refEnum",
        "enums": ["pending_payment","payment_successful","confirmed","completed","cancelled","expired","overdue"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RefundStatusEnum": {
        "dataType": "refEnum",
        "enums": ["none","pending","refunded"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReservationCancelSourceEnum": {
        "dataType": "refEnum",
        "enums": ["customer","facility","system"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofreservationResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"zone":{"dataType":"string"},"status":{"dataType":"string","required":true},"floor":{"dataType":"double","required":true},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"offering":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"minRentalDays":{"dataType":"double"},"depositMultiplier":{"dataType":"double"},"unitTypeId":{"dataType":"string"},"pricePerUnit":{"dataType":"double","required":true},"billingUnit":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"email":{"dataType":"string"},"phone":{"dataType":"string"},"address":{"dataType":"string","required":true},"city":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"customer":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"notes":{"dataType":"string"},"paymentId":{"dataType":"string"},"paidAmount":{"dataType":"double"},"paidAt":{"dataType":"string"},"refundNote":{"dataType":"string"},"refundReference":{"dataType":"string"},"refundedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"refundedAt":{"dataType":"string"},"cancellationSource":{"ref":"ReservationCancelSourceEnum"},"cancelledAt":{"dataType":"string"},"cancelledBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"cancellationReason":{"dataType":"string"},"assignedStaffAt":{"dataType":"string"},"assignedStaff":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"assignedStaffId":{"dataType":"string"},"confirmedAt":{"dataType":"string"},"confirmedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"graceExpiresAt":{"dataType":"string"},"expiresAt":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"updatedAt":{"dataType":"string","required":true},"createdAt":{"dataType":"string","required":true},"unitChangeHistory":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"changedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"toUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"zone":{"dataType":"string"},"status":{"dataType":"string","required":true},"floor":{"dataType":"double","required":true},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"fromUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"zone":{"dataType":"string"},"status":{"dataType":"string","required":true},"floor":{"dataType":"double","required":true},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"changedAt":{"dataType":"string","required":true},"reason":{"dataType":"string","required":true},"toUnitId":{"dataType":"string","required":true},"fromUnitId":{"dataType":"string","required":true}}},"required":true},"refundStatus":{"ref":"RefundStatusEnum","required":true},"forfeitedAmount":{"dataType":"double","required":true},"refundAmount":{"dataType":"double","required":true},"status":{"ref":"ReservationStatusEnum","required":true},"totalAmount":{"dataType":"double","required":true},"amenities":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"totalPrice":{"dataType":"double","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"pricePerUnit":{"dataType":"double","required":true},"quantity":{"dataType":"double","required":true},"name":{"dataType":"string","required":true},"amenityId":{"dataType":"string","required":true},"facilityAmenityOfferingId":{"dataType":"string","required":true}}},"required":true},"depositAmount":{"dataType":"double","required":true},"basePrice":{"dataType":"double","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"rentalDuration":{"dataType":"double","required":true},"checkInTimeSlot":{"dataType":"string","required":true},"checkInDate":{"dataType":"string","required":true},"startDate":{"dataType":"string","required":true},"facilityUnitTypeOfferingId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"reservationCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReservationResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofreservationResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_ReservationResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"ReservationResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateReservationSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"startDate":{"dataType":"string"},"facilityUnitTypeOfferingId":{"dataType":"string"},"amenities":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"quantity":{"dataType":"double","required":true},"facilityAmenityOfferingId":{"dataType":"string","required":true}}},"required":true},"rentalDuration":{"dataType":"double","required":true},"checkInTimeSlot":{"dataType":"string","required":true},"checkInDate":{"dataType":"string","required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateReservationRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateReservationSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_ReservationResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"ReservationResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_ReservationResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_ReservationResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofreservationQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"checkInDateTo":{"dataType":"string"},"checkInDateFrom":{"dataType":"string"},"startDateTo":{"dataType":"string"},"startDateFrom":{"dataType":"string"},"reservationCode":{"dataType":"string"},"refundStatus":{"ref":"RefundStatusEnum"},"status":{"ref":"ReservationStatusEnum"},"storageUnitId":{"dataType":"string"},"facilityUnitTypeOfferingId":{"dataType":"string"},"facilityId":{"dataType":"string"},"customerId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["startDate"]},{"dataType":"enum","enums":["checkInDate"]},{"dataType":"enum","enums":["totalAmount"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReservationQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofreservationQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse__processedCount-number__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"processedCount":{"dataType":"double","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse__overdueCount-number--noShowCount-number--unconfirmedCount-number__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"unconfirmedCount":{"dataType":"double","required":true},"noShowCount":{"dataType":"double","required":true},"overdueCount":{"dataType":"double","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofreassignStorageUnitSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"oldUnitStatus":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["under_maintenance"]},{"dataType":"enum","enums":["available"]}]},"reason":{"dataType":"string","required":true},"newStorageUnitId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReassignStorageUnitRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofreassignStorageUnitSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofconfirmReservationSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"assignedStaffId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfirmReservationRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofconfirmReservationSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcancelReservationSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"cancellationReason":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CancelReservationRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcancelReservationSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofassignReservationStaffSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"staffId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AssignReservationStaffRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofassignReservationStaffSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofconfirmRefundSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"referenceCode":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfirmRefundRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofconfirmRefundSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SepayWebhookPayload": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "gateway": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "transactionDate": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "accountNumber": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "subAccount": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "code": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "content": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "transferType": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "transferAmount": {"dataType":"double","required":true},
            "accumulated": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "referenceCode": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentPurposeEnum": {
        "dataType": "refEnum",
        "enums": ["reservation_deposit","contract_deposit"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentMethodEnum": {
        "dataType": "refEnum",
        "enums": ["sepay_qr","cash","bank_transfer"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentStatusEnum": {
        "dataType": "refEnum",
        "enums": ["pending","partially_paid","paid","expired","cancelled"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofpaymentResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"email":{"dataType":"string"},"phone":{"dataType":"string"},"address":{"dataType":"string","required":true},"city":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"customer":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"note":{"dataType":"string"},"cancellationReason":{"dataType":"string"},"cancelledAt":{"dataType":"string"},"cancelledBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"proofImageUrl":{"dataType":"string"},"confirmedAt":{"dataType":"string"},"confirmedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"referenceCode":{"dataType":"string"},"sepayTransactionId":{"dataType":"double"},"paidAt":{"dataType":"string"},"expiresAt":{"dataType":"string"},"bankInfo":{"dataType":"nestedObjectLiteral","nestedProperties":{"accountName":{"dataType":"string","required":true},"accountNumber":{"dataType":"string","required":true},"bankCode":{"dataType":"string","required":true}}},"qrUrl":{"dataType":"string"},"contractId":{"dataType":"string"},"reservationId":{"dataType":"string"},"updatedAt":{"dataType":"string","required":true},"createdAt":{"dataType":"string","required":true},"status":{"ref":"PaymentStatusEnum","required":true},"method":{"ref":"PaymentMethodEnum","required":true},"overpaidAmount":{"dataType":"double","required":true},"paidAmount":{"dataType":"double","required":true},"amount":{"dataType":"double","required":true},"facilityId":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"purpose":{"ref":"PaymentPurposeEnum","required":true},"paymentCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofpaymentResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaymentResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaymentResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreatePaymentSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"contractId":{"dataType":"string"},"reservationId":{"dataType":"string"},"purpose":{"ref":"PaymentPurposeEnum","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatePaymentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreatePaymentSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_PaymentResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"PaymentResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_PaymentResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_PaymentResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofpaymentQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"createdAtTo":{"dataType":"string"},"createdAtFrom":{"dataType":"string"},"paymentCode":{"dataType":"string"},"status":{"ref":"PaymentStatusEnum"},"purpose":{"ref":"PaymentPurposeEnum"},"contractId":{"dataType":"string"},"reservationId":{"dataType":"string"},"facilityId":{"dataType":"string"},"customerId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofpaymentQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcancelPaymentSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"cancellationReason":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CancelPaymentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcancelPaymentSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentMethodEnum.CASH": {
        "dataType": "refEnum",
        "enums": ["cash"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentMethodEnum.BANK_TRANSFER": {
        "dataType": "refEnum",
        "enums": ["bank_transfer"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofconfirmManualPaymentSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"proofImageUrl":{"dataType":"string"},"referenceCode":{"dataType":"string"},"note":{"dataType":"string","required":true},"method":{"dataType":"union","subSchemas":[{"ref":"PaymentMethodEnum.CASH"},{"ref":"PaymentMethodEnum.BANK_TRANSFER"}],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfirmManualPaymentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofconfirmManualPaymentSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NotificationTypeEnum": {
        "dataType": "refEnum",
        "enums": ["system","system_alert","approval_request","storage_unit","reservation","contract","payment","incident"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NotificationPriorityEnum": {
        "dataType": "refEnum",
        "enums": ["low","normal","high","urgent"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NotificationChannelEnum": {
        "dataType": "refEnum",
        "enums": ["in_app","email"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofnotificationResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"metadata":{"ref":"Record_string.unknown_"},"readAt":{"dataType":"string"},"facilityId":{"dataType":"string"},"isRead":{"dataType":"boolean","required":true},"channels":{"dataType":"array","array":{"dataType":"refEnum","ref":"NotificationChannelEnum"},"required":true},"priority":{"ref":"NotificationPriorityEnum","required":true},"type":{"ref":"NotificationTypeEnum","required":true},"content":{"dataType":"string","required":true},"title":{"dataType":"string","required":true},"recipientId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NotificationResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofnotificationResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_NotificationResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"NotificationResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofsendTestNotificationSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"type":{"dataType":"string","required":true},"body":{"dataType":"string","required":true},"title":{"dataType":"string","required":true},"recipientId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SendTestNotificationRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofsendTestNotificationSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_NotificationResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"NotificationResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_NotificationResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_NotificationResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofnotificationQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"facilityId":{"dataType":"string"},"priority":{"ref":"NotificationPriorityEnum"},"type":{"ref":"NotificationTypeEnum"},"isRead":{"dataType":"boolean"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NotificationQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofnotificationQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofunreadCountResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"unreadCount":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UnreadCountResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofunreadCountResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_UnreadCountResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"UnreadCountResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse__modifiedCount-number__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"modifiedCount":{"dataType":"double","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IncidentCategoryEnum": {
        "dataType": "refEnum",
        "enums": ["structural","electrical","water_leak","security","cleanliness","other"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IncidentSeverityEnum": {
        "dataType": "refEnum",
        "enums": ["low","medium","high","critical"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IncidentStatusEnum": {
        "dataType": "refEnum",
        "enums": ["reported","assigned","investigating","in_progress","resolved","closed","cancelled"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IncidentLiablePartyEnum": {
        "dataType": "refEnum",
        "enums": ["customer","facility","third_party","force_majeure"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofincidentResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"cancellationReason":{"dataType":"string"},"cancelledAt":{"dataType":"string"},"closedAt":{"dataType":"string"},"resolution":{"dataType":"nestedObjectLiteral","nestedProperties":{"resolvedBy":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string"},"id":{"dataType":"string","required":true}}}]},"investigationNotes":{"dataType":"string"},"resolvedAt":{"dataType":"string","required":true},"damageFee":{"dataType":"double","required":true},"liableParty":{"ref":"IncidentLiablePartyEnum","required":true},"repairCost":{"dataType":"double","required":true},"resolutionNotes":{"dataType":"string","required":true},"staffEvidenceImages":{"dataType":"array","array":{"dataType":"string"},"required":true}}},"investigationNotes":{"dataType":"string"},"assignedStaff":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string"},"id":{"dataType":"string","required":true}}},"reporter":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string"},"id":{"dataType":"string","required":true}}}]},"contract":{"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"status":{"dataType":"string"},"contractCode":{"dataType":"string"},"id":{"dataType":"string","required":true}}},"rackTier":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"tierNumber":{"dataType":"double"},"id":{"dataType":"string","required":true}}},"storageRack":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"bay":{"dataType":"double"},"aisle":{"dataType":"string"},"rackCode":{"dataType":"string"},"id":{"dataType":"string","required":true}}},"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitNumber":{"dataType":"string"},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"nestedObjectLiteral","nestedProperties":{"address":{"dataType":"string"},"name":{"dataType":"string"},"code":{"dataType":"string"},"id":{"dataType":"string","required":true}}}]},"updatedAt":{"dataType":"string","required":true},"createdAt":{"dataType":"string","required":true},"requiresRelocation":{"dataType":"boolean","required":true},"putUnitUnderMaintenance":{"dataType":"boolean","required":true},"status":{"ref":"IncidentStatusEnum","required":true},"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"description":{"dataType":"string","required":true},"title":{"dataType":"string","required":true},"severity":{"ref":"IncidentSeverityEnum","required":true},"category":{"ref":"IncidentCategoryEnum","required":true},"reporterRole":{"ref":"RoleEnum","required":true},"incidentCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IncidentResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofincidentResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_IncidentResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"IncidentResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofreportIncidentSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"contractId":{"dataType":"string"},"rackTierId":{"dataType":"string"},"storageRackId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"requiresRelocation":{"dataType":"boolean","required":true},"putUnitUnderMaintenance":{"dataType":"boolean","required":true},"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"description":{"dataType":"string","required":true},"title":{"dataType":"string","required":true},"severity":{"ref":"IncidentSeverityEnum","required":true},"category":{"ref":"IncidentCategoryEnum","required":true},"facilityId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReportIncidentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofreportIncidentSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofpaginatedIncidentResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"pagination":{"dataType":"nestedObjectLiteral","nestedProperties":{"hasPrevPage":{"dataType":"boolean","required":true},"hasNextPage":{"dataType":"boolean","required":true},"totalPages":{"dataType":"double","required":true},"totalItems":{"dataType":"double","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"required":true},"items":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"cancellationReason":{"dataType":"string"},"cancelledAt":{"dataType":"string"},"closedAt":{"dataType":"string"},"resolution":{"dataType":"nestedObjectLiteral","nestedProperties":{"resolvedBy":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string"},"id":{"dataType":"string","required":true}}}]},"investigationNotes":{"dataType":"string"},"resolvedAt":{"dataType":"string","required":true},"damageFee":{"dataType":"double","required":true},"liableParty":{"ref":"IncidentLiablePartyEnum","required":true},"repairCost":{"dataType":"double","required":true},"resolutionNotes":{"dataType":"string","required":true},"staffEvidenceImages":{"dataType":"array","array":{"dataType":"string"},"required":true}}},"investigationNotes":{"dataType":"string"},"assignedStaff":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string"},"id":{"dataType":"string","required":true}}},"reporter":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string"},"id":{"dataType":"string","required":true}}}]},"contract":{"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"status":{"dataType":"string"},"contractCode":{"dataType":"string"},"id":{"dataType":"string","required":true}}},"rackTier":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"tierNumber":{"dataType":"double"},"id":{"dataType":"string","required":true}}},"storageRack":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"bay":{"dataType":"double"},"aisle":{"dataType":"string"},"rackCode":{"dataType":"string"},"id":{"dataType":"string","required":true}}},"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitNumber":{"dataType":"string"},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"nestedObjectLiteral","nestedProperties":{"address":{"dataType":"string"},"name":{"dataType":"string"},"code":{"dataType":"string"},"id":{"dataType":"string","required":true}}}]},"updatedAt":{"dataType":"string","required":true},"createdAt":{"dataType":"string","required":true},"requiresRelocation":{"dataType":"boolean","required":true},"putUnitUnderMaintenance":{"dataType":"boolean","required":true},"status":{"ref":"IncidentStatusEnum","required":true},"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"description":{"dataType":"string","required":true},"title":{"dataType":"string","required":true},"severity":{"ref":"IncidentSeverityEnum","required":true},"category":{"ref":"IncidentCategoryEnum","required":true},"reporterRole":{"ref":"RoleEnum","required":true},"incidentCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedIncidentResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofpaginatedIncidentResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedIncidentResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedIncidentResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofincidentQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"search":{"dataType":"string"},"severity":{"ref":"IncidentSeverityEnum"},"category":{"ref":"IncidentCategoryEnum"},"status":{"ref":"IncidentStatusEnum"},"assignedStaffId":{"dataType":"string"},"reporterId":{"dataType":"string"},"contractId":{"dataType":"string"},"storageRackId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IncidentQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofincidentQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofassignIncidentSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"assignedStaffId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AssignIncidentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofassignIncidentSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofinvestigateIncidentSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"requiresRelocation":{"dataType":"boolean"},"putUnitUnderMaintenance":{"dataType":"boolean"},"investigationNotes":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InvestigateIncidentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofinvestigateIncidentSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofresolveIncidentSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"damageFee":{"dataType":"double","required":true},"liableParty":{"ref":"IncidentLiablePartyEnum","required":true},"repairCost":{"dataType":"double","required":true},"staffEvidenceImages":{"dataType":"array","array":{"dataType":"string"},"required":true},"resolutionNotes":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResolveIncidentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofresolveIncidentSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcloseIncidentSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CloseIncidentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcloseIncidentSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcancelIncidentSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"cancellationReason":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CancelIncidentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcancelIncidentSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityUnitTypeOfferingStatusEnum": {
        "dataType": "refEnum",
        "enums": ["active","inactive"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeoffacilityUnitTypeOfferingResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"notes":{"dataType":"string"},"rackZonePricing":{"dataType":"nestedObjectLiteral","nestedProperties":{"ECONOMY":{"dataType":"double","required":true},"STANDARD":{"dataType":"double","required":true},"PRIME":{"dataType":"double","required":true}}},"status":{"ref":"FacilityUnitTypeOfferingStatusEnum","required":true},"minRentalDays":{"dataType":"double","required":true},"depositMultiplier":{"dataType":"double","required":true},"pricePerUnit":{"dataType":"double","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"unitType":{"dataType":"nestedObjectLiteral","nestedProperties":{"category":{"ref":"UnitTypeCategoryEnum"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}},"required":true},"status":{"ref":"UnitTypeStatusEnum","required":true},"volume":{"dataType":"double","required":true},"area":{"dataType":"double","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"FacilityStatusEnum","required":true},"address":{"dataType":"string","required":true},"city":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityUnitTypeOfferingResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeoffacilityUnitTypeOfferingResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_FacilityUnitTypeOfferingResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"FacilityUnitTypeOfferingResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_FacilityUnitTypeOfferingResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_FacilityUnitTypeOfferingResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofofferingQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"maxPrice":{"dataType":"double"},"minPrice":{"dataType":"double"},"status":{"ref":"FacilityUnitTypeOfferingStatusEnum"},"billingUnit":{"ref":"BillingUnitEnum"},"unitTypeId":{"dataType":"string"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["pricePerUnit"]},{"dataType":"enum","enums":["minRentalDays"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfferingQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofofferingQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_FacilityUnitTypeOfferingResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"FacilityUnitTypeOfferingResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateOfferingSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"status":{"ref":"FacilityUnitTypeOfferingStatusEnum"},"rackZonePricing":{"dataType":"nestedObjectLiteral","nestedProperties":{"ECONOMY":{"dataType":"double","required":true},"STANDARD":{"dataType":"double","required":true},"PRIME":{"dataType":"double","required":true}}},"minRentalDays":{"dataType":"double","required":true},"depositMultiplier":{"dataType":"double","required":true},"pricePerUnit":{"dataType":"double","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"unitTypeId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateOfferingRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateOfferingSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateOfferingSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"status":{"ref":"FacilityUnitTypeOfferingStatusEnum"},"minRentalDays":{"dataType":"double"},"depositMultiplier":{"dataType":"double"},"rackZonePricing":{"dataType":"nestedObjectLiteral","nestedProperties":{"ECONOMY":{"dataType":"double","required":true},"STANDARD":{"dataType":"double","required":true},"PRIME":{"dataType":"double","required":true}}},"pricePerUnit":{"dataType":"double"},"billingUnit":{"ref":"BillingUnitEnum"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateOfferingRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateOfferingSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofavailableTimeSlotItemResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"isAvailable":{"dataType":"boolean","required":true},"availableCapacity":{"dataType":"double","required":true},"bookedCount":{"dataType":"double","required":true},"maxCapacity":{"dataType":"double","required":true},"endTime":{"dataType":"string","required":true},"startTime":{"dataType":"string","required":true},"slotName":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AvailableTimeSlotItemResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofavailableTimeSlotItemResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_AvailableTimeSlotItemResponse-Array_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"array","array":{"dataType":"refAlias","ref":"AvailableTimeSlotItemResponse"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeoffacilityTimeSlotResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"updatedAt":{"dataType":"string","required":true},"createdAt":{"dataType":"string","required":true},"isActive":{"dataType":"boolean","required":true},"maxCapacity":{"dataType":"double","required":true},"endTime":{"dataType":"string","required":true},"startTime":{"dataType":"string","required":true},"slotName":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityTimeSlotResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeoffacilityTimeSlotResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_FacilityTimeSlotResponse-Array_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"array","array":{"dataType":"refAlias","ref":"FacilityTimeSlotResponse"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_FacilityTimeSlotResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"FacilityTimeSlotResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateFacilityTimeSlotSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"isActive":{"dataType":"boolean","required":true},"maxCapacity":{"dataType":"double","required":true},"endTime":{"dataType":"string","required":true},"startTime":{"dataType":"string","required":true},"slotName":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateFacilityTimeSlotRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateFacilityTimeSlotSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateFacilityTimeSlotSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"isActive":{"dataType":"boolean"},"maxCapacity":{"dataType":"double"},"endTime":{"dataType":"string"},"startTime":{"dataType":"string"},"slotName":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateFacilityTimeSlotRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateFacilityTimeSlotSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeoffacilityResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"operatingHours":{"dataType":"nestedObjectLiteral","nestedProperties":{"close":{"dataType":"string","required":true},"open":{"dataType":"string","required":true}}},"managerId":{"dataType":"string"},"description":{"dataType":"string"},"email":{"dataType":"string"},"phone":{"dataType":"string"},"code":{"dataType":"string"},"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"status":{"ref":"FacilityStatusEnum","required":true},"city":{"dataType":"string","required":true},"address":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeoffacilityResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_FacilityResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"FacilityResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MyFacilityDashboardFacility": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "address": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "status": {"ref":"FacilityStatusEnum","required":true},
            "phone": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "email": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MyFacilityStorageUnitsBreakdown": {
        "dataType": "refObject",
        "properties": {
            "total": {"dataType":"double","required":true},
            "available": {"dataType":"double","required":true},
            "underMaintenance": {"dataType":"double","required":true},
            "occupied": {"dataType":"double","required":true},
            "reserved": {"dataType":"double","required":true},
            "inactive": {"dataType":"double","required":true},
            "occupancyRate": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MyFacilityAmenitiesSummary": {
        "dataType": "refObject",
        "properties": {
            "totalOfferings": {"dataType":"double","required":true},
            "totalQuantity": {"dataType":"double","required":true},
            "inUseQuantity": {"dataType":"double","required":true},
            "availableQuantity": {"dataType":"double","required":true},
            "outOfStockOfferingsCount": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MyFacilityDashboardResponse": {
        "dataType": "refObject",
        "properties": {
            "facility": {"ref":"MyFacilityDashboardFacility","required":true},
            "storageUnits": {"ref":"MyFacilityStorageUnitsBreakdown","required":true},
            "amenities": {"ref":"MyFacilityAmenitiesSummary","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_MyFacilityDashboardResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"MyFacilityDashboardResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeoffacilityStaffQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"UserStatusEnum"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["email"]},{"dataType":"enum","enums":["createdAt"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityStaffQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeoffacilityStaffQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityAmenityOfferingStatusEnum": {
        "dataType": "refEnum",
        "enums": ["active","inactive","out_of_stock"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AmenityTypeEnum": {
        "dataType": "refEnum",
        "enums": ["physical","service"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AmenityStatusEnum": {
        "dataType": "refEnum",
        "enums": ["active","inactive"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeoffacilityAmenityOfferingResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}]},"createdAt":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}]},"notes":{"dataType":"string"},"availableQuantity":{"dataType":"double"},"inUseQuantity":{"dataType":"double"},"totalQuantity":{"dataType":"double"},"amenity":{"dataType":"nestedObjectLiteral","nestedProperties":{"description":{"dataType":"string"},"tags":{"dataType":"array","array":{"dataType":"string"},"required":true},"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"status":{"ref":"AmenityStatusEnum","required":true},"type":{"ref":"AmenityTypeEnum","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"FacilityStatusEnum","required":true},"address":{"dataType":"string","required":true},"city":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"status":{"ref":"FacilityAmenityOfferingStatusEnum","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"pricePerUnit":{"dataType":"double","required":true},"amenityId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityAmenityOfferingResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeoffacilityAmenityOfferingResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_FacilityAmenityOfferingResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"FacilityAmenityOfferingResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_FacilityAmenityOfferingResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_FacilityAmenityOfferingResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeoffacilityAmenityOfferingQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"maxPrice":{"dataType":"double"},"minPrice":{"dataType":"double"},"status":{"ref":"FacilityAmenityOfferingStatusEnum"},"billingUnit":{"ref":"BillingUnitEnum"},"amenityId":{"dataType":"string"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["pricePerUnit"]},{"dataType":"enum","enums":["totalQuantity"]},{"dataType":"enum","enums":["inUseQuantity"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityAmenityOfferingQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeoffacilityAmenityOfferingQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_FacilityAmenityOfferingResponse-Array_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"array","array":{"dataType":"refAlias","ref":"FacilityAmenityOfferingResponse"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_FacilityAmenityOfferingResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"FacilityAmenityOfferingResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateFacilityAmenityOfferingSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"totalQuantity":{"dataType":"double"},"status":{"ref":"FacilityAmenityOfferingStatusEnum","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"pricePerUnit":{"dataType":"double","required":true},"amenityId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateFacilityAmenityOfferingRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateFacilityAmenityOfferingSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateFacilityAmenityOfferingSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"status":{"ref":"FacilityAmenityOfferingStatusEnum"},"totalQuantity":{"dataType":"double"},"billingUnit":{"ref":"BillingUnitEnum"},"pricePerUnit":{"dataType":"double"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateFacilityAmenityOfferingRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateFacilityAmenityOfferingSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_FacilityResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"FacilityResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_FacilityResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_FacilityResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeoffacilityQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"FacilityStatusEnum"},"city":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["city"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeoffacilityQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofsearchByAmenityQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"search":{"dataType":"string"},"city":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["city"]}],"required":true},"matchAll":{"dataType":"boolean","required":true},"amenityIds":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SearchByAmenityQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofsearchByAmenityQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeoffacilityPublicDetailResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"amenityOfferings":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"availableQuantity":{"dataType":"double"},"inUseQuantity":{"dataType":"double"},"totalQuantity":{"dataType":"double"},"status":{"ref":"FacilityAmenityOfferingStatusEnum","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"pricePerUnit":{"dataType":"double","required":true},"amenity":{"dataType":"nestedObjectLiteral","nestedProperties":{"tags":{"dataType":"array","array":{"dataType":"string"}},"images":{"dataType":"array","array":{"dataType":"string"}},"description":{"dataType":"string"},"status":{"ref":"AmenityStatusEnum","required":true},"type":{"ref":"AmenityTypeEnum","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},"amenityId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true},"unitTypeOfferings":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"availableUnitsCount":{"dataType":"double","required":true},"status":{"ref":"FacilityUnitTypeOfferingStatusEnum","required":true},"minRentalDays":{"dataType":"double","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"depositMultiplier":{"dataType":"double","required":true},"pricePerUnit":{"dataType":"double","required":true},"unitType":{"dataType":"nestedObjectLiteral","nestedProperties":{"description":{"dataType":"string"},"status":{"ref":"UnitTypeStatusEnum","required":true},"volume":{"dataType":"double","required":true},"area":{"dataType":"double","required":true},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}},"required":true},"category":{"ref":"UnitTypeCategoryEnum","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},"unitTypeId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"operatingHours":{"dataType":"nestedObjectLiteral","nestedProperties":{"close":{"dataType":"string","required":true},"open":{"dataType":"string","required":true}}},"managerId":{"dataType":"string"},"description":{"dataType":"string"},"email":{"dataType":"string"},"phone":{"dataType":"string"},"code":{"dataType":"string"},"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"status":{"ref":"FacilityStatusEnum","required":true},"city":{"dataType":"string","required":true},"address":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FacilityPublicDetailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeoffacilityPublicDetailResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_FacilityPublicDetailResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"FacilityPublicDetailResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateFacilitySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"operatingHours":{"dataType":"nestedObjectLiteral","nestedProperties":{"close":{"dataType":"string","required":true},"open":{"dataType":"string","required":true}}},"images":{"dataType":"array","array":{"dataType":"string"}},"description":{"dataType":"string"},"email":{"dataType":"string"},"phone":{"dataType":"string"},"code":{"dataType":"string"},"city":{"dataType":"string","required":true},"address":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateFacilityRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateFacilitySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateFacilitySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"operatingHours":{"dataType":"nestedObjectLiteral","nestedProperties":{"close":{"dataType":"string","required":true},"open":{"dataType":"string","required":true}}},"images":{"dataType":"array","array":{"dataType":"string"}},"status":{"ref":"FacilityStatusEnum"},"description":{"dataType":"string"},"email":{"dataType":"string"},"phone":{"dataType":"string"},"city":{"dataType":"string"},"address":{"dataType":"string"},"code":{"dataType":"string"},"name":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateFacilityRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateFacilitySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofassignManagerSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"managerId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AssignManagerRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofassignManagerSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustomerSkuStatusEnum": {
        "dataType": "refEnum",
        "enums": ["active","inactive"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcustomerSkuResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"customer":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"notes":{"dataType":"string"},"imageUrl":{"dataType":"string"},"weightKg":{"dataType":"double"},"volume":{"dataType":"double"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"barcode":{"dataType":"string"},"category":{"dataType":"string"},"description":{"dataType":"string"},"status":{"ref":"CustomerSkuStatusEnum","required":true},"uom":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"skuCode":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustomerSkuResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcustomerSkuResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_CustomerSkuResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"CustomerSkuResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateCustomerSkuSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"status":{"ref":"CustomerSkuStatusEnum"},"imageUrl":{"dataType":"string"},"weightKg":{"dataType":"double"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"uom":{"dataType":"string"},"barcode":{"dataType":"string"},"category":{"dataType":"string"},"description":{"dataType":"string"},"customerId":{"dataType":"string"},"name":{"dataType":"string","required":true},"skuCode":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateCustomerSkuRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateCustomerSkuSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_CustomerSkuResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"CustomerSkuResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_CustomerSkuResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_CustomerSkuResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcustomerSkuQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"barcode":{"dataType":"string"},"skuCode":{"dataType":"string"},"search":{"dataType":"string"},"category":{"dataType":"string"},"status":{"ref":"CustomerSkuStatusEnum"},"customerId":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["skuCode"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustomerSkuQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcustomerSkuQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateCustomerSkuSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"status":{"ref":"CustomerSkuStatusEnum"},"imageUrl":{"dataType":"string"},"weightKg":{"dataType":"double"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"uom":{"dataType":"string"},"barcode":{"dataType":"string"},"category":{"dataType":"string"},"description":{"dataType":"string"},"name":{"dataType":"string"},"skuCode":{"dataType":"string"},"customerId":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateCustomerSkuRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateCustomerSkuSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InventoryRequestTypeEnum": {
        "dataType": "refEnum",
        "enums": ["inbound","outbound"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InventoryRequestStatusEnum": {
        "dataType": "refEnum",
        "enums": ["pending","pending_confirmation","processing","ready_to_putaway","completed","disputed","cancelled","expired"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofinventoryRequestResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"isAutoConfirmed":{"dataType":"boolean"},"cancelledAt":{"dataType":"datetime"},"completedBy":{"dataType":"string"},"completedAt":{"dataType":"datetime"},"verifiedBy":{"dataType":"string"},"verifiedAt":{"dataType":"datetime"},"customerFeedbackNotes":{"dataType":"string"},"discrepancyImages":{"dataType":"array","array":{"dataType":"string"}},"discrepancyReason":{"dataType":"string"},"staffNotes":{"dataType":"string"},"signatureUrl":{"dataType":"string"},"evidenceImages":{"dataType":"array","array":{"dataType":"string"}},"transporterInfo":{"dataType":"nestedObjectLiteral","nestedProperties":{"deliveryCompany":{"dataType":"string"},"vehiclePlate":{"dataType":"string"},"phoneNumber":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}}},"expiresAt":{"dataType":"datetime"},"rawOtpCode":{"dataType":"string"},"pickupQrPayload":{"dataType":"string"},"pickupQrToken":{"dataType":"string"},"unitNumber":{"dataType":"string"},"facilityName":{"dataType":"string"},"facilityCode":{"dataType":"string"},"updatedAt":{"dataType":"datetime","required":true},"createdAt":{"dataType":"datetime","required":true},"isVerified":{"dataType":"boolean","required":true},"items":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"tierNumber":{"dataType":"double"},"rackTierId":{"dataType":"string"},"zone":{"dataType":"string"},"bay":{"dataType":"double"},"aisle":{"dataType":"string"},"rackCode":{"dataType":"string"},"storageRackId":{"dataType":"string"},"discrepancyQuantity":{"dataType":"double"},"actualQuantity":{"dataType":"double"},"uom":{"dataType":"string"},"barcode":{"dataType":"string"},"name":{"dataType":"string"},"skuCode":{"dataType":"string"},"quantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true}}},"required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"contractId":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"status":{"ref":"InventoryRequestStatusEnum","required":true},"type":{"ref":"InventoryRequestTypeEnum","required":true},"requestCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InventoryRequestResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofinventoryRequestResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_InventoryRequestResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"InventoryRequestResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateOutboundRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"transporterInfo":{"dataType":"nestedObjectLiteral","nestedProperties":{"deliveryCompany":{"dataType":"string"},"vehiclePlate":{"dataType":"string"},"phoneNumber":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}}},"items":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"rackTierId":{"dataType":"string","required":true},"storageRackId":{"dataType":"string","required":true},"quantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true}}},"required":true},"contractId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateOutboundRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateOutboundRequestSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofverifiedHandoverDetailsResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"transporterInfo":{"dataType":"nestedObjectLiteral","nestedProperties":{"deliveryCompany":{"dataType":"string"},"vehiclePlate":{"dataType":"string"},"phoneNumber":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}}},"unitNumber":{"dataType":"string"},"customerPhone":{"dataType":"string"},"customerName":{"dataType":"string"},"verifiedBy":{"dataType":"string","required":true},"verifiedAt":{"dataType":"datetime","required":true},"items":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"tierNumber":{"dataType":"double"},"rackTierId":{"dataType":"string"},"zone":{"dataType":"string"},"bay":{"dataType":"double"},"aisle":{"dataType":"string"},"rackCode":{"dataType":"string"},"storageRackId":{"dataType":"string"},"discrepancyQuantity":{"dataType":"double"},"actualQuantity":{"dataType":"double"},"uom":{"dataType":"string"},"barcode":{"dataType":"string"},"name":{"dataType":"string"},"skuCode":{"dataType":"string"},"quantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true}}},"required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"contractId":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"status":{"ref":"InventoryRequestStatusEnum","required":true},"type":{"ref":"InventoryRequestTypeEnum","required":true},"requestCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "VerifiedHandoverDetailsResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofverifiedHandoverDetailsResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_VerifiedHandoverDetailsResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"VerifiedHandoverDetailsResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofverifyPickupCodeSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"requestCode":{"dataType":"string"},"pickupCode":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "VerifyPickupCodeRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofverifyPickupCodeSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcompleteOutboundHandoverSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"discrepancyImages":{"dataType":"array","array":{"dataType":"string"}},"discrepancyReason":{"dataType":"string"},"actualItems":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"rackTierId":{"dataType":"string"},"storageRackId":{"dataType":"string"},"actualQuantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true}}}},"staffNotes":{"dataType":"string"},"signatureUrl":{"dataType":"string"},"evidenceImages":{"dataType":"array","array":{"dataType":"string"},"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CompleteOutboundHandoverRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcompleteOutboundHandoverSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcancelOutboundRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"reason":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CancelOutboundRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcancelOutboundRequestSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateInboundRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"staffNotes":{"dataType":"string"},"signatureUrl":{"dataType":"string"},"evidenceImages":{"dataType":"array","array":{"dataType":"string"},"required":true},"transporterInfo":{"dataType":"nestedObjectLiteral","nestedProperties":{"deliveryCompany":{"dataType":"string"},"vehiclePlate":{"dataType":"string"},"phoneNumber":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}},"required":true},"items":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"rackTierId":{"dataType":"string"},"storageRackId":{"dataType":"string"},"quantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true}}},"required":true},"contractId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateInboundRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateInboundRequestSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofdisputeInboundRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"disputeReason":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DisputeInboundRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofdisputeInboundRequestSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofputawayInboundRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"placements":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"rackTierId":{"dataType":"string","required":true},"storageRackId":{"dataType":"string","required":true},"quantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true}}},"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PutawayInboundRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofputawayInboundRequestSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofpaginatedInventoryRequestResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"pagination":{"dataType":"nestedObjectLiteral","nestedProperties":{"hasPrevPage":{"dataType":"boolean","required":true},"hasNextPage":{"dataType":"boolean","required":true},"totalPages":{"dataType":"double","required":true},"totalItems":{"dataType":"double","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"required":true},"items":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"isAutoConfirmed":{"dataType":"boolean"},"cancelledAt":{"dataType":"datetime"},"completedBy":{"dataType":"string"},"completedAt":{"dataType":"datetime"},"verifiedBy":{"dataType":"string"},"verifiedAt":{"dataType":"datetime"},"customerFeedbackNotes":{"dataType":"string"},"discrepancyImages":{"dataType":"array","array":{"dataType":"string"}},"discrepancyReason":{"dataType":"string"},"staffNotes":{"dataType":"string"},"signatureUrl":{"dataType":"string"},"evidenceImages":{"dataType":"array","array":{"dataType":"string"}},"transporterInfo":{"dataType":"nestedObjectLiteral","nestedProperties":{"deliveryCompany":{"dataType":"string"},"vehiclePlate":{"dataType":"string"},"phoneNumber":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}}},"expiresAt":{"dataType":"datetime"},"rawOtpCode":{"dataType":"string"},"pickupQrPayload":{"dataType":"string"},"pickupQrToken":{"dataType":"string"},"unitNumber":{"dataType":"string"},"facilityName":{"dataType":"string"},"facilityCode":{"dataType":"string"},"updatedAt":{"dataType":"datetime","required":true},"createdAt":{"dataType":"datetime","required":true},"isVerified":{"dataType":"boolean","required":true},"items":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"tierNumber":{"dataType":"double"},"rackTierId":{"dataType":"string"},"zone":{"dataType":"string"},"bay":{"dataType":"double"},"aisle":{"dataType":"string"},"rackCode":{"dataType":"string"},"storageRackId":{"dataType":"string"},"discrepancyQuantity":{"dataType":"double"},"actualQuantity":{"dataType":"double"},"uom":{"dataType":"string"},"barcode":{"dataType":"string"},"name":{"dataType":"string"},"skuCode":{"dataType":"string"},"quantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true}}},"required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"contractId":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"status":{"ref":"InventoryRequestStatusEnum","required":true},"type":{"ref":"InventoryRequestTypeEnum","required":true},"requestCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedInventoryRequestResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofpaginatedInventoryRequestResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedInventoryRequestResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedInventoryRequestResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InventoryRequestQuery": {
        "dataType": "refObject",
        "properties": {
            "page": {"dataType":"double"},
            "limit": {"dataType":"double"},
            "search": {"dataType":"string"},
            "sortBy": {"dataType":"string"},
            "sortOrder": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}]},
            "customerId": {"dataType":"string"},
            "facilityId": {"dataType":"string"},
            "contractId": {"dataType":"string"},
            "type": {"ref":"InventoryRequestTypeEnum"},
            "status": {"ref":"InventoryRequestStatusEnum"},
            "startDate": {"dataType":"string"},
            "endDate": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcustomerInventoryResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"sku":{"dataType":"nestedObjectLiteral","nestedProperties":{"imageUrl":{"dataType":"string"},"barcode":{"dataType":"string"},"category":{"dataType":"string"},"uom":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"skuCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"rackTier":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"maxWeightKg":{"dataType":"double"},"tierCode":{"dataType":"string","required":true},"tierNumber":{"dataType":"double","required":true},"id":{"dataType":"string","required":true}}},"storageRack":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"name":{"dataType":"string"},"rackCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"address":{"dataType":"string"},"city":{"dataType":"string"},"code":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"contract":{"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"status":{"dataType":"string","required":true},"contractCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"customer":{"dataType":"nestedObjectLiteral","nestedProperties":{"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"notes":{"dataType":"string"},"lastMovementAt":{"dataType":"string"},"rackTierId":{"dataType":"string"},"storageRackId":{"dataType":"string"},"quantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"contractId":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustomerInventoryResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcustomerInventoryResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_CustomerInventoryResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"CustomerInventoryResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StockInRequest": {
        "dataType": "refObject",
        "properties": {
            "contractId": {"dataType":"string","required":true},
            "skuId": {"dataType":"string","required":true},
            "rackTierId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "quantity": {"dataType":"double","required":true},
            "referenceCode": {"dataType":"string"},
            "notes": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StockOutRequest": {
        "dataType": "refObject",
        "properties": {
            "contractId": {"dataType":"string","required":true},
            "skuId": {"dataType":"string","required":true},
            "rackTierId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "quantity": {"dataType":"double","required":true},
            "reason": {"dataType":"string"},
            "referenceCode": {"dataType":"string"},
            "notes": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StockMoveRequest": {
        "dataType": "refObject",
        "properties": {
            "contractId": {"dataType":"string","required":true},
            "skuId": {"dataType":"string","required":true},
            "fromRackTierId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "toRackTierId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "quantity": {"dataType":"double","required":true},
            "reason": {"dataType":"string"},
            "notes": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StockAdjustRequest": {
        "dataType": "refObject",
        "properties": {
            "contractId": {"dataType":"string","required":true},
            "skuId": {"dataType":"string","required":true},
            "rackTierId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "newQuantity": {"dataType":"double","required":true},
            "reason": {"dataType":"string","required":true},
            "notes": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MovementTypeEnum": {
        "dataType": "refEnum",
        "enums": ["in","out","move","adjust"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofinventoryMovementResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"performer":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"toRackTier":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"maxWeightKg":{"dataType":"double"},"tierCode":{"dataType":"string","required":true},"tierNumber":{"dataType":"double","required":true},"id":{"dataType":"string","required":true}}},"fromRackTier":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"maxWeightKg":{"dataType":"double"},"tierCode":{"dataType":"string","required":true},"tierNumber":{"dataType":"double","required":true},"id":{"dataType":"string","required":true}}},"sku":{"dataType":"nestedObjectLiteral","nestedProperties":{"imageUrl":{"dataType":"string"},"barcode":{"dataType":"string"},"category":{"dataType":"string"},"uom":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"skuCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"address":{"dataType":"string"},"city":{"dataType":"string"},"code":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"contract":{"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"status":{"dataType":"string","required":true},"contractCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"customer":{"dataType":"nestedObjectLiteral","nestedProperties":{"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"notes":{"dataType":"string"},"referenceCode":{"dataType":"string"},"reason":{"dataType":"string"},"toRackTierId":{"dataType":"string"},"fromRackTierId":{"dataType":"string"},"customerInventoryId":{"dataType":"string"},"performedBy":{"dataType":"string","required":true},"newQuantity":{"dataType":"double","required":true},"previousQuantity":{"dataType":"double","required":true},"quantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"contractId":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"type":{"ref":"MovementTypeEnum","required":true},"movementCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InventoryMovementResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofinventoryMovementResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_InventoryMovementResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"InventoryMovementResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_InventoryMovementResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_InventoryMovementResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofinventoryMovementQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"type":{"ref":"MovementTypeEnum"},"customerId":{"dataType":"string"},"rackTierId":{"dataType":"string"},"skuId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"contractId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["type"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["quantity"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InventoryMovementQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofinventoryMovementQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_CustomerInventoryResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"CustomerInventoryResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_CustomerInventoryResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_CustomerInventoryResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcustomerInventoryQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"minQuantity":{"dataType":"double"},"customerId":{"dataType":"string"},"skuId":{"dataType":"string"},"rackTierId":{"dataType":"string"},"storageRackId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"contractId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["quantity"]},{"dataType":"enum","enums":["lastMovementAt"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustomerInventoryQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcustomerInventoryQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofstorageUnitInventoryTreeResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"contract":{"dataType":"nestedObjectLiteral","nestedProperties":{"customer":{"dataType":"nestedObjectLiteral","nestedProperties":{"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"status":{"dataType":"string","required":true},"contractCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"address":{"dataType":"string"},"city":{"dataType":"string"},"code":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"unrackedItems":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"lastMovementAt":{"dataType":"string"},"sku":{"dataType":"nestedObjectLiteral","nestedProperties":{"imageUrl":{"dataType":"string"},"weightKg":{"dataType":"double"},"volume":{"dataType":"double"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"barcode":{"dataType":"string"},"category":{"dataType":"string"},"uom":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"skuCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},"quantity":{"dataType":"double","required":true},"inventoryId":{"dataType":"string","required":true}}},"required":true},"racks":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"name":{"dataType":"string"},"tiers":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"volume":{"dataType":"double"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"maxWeightKg":{"dataType":"double"},"items":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"lastMovementAt":{"dataType":"string"},"sku":{"dataType":"nestedObjectLiteral","nestedProperties":{"imageUrl":{"dataType":"string"},"weightKg":{"dataType":"double"},"volume":{"dataType":"double"},"dimensions":{"dataType":"nestedObjectLiteral","nestedProperties":{"height":{"dataType":"double","required":true},"width":{"dataType":"double","required":true},"length":{"dataType":"double","required":true}}},"barcode":{"dataType":"string"},"category":{"dataType":"string"},"uom":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"skuCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},"quantity":{"dataType":"double","required":true},"inventoryId":{"dataType":"string","required":true}}},"required":true},"tierCode":{"dataType":"string","required":true},"tierNumber":{"dataType":"double","required":true},"id":{"dataType":"string","required":true}}},"required":true},"tierCount":{"dataType":"double","required":true},"rackCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true},"summary":{"dataType":"nestedObjectLiteral","nestedProperties":{"totalQuantity":{"dataType":"double","required":true},"totalSkus":{"dataType":"double","required":true},"availableTiers":{"dataType":"double","required":true},"occupiedTiers":{"dataType":"double","required":true},"totalTiers":{"dataType":"double","required":true},"totalRacks":{"dataType":"double","required":true}},"required":true},"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StorageUnitInventoryTreeResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofstorageUnitInventoryTreeResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_StorageUnitInventoryTreeResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"StorageUnitInventoryTreeResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofskuLocationsResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"locations":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"rackTier":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"maxWeightKg":{"dataType":"double"},"tierCode":{"dataType":"string","required":true},"tierNumber":{"dataType":"double","required":true},"id":{"dataType":"string","required":true}}},"storageRack":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"name":{"dataType":"string"},"rackCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"contract":{"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"status":{"dataType":"string","required":true},"contractCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"address":{"dataType":"string"},"city":{"dataType":"string"},"code":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"notes":{"dataType":"string"},"lastMovementAt":{"dataType":"string"},"quantity":{"dataType":"double","required":true},"inventoryId":{"dataType":"string","required":true}}},"required":true},"sku":{"dataType":"nestedObjectLiteral","nestedProperties":{"imageUrl":{"dataType":"string"},"barcode":{"dataType":"string"},"category":{"dataType":"string"},"totalQuantity":{"dataType":"double","required":true},"uom":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"skuCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SkuLocationsResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofskuLocationsResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_SkuLocationsResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"SkuLocationsResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcustomerInventorySummaryResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"recentMovements":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"performer":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"toRackTier":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"maxWeightKg":{"dataType":"double"},"tierCode":{"dataType":"string","required":true},"tierNumber":{"dataType":"double","required":true},"id":{"dataType":"string","required":true}}},"fromRackTier":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"maxWeightKg":{"dataType":"double"},"tierCode":{"dataType":"string","required":true},"tierNumber":{"dataType":"double","required":true},"id":{"dataType":"string","required":true}}},"sku":{"dataType":"nestedObjectLiteral","nestedProperties":{"imageUrl":{"dataType":"string"},"barcode":{"dataType":"string"},"category":{"dataType":"string"},"uom":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"skuCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"address":{"dataType":"string"},"city":{"dataType":"string"},"code":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"contract":{"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"status":{"dataType":"string","required":true},"contractCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"customer":{"dataType":"nestedObjectLiteral","nestedProperties":{"phoneNumber":{"dataType":"string"},"email":{"dataType":"string"},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"notes":{"dataType":"string"},"referenceCode":{"dataType":"string"},"reason":{"dataType":"string"},"toRackTierId":{"dataType":"string"},"fromRackTierId":{"dataType":"string"},"customerInventoryId":{"dataType":"string"},"performedBy":{"dataType":"string","required":true},"newQuantity":{"dataType":"double","required":true},"previousQuantity":{"dataType":"double","required":true},"quantity":{"dataType":"double","required":true},"skuId":{"dataType":"string","required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"contractId":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"type":{"ref":"MovementTypeEnum","required":true},"movementCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true},"categoryBreakdown":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"totalQuantity":{"dataType":"double","required":true},"skuCount":{"dataType":"double","required":true},"category":{"dataType":"string","required":true}}},"required":true},"totalStorageUnits":{"dataType":"double","required":true},"totalActiveContracts":{"dataType":"double","required":true},"totalQuantity":{"dataType":"double","required":true},"totalSkus":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustomerInventorySummaryResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcustomerInventorySummaryResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_CustomerInventorySummaryResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"CustomerInventorySummaryResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustomerInventorySummaryQuery": {
        "dataType": "refObject",
        "properties": {
            "customerId": {"dataType":"string"},
            "userId": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofbatchMigrateRackResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true},"movementsGenerated":{"dataType":"array","array":{"dataType":"string"},"required":true},"totalQuantityMigrated":{"dataType":"double","required":true},"migratedItemsCount":{"dataType":"double","required":true},"contractId":{"dataType":"string","required":true},"toRackCode":{"dataType":"string","required":true},"fromRackCode":{"dataType":"string","required":true},"toRackId":{"dataType":"string","required":true},"fromRackId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchMigrateRackResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofbatchMigrateRackResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_BatchMigrateRackResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"BatchMigrateRackResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofbatchMigrateRackRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"reason":{"dataType":"string"},"emergencyReason":{"dataType":"string"},"incidentId":{"dataType":"string"},"addendumId":{"dataType":"string"},"contractId":{"dataType":"string"},"toRackId":{"dataType":"string","required":true},"fromRackId":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchMigrateRackRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofbatchMigrateRackRequestSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ContractSourceEnum": {
        "dataType": "refEnum",
        "enums": ["reservation","walk_in"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ContractAddendumTypeEnum": {
        "dataType": "refEnum",
        "enums": ["add","remove"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ContractAddendumStatusEnum": {
        "dataType": "refEnum",
        "enums": ["pending_approval","draft","active","rejected","cancelled"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ContractStatusEnum": {
        "dataType": "refEnum",
        "enums": ["draft","active","overdue","completed","cancelled","terminated"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcontractResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"assignedStaff":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"storageUnit":{"dataType":"nestedObjectLiteral","nestedProperties":{"zone":{"dataType":"string"},"status":{"dataType":"string","required":true},"floor":{"dataType":"double","required":true},"unitNumber":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"offering":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"minRentalDays":{"dataType":"double"},"depositMultiplier":{"dataType":"double"},"unitTypeId":{"dataType":"string"},"pricePerUnit":{"dataType":"double","required":true},"billingUnit":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string"},"email":{"dataType":"string"},"phone":{"dataType":"string"},"address":{"dataType":"string","required":true},"city":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"customer":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"notes":{"dataType":"string"},"staffSignedAt":{"dataType":"string"},"customerSignedAt":{"dataType":"string"},"terminatedAt":{"dataType":"string"},"terminatedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"terminationReason":{"dataType":"string"},"cancelledAt":{"dataType":"string"},"cancelledBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"cancellationReason":{"dataType":"string"},"inspectionNotes":{"dataType":"string"},"inspectedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"depositPaymentId":{"dataType":"string"},"depositPaidAt":{"dataType":"string"},"actualCheckOutDate":{"dataType":"string"},"actualCheckInDate":{"dataType":"string"},"assignedStaffId":{"dataType":"string"},"reservationId":{"dataType":"string"},"updatedAt":{"dataType":"string","required":true},"createdAt":{"dataType":"string","required":true},"staffSigned":{"dataType":"boolean","required":true},"customerSigned":{"dataType":"boolean","required":true},"termsAccepted":{"dataType":"boolean","required":true},"status":{"ref":"ContractStatusEnum","required":true},"additionalPaymentRequired":{"dataType":"double","required":true},"refundAmount":{"dataType":"double","required":true},"overdueFee":{"dataType":"double","required":true},"damageFee":{"dataType":"double","required":true},"renewalCount":{"dataType":"double","required":true},"renewals":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"note":{"dataType":"string"},"renewedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"renewedAt":{"dataType":"string","required":true},"newEndDate":{"dataType":"string","required":true},"previousEndDate":{"dataType":"string","required":true}}},"required":true},"addendums":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"cancelledAt":{"dataType":"string"},"cancelledBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"cancellationReason":{"dataType":"string"},"rejectedAt":{"dataType":"string"},"rejectedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"rejectionReason":{"dataType":"string"},"completedAt":{"dataType":"string"},"staffSignedAt":{"dataType":"string"},"customerSignedAt":{"dataType":"string"},"assignedStaff":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"assignedStaffId":{"dataType":"string"},"approvedAt":{"dataType":"string"},"approvedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"requestedBy":{"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string"},"phoneNumber":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"staffSigned":{"dataType":"boolean","required":true},"customerSigned":{"dataType":"boolean","required":true},"requestedAt":{"dataType":"string","required":true},"status":{"ref":"ContractAddendumStatusEnum","required":true},"damageFee":{"dataType":"double","required":true},"totalPeriodicPrice":{"dataType":"double","required":true},"amenities":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"addedAt":{"dataType":"string","required":true},"totalPrice":{"dataType":"double","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"pricePerUnit":{"dataType":"double","required":true},"quantity":{"dataType":"double","required":true},"name":{"dataType":"string","required":true},"amenityId":{"dataType":"string","required":true},"facilityAmenityOfferingId":{"dataType":"string","required":true}}},"required":true},"type":{"ref":"ContractAddendumTypeEnum","required":true},"addendumCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true},"amenities":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"addedAt":{"dataType":"string","required":true},"totalPrice":{"dataType":"double","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"pricePerUnit":{"dataType":"double","required":true},"quantity":{"dataType":"double","required":true},"name":{"dataType":"string","required":true},"amenityId":{"dataType":"string","required":true},"facilityAmenityOfferingId":{"dataType":"string","required":true}}},"required":true},"totalPeriodicPrice":{"dataType":"double","required":true},"depositAmount":{"dataType":"double","required":true},"rentalPrice":{"dataType":"double","required":true},"billingUnit":{"ref":"BillingUnitEnum","required":true},"endDate":{"dataType":"string","required":true},"startDate":{"dataType":"string","required":true},"facilityUnitTypeOfferingId":{"dataType":"string","required":true},"storageUnitId":{"dataType":"string","required":true},"facilityId":{"dataType":"string","required":true},"customerId":{"dataType":"string","required":true},"source":{"ref":"ContractSourceEnum","required":true},"contractCode":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ContractResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcontractResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_ContractResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"ContractResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateContractSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"assignedStaffId":{"dataType":"string"},"amenities":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"quantity":{"dataType":"double","required":true},"facilityAmenityOfferingId":{"dataType":"string","required":true}}}},"depositAmount":{"dataType":"double"},"rentalPrice":{"dataType":"double"},"billingUnit":{"ref":"BillingUnitEnum"},"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"facilityUnitTypeOfferingId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"customerId":{"dataType":"string"},"reservationId":{"dataType":"string"},"source":{"ref":"ContractSourceEnum","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateContractRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateContractSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_ContractResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"ContractResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_ContractResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_ContractResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcontractQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"endDateTo":{"dataType":"string"},"endDateFrom":{"dataType":"string"},"startDateTo":{"dataType":"string"},"startDateFrom":{"dataType":"string"},"contractCode":{"dataType":"string"},"source":{"ref":"ContractSourceEnum"},"status":{"ref":"ContractStatusEnum"},"facilityUnitTypeOfferingId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"customerId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ContractQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcontractQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcustomerSignContractSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"termsAccepted":{"dataType":"boolean","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustomerSignContractRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcustomerSignContractSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcheckInContractSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"actualCheckInDate":{"dataType":"string"},"termsAccepted":{"dataType":"boolean","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CheckInContractRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcheckInContractSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcancelContractSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"cancellationReason":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CancelContractRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcancelContractSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofrenewContractSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"note":{"dataType":"string"},"newEndDate":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RenewContractRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofrenewContractSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateContractAddendumSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"amenities":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"quantity":{"dataType":"double","required":true},"facilityAmenityOfferingId":{"dataType":"string","required":true}}},"required":true},"type":{"ref":"ContractAddendumTypeEnum","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateContractAddendumRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateContractAddendumSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofapproveContractAddendumSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"assignedStaffId":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApproveContractAddendumRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofapproveContractAddendumSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofrejectContractAddendumSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"rejectionReason":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RejectContractAddendumRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofrejectContractAddendumSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofsignContractAddendumSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"damageFee":{"dataType":"double"},"termsAccepted":{"dataType":"boolean","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SignContractAddendumRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofsignContractAddendumSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcancelContractAddendumSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"cancellationReason":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CancelContractAddendumRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcancelContractAddendumSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcheckOutContractSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"actualCheckOutDate":{"dataType":"string"},"inspectionNotes":{"dataType":"string"},"damageFee":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CheckOutContractRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcheckOutContractSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofterminateContractSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"terminationReason":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TerminateContractRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofterminateContractSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApprovalRequestTargetTypeEnum": {
        "dataType": "refEnum",
        "enums": ["unit_type","facility_unit_type_offering","amenity","facility_amenity_offering"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApprovalRequestActionEnum": {
        "dataType": "refEnum",
        "enums": ["create","update"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApprovalRequestStatusEnum": {
        "dataType": "refEnum",
        "enums": ["pending","approved","rejected","cancelled"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofapprovalRequestResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"string"},"createdAt":{"dataType":"string"},"targetCurrentData":{"ref":"Record_string.unknown_"},"reviewNotes":{"dataType":"string"},"rejectionReason":{"dataType":"string"},"reviewedAt":{"dataType":"string"},"approver":{"dataType":"nestedObjectLiteral","nestedProperties":{"phoneNumber":{"dataType":"string"},"role":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"approverId":{"dataType":"string"},"targetId":{"dataType":"string"},"facility":{"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string","required":true},"address":{"dataType":"string","required":true},"city":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"requester":{"dataType":"nestedObjectLiteral","nestedProperties":{"phoneNumber":{"dataType":"string"},"role":{"dataType":"string"},"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"status":{"ref":"ApprovalRequestStatusEnum","required":true},"reason":{"dataType":"string","required":true},"payload":{"ref":"Record_string.unknown_","required":true},"action":{"ref":"ApprovalRequestActionEnum","required":true},"targetType":{"ref":"ApprovalRequestTargetTypeEnum","required":true},"facilityId":{"dataType":"string","required":true},"requesterId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApprovalRequestResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofapprovalRequestResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_ApprovalRequestResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"ApprovalRequestResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateApprovalRequest": {
        "dataType": "refObject",
        "properties": {
            "facilityId": {"dataType":"string"},
            "targetType": {"ref":"ApprovalRequestTargetTypeEnum","required":true},
            "action": {"ref":"ApprovalRequestActionEnum","required":true},
            "targetId": {"dataType":"string"},
            "payload": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"any"},"required":true},
            "reason": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_ApprovalRequestResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"ApprovalRequestResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_ApprovalRequestResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_ApprovalRequestResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofapprovalRequestQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"ApprovalRequestStatusEnum"},"targetType":{"ref":"ApprovalRequestTargetTypeEnum"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["targetType"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApprovalRequestQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofapprovalRequestQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApprovalReviewDecisionEnum.APPROVE": {
        "dataType": "refEnum",
        "enums": ["approve"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApprovalReviewDecisionEnum.REJECT": {
        "dataType": "refEnum",
        "enums": ["reject"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofreviewApprovalRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"nestedObjectLiteral","nestedProperties":{"notes":{"dataType":"string"},"action":{"ref":"ApprovalReviewDecisionEnum.APPROVE","required":true}}},{"dataType":"nestedObjectLiteral","nestedProperties":{"rejectionReason":{"dataType":"string","required":true},"action":{"ref":"ApprovalReviewDecisionEnum.REJECT","required":true}}}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReviewApprovalRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofreviewApprovalRequestSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofamenityResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"updatedAt":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}]},"createdAt":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}]},"description":{"dataType":"string"},"tags":{"dataType":"array","array":{"dataType":"string"},"required":true},"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"status":{"ref":"AmenityStatusEnum","required":true},"type":{"ref":"AmenityTypeEnum","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AmenityResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofamenityResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedData_AmenityResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refAlias","ref":"AmenityResponse"},"required":true},
            "pagination": {"ref":"PaginationMeta","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_PaginatedData_AmenityResponse__": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"PaginatedData_AmenityResponse_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofamenityQuerySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"AmenityStatusEnum"},"type":{"ref":"AmenityTypeEnum"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["type"]},{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AmenityQuery": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofamenityQuerySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiResponse_AmenityResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "statusCode": {"dataType":"double","required":true},
            "messageCode": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"ref":"AmenityResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofcreateAmenitySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"description":{"dataType":"string"},"tags":{"dataType":"array","array":{"dataType":"string"},"required":true},"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"status":{"ref":"AmenityStatusEnum","required":true},"type":{"ref":"AmenityTypeEnum","required":true},"name":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateAmenityRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofcreateAmenitySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofupdateAmenitySchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"tags":{"dataType":"array","array":{"dataType":"string"}},"images":{"dataType":"array","array":{"dataType":"string"}},"status":{"ref":"AmenityStatusEnum"},"type":{"ref":"AmenityTypeEnum"},"description":{"dataType":"string"},"name":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateAmenityRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofupdateAmenitySchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsUserController_findAllUser: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"sort":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]},{"dataType":"enum","enums":["a-z"]},{"dataType":"enum","enums":["z-a"]}]},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["email"]},{"dataType":"enum","enums":["role"]},{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/users',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.findAllUser)),

            async function UserController_findAllUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_findAllUser, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findAllUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_searchUser: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"sort":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]},{"dataType":"enum","enums":["a-z"]},{"dataType":"enum","enums":["z-a"]}]},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["email"]},{"dataType":"enum","enums":["role"]},{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/users/search',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.searchUser)),

            async function UserController_searchUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_searchUser, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'searchUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_findUserById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/users/:id',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.findUserById)),

            async function UserController_findUserById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_findUserById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findUserById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_createUser: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateUserRequest"},
        };
        app.post('/users',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.createUser)),

            async function UserController_createUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_createUser, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_updateUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateUserRequest"},
        };
        app.patch('/users/:id',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.updateUser)),

            async function UserController_updateUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_updateUser, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_deleteUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","dataType":"object"},
        };
        app.delete('/users/:id',
            authenticateMiddleware([{"bearerAuth":[]},{"cookieAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.deleteUser)),

            async function UserController_deleteUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_deleteUser, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_restoreUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/users/:id/restore',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.restoreUser)),

            async function UserController_restoreUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_restoreUser, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'restoreUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_sendOtp: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"SendOtpRequest"},
        };
        app.post('/auth/send-otp',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.sendOtp)),

            async function AuthController_sendOtp(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_sendOtp, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'sendOtp',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_register: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"RegisterRequest"},
                req: {"in":"request","name":"req","dataType":"object"},
        };
        app.post('/auth/register',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.register)),

            async function AuthController_register(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_register, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'register',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_login: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"LoginRequest"},
                req: {"in":"request","name":"req","dataType":"object"},
        };
        app.post('/auth/login',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.login)),

            async function AuthController_login(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_login, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'login',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_refreshToken: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","ref":"RefreshTokenRequest"},
                req: {"in":"request","name":"req","dataType":"object"},
        };
        app.post('/auth/refresh',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.refreshToken)),

            async function AuthController_refreshToken(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_refreshToken, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'refreshToken',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_logout: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","ref":"RefreshTokenRequest"},
                req: {"in":"request","name":"req","dataType":"object"},
        };
        app.post('/auth/logout',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.logout)),

            async function AuthController_logout(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_logout, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'logout',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_getMe: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/auth/me',
            authenticateMiddleware([{"bearerAuth":[]},{"cookieAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.getMe)),

            async function AuthController_getMe(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_getMe, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getMe',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_forgotPassword: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ForgotPasswordRequest"},
        };
        app.post('/auth/forgot-password',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.forgotPassword)),

            async function AuthController_forgotPassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_forgotPassword, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'forgotPassword',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_resetPassword: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ResetPasswordRequest"},
        };
        app.post('/auth/reset-password',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.resetPassword)),

            async function AuthController_resetPassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_resetPassword, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'resetPassword',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_changePassword: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ChangePasswordRequest"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.patch('/auth/change-password',
            authenticateMiddleware([{"bearerAuth":[]},{"cookieAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.changePassword)),

            async function AuthController_changePassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_changePassword, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'changePassword',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProfileController_getMyProfile: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/profile/me',
            authenticateMiddleware([{"bearerAuth":[]},{"cookieAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ProfileController)),
            ...(fetchMiddlewares<RequestHandler>(ProfileController.prototype.getMyProfile)),

            async function ProfileController_getMyProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProfileController_getMyProfile, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ProfileController>(ProfileController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getMyProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProfileController_updateMyProfile: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateProfileRequest"},
        };
        app.patch('/profile/me',
            authenticateMiddleware([{"bearerAuth":[]},{"cookieAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ProfileController)),
            ...(fetchMiddlewares<RequestHandler>(ProfileController.prototype.updateMyProfile)),

            async function ProfileController_updateMyProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProfileController_updateMyProfile, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ProfileController>(ProfileController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateMyProfile',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProfileController_getProfileByUserId: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
        };
        app.get('/profile/:userId',
            authenticateMiddleware([{"bearerAuth":[]},{"cookieAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ProfileController)),
            ...(fetchMiddlewares<RequestHandler>(ProfileController.prototype.getProfileByUserId)),

            async function ProfileController_getProfileByUserId(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProfileController_getProfileByUserId, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ProfileController>(ProfileController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getProfileByUserId',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuditLogController_findAll: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"to":{"dataType":"string"},"from":{"dataType":"string"},"status":{"ref":"AuditStatusEnum"},"resourceId":{"dataType":"string"},"resourceType":{"ref":"AuditResourceEnum"},"action":{"ref":"AuditActionEnum"},"actorId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["action"]},{"dataType":"enum","enums":["resourceType"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/audit-logs',
            ...(fetchMiddlewares<RequestHandler>(AuditLogController)),
            ...(fetchMiddlewares<RequestHandler>(AuditLogController.prototype.findAll)),

            async function AuditLogController_findAll(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuditLogController_findAll, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuditLogController>(AuditLogController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findAll',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuditLogController_findMine: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"to":{"dataType":"string"},"from":{"dataType":"string"},"status":{"ref":"AuditStatusEnum"},"resourceId":{"dataType":"string"},"resourceType":{"ref":"AuditResourceEnum"},"action":{"ref":"AuditActionEnum"},"actorId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["action"]},{"dataType":"enum","enums":["resourceType"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/audit-logs/me',
            ...(fetchMiddlewares<RequestHandler>(AuditLogController)),
            ...(fetchMiddlewares<RequestHandler>(AuditLogController.prototype.findMine)),

            async function AuditLogController_findMine(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuditLogController_findMine, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuditLogController>(AuditLogController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findMine',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuditLogController_findByResource: Record<string, TsoaRoute.ParameterSchema> = {
                resourceType: {"in":"path","name":"resourceType","required":true,"ref":"AuditResourceEnum"},
                resourceId: {"in":"path","name":"resourceId","required":true,"dataType":"string"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"to":{"dataType":"string"},"from":{"dataType":"string"},"status":{"ref":"AuditStatusEnum"},"resourceId":{"dataType":"string"},"resourceType":{"ref":"AuditResourceEnum"},"action":{"ref":"AuditActionEnum"},"actorId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["action"]},{"dataType":"enum","enums":["resourceType"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/audit-logs/resource/:resourceType/:resourceId',
            ...(fetchMiddlewares<RequestHandler>(AuditLogController)),
            ...(fetchMiddlewares<RequestHandler>(AuditLogController.prototype.findByResource)),

            async function AuditLogController_findByResource(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuditLogController_findByResource, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuditLogController>(AuditLogController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findByResource',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuditLogController_findById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/audit-logs/:id',
            ...(fetchMiddlewares<RequestHandler>(AuditLogController)),
            ...(fetchMiddlewares<RequestHandler>(AuditLogController.prototype.findById)),

            async function AuditLogController_findById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuditLogController_findById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuditLogController>(AuditLogController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUploadController_getUploadSignature: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CloudinarySignatureRequest"},
        };
        app.post('/upload/signature',
            ...(fetchMiddlewares<RequestHandler>(UploadController)),
            ...(fetchMiddlewares<RequestHandler>(UploadController.prototype.getUploadSignature)),

            async function UploadController_getUploadSignature(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUploadController_getUploadSignature, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UploadController>(UploadController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getUploadSignature',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUnitTypeController_findAllUnitType: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"maxArea":{"dataType":"double"},"minArea":{"dataType":"double"},"category":{"ref":"UnitTypeCategoryEnum"},"status":{"ref":"UnitTypeStatusEnum"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["area"]},{"dataType":"enum","enums":["volume"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/unit-types',
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController)),
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController.prototype.findAllUnitType)),

            async function UnitTypeController_findAllUnitType(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUnitTypeController_findAllUnitType, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UnitTypeController>(UnitTypeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findAllUnitType',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUnitTypeController_findUnitTypeById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/unit-types/:id',
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController)),
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController.prototype.findUnitTypeById)),

            async function UnitTypeController_findUnitTypeById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUnitTypeController_findUnitTypeById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UnitTypeController>(UnitTypeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findUnitTypeById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUnitTypeController_createUnitType: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateUnitTypeRequest"},
        };
        app.post('/unit-types',
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController)),
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController.prototype.createUnitType)),

            async function UnitTypeController_createUnitType(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUnitTypeController_createUnitType, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UnitTypeController>(UnitTypeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createUnitType',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUnitTypeController_updateUnitType: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateUnitTypeRequest"},
        };
        app.patch('/unit-types/:id',
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController)),
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController.prototype.updateUnitType)),

            async function UnitTypeController_updateUnitType(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUnitTypeController_updateUnitType, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UnitTypeController>(UnitTypeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateUnitType',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUnitTypeController_deleteUnitType: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","dataType":"object"},
        };
        app.delete('/unit-types/:id',
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController)),
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController.prototype.deleteUnitType)),

            async function UnitTypeController_deleteUnitType(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUnitTypeController_deleteUnitType, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UnitTypeController>(UnitTypeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteUnitType',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUnitTypeController_restoreUnitType: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/unit-types/:id/restore',
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController)),
            ...(fetchMiddlewares<RequestHandler>(UnitTypeController.prototype.restoreUnitType)),

            async function UnitTypeController_restoreUnitType(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUnitTypeController_restoreUnitType, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UnitTypeController>(UnitTypeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'restoreUnitType',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageUnitController_getStorageUnits: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"unitNumber":{"dataType":"string"},"zone":{"dataType":"string"},"floor":{"dataType":"double"},"status":{"ref":"StorageUnitStatusEnum"},"unitTypeId":{"dataType":"string"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["unitNumber"]},{"dataType":"enum","enums":["floor"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/storage-units',
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController)),
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController.prototype.getStorageUnits)),

            async function StorageUnitController_getStorageUnits(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageUnitController_getStorageUnits, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageUnitController>(StorageUnitController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getStorageUnits',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageUnitController_getAvailableUnits: Record<string, TsoaRoute.ParameterSchema> = {
                facilityId: {"in":"path","name":"facilityId","required":true,"dataType":"string"},
                query: {"in":"queries","name":"query","dataType":"nestedObjectLiteral","nestedProperties":{"zone":{"dataType":"string"},"floor":{"dataType":"double"},"unitTypeId":{"dataType":"string"}}},
        };
        app.get('/storage-units/facility/:facilityId/available',
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController)),
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController.prototype.getAvailableUnits)),

            async function StorageUnitController_getAvailableUnits(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageUnitController_getAvailableUnits, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageUnitController>(StorageUnitController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getAvailableUnits',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageUnitController_getFacilityMapLayout: Record<string, TsoaRoute.ParameterSchema> = {
                facilityId: {"in":"path","name":"facilityId","required":true,"dataType":"string"},
        };
        app.get('/storage-units/facility/:facilityId/map-layout',
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController)),
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController.prototype.getFacilityMapLayout)),

            async function StorageUnitController_getFacilityMapLayout(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageUnitController_getFacilityMapLayout, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageUnitController>(StorageUnitController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getFacilityMapLayout',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageUnitController_getStorageUnitById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/storage-units/:id',
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController)),
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController.prototype.getStorageUnitById)),

            async function StorageUnitController_getStorageUnitById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageUnitController_getStorageUnitById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageUnitController>(StorageUnitController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getStorageUnitById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageUnitController_createStorageUnit: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateStorageUnitRequest"},
        };
        app.post('/storage-units',
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController)),
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController.prototype.createStorageUnit)),

            async function StorageUnitController_createStorageUnit(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageUnitController_createStorageUnit, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageUnitController>(StorageUnitController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createStorageUnit',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageUnitController_updateStorageUnit: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"UpdateStorageUnitRequest"},
        };
        app.patch('/storage-units/:id',
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController)),
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController.prototype.updateStorageUnit)),

            async function StorageUnitController_updateStorageUnit(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageUnitController_updateStorageUnit, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageUnitController>(StorageUnitController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateStorageUnit',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageUnitController_toggleMaintenance: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"ToggleMaintenanceRequest"},
        };
        app.patch('/storage-units/:id/maintenance',
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController)),
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController.prototype.toggleMaintenance)),

            async function StorageUnitController_toggleMaintenance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageUnitController_toggleMaintenance, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageUnitController>(StorageUnitController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'toggleMaintenance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageUnitController_deleteStorageUnit: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/storage-units/:id',
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController)),
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController.prototype.deleteStorageUnit)),

            async function StorageUnitController_deleteStorageUnit(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageUnitController_deleteStorageUnit, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageUnitController>(StorageUnitController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteStorageUnit',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageUnitController_restoreStorageUnit: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/storage-units/:id/restore',
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController)),
            ...(fetchMiddlewares<RequestHandler>(StorageUnitController.prototype.restoreStorageUnit)),

            async function StorageUnitController_restoreStorageUnit(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageUnitController_restoreStorageUnit, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageUnitController>(StorageUnitController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'restoreStorageUnit',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageRackController_getStorageRacks: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"zone":{"ref":"RackZoneEnum"},"aisle":{"dataType":"string"},"rackCode":{"dataType":"string"},"status":{"ref":"RackStatusEnum"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["rackCode"]},{"dataType":"enum","enums":["aisle"]},{"dataType":"enum","enums":["bay"]},{"dataType":"enum","enums":["tierCount"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/storage-racks',
            ...(fetchMiddlewares<RequestHandler>(StorageRackController)),
            ...(fetchMiddlewares<RequestHandler>(StorageRackController.prototype.getStorageRacks)),

            async function StorageRackController_getStorageRacks(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageRackController_getStorageRacks, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageRackController>(StorageRackController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getStorageRacks',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageRackController_getRacksByUnit: Record<string, TsoaRoute.ParameterSchema> = {
                unitId: {"in":"path","name":"unitId","required":true,"dataType":"string"},
        };
        app.get('/storage-racks/unit/:unitId',
            ...(fetchMiddlewares<RequestHandler>(StorageRackController)),
            ...(fetchMiddlewares<RequestHandler>(StorageRackController.prototype.getRacksByUnit)),

            async function StorageRackController_getRacksByUnit(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageRackController_getRacksByUnit, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageRackController>(StorageRackController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getRacksByUnit',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageRackController_getStorageRackById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/storage-racks/:id',
            ...(fetchMiddlewares<RequestHandler>(StorageRackController)),
            ...(fetchMiddlewares<RequestHandler>(StorageRackController.prototype.getStorageRackById)),

            async function StorageRackController_getStorageRackById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageRackController_getStorageRackById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageRackController>(StorageRackController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getStorageRackById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageRackController_createStorageRack: Record<string, TsoaRoute.ParameterSchema> = {
                data: {"in":"body","name":"data","required":true,"ref":"CreateStorageRackRequest"},
        };
        app.post('/storage-racks',
            ...(fetchMiddlewares<RequestHandler>(StorageRackController)),
            ...(fetchMiddlewares<RequestHandler>(StorageRackController.prototype.createStorageRack)),

            async function StorageRackController_createStorageRack(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageRackController_createStorageRack, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageRackController>(StorageRackController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createStorageRack',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageRackController_provisionRacks: Record<string, TsoaRoute.ParameterSchema> = {
                unitId: {"in":"path","name":"unitId","required":true,"dataType":"string"},
        };
        app.post('/storage-racks/unit/:unitId/provision',
            ...(fetchMiddlewares<RequestHandler>(StorageRackController)),
            ...(fetchMiddlewares<RequestHandler>(StorageRackController.prototype.provisionRacks)),

            async function StorageRackController_provisionRacks(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageRackController_provisionRacks, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageRackController>(StorageRackController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'provisionRacks',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageRackController_updateStorageRack: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                data: {"in":"body","name":"data","required":true,"ref":"UpdateStorageRackRequest"},
        };
        app.patch('/storage-racks/:id',
            ...(fetchMiddlewares<RequestHandler>(StorageRackController)),
            ...(fetchMiddlewares<RequestHandler>(StorageRackController.prototype.updateStorageRack)),

            async function StorageRackController_updateStorageRack(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageRackController_updateStorageRack, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageRackController>(StorageRackController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateStorageRack',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageRackController_updateRackTier: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                data: {"in":"body","name":"data","required":true,"ref":"UpdateRackTierRequest"},
        };
        app.patch('/storage-racks/tiers/:id',
            ...(fetchMiddlewares<RequestHandler>(StorageRackController)),
            ...(fetchMiddlewares<RequestHandler>(StorageRackController.prototype.updateRackTier)),

            async function StorageRackController_updateRackTier(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageRackController_updateRackTier, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageRackController>(StorageRackController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateRackTier',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageRackController_deleteStorageRack: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/storage-racks/:id',
            ...(fetchMiddlewares<RequestHandler>(StorageRackController)),
            ...(fetchMiddlewares<RequestHandler>(StorageRackController.prototype.deleteStorageRack)),

            async function StorageRackController_deleteStorageRack(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageRackController_deleteStorageRack, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageRackController>(StorageRackController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteStorageRack',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStorageRackController_restoreStorageRack: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/storage-racks/:id/restore',
            ...(fetchMiddlewares<RequestHandler>(StorageRackController)),
            ...(fetchMiddlewares<RequestHandler>(StorageRackController.prototype.restoreStorageRack)),

            async function StorageRackController_restoreStorageRack(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStorageRackController_restoreStorageRack, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StorageRackController>(StorageRackController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'restoreStorageRack',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_createReservation: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateReservationRequest"},
        };
        app.post('/reservations',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.createReservation)),

            async function ReservationController_createReservation(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_createReservation, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createReservation',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_getReservations: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"checkInDateTo":{"dataType":"string"},"checkInDateFrom":{"dataType":"string"},"startDateTo":{"dataType":"string"},"startDateFrom":{"dataType":"string"},"reservationCode":{"dataType":"string"},"refundStatus":{"ref":"RefundStatusEnum"},"status":{"ref":"ReservationStatusEnum"},"storageUnitId":{"dataType":"string"},"facilityUnitTypeOfferingId":{"dataType":"string"},"facilityId":{"dataType":"string"},"customerId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["startDate"]},{"dataType":"enum","enums":["checkInDate"]},{"dataType":"enum","enums":["totalAmount"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/reservations',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.getReservations)),

            async function ReservationController_getReservations(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_getReservations, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getReservations',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_processExpiredReservations: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/reservations/process-expired',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.processExpiredReservations)),

            async function ReservationController_processExpiredReservations(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_processExpiredReservations, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'processExpiredReservations',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_processOverdueReservations: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/reservations/process-overdue',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.processOverdueReservations)),

            async function ReservationController_processOverdueReservations(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_processOverdueReservations, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'processOverdueReservations',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_getReservationById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/reservations/:id',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.getReservationById)),

            async function ReservationController_getReservationById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_getReservationById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getReservationById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_reassignStorageUnit: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"ReassignStorageUnitRequest"},
        };
        app.post('/reservations/:id/reassign-unit',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.reassignStorageUnit)),

            async function ReservationController_reassignStorageUnit(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_reassignStorageUnit, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'reassignStorageUnit',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_confirmReservation: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"ConfirmReservationRequest"},
        };
        app.post('/reservations/:id/confirm',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.confirmReservation)),

            async function ReservationController_confirmReservation(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_confirmReservation, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'confirmReservation',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_cancelReservation: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CancelReservationRequest"},
        };
        app.post('/reservations/:id/cancel',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.cancelReservation)),

            async function ReservationController_cancelReservation(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_cancelReservation, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelReservation',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_assignStaffToCheckIn: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"AssignReservationStaffRequest"},
        };
        app.post('/reservations/:id/assign-staff',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.assignStaffToCheckIn)),

            async function ReservationController_assignStaffToCheckIn(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_assignStaffToCheckIn, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'assignStaffToCheckIn',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReservationController_confirmRefund: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"ConfirmRefundRequest"},
        };
        app.post('/reservations/:id/confirm-refund',
            ...(fetchMiddlewares<RequestHandler>(ReservationController)),
            ...(fetchMiddlewares<RequestHandler>(ReservationController.prototype.confirmRefund)),

            async function ReservationController_confirmRefund(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReservationController_confirmRefund, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ReservationController>(ReservationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'confirmRefund',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentController_handleSepayWebhook: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"SepayWebhookPayload"},
        };
        app.post('/payments/sepay/webhook',
            ...(fetchMiddlewares<RequestHandler>(PaymentController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentController.prototype.handleSepayWebhook)),

            async function PaymentController_handleSepayWebhook(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentController_handleSepayWebhook, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PaymentController>(PaymentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'handleSepayWebhook',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentController_createPayment: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreatePaymentRequest"},
        };
        app.post('/payments',
            ...(fetchMiddlewares<RequestHandler>(PaymentController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentController.prototype.createPayment)),

            async function PaymentController_createPayment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentController_createPayment, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PaymentController>(PaymentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createPayment',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentController_processExpiredPayments: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/payments/process-expired',
            ...(fetchMiddlewares<RequestHandler>(PaymentController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentController.prototype.processExpiredPayments)),

            async function PaymentController_processExpiredPayments(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentController_processExpiredPayments, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PaymentController>(PaymentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'processExpiredPayments',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentController_getPayments: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"createdAtTo":{"dataType":"string"},"createdAtFrom":{"dataType":"string"},"paymentCode":{"dataType":"string"},"status":{"ref":"PaymentStatusEnum"},"purpose":{"ref":"PaymentPurposeEnum"},"contractId":{"dataType":"string"},"reservationId":{"dataType":"string"},"facilityId":{"dataType":"string"},"customerId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/payments',
            ...(fetchMiddlewares<RequestHandler>(PaymentController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentController.prototype.getPayments)),

            async function PaymentController_getPayments(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentController_getPayments, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PaymentController>(PaymentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getPayments',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentController_getPaymentById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/payments/:id',
            ...(fetchMiddlewares<RequestHandler>(PaymentController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentController.prototype.getPaymentById)),

            async function PaymentController_getPaymentById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentController_getPaymentById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PaymentController>(PaymentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getPaymentById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentController_cancelPayment: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CancelPaymentRequest"},
        };
        app.post('/payments/:id/cancel',
            ...(fetchMiddlewares<RequestHandler>(PaymentController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentController.prototype.cancelPayment)),

            async function PaymentController_cancelPayment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentController_cancelPayment, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PaymentController>(PaymentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelPayment',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentController_confirmManualPayment: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"ConfirmManualPaymentRequest"},
        };
        app.post('/payments/:id/confirm-manual',
            ...(fetchMiddlewares<RequestHandler>(PaymentController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentController.prototype.confirmManualPayment)),

            async function PaymentController_confirmManualPayment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentController_confirmManualPayment, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PaymentController>(PaymentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'confirmManualPayment',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsNotificationController_sendTestNotification: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"SendTestNotificationRequest"},
        };
        app.post('/notifications/test',
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.sendTestNotification)),

            async function NotificationController_sendTestNotification(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_sendTestNotification, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<NotificationController>(NotificationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'sendTestNotification',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsNotificationController_getMyNotifications: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"facilityId":{"dataType":"string"},"priority":{"ref":"NotificationPriorityEnum"},"type":{"ref":"NotificationTypeEnum"},"isRead":{"dataType":"boolean"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/notifications',
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.getMyNotifications)),

            async function NotificationController_getMyNotifications(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_getMyNotifications, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<NotificationController>(NotificationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getMyNotifications',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsNotificationController_getUnreadCount: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/notifications/unread-count',
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.getUnreadCount)),

            async function NotificationController_getUnreadCount(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_getUnreadCount, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<NotificationController>(NotificationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getUnreadCount',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsNotificationController_markAsRead: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.patch('/notifications/:id/read',
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.markAsRead)),

            async function NotificationController_markAsRead(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_markAsRead, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<NotificationController>(NotificationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'markAsRead',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsNotificationController_markAllAsRead: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.patch('/notifications/read-all',
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.markAllAsRead)),

            async function NotificationController_markAllAsRead(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_markAllAsRead, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<NotificationController>(NotificationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'markAllAsRead',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsNotificationController_deleteNotification: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/notifications/:id',
            ...(fetchMiddlewares<RequestHandler>(NotificationController)),
            ...(fetchMiddlewares<RequestHandler>(NotificationController.prototype.deleteNotification)),

            async function NotificationController_deleteNotification(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsNotificationController_deleteNotification, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<NotificationController>(NotificationController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteNotification',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsIncidentController_reportIncident: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"ReportIncidentRequest"},
        };
        app.post('/incidents',
            ...(fetchMiddlewares<RequestHandler>(IncidentController)),
            ...(fetchMiddlewares<RequestHandler>(IncidentController.prototype.reportIncident)),

            async function IncidentController_reportIncident(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIncidentController_reportIncident, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<IncidentController>(IncidentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'reportIncident',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsIncidentController_getIncidents: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"search":{"dataType":"string"},"severity":{"ref":"IncidentSeverityEnum"},"category":{"ref":"IncidentCategoryEnum"},"status":{"ref":"IncidentStatusEnum"},"assignedStaffId":{"dataType":"string"},"reporterId":{"dataType":"string"},"contractId":{"dataType":"string"},"storageRackId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/incidents',
            ...(fetchMiddlewares<RequestHandler>(IncidentController)),
            ...(fetchMiddlewares<RequestHandler>(IncidentController.prototype.getIncidents)),

            async function IncidentController_getIncidents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIncidentController_getIncidents, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<IncidentController>(IncidentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getIncidents',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsIncidentController_getIncidentById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/incidents/:id',
            ...(fetchMiddlewares<RequestHandler>(IncidentController)),
            ...(fetchMiddlewares<RequestHandler>(IncidentController.prototype.getIncidentById)),

            async function IncidentController_getIncidentById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIncidentController_getIncidentById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<IncidentController>(IncidentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getIncidentById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsIncidentController_assignStaff: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"AssignIncidentRequest"},
        };
        app.post('/incidents/:id/assign',
            ...(fetchMiddlewares<RequestHandler>(IncidentController)),
            ...(fetchMiddlewares<RequestHandler>(IncidentController.prototype.assignStaff)),

            async function IncidentController_assignStaff(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIncidentController_assignStaff, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<IncidentController>(IncidentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'assignStaff',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsIncidentController_investigateIncident: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"InvestigateIncidentRequest"},
        };
        app.post('/incidents/:id/investigate',
            ...(fetchMiddlewares<RequestHandler>(IncidentController)),
            ...(fetchMiddlewares<RequestHandler>(IncidentController.prototype.investigateIncident)),

            async function IncidentController_investigateIncident(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIncidentController_investigateIncident, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<IncidentController>(IncidentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'investigateIncident',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsIncidentController_resolveIncident: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"ResolveIncidentRequest"},
        };
        app.post('/incidents/:id/resolve',
            ...(fetchMiddlewares<RequestHandler>(IncidentController)),
            ...(fetchMiddlewares<RequestHandler>(IncidentController.prototype.resolveIncident)),

            async function IncidentController_resolveIncident(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIncidentController_resolveIncident, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<IncidentController>(IncidentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'resolveIncident',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsIncidentController_closeIncident: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CloseIncidentRequest"},
        };
        app.post('/incidents/:id/close',
            ...(fetchMiddlewares<RequestHandler>(IncidentController)),
            ...(fetchMiddlewares<RequestHandler>(IncidentController.prototype.closeIncident)),

            async function IncidentController_closeIncident(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIncidentController_closeIncident, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<IncidentController>(IncidentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'closeIncident',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsIncidentController_cancelIncident: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CancelIncidentRequest"},
        };
        app.post('/incidents/:id/cancel',
            ...(fetchMiddlewares<RequestHandler>(IncidentController)),
            ...(fetchMiddlewares<RequestHandler>(IncidentController.prototype.cancelIncident)),

            async function IncidentController_cancelIncident(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIncidentController_cancelIncident, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<IncidentController>(IncidentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelIncident',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityUnitTypeOfferingController_getOfferings: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"maxPrice":{"dataType":"double"},"minPrice":{"dataType":"double"},"status":{"ref":"FacilityUnitTypeOfferingStatusEnum"},"billingUnit":{"ref":"BillingUnitEnum"},"unitTypeId":{"dataType":"string"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["pricePerUnit"]},{"dataType":"enum","enums":["minRentalDays"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/facility-unit-type-offerings',
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController.prototype.getOfferings)),

            async function FacilityUnitTypeOfferingController_getOfferings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityUnitTypeOfferingController_getOfferings, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityUnitTypeOfferingController>(FacilityUnitTypeOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getOfferings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityUnitTypeOfferingController_getOfferingById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/facility-unit-type-offerings/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController.prototype.getOfferingById)),

            async function FacilityUnitTypeOfferingController_getOfferingById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityUnitTypeOfferingController_getOfferingById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityUnitTypeOfferingController>(FacilityUnitTypeOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getOfferingById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityUnitTypeOfferingController_getOfferingByFacilityAndUnitType: Record<string, TsoaRoute.ParameterSchema> = {
                facilityId: {"in":"path","name":"facilityId","required":true,"dataType":"string"},
                unitTypeId: {"in":"path","name":"unitTypeId","required":true,"dataType":"string"},
        };
        app.get('/facility-unit-type-offerings/facility/:facilityId/unit-type/:unitTypeId',
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController.prototype.getOfferingByFacilityAndUnitType)),

            async function FacilityUnitTypeOfferingController_getOfferingByFacilityAndUnitType(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityUnitTypeOfferingController_getOfferingByFacilityAndUnitType, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityUnitTypeOfferingController>(FacilityUnitTypeOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getOfferingByFacilityAndUnitType',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityUnitTypeOfferingController_createOffering: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateOfferingRequest"},
        };
        app.post('/facility-unit-type-offerings',
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController.prototype.createOffering)),

            async function FacilityUnitTypeOfferingController_createOffering(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityUnitTypeOfferingController_createOffering, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityUnitTypeOfferingController>(FacilityUnitTypeOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createOffering',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityUnitTypeOfferingController_updateOffering: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateOfferingRequest"},
        };
        app.patch('/facility-unit-type-offerings/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController.prototype.updateOffering)),

            async function FacilityUnitTypeOfferingController_updateOffering(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityUnitTypeOfferingController_updateOffering, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityUnitTypeOfferingController>(FacilityUnitTypeOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateOffering',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityUnitTypeOfferingController_deleteOffering: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","dataType":"object"},
        };
        app.delete('/facility-unit-type-offerings/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController.prototype.deleteOffering)),

            async function FacilityUnitTypeOfferingController_deleteOffering(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityUnitTypeOfferingController_deleteOffering, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityUnitTypeOfferingController>(FacilityUnitTypeOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteOffering',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityUnitTypeOfferingController_restoreOffering: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/facility-unit-type-offerings/:id/restore',
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityUnitTypeOfferingController.prototype.restoreOffering)),

            async function FacilityUnitTypeOfferingController_restoreOffering(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityUnitTypeOfferingController_restoreOffering, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityUnitTypeOfferingController>(FacilityUnitTypeOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'restoreOffering',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityTimeSlotController_getAvailableSlots: Record<string, TsoaRoute.ParameterSchema> = {
                facilityId: {"in":"path","name":"facilityId","required":true,"dataType":"string"},
                date: {"in":"query","name":"date","required":true,"dataType":"string"},
        };
        app.get('/facility-time-slots/facility/:facilityId/available',
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController.prototype.getAvailableSlots)),

            async function FacilityTimeSlotController_getAvailableSlots(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityTimeSlotController_getAvailableSlots, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityTimeSlotController>(FacilityTimeSlotController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getAvailableSlots',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityTimeSlotController_getSlotsByFacility: Record<string, TsoaRoute.ParameterSchema> = {
                facilityId: {"in":"path","name":"facilityId","required":true,"dataType":"string"},
        };
        app.get('/facility-time-slots/facility/:facilityId',
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController.prototype.getSlotsByFacility)),

            async function FacilityTimeSlotController_getSlotsByFacility(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityTimeSlotController_getSlotsByFacility, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityTimeSlotController>(FacilityTimeSlotController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getSlotsByFacility',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityTimeSlotController_createTimeSlot: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateFacilityTimeSlotRequest"},
        };
        app.post('/facility-time-slots',
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController.prototype.createTimeSlot)),

            async function FacilityTimeSlotController_createTimeSlot(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityTimeSlotController_createTimeSlot, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityTimeSlotController>(FacilityTimeSlotController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createTimeSlot',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityTimeSlotController_updateTimeSlot: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateFacilityTimeSlotRequest"},
        };
        app.patch('/facility-time-slots/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController.prototype.updateTimeSlot)),

            async function FacilityTimeSlotController_updateTimeSlot(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityTimeSlotController_updateTimeSlot, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityTimeSlotController>(FacilityTimeSlotController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateTimeSlot',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityTimeSlotController_deleteTimeSlot: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/facility-time-slots/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityTimeSlotController.prototype.deleteTimeSlot)),

            async function FacilityTimeSlotController_deleteTimeSlot(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityTimeSlotController_deleteTimeSlot, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityTimeSlotController>(FacilityTimeSlotController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteTimeSlot',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityManagerController_getMyFacility: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/my-facility',
            ...(fetchMiddlewares<RequestHandler>(FacilityManagerController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityManagerController.prototype.getMyFacility)),

            async function FacilityManagerController_getMyFacility(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityManagerController_getMyFacility, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityManagerController>(FacilityManagerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getMyFacility',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityManagerController_getMyFacilityDashboard: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.get('/my-facility/dashboard',
            ...(fetchMiddlewares<RequestHandler>(FacilityManagerController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityManagerController.prototype.getMyFacilityDashboard)),

            async function FacilityManagerController_getMyFacilityDashboard(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityManagerController_getMyFacilityDashboard, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityManagerController>(FacilityManagerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getMyFacilityDashboard',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityManagerController_getMyFacilityStaffs: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"UserStatusEnum"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["email"]},{"dataType":"enum","enums":["createdAt"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/my-facility/staffs',
            ...(fetchMiddlewares<RequestHandler>(FacilityManagerController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityManagerController.prototype.getMyFacilityStaffs)),

            async function FacilityManagerController_getMyFacilityStaffs(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityManagerController_getMyFacilityStaffs, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityManagerController>(FacilityManagerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getMyFacilityStaffs',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityAmenityOfferingController_getOfferings: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"maxPrice":{"dataType":"double"},"minPrice":{"dataType":"double"},"status":{"ref":"FacilityAmenityOfferingStatusEnum"},"billingUnit":{"ref":"BillingUnitEnum"},"amenityId":{"dataType":"string"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["pricePerUnit"]},{"dataType":"enum","enums":["totalQuantity"]},{"dataType":"enum","enums":["inUseQuantity"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/facility-amenity-offerings',
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController.prototype.getOfferings)),

            async function FacilityAmenityOfferingController_getOfferings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityAmenityOfferingController_getOfferings, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityAmenityOfferingController>(FacilityAmenityOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getOfferings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityAmenityOfferingController_getAvailableOfferings: Record<string, TsoaRoute.ParameterSchema> = {
                facilityId: {"in":"path","name":"facilityId","required":true,"dataType":"string"},
        };
        app.get('/facility-amenity-offerings/facility/:facilityId/available',
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController.prototype.getAvailableOfferings)),

            async function FacilityAmenityOfferingController_getAvailableOfferings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityAmenityOfferingController_getAvailableOfferings, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityAmenityOfferingController>(FacilityAmenityOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getAvailableOfferings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityAmenityOfferingController_getOfferingByFacilityAndAmenity: Record<string, TsoaRoute.ParameterSchema> = {
                facilityId: {"in":"path","name":"facilityId","required":true,"dataType":"string"},
                amenityId: {"in":"path","name":"amenityId","required":true,"dataType":"string"},
        };
        app.get('/facility-amenity-offerings/facility/:facilityId/amenity/:amenityId',
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController.prototype.getOfferingByFacilityAndAmenity)),

            async function FacilityAmenityOfferingController_getOfferingByFacilityAndAmenity(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityAmenityOfferingController_getOfferingByFacilityAndAmenity, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityAmenityOfferingController>(FacilityAmenityOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getOfferingByFacilityAndAmenity',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityAmenityOfferingController_getOfferingById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/facility-amenity-offerings/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController.prototype.getOfferingById)),

            async function FacilityAmenityOfferingController_getOfferingById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityAmenityOfferingController_getOfferingById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityAmenityOfferingController>(FacilityAmenityOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getOfferingById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityAmenityOfferingController_createOffering: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateFacilityAmenityOfferingRequest"},
        };
        app.post('/facility-amenity-offerings',
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController.prototype.createOffering)),

            async function FacilityAmenityOfferingController_createOffering(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityAmenityOfferingController_createOffering, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityAmenityOfferingController>(FacilityAmenityOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createOffering',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityAmenityOfferingController_updateOffering: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateFacilityAmenityOfferingRequest"},
        };
        app.patch('/facility-amenity-offerings/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController.prototype.updateOffering)),

            async function FacilityAmenityOfferingController_updateOffering(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityAmenityOfferingController_updateOffering, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityAmenityOfferingController>(FacilityAmenityOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateOffering',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityAmenityOfferingController_deleteOffering: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/facility-amenity-offerings/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController.prototype.deleteOffering)),

            async function FacilityAmenityOfferingController_deleteOffering(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityAmenityOfferingController_deleteOffering, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityAmenityOfferingController>(FacilityAmenityOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteOffering',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityAmenityOfferingController_restoreOffering: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/facility-amenity-offerings/:id/restore',
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityAmenityOfferingController.prototype.restoreOffering)),

            async function FacilityAmenityOfferingController_restoreOffering(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityAmenityOfferingController_restoreOffering, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityAmenityOfferingController>(FacilityAmenityOfferingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'restoreOffering',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityController_findAllFacility: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"FacilityStatusEnum"},"city":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["city"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/facilities',
            ...(fetchMiddlewares<RequestHandler>(FacilityController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityController.prototype.findAllFacility)),

            async function FacilityController_findAllFacility(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityController_findAllFacility, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityController>(FacilityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findAllFacility',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityController_searchFacilitiesByAmenity: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"search":{"dataType":"string"},"city":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["city"]}],"required":true},"matchAll":{"dataType":"boolean","required":true},"amenityIds":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/facilities/search-by-amenity',
            ...(fetchMiddlewares<RequestHandler>(FacilityController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityController.prototype.searchFacilitiesByAmenity)),

            async function FacilityController_searchFacilitiesByAmenity(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityController_searchFacilitiesByAmenity, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityController>(FacilityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'searchFacilitiesByAmenity',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityController_getPublicFacilityDetail: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/facilities/:id/public-detail',
            ...(fetchMiddlewares<RequestHandler>(FacilityController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityController.prototype.getPublicFacilityDetail)),

            async function FacilityController_getPublicFacilityDetail(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityController_getPublicFacilityDetail, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityController>(FacilityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getPublicFacilityDetail',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityController_findFacilityById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/facilities/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityController.prototype.findFacilityById)),

            async function FacilityController_findFacilityById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityController_findFacilityById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityController>(FacilityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findFacilityById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityController_createFacility: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateFacilityRequest"},
        };
        app.post('/facilities',
            ...(fetchMiddlewares<RequestHandler>(FacilityController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityController.prototype.createFacility)),

            async function FacilityController_createFacility(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityController_createFacility, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityController>(FacilityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createFacility',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityController_updateFacility: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateFacilityRequest"},
        };
        app.patch('/facilities/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityController.prototype.updateFacility)),

            async function FacilityController_updateFacility(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityController_updateFacility, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityController>(FacilityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateFacility',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityController_deleteFacility: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","dataType":"object"},
        };
        app.delete('/facilities/:id',
            ...(fetchMiddlewares<RequestHandler>(FacilityController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityController.prototype.deleteFacility)),

            async function FacilityController_deleteFacility(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityController_deleteFacility, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityController>(FacilityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteFacility',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityController_assignManager: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"AssignManagerRequest"},
        };
        app.patch('/facilities/:id/assign-manager',
            ...(fetchMiddlewares<RequestHandler>(FacilityController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityController.prototype.assignManager)),

            async function FacilityController_assignManager(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityController_assignManager, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityController>(FacilityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'assignManager',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFacilityController_restoreFacility: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/facilities/:id/restore',
            ...(fetchMiddlewares<RequestHandler>(FacilityController)),
            ...(fetchMiddlewares<RequestHandler>(FacilityController.prototype.restoreFacility)),

            async function FacilityController_restoreFacility(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFacilityController_restoreFacility, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FacilityController>(FacilityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'restoreFacility',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerSkuController_createSku: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateCustomerSkuRequest"},
        };
        app.post('/customer-skus',
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController.prototype.createSku)),

            async function CustomerSkuController_createSku(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerSkuController_createSku, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerSkuController>(CustomerSkuController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createSku',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerSkuController_getSkus: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"barcode":{"dataType":"string"},"skuCode":{"dataType":"string"},"search":{"dataType":"string"},"category":{"dataType":"string"},"status":{"ref":"CustomerSkuStatusEnum"},"customerId":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["skuCode"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/customer-skus',
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController.prototype.getSkus)),

            async function CustomerSkuController_getSkus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerSkuController_getSkus, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerSkuController>(CustomerSkuController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getSkus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerSkuController_getSkuByBarcode: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                barcode: {"in":"path","name":"barcode","required":true,"dataType":"string"},
                customerId: {"in":"query","name":"customerId","dataType":"string"},
        };
        app.get('/customer-skus/barcode/:barcode',
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController.prototype.getSkuByBarcode)),

            async function CustomerSkuController_getSkuByBarcode(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerSkuController_getSkuByBarcode, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerSkuController>(CustomerSkuController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getSkuByBarcode',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerSkuController_getSkuById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/customer-skus/:id',
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController.prototype.getSkuById)),

            async function CustomerSkuController_getSkuById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerSkuController_getSkuById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerSkuController>(CustomerSkuController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getSkuById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerSkuController_updateSku: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateCustomerSkuRequest"},
        };
        app.patch('/customer-skus/:id',
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController.prototype.updateSku)),

            async function CustomerSkuController_updateSku(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerSkuController_updateSku, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerSkuController>(CustomerSkuController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateSku',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerSkuController_deleteSku: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/customer-skus/:id',
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController.prototype.deleteSku)),

            async function CustomerSkuController_deleteSku(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerSkuController_deleteSku, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerSkuController>(CustomerSkuController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteSku',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerSkuController_restoreSku: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/customer-skus/:id/restore',
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerSkuController.prototype.restoreSku)),

            async function CustomerSkuController_restoreSku(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerSkuController_restoreSku, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerSkuController>(CustomerSkuController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'restoreSku',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_createOutboundRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateOutboundRequest"},
        };
        app.post('/customer-inventories/outbound-requests',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.createOutboundRequest)),

            async function InventoryRequestController_createOutboundRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_createOutboundRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createOutboundRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_verifyPickupCode: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"VerifyPickupCodeRequest"},
        };
        app.post('/customer-inventories/verify-pickup-code',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.verifyPickupCode)),

            async function InventoryRequestController_verifyPickupCode(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_verifyPickupCode, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'verifyPickupCode',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_completeOutboundHandover: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CompleteOutboundHandoverRequest"},
        };
        app.post('/customer-inventories/outbound-requests/:id/complete',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.completeOutboundHandover)),

            async function InventoryRequestController_completeOutboundHandover(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_completeOutboundHandover, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'completeOutboundHandover',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_cancelOutboundRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CancelOutboundRequest"},
        };
        app.post('/customer-inventories/outbound-requests/:id/cancel',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.cancelOutboundRequest)),

            async function InventoryRequestController_cancelOutboundRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_cancelOutboundRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelOutboundRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_createInboundRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateInboundRequest"},
        };
        app.post('/customer-inventories/inbound-requests',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.createInboundRequest)),

            async function InventoryRequestController_createInboundRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_createInboundRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createInboundRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_confirmInboundRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/customer-inventories/inbound-requests/:id/confirm',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.confirmInboundRequest)),

            async function InventoryRequestController_confirmInboundRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_confirmInboundRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'confirmInboundRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_disputeInboundRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"DisputeInboundRequest"},
        };
        app.post('/customer-inventories/inbound-requests/:id/dispute',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.disputeInboundRequest)),

            async function InventoryRequestController_disputeInboundRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_disputeInboundRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'disputeInboundRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_putawayInboundRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"PutawayInboundRequest"},
        };
        app.post('/customer-inventories/inbound-requests/:id/putaway',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.putawayInboundRequest)),

            async function InventoryRequestController_putawayInboundRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_putawayInboundRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'putawayInboundRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_getRequests: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"ref":"InventoryRequestQuery"},
        };
        app.get('/customer-inventories/requests',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.getRequests)),

            async function InventoryRequestController_getRequests(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_getRequests, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getRequests',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_processAutoAccept: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/customer-inventories/requests/process-auto-accept',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.processAutoAccept)),

            async function InventoryRequestController_processAutoAccept(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_processAutoAccept, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'processAutoAccept',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsInventoryRequestController_getRequestById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/customer-inventories/requests/:id',
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController)),
            ...(fetchMiddlewares<RequestHandler>(InventoryRequestController.prototype.getRequestById)),

            async function InventoryRequestController_getRequestById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInventoryRequestController_getRequestById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<InventoryRequestController>(InventoryRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getRequestById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_stockIn: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"StockInRequest"},
        };
        app.post('/customer-inventories/in',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.stockIn)),

            async function CustomerInventoryController_stockIn(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_stockIn, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'stockIn',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_stockOut: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"StockOutRequest"},
        };
        app.post('/customer-inventories/out',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.stockOut)),

            async function CustomerInventoryController_stockOut(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_stockOut, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'stockOut',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_stockMove: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"StockMoveRequest"},
        };
        app.post('/customer-inventories/move',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.stockMove)),

            async function CustomerInventoryController_stockMove(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_stockMove, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'stockMove',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_stockAdjust: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"StockAdjustRequest"},
        };
        app.post('/customer-inventories/adjust',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.stockAdjust)),

            async function CustomerInventoryController_stockAdjust(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_stockAdjust, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'stockAdjust',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_findAllMovements: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"type":{"ref":"MovementTypeEnum"},"customerId":{"dataType":"string"},"rackTierId":{"dataType":"string"},"skuId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"contractId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["type"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["quantity"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/customer-inventories/movements',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.findAllMovements)),

            async function CustomerInventoryController_findAllMovements(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_findAllMovements, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findAllMovements',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_findAllInventories: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"minQuantity":{"dataType":"double"},"customerId":{"dataType":"string"},"skuId":{"dataType":"string"},"rackTierId":{"dataType":"string"},"storageRackId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"contractId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["quantity"]},{"dataType":"enum","enums":["lastMovementAt"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/customer-inventories',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.findAllInventories)),

            async function CustomerInventoryController_findAllInventories(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_findAllInventories, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findAllInventories',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_getStorageUnitTree: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                storageUnitId: {"in":"path","name":"storageUnitId","required":true,"dataType":"string"},
        };
        app.get('/customer-inventories/unit/:storageUnitId/tree',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.getStorageUnitTree)),

            async function CustomerInventoryController_getStorageUnitTree(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_getStorageUnitTree, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getStorageUnitTree',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_getSkuLocations: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                skuId: {"in":"path","name":"skuId","required":true,"dataType":"string"},
        };
        app.get('/customer-inventories/sku/:skuId/locations',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.getSkuLocations)),

            async function CustomerInventoryController_getSkuLocations(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_getSkuLocations, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getSkuLocations',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_getSkuLocationsByBarcode: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                barcode: {"in":"path","name":"barcode","required":true,"dataType":"string"},
        };
        app.get('/customer-inventories/barcode/:barcode/locations',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.getSkuLocationsByBarcode)),

            async function CustomerInventoryController_getSkuLocationsByBarcode(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_getSkuLocationsByBarcode, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getSkuLocationsByBarcode',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_getCustomerSummary: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","ref":"CustomerInventorySummaryQuery"},
        };
        app.get('/customer-inventories/summary',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.getCustomerSummary)),

            async function CustomerInventoryController_getCustomerSummary(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_getCustomerSummary, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getCustomerSummary',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_findInventoryById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/customer-inventories/:id',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.findInventoryById)),

            async function CustomerInventoryController_findInventoryById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_findInventoryById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'findInventoryById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustomerInventoryController_batchMigrateRack: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"BatchMigrateRackRequest"},
        };
        app.post('/customer-inventories/racks/batch-migrate',
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController)),
            ...(fetchMiddlewares<RequestHandler>(CustomerInventoryController.prototype.batchMigrateRack)),

            async function CustomerInventoryController_batchMigrateRack(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustomerInventoryController_batchMigrateRack, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CustomerInventoryController>(CustomerInventoryController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'batchMigrateRack',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_createContract: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateContractRequest"},
        };
        app.post('/contracts',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.createContract)),

            async function ContractController_createContract(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_createContract, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createContract',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_getContracts: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"endDateTo":{"dataType":"string"},"endDateFrom":{"dataType":"string"},"startDateTo":{"dataType":"string"},"startDateFrom":{"dataType":"string"},"contractCode":{"dataType":"string"},"source":{"ref":"ContractSourceEnum"},"status":{"ref":"ContractStatusEnum"},"facilityUnitTypeOfferingId":{"dataType":"string"},"storageUnitId":{"dataType":"string"},"facilityId":{"dataType":"string"},"customerId":{"dataType":"string"},"search":{"dataType":"string"},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"sortBy":{"dataType":"string","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/contracts',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.getContracts)),

            async function ContractController_getContracts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_getContracts, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getContracts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_processOverdue: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/contracts/process-overdue',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.processOverdue)),

            async function ContractController_processOverdue(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_processOverdue, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'processOverdue',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_getContractById: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/contracts/:id',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.getContractById)),

            async function ContractController_getContractById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_getContractById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getContractById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_customerSignContract: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CustomerSignContractRequest"},
        };
        app.post('/contracts/:id/customer-sign',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.customerSignContract)),

            async function ContractController_customerSignContract(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_customerSignContract, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'customerSignContract',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_checkInContract: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CheckInContractRequest"},
        };
        app.post('/contracts/:id/check-in',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.checkInContract)),

            async function ContractController_checkInContract(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_checkInContract, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'checkInContract',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_cancelContract: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CancelContractRequest"},
        };
        app.post('/contracts/:id/cancel',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.cancelContract)),

            async function ContractController_cancelContract(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_cancelContract, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelContract',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_renewContract: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"RenewContractRequest"},
        };
        app.post('/contracts/:id/renew',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.renewContract)),

            async function ContractController_renewContract(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_renewContract, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'renewContract',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_createAddendum: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateContractAddendumRequest"},
        };
        app.post('/contracts/:id/addendums',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.createAddendum)),

            async function ContractController_createAddendum(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_createAddendum, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createAddendum',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_approveAddendum: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                addendumId: {"in":"path","name":"addendumId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"ApproveContractAddendumRequest"},
        };
        app.post('/contracts/:id/addendums/:addendumId/approve',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.approveAddendum)),

            async function ContractController_approveAddendum(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_approveAddendum, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'approveAddendum',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_rejectAddendum: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                addendumId: {"in":"path","name":"addendumId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"RejectContractAddendumRequest"},
        };
        app.post('/contracts/:id/addendums/:addendumId/reject',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.rejectAddendum)),

            async function ContractController_rejectAddendum(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_rejectAddendum, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'rejectAddendum',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_customerSignAddendum: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                addendumId: {"in":"path","name":"addendumId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"SignContractAddendumRequest"},
        };
        app.post('/contracts/:id/addendums/:addendumId/customer-sign',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.customerSignAddendum)),

            async function ContractController_customerSignAddendum(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_customerSignAddendum, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'customerSignAddendum',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_staffSignAddendum: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                addendumId: {"in":"path","name":"addendumId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"SignContractAddendumRequest"},
        };
        app.post('/contracts/:id/addendums/:addendumId/staff-sign',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.staffSignAddendum)),

            async function ContractController_staffSignAddendum(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_staffSignAddendum, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'staffSignAddendum',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_cancelAddendum: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                addendumId: {"in":"path","name":"addendumId","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CancelContractAddendumRequest"},
        };
        app.post('/contracts/:id/addendums/:addendumId/cancel',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.cancelAddendum)),

            async function ContractController_cancelAddendum(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_cancelAddendum, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelAddendum',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_checkOutContract: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"CheckOutContractRequest"},
        };
        app.post('/contracts/:id/check-out',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.checkOutContract)),

            async function ContractController_checkOutContract(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_checkOutContract, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'checkOutContract',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsContractController_terminateContract: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"TerminateContractRequest"},
        };
        app.post('/contracts/:id/terminate',
            ...(fetchMiddlewares<RequestHandler>(ContractController)),
            ...(fetchMiddlewares<RequestHandler>(ContractController.prototype.terminateContract)),

            async function ContractController_terminateContract(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsContractController_terminateContract, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ContractController>(ContractController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'terminateContract',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsApprovalRequestController_createApprovalRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateApprovalRequest"},
        };
        app.post('/approval-requests',
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController)),
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController.prototype.createApprovalRequest)),

            async function ApprovalRequestController_createApprovalRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApprovalRequestController_createApprovalRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ApprovalRequestController>(ApprovalRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createApprovalRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsApprovalRequestController_getMyApprovalRequests: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"ApprovalRequestStatusEnum"},"targetType":{"ref":"ApprovalRequestTargetTypeEnum"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["targetType"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/approval-requests/my-requests',
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController)),
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController.prototype.getMyApprovalRequests)),

            async function ApprovalRequestController_getMyApprovalRequests(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApprovalRequestController_getMyApprovalRequests, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ApprovalRequestController>(ApprovalRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getMyApprovalRequests',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsApprovalRequestController_getAllApprovalRequests: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"ApprovalRequestStatusEnum"},"targetType":{"ref":"ApprovalRequestTargetTypeEnum"},"facilityId":{"dataType":"string"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["targetType"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/approval-requests',
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController)),
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController.prototype.getAllApprovalRequests)),

            async function ApprovalRequestController_getAllApprovalRequests(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApprovalRequestController_getAllApprovalRequests, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ApprovalRequestController>(ApprovalRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getAllApprovalRequests',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsApprovalRequestController_getApprovalRequestById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/approval-requests/:id',
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController)),
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController.prototype.getApprovalRequestById)),

            async function ApprovalRequestController_getApprovalRequestById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApprovalRequestController_getApprovalRequestById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ApprovalRequestController>(ApprovalRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getApprovalRequestById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsApprovalRequestController_cancelApprovalRequest: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.patch('/approval-requests/:id/cancel',
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController)),
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController.prototype.cancelApprovalRequest)),

            async function ApprovalRequestController_cancelApprovalRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApprovalRequestController_cancelApprovalRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ApprovalRequestController>(ApprovalRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelApprovalRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsApprovalRequestController_reviewApprovalRequest: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"ReviewApprovalRequest"},
        };
        app.patch('/approval-requests/:id/review',
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController)),
            ...(fetchMiddlewares<RequestHandler>(ApprovalRequestController.prototype.reviewApprovalRequest)),

            async function ApprovalRequestController_reviewApprovalRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApprovalRequestController_reviewApprovalRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ApprovalRequestController>(ApprovalRequestController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'reviewApprovalRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAmenityController_getAmenities: Record<string, TsoaRoute.ParameterSchema> = {
                query: {"in":"queries","name":"query","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"ref":"AmenityStatusEnum"},"type":{"ref":"AmenityTypeEnum"},"search":{"dataType":"string"},"sortBy":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["type"]},{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["status"]},{"dataType":"enum","enums":["createdAt"]}],"required":true},"sortOrder":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}],"required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}}},
        };
        app.get('/amenities',
            ...(fetchMiddlewares<RequestHandler>(AmenityController)),
            ...(fetchMiddlewares<RequestHandler>(AmenityController.prototype.getAmenities)),

            async function AmenityController_getAmenities(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAmenityController_getAmenities, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AmenityController>(AmenityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getAmenities',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAmenityController_getAmenityById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/amenities/:id',
            ...(fetchMiddlewares<RequestHandler>(AmenityController)),
            ...(fetchMiddlewares<RequestHandler>(AmenityController.prototype.getAmenityById)),

            async function AmenityController_getAmenityById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAmenityController_getAmenityById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AmenityController>(AmenityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getAmenityById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAmenityController_createAmenity: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateAmenityRequest"},
        };
        app.post('/amenities',
            ...(fetchMiddlewares<RequestHandler>(AmenityController)),
            ...(fetchMiddlewares<RequestHandler>(AmenityController.prototype.createAmenity)),

            async function AmenityController_createAmenity(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAmenityController_createAmenity, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AmenityController>(AmenityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createAmenity',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAmenityController_updateAmenity: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateAmenityRequest"},
        };
        app.patch('/amenities/:id',
            ...(fetchMiddlewares<RequestHandler>(AmenityController)),
            ...(fetchMiddlewares<RequestHandler>(AmenityController.prototype.updateAmenity)),

            async function AmenityController_updateAmenity(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAmenityController_updateAmenity, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AmenityController>(AmenityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateAmenity',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAmenityController_deleteAmenity: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.delete('/amenities/:id',
            ...(fetchMiddlewares<RequestHandler>(AmenityController)),
            ...(fetchMiddlewares<RequestHandler>(AmenityController.prototype.deleteAmenity)),

            async function AmenityController_deleteAmenity(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAmenityController_deleteAmenity, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AmenityController>(AmenityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteAmenity',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAmenityController_restoreAmenity: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/amenities/:id/restore',
            ...(fetchMiddlewares<RequestHandler>(AmenityController)),
            ...(fetchMiddlewares<RequestHandler>(AmenityController.prototype.restoreAmenity)),

            async function AmenityController_restoreAmenity(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAmenityController_restoreAmenity, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AmenityController>(AmenityController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'restoreAmenity',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
