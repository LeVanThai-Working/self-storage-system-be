import type { IocContainer } from '@tsoa/runtime';
import { UserController } from './modules/user/user.controller.ts';
import { userController } from './modules/user/user.container.ts';
import { AuthController } from './modules/auth/auth.controller.ts';
import { authController } from './modules/auth/auth.container.ts';
import { ProfileController } from './modules/profile/profile.controller.ts';
import { profileController } from './modules/profile/profile.container.ts';
import { FacilityController } from './modules/facility/facility.controller.ts';
import { facilityController } from './modules/facility/facility.container.ts';
import { UnitTypeController } from './modules/unitType/unitType.controller.ts';
import { unitTypeController } from './modules/unitType/unitType.container.ts';
import { FacilityUnitTypeOfferingController } from './modules/facilityUnitTypeOffering/facilityUnitTypeOffering.controller.ts';
import { facilityUnitTypeOfferingController } from './modules/facilityUnitTypeOffering/facilityUnitTypeOffering.container.ts';
import { StorageUnitController } from './modules/storageUnit/storageUnit.controller.ts';
import { storageUnitController } from './modules/storageUnit/storageUnit.container.ts';
import { AmenityController } from './modules/amenity/amenity.controller.ts';
import { amenityController } from './modules/amenity/amenity.container.ts';
import { FacilityAmenityOfferingController } from './modules/facilityAmenityOffering/facilityAmenityOffering.controller.ts';
import { facilityAmenityOfferingController } from './modules/facilityAmenityOffering/facilityAmenityOffering.container.ts';
import { AuditLogController } from './modules/auditLog/auditLog.controller.ts';
import { auditLogController } from './modules/auditLog/auditLog.container.ts';
import { ApprovalRequestController } from './modules/approvalRequest/approvalRequest.controller.ts';
import { approvalRequestController } from './modules/approvalRequest/approvalRequest.container.ts';
import { ReservationController } from './modules/reservation/reservation.controller.ts';
import { reservationController } from './modules/reservation/reservation.container.ts';
import { FacilityManagerController } from './modules/facilityManager/facilityManager.controller.ts';
import { facilityManagerController } from './modules/facilityManager/facilityManager.container.ts';
import { ContractController } from './modules/contract/contract.controller.ts';
import { contractController } from './modules/contract/contract.container.ts';
import { PaymentController } from './modules/payment/payment.controller.ts';
import { paymentController } from './modules/payment/payment.container.ts';

export const iocContainer: IocContainer = {
  get: <T>(controller: unknown): T => {
    if (controller === UserController) {
      return userController as unknown as T;
    }
    if (controller === AuthController) {
      return authController as unknown as T;
    }
    if (controller === ProfileController) {
      return profileController as unknown as T;
    }
    if (controller === FacilityController) {
      return facilityController as unknown as T;
    }
    if (controller === UnitTypeController) {
      return unitTypeController as unknown as T;
    }
    if (controller === FacilityUnitTypeOfferingController) {
      return facilityUnitTypeOfferingController as unknown as T;
    }
    if (controller === StorageUnitController) {
      return storageUnitController as unknown as T;
    }
    if (controller === AmenityController) {
      return amenityController as unknown as T;
    }
    if (controller === FacilityAmenityOfferingController) {
      return facilityAmenityOfferingController as unknown as T;
    }
    if (controller === AuditLogController) {
      return auditLogController as unknown as T;
    }
    if (controller === ApprovalRequestController) {
      return approvalRequestController as unknown as T;
    }
    if (controller === ReservationController) {
      return reservationController as unknown as T;
    }
    if (controller === FacilityManagerController) {
      return facilityManagerController as unknown as T;
    }
    if (controller === ContractController) {
      return contractController as unknown as T;
    }
    if (controller === PaymentController) {
      return paymentController as unknown as T;
    }
    throw new Error(
      `Controller not found in iocContainer: ${String(controller)}`
    );
  },
};
