import crypto from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  addDays,
  calculateAgeVN,
  checkOperatingHoursMatchVN,
  checkTimeSlotMatchVN,
  endOfDayVN,
  isEarlyCheckInVN,
  startOfDayVN,
} from '../../utils/date.util.ts';
import { encryptText } from '../../utils/encryption.util.ts';
import { calculateContractOverdueFee } from '../../utils/contractFee.util.ts';
import {
  computeCancellationOutcome,
  isReservationCheckInAllowed,
} from '../../utils/reservationPolicy.util.ts';
import { contractConfig } from '../../config/contract.config.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import {
  AuthProviderEnum,
  RoleEnum,
  UserStatusEnum,
} from '../../common/enums/user.enum.ts';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
  ContractCancellationTypeEnum,
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
  ContractTerminationTypeEnum,
  ViolationCategoryEnum,
} from '../../common/enums/contract.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';
import {
  ReservationCancelSourceEnum,
  ReservationStatusEnum,
} from '../../common/enums/reservation.enum.ts';
import { RefundReasonEnum } from '../../common/enums/refundRequest.enum.ts';
import {
  NotificationChannelEnum,
  NotificationPriorityEnum,
  NotificationTypeEnum,
} from '../../common/enums/notification.enum.ts';
import { runAfterCommit } from '../../utils/transactionScope.util.ts';
import type { NotificationService } from '../notification/notification.service.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { RefundRequestService } from '../refundRequest/refundRequest.service.ts';
import type { ContractRepository } from './contract.repository.ts';
import type { ReservationRepository } from '../reservation/reservation.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import type { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { CustomerInventoryRepository } from '../customerInventory/customerInventory.repository.ts';
import type { IncidentRepository } from '../incident/incident.repository.ts';
import type { LegalEntityRepository } from '../legalEntity/legalEntity.repository.ts';
import type { SigningAuthorizationRepository } from '../signingAuthorization/signingAuthorization.repository.ts';
import type { ProfileRepository } from '../profile/profile.repository.ts';
import type { ContractTemplateRepository } from '../contractTemplate/contractTemplate.repository.ts';
import type { StorageRackRepository } from '../storageRack/storageRack.repository.ts';
import type { IStorageRack } from '../storageRack/storageRack.model.ts';
import { RentalTargetTypeEnum } from '../../common/enums/rental.enum.ts';
import { ContractPdfService } from './services/contractPdf.service.ts';
import type {
  IContract,
  IContractAddendum,
  IContractAmenity,
  IContractRenewal,
  IContractSignatureHistory,
  IContractTerminationFile,
  IContractTerminationHistory,
  ICustomerSnapshot,
  ILegalEntitySnapshot,
  ISigningAuthorizationSnapshot,
} from './contract.model.ts';
import {
  contractResponseSchema,
  processContractOverdueResponseSchema,
  type ContractResponse,
  type ProcessContractOverdueResponse,
} from './schemas/contract.response.schema.ts';
import type {
  ApproveContractAddendumRequest,
  CancelContractAddendumRequest,
  CancelContractRequest,
  CheckInContractRequest,
  CheckOutContractRequest,
  ContractQuery,
  CreateContractAddendumRequest,
  CreateContractRequest,
  CustomerSignContractRequest,
  ProcessContractOverdueQuery,
  RejectContractAddendumRequest,
  RenewContractRequest,
  SignContractAddendumRequest,
  TerminateContractRequest,
  DisputeSettlementRequest,
  WalkInContractRequest,
} from './schemas/contract.request.schema.ts';
import type { ContractQueue } from './contract.queue.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

export class ContractService {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly reservationRepository: ReservationRepository,
    private readonly storageUnitRepository: StorageUnitRepository,
    private readonly amenityOfferingRepository: FacilityAmenityOfferingRepository,
    private readonly unitTypeOfferingRepository: FacilityUnitTypeOfferingRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLogService?: AuditLogService,
    private readonly refundRequestService?: RefundRequestService,
    private readonly customerInventoryRepository?: CustomerInventoryRepository,
    private readonly incidentRepository?: IncidentRepository,
    private readonly contractQueue?: ContractQueue,
    private readonly notificationService?: NotificationService,
    private readonly legalEntityRepository?: LegalEntityRepository,
    private readonly signingAuthRepository?: SigningAuthorizationRepository,
    private readonly profileRepository?: ProfileRepository,
    private readonly contractTemplateRepository?: ContractTemplateRepository,
    private readonly storageRackRepository?: StorageRackRepository,
    private readonly contractPdfService: ContractPdfService = new ContractPdfService()
  ) {}

  // 1. Create contract (From RESERVATION or WALK_IN)
  @Transactional()
  async createContract(
    data: CreateContractRequest,
    actorId: string,
    actorRole: string,
    session?: ClientSession
  ): Promise<ContractResponse> {
    if (
      actorRole !== RoleEnum.FACILITY_STAFF &&
      actorRole !== RoleEnum.FACILITY_MANAGER &&
      actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      actorRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const contractCode = await this.generateContractCode();

    if (data.source === ContractSourceEnum.RESERVATION) {
      if (!data.reservationId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
          'reservationId is required for RESERVATION contracts',
        ]);
      }

      // Check if an active contract already exists for this reservation
      const existingContract =
        await this.contractRepository.findActiveByReservationId(
          data.reservationId,
          session
        );
      if (existingContract) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, [
          'Contract for this reservation',
        ]);
      }

      const reservation = await this.reservationRepository.findById(
        data.reservationId,
        session
      );
      if (!reservation) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_300);
      }

      const customerId =
        reservation.customerId && typeof reservation.customerId === 'object'
          ? (reservation.customerId as { _id: Types.ObjectId })._id
          : (reservation.customerId as Types.ObjectId);

      const facilityId =
        reservation.facilityId && typeof reservation.facilityId === 'object'
          ? (reservation.facilityId as { _id: Types.ObjectId })._id
          : (reservation.facilityId as Types.ObjectId);

      await this.assertFacilityAccess(actorId, actorRole, String(facilityId));

      // Age check on customer profile (T4.2)
      if (this.profileRepository) {
        const profile = await this.profileRepository.findByUserId(
          String(customerId)
        );
        if (profile?.dateOfBirth) {
          const age = calculateAgeVN(new Date(profile.dateOfBirth));
          if (age < contractConfig.minCustomerAge) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_430, [
              'Customer must be at least 18 years old',
            ]);
          }
        }
      }

      // Reservation must be CONFIRMED or OVERDUE (within grace period)
      if (
        reservation.status !== ReservationStatusEnum.CONFIRMED &&
        reservation.status !== ReservationStatusEnum.OVERDUE
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_406);
      }

      // Gate check for reservation: check-in date, arrival, and deadline window
      const now = new Date();
      const checkInGate = isReservationCheckInAllowed(reservation, now);
      if (!checkInGate.isAllowed) {
        if (checkInGate.code === 'MESSAGE_CODE_423') {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_423);
        }
        if (checkInGate.code === 'MESSAGE_CODE_424') {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_424);
        }
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_406);
      }

      if (!reservation.storageUnitId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_305);
      }

      const storageUnitId =
        reservation.storageUnitId &&
        typeof reservation.storageUnitId === 'object'
          ? (reservation.storageUnitId as { _id: Types.ObjectId })._id
          : (reservation.storageUnitId as Types.ObjectId);

      const facilityUnitTypeOfferingId =
        reservation.facilityUnitTypeOfferingId &&
        typeof reservation.facilityUnitTypeOfferingId === 'object'
          ? (reservation.facilityUnitTypeOfferingId as { _id: Types.ObjectId })
              ._id
          : (reservation.facilityUnitTypeOfferingId as Types.ObjectId);

      const startDate = new Date(reservation.startDate);
      const endDate = new Date(
        startDate.getTime() + reservation.rentalDuration * 24 * 60 * 60 * 1000
      );

      // Snapshot amenities from reservation
      const contractAmenities: IContractAmenity[] = reservation.amenities.map(
        (a) => ({
          facilityAmenityOfferingId: a.facilityAmenityOfferingId,
          amenityId: a.amenityId,
          name: a.name,
          quantity: a.quantity,
          pricePerUnit: a.pricePerUnit,
          billingUnit: a.billingUnit,
          totalPrice: a.totalPrice,
          addedAt: new Date(),
        })
      );

      const amenitiesTotal = contractAmenities.reduce(
        (sum, a) => sum + a.totalPrice,
        0
      );
      const totalPeriodicPrice = reservation.basePrice + amenitiesTotal;

      const created = await this.contractRepository.create(
        {
          contractCode,
          source: ContractSourceEnum.RESERVATION,
          reservationId: new Types.ObjectId(data.reservationId),
          customerId: new Types.ObjectId(String(customerId)),
          facilityId: new Types.ObjectId(String(facilityId)),
          storageUnitId: new Types.ObjectId(String(storageUnitId)),
          rentalTargetType:
            reservation.rentalTargetType ||
            (reservation.rentedRackIds && reservation.rentedRackIds.length > 0
              ? RentalTargetTypeEnum.STORAGE_RACK
              : RentalTargetTypeEnum.STORAGE_UNIT),
          rentedRackIds: (reservation.rentedRackIds || []).map(
            (id) =>
              new Types.ObjectId(
                String((id as { _id?: Types.ObjectId })._id || id)
              )
          ),
          facilityUnitTypeOfferingId: new Types.ObjectId(
            String(facilityUnitTypeOfferingId)
          ),
          assignedStaffId: data.assignedStaffId
            ? new Types.ObjectId(data.assignedStaffId)
            : new Types.ObjectId(actorId),
          startDate,
          endDate,
          billingUnit: reservation.billingUnit,
          rentalPrice: reservation.basePrice,
          depositAmount: reservation.depositAmount,
          depositPaidAt: reservation.paidAt || new Date(),
          depositPaymentId: reservation.paymentId
            ? new Types.ObjectId(String(reservation.paymentId))
            : null,
          totalPeriodicPrice,
          amenities: contractAmenities,
          status: ContractStatusEnum.DRAFT,
          depositStatus: ContractDepositStatusEnum.HELD,
          termsAccepted: false,
          notes: data.notes || reservation.notes,
        },
        session
      );

      const populated = await this.contractRepository.findById(
        String(created._id),
        session
      );
      const formatted = this.formatContract(populated || created);

      this.auditLogService?.record({
        action: AuditActionEnum.CREATE,
        resourceType: AuditResourceEnum.CONTRACT,
        resourceId: String(created._id),
        after: formatted,
        metadata: { source: ContractSourceEnum.RESERVATION },
      });

      const customerIdStr = this.extractIdStr(created.customerId);
      const facilityIdStr = this.extractIdStr(created.facilityId);
      this.notifyCustomer(
        customerIdStr,
        facilityIdStr,
        `Hợp đồng nháp [${created.contractCode}] đã được tạo`,
        `Hợp đồng thuê kho [${created.contractCode}] từ đơn đặt chỗ đã được lập bản nháp. Vui lòng xác nhận và ký hợp đồng.`,
        { contractId: String(created._id), contractCode: created.contractCode }
      );
      this.notifyFacilityManager(
        facilityIdStr,
        `Hợp đồng [${created.contractCode}] đã được tạo`,
        `Hợp đồng [${created.contractCode}] đã được tạo tại cơ sở từ đơn đặt chỗ.`,
        { contractId: String(created._id), contractCode: created.contractCode }
      );

      return validateResponse(contractResponseSchema, formatted);
    } else {
      // WALK_IN flow
      await this.assertFacilityAccess(
        actorId,
        actorRole,
        String(data.facilityId)
      );

      const customer = await this.userRepository.findById(data.customerId!);
      if (!customer) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Customer']);
      }

      // Age check on customer profile (T4.2)
      if (this.profileRepository) {
        const profile = await this.profileRepository.findByUserId(
          String(data.customerId)
        );
        if (profile?.dateOfBirth) {
          const age = calculateAgeVN(new Date(profile.dateOfBirth));
          if (age < contractConfig.minCustomerAge) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_430, [
              'Customer must be at least 18 years old',
            ]);
          }
        }
      }

      const facility = await this.facilityRepository.findById(data.facilityId!);
      if (!facility) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
      }

      const offering = await this.unitTypeOfferingRepository.findById(
        data.facilityUnitTypeOfferingId!
      );
      if (!offering) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
          'Facility Unit Type Offering',
        ]);
      }

      const unit = await this.storageUnitRepository.findById(
        data.storageUnitId!,
        session
      );
      if (!unit) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
          'Storage Unit',
        ]);
      }

      const unitFacilityId =
        unit.facilityId && typeof unit.facilityId === 'object'
          ? String((unit.facilityId as { _id: Types.ObjectId })._id)
          : String(unit.facilityId);
      if (unitFacilityId !== data.facilityId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_407);
      }

      if (unit.status !== StorageUnitStatusEnum.AVAILABLE) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_402);
      }

      // Atomic update storage unit to RESERVED
      await this.storageUnitRepository.updateById(
        data.storageUnitId!,
        { status: StorageUnitStatusEnum.RESERVED },
        session
      );

      // Process amenities
      const contractAmenities: IContractAmenity[] = [];
      if (data.amenities && data.amenities.length > 0) {
        for (const item of data.amenities) {
          const amenityOffering = await this.amenityOfferingRepository.findById(
            item.facilityAmenityOfferingId,
            session
          );
          if (!amenityOffering) {
            throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
              'Facility Amenity Offering',
            ]);
          }

          const isService =
            amenityOffering.amenityId &&
            typeof amenityOffering.amenityId === 'object' &&
            'type' in amenityOffering.amenityId &&
            (amenityOffering.amenityId as { type?: string }).type === 'service';

          if (!isService) {
            const total = amenityOffering.totalQuantity ?? 0;
            const available = total - amenityOffering.inUseQuantity;
            if (total > 0 && available < item.quantity) {
              throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_408);
            }

            // Lock amenity inventory
            await this.amenityOfferingRepository.updateById(
              String(amenityOffering._id),
              { inUseQuantity: amenityOffering.inUseQuantity + item.quantity },
              session
            );
          }

          const amenityName =
            amenityOffering.amenityId &&
            typeof amenityOffering.amenityId === 'object' &&
            'name' in amenityOffering.amenityId
              ? String(amenityOffering.amenityId.name)
              : 'Amenity';

          const amenityId =
            amenityOffering.amenityId &&
            typeof amenityOffering.amenityId === 'object' &&
            '_id' in amenityOffering.amenityId
              ? (amenityOffering.amenityId as { _id: Types.ObjectId })._id
              : (amenityOffering.amenityId as Types.ObjectId);

          const totalPrice = amenityOffering.pricePerUnit * item.quantity;
          contractAmenities.push({
            facilityAmenityOfferingId: amenityOffering._id,
            amenityId,
            name: amenityName,
            quantity: item.quantity,
            pricePerUnit: amenityOffering.pricePerUnit,
            billingUnit: amenityOffering.billingUnit,
            totalPrice,
            addedAt: new Date(),
          });
        }
      }

      const amenitiesTotal = contractAmenities.reduce(
        (sum, a) => sum + a.totalPrice,
        0
      );
      const rentalPrice = data.rentalPrice!;
      const totalPeriodicPrice = rentalPrice + amenitiesTotal;

      const created = await this.contractRepository.create(
        {
          contractCode,
          source: ContractSourceEnum.WALK_IN,
          customerId: new Types.ObjectId(data.customerId),
          facilityId: new Types.ObjectId(data.facilityId),
          storageUnitId: new Types.ObjectId(data.storageUnitId),
          facilityUnitTypeOfferingId: new Types.ObjectId(
            data.facilityUnitTypeOfferingId
          ),
          assignedStaffId: data.assignedStaffId
            ? new Types.ObjectId(data.assignedStaffId)
            : new Types.ObjectId(actorId),
          startDate: new Date(data.startDate!),
          endDate: new Date(data.endDate!),
          billingUnit: data.billingUnit!,
          rentalPrice,
          depositAmount: data.depositAmount!,
          totalPeriodicPrice,
          amenities: contractAmenities,
          status: ContractStatusEnum.DRAFT,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          termsAccepted: false,
          notes: data.notes || null,
        },
        session
      );

      const populated = await this.contractRepository.findById(
        String(created._id),
        session
      );
      const formatted = this.formatContract(populated || created);

      this.auditLogService?.record({
        action: AuditActionEnum.CREATE,
        resourceType: AuditResourceEnum.CONTRACT,
        resourceId: String(created._id),
        after: formatted,
        metadata: { source: ContractSourceEnum.WALK_IN },
      });

      const customerIdStr = this.extractIdStr(created.customerId);
      const facilityIdStr = this.extractIdStr(created.facilityId);
      this.notifyCustomer(
        customerIdStr,
        facilityIdStr,
        `Hợp đồng nháp [${created.contractCode}] đã được tạo`,
        `Hợp đồng thuê kho vãng lai [${created.contractCode}] đã được tạo bản nháp. Vui lòng ký hợp đồng tại quầy.`,
        { contractId: String(created._id), contractCode: created.contractCode }
      );
      this.notifyFacilityManager(
        facilityIdStr,
        `Hợp đồng vãng lai mới [${created.contractCode}]`,
        `Hợp đồng vãng lai [${created.contractCode}] đã được tạo tại cơ sở.`,
        { contractId: String(created._id), contractCode: created.contractCode }
      );

      return validateResponse(contractResponseSchema, formatted);
    }
  }

  // 2a. Customer signs contract terms on Mobile (Two-party signing: Customer side)
  @Transactional()
  async customerSignContract(
    id: string,
    actorId: string,
    actorRole: string,
    data: CustomerSignContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (actorRole !== RoleEnum.CUSTOMER) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const customerIdStr = this.extractIdStr(contract.customerId);
    if (customerIdStr !== actorId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (contract.status !== ContractStatusEnum.DRAFT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    if (contract.customerSigned) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_412);
    }

    if (data.termsAccepted === false) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_411);
    }

    // Require walk-in contracts to have paid deposit before signing/check-in
    if (
      contract.source === ContractSourceEnum.WALK_IN &&
      !contract.depositPaidAt
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_506);
    }

    const now = new Date();
    const facilityIdStr = this.extractIdStr(contract.facilityId);
    const facility = await this.facilityRepository.findById(facilityIdStr);
    const opHoursMatch = checkOperatingHoursMatchVN(
      facility?.operatingHours,
      now
    );
    const outsideOperatingHours = !opHoursMatch.isWithinOperatingHours;
    const operatingHours = facility?.operatingHours
      ? {
          open: facility.operatingHours.open,
          close: facility.operatingHours.close,
        }
      : null;
    const bothSigned = Boolean(contract.staffSigned);

    if (bothSigned) {
      const storageUnitId =
        contract.storageUnitId && typeof contract.storageUnitId === 'object'
          ? String((contract.storageUnitId as { _id: Types.ObjectId })._id)
          : String(contract.storageUnitId);

      if (contract.rentedRackIds && contract.rentedRackIds.length > 0) {
        if (this.storageRackRepository) {
          const rackIds = contract.rentedRackIds.map((id) =>
            String((id as { _id?: Types.ObjectId })._id || id)
          );
          await this.storageRackRepository.occupyRacksAtomic(
            rackIds,
            String(contract._id),
            customerIdStr,
            session
          );
        }
      } else {
        await this.storageUnitRepository.updateById(
          storageUnitId,
          { status: StorageUnitStatusEnum.OCCUPIED },
          session
        );
      }

      if (contract.reservationId) {
        await this.reservationRepository.atomicUpdateStatus(
          String(contract.reservationId),
          [ReservationStatusEnum.CONFIRMED, ReservationStatusEnum.OVERDUE],
          { status: ReservationStatusEnum.COMPLETED },
          session
        );
      }
    }

    // T4.2: Snapshot customer info during signing & verify age
    let customerSnapshot: ICustomerSnapshot | null = null;
    if (this.profileRepository) {
      const profile = await this.profileRepository.findByUserId(customerIdStr);
      if (profile?.dateOfBirth) {
        const age = calculateAgeVN(new Date(profile.dateOfBirth));
        if (age < contractConfig.minCustomerAge) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_430, [
            'Customer must be at least 18 years old',
          ]);
        }
      }
      const customerUser = await this.userRepository.findById(customerIdStr);
      if (customerUser) {
        customerSnapshot = {
          customerId: new Types.ObjectId(customerIdStr),
          name: customerUser.name,
          email: customerUser.email,
          phoneNumber: customerUser.phoneNumber || '',
          dateOfBirth: profile?.dateOfBirth
            ? new Date(profile.dateOfBirth)
            : null,
          address: profile?.address || null,
          idCardNumberMasked: profile?.idCardLast4
            ? `****${profile.idCardLast4}`
            : null,
          idCardFrontPhotoUrl: profile?.idCardFrontPhotoUrl || null,
          idCardBackPhotoUrl: profile?.idCardBackPhotoUrl || null,
          signedAt: now,
          signedIp: null,
        };
      }
    }

    const updated = await this.contractRepository.update(
      id,
      {
        customerSigned: true,
        customerSignedAt: now,
        termsAccepted: true,
        customerSnapshot: customerSnapshot || contract.customerSnapshot || null,
        status: bothSigned
          ? ContractStatusEnum.ACTIVE
          : ContractStatusEnum.DRAFT,
        actualCheckInDate: bothSigned
          ? contract.actualCheckInDate || now
          : contract.actualCheckInDate || null,
        notes: data.notes || contract.notes,
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.SIGN_CONTRACT,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        party: 'customer',
        activated: bothSigned,
        outsideOperatingHours,
        operatingHours,
      },
    });

    this.notifyFacilityManager(
      facilityIdStr,
      `Khách hàng đã ký hợp đồng [${contract.contractCode}]`,
      `Khách hàng đã xác nhận ký hợp đồng [${contract.contractCode}]. Sẵn sàng làm thủ tục nhận kho check-in.`,
      { contractId: id, contractCode: contract.contractCode }
    );

    return validateResponse(contractResponseSchema, formatted);
  }

  // 2b. Facility Manager confirms handover & signs contract on Web (Two-party signing: Facility side)
  @Transactional()
  async checkInContract(
    id: string,
    actorId: string,
    actorRole: string,
    data: CheckInContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (
      actorRole !== RoleEnum.FACILITY_MANAGER &&
      actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      actorRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        RoleEnum.FACILITY_MANAGER,
      ]);
    }

    const facilityIdStr = this.extractIdStr(contract.facilityId);
    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    if (contract.status !== ContractStatusEnum.DRAFT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    if (contract.staffSigned) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_412);
    }

    if (!contract.customerSigned) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_414);
    }

    if (data.termsAccepted === false) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_411);
    }

    // Require walk-in contracts to have paid deposit before check-in
    if (
      contract.source === ContractSourceEnum.WALK_IN &&
      !contract.depositPaidAt
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_506);
    }

    // Require first period rent to be paid before check-in
    if (!contract.firstPeriodPaidAt) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_519);
    }

    const now = new Date();
    const actualCheckInDate = data.actualCheckInDate
      ? new Date(data.actualCheckInDate)
      : now;

    // T4.3: Digitized paper contract scan upload verification
    if (contractConfig.requireSignedContractScan) {
      if (
        !data.signedContractFileUrls ||
        data.signedContractFileUrls.length === 0
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_432);
      }
    }

    const signedContractFiles: IContractTerminationFile[] = (
      data.signedContractFileUrls || []
    ).map((url) => ({
      url,
      fileHash: crypto.createHash('sha256').update(url).digest('hex'),
      uploadedAt: now,
    }));

    // T2.8: Compute early check-in, out-of-slot, and facility operating hours soft flags
    const facility = await this.facilityRepository.findById(facilityIdStr);

    // T4.1 / D12: Check SigningAuthorization for Facility Manager
    let signingAuthorizationSnapshot: ISigningAuthorizationSnapshot | null =
      null;
    if (
      this.signingAuthRepository &&
      contractConfig.requireSigningAuthorization
    ) {
      if (actorRole === RoleEnum.FACILITY_MANAGER) {
        const validAuth =
          await this.signingAuthRepository.findValidAuthorization(
            actorId,
            facilityIdStr,
            now
          );
        if (!validAuth) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_431);
        }
        signingAuthorizationSnapshot = {
          authorizationId: validAuth._id,
          authorizedUserId: validAuth.authorizedUserId,
          authorizationNumber: validAuth.authorizationNumber,
          issuedDate: validAuth.issuedDate,
          validFrom: validAuth.validFrom,
          validTo: validAuth.validTo,
          documentUrl: validAuth.documentUrl,
          fileHash: validAuth.fileHash ?? null,
        };
      }
    }

    // T4.1 / D12: Snapshot Legal Entity from Facility
    let legalEntitySnapshot: ILegalEntitySnapshot | null = null;
    if (this.legalEntityRepository && facility?.legalEntityId) {
      const le = await this.legalEntityRepository.findById(
        String(facility.legalEntityId)
      );
      if (le) {
        legalEntitySnapshot = {
          legalEntityId: le._id,
          companyName: le.companyName,
          taxCode: le.taxCode,
          registeredAddress: le.registeredAddress,
          legalRepresentative: {
            name: le.legalRepresentative.name,
            title: le.legalRepresentative.title,
            idNumber: le.legalRepresentative.idNumber,
          },
          bankAccount: {
            bankName: le.bankAccount.bankName,
            accountNumber: le.bankAccount.accountNumber,
            accountHolder: le.bankAccount.accountHolder,
          },
        };
      }
    }

    let reservation = null;
    if (contract.reservationId) {
      reservation = await this.reservationRepository.findById(
        String(contract.reservationId),
        session
      );
    }

    const earlyCheckIn = reservation
      ? isEarlyCheckInVN(reservation.checkInDate, actualCheckInDate)
      : null;
    const slotMatch = reservation
      ? checkTimeSlotMatchVN(
          reservation.checkInDate,
          reservation.checkInTimeSlot,
          actualCheckInDate
        )
      : null;
    const outOfSlot = slotMatch ? !slotMatch.isWithinSlot : null;

    const opHoursMatch = checkOperatingHoursMatchVN(
      facility?.operatingHours,
      actualCheckInDate
    );
    const outsideOperatingHours = !opHoursMatch.isWithinOperatingHours;

    // Late check-in date adjustment [OPEN D6 & T2.7]
    let finalStartDate = contract.startDate;
    let finalEndDate = contract.endDate;
    if (
      startOfDayVN(actualCheckInDate).getTime() >
      startOfDayVN(contract.startDate).getTime()
    ) {
      const leaseDurationMs =
        contract.endDate.getTime() - contract.startDate.getTime();
      finalStartDate = startOfDayVN(actualCheckInDate);
      finalEndDate = new Date(finalStartDate.getTime() + leaseDurationMs);

      // If customer has already signed DRAFT contract, date shift invalidates signature (T2.7 / OPEN D2):
      // 1. Record customer signature in signatureHistory
      // 2. Adjust dates and reset customerSigned = false, customerSignedAt = null
      // 3. Throw MESSAGE_CODE_425 to require re-signing the updated draft
      if (contract.customerSigned) {
        const historyEntry: IContractSignatureHistory = {
          party: 'customer',
          signedAt: contract.customerSignedAt || now,
          previousStartDate: contract.startDate,
          previousEndDate: contract.endDate,
          resetAt: now,
          resetReason: `Check-in date shifted from ${contract.startDate.toISOString()} to ${finalStartDate.toISOString()}`,
        };

        const updatedDraft = await this.contractRepository.update(id, {
          $set: {
            startDate: finalStartDate,
            endDate: finalEndDate,
            customerSigned: false,
            customerSignedAt: null,
          },
          $push: { signatureHistory: historyEntry },
        } as unknown as Partial<IContract>);

        this.auditLogService?.record({
          action: AuditActionEnum.UPDATE,
          resourceType: AuditResourceEnum.CONTRACT,
          resourceId: id,
          before: this.formatContract(contract),
          after: this.formatContract(updatedDraft || contract),
          metadata: {
            reason:
              'Check-in date shifted. Customer signature reset for re-signing.',
            previousStartDate: contract.startDate,
            newStartDate: finalStartDate,
          },
        });

        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_425);
      }
    }
    const bothSigned = Boolean(contract.customerSigned);
    const customerIdStr = this.extractIdStr(contract.customerId);

    if (bothSigned) {
      const storageUnitId =
        contract.storageUnitId && typeof contract.storageUnitId === 'object'
          ? String((contract.storageUnitId as { _id: Types.ObjectId })._id)
          : String(contract.storageUnitId);

      if (contract.rentedRackIds && contract.rentedRackIds.length > 0) {
        if (this.storageRackRepository) {
          const rackIds = contract.rentedRackIds.map((id) =>
            String((id as { _id?: Types.ObjectId })._id || id)
          );
          await this.storageRackRepository.occupyRacksAtomic(
            rackIds,
            String(contract._id),
            customerIdStr,
            session
          );
        }
      } else {
        // Transition storage unit to OCCUPIED
        await this.storageUnitRepository.updateById(
          storageUnitId,
          { status: StorageUnitStatusEnum.OCCUPIED },
          session
        );
      }

      // If contract was created from Reservation, complete the reservation
      if (contract.reservationId) {
        await this.reservationRepository.atomicUpdateStatus(
          String(contract.reservationId),
          [ReservationStatusEnum.CONFIRMED, ReservationStatusEnum.OVERDUE],
          {
            status: ReservationStatusEnum.COMPLETED,
            earlyCheckIn,
            outOfSlot,
          },
          session
        );
      }
    }

    const storageUnitIdStr = this.extractIdStr(contract.storageUnitId);
    const updated = await this.contractRepository.atomicCheckIn(
      id,
      {
        status: ContractStatusEnum.DRAFT,
        customerSigned: true,
        storageUnitId: storageUnitIdStr,
      },
      {
        staffSigned: true,
        staffSignedAt: now,
        status: ContractStatusEnum.ACTIVE,
        startDate: finalStartDate,
        endDate: finalEndDate,
        actualCheckInDate,
        earlyCheckIn,
        outOfSlot,
        termsAccepted: true,
        signedContractFiles,
        signingAuthorizationSnapshot,
        legalEntitySnapshot,
        notes: data.notes || contract.notes,
        assignedStaffId:
          contract.assignedStaffId || new Types.ObjectId(actorId),
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.CHECK_IN,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        party: 'staff',
        activated: bothSigned,
        earlyCheckIn,
        outOfSlot,
        outsideOperatingHours,
        notes: data.notes || undefined,
      },
    });

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Nhận kho thành công [${contract.contractCode}]`,
      `Hợp đồng thuê kho [${contract.contractCode}] đã kích hoạt thành công. Quý khách có thể bắt đầu sử dụng phòng kho.`,
      {
        contractId: id,
        contractCode: contract.contractCode,
        status: ContractStatusEnum.ACTIVE,
      },
      NotificationPriorityEnum.HIGH
    );

    return validateResponse(contractResponseSchema, formatted);
  }

  // Mark contract deposit as paid (from Payment service or SePay Webhook)
  @Transactional()
  async markDepositPaid(
    id: string,
    paymentInfo: {
      paymentId: string;
      paidAmount: number;
      paidAt: Date;
      referenceCode?: string | null;
    },
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (contract.status !== ContractStatusEnum.DRAFT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const updated = await this.contractRepository.update(
      id,
      {
        depositPaidAt: paymentInfo.paidAt,
        depositPaymentId: new Types.ObjectId(paymentInfo.paymentId),
        depositStatus: ContractDepositStatusEnum.HELD,
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.RECEIVE_PAYMENT,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        paymentId: paymentInfo.paymentId,
        paidAmount: paymentInfo.paidAmount,
        referenceCode: paymentInfo.referenceCode ?? null,
      },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // Mark contract first period rent as paid (from Payment service or SePay Webhook)
  @Transactional()
  async markFirstPeriodRentPaid(
    id: string,
    paymentInfo: {
      paymentId: string;
      paidAmount: number;
      paidAt: Date;
      referenceCode?: string | null;
    },
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (contract.status !== ContractStatusEnum.DRAFT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    if (!contract.depositPaidAt) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_520);
    }

    const updated = await this.contractRepository.update(
      id,
      {
        firstPeriodPaidAt: paymentInfo.paidAt,
        firstPeriodPaymentId: new Types.ObjectId(paymentInfo.paymentId),
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.RECEIVE_PAYMENT,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        paymentId: paymentInfo.paymentId,
        paidAmount: paymentInfo.paidAmount,
        purpose: 'RENT_FIRST_PERIOD',
        referenceCode: paymentInfo.referenceCode ?? null,
      },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  private async releaseContractAmenities(
    contract: IContract,
    session?: ClientSession
  ): Promise<void> {
    if (!contract.amenities || contract.amenities.length === 0) return;
    for (const a of contract.amenities) {
      const offeringId = String(
        (a.facilityAmenityOfferingId as unknown as { _id: Types.ObjectId })
          ._id || a.facilityAmenityOfferingId
      );
      const offering = await this.amenityOfferingRepository.findById(
        offeringId,
        session
      );
      if (offering) {
        const isService =
          offering.amenityId &&
          typeof offering.amenityId === 'object' &&
          'type' in offering.amenityId &&
          (offering.amenityId as { type?: string }).type === 'service';

        if (!isService) {
          await this.amenityOfferingRepository.releaseAmenityQuantityAtomic(
            offeringId,
            a.quantity,
            session
          );
        }
      }
    }
  }

  // 3. Cancel or VOID contract (DRAFT -> CANCELLED)
  @Transactional()
  async cancelContract(
    id: string,
    actorId: string,
    actorRole: string,
    data: CancelContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    const cancellationType =
      data.cancellationType || ContractCancellationTypeEnum.CANCEL;

    // Role and scope authorization
    const customerIdStr = this.extractIdStr(contract.customerId);
    const facilityIdStr = this.extractIdStr(contract.facilityId);

    if (cancellationType === ContractCancellationTypeEnum.VOID) {
      // Q2: Only STAFF, MANAGER, OPS, ADMIN of facility can VOID (staff mistake correction)
      if (actorRole === RoleEnum.CUSTOMER) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
      await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);
    } else {
      // CANCEL: CUSTOMER can cancel own contract; STAFF/MANAGER of facility can cancel
      if (actorRole === RoleEnum.CUSTOMER) {
        if (customerIdStr !== actorId) {
          throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
        }
      } else if (
        actorRole === RoleEnum.FACILITY_STAFF ||
        actorRole === RoleEnum.FACILITY_MANAGER ||
        actorRole === RoleEnum.BUSINESS_OPS_MANAGER ||
        actorRole === RoleEnum.SYSTEM_ADMIN
      ) {
        await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);
      } else {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    }

    if (contract.status !== ContractStatusEnum.DRAFT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const storageUnitId =
      contract.storageUnitId && typeof contract.storageUnitId === 'object'
        ? String((contract.storageUnitId as { _id: Types.ObjectId })._id)
        : String(contract.storageUnitId);

    let contractRefundAmount: number;
    let contractForfeitedAmount: number;
    let contractDepositStatus: ContractDepositStatusEnum | null =
      contract.depositStatus || null;

    if (cancellationType === ContractCancellationTypeEnum.VOID) {
      // ==========================================
      // VOID FLOW: Erroneous staff draft creation
      // ==========================================
      if (contract.reservationId) {
        const reservation = await this.reservationRepository.findById(
          String(contract.reservationId),
          session
        );
        if (
          !reservation ||
          (reservation.status !== ReservationStatusEnum.CONFIRMED &&
            reservation.status !== ReservationStatusEnum.OVERDUE)
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_422);
        }

        // Reservation remains CONFIRMED or OVERDUE (Q3: preserve state, do not cancel)
        // Storage unit and amenities remain RESERVED / inUse for the reservation
        contractRefundAmount = 0;
        contractForfeitedAmount = 0;
        contractDepositStatus = ContractDepositStatusEnum.HELD;
      } else {
        // WALK_IN void: release storage unit and amenities
        await this.storageUnitRepository.releaseReservedUnitAtomic(
          storageUnitId,
          StorageUnitStatusEnum.AVAILABLE,
          session
        );
        await this.releaseContractAmenities(contract, session);

        // If deposit was paid, refund full deposit via RefundRequest (A2)
        if (contract.depositPaidAt && contract.depositAmount > 0) {
          contractRefundAmount = contract.depositAmount;
          contractForfeitedAmount = 0;
          contractDepositStatus = ContractDepositStatusEnum.REFUNDED;

          if (this.refundRequestService) {
            await this.refundRequestService.createRefundRequestInternal(
              actorId,
              {
                contractId: id,
                paymentId: contract.depositPaymentId
                  ? String(contract.depositPaymentId)
                  : undefined,
                facilityId: facilityIdStr,
                customerId: customerIdStr,
                amount: contract.depositAmount,
                reason: RefundReasonEnum.FACILITY_CANCEL,
                note: data.cancellationReason || 'Huỷ void hợp đồng walk-in',
                refundBankName: data.refundBankName,
                refundAccountNumber: data.refundAccountNumber,
                refundAccountHolder: data.refundAccountHolder,
              },
              session
            );
          }
        } else {
          contractRefundAmount = 0;
          contractForfeitedAmount = 0;
        }
      }
    } else {
      // ==========================================
      // CANCEL FLOW: Customer change of mind
      // ==========================================
      const isCustomer = actorRole === RoleEnum.CUSTOMER;
      const cancellationSource = isCustomer
        ? ReservationCancelSourceEnum.CUSTOMER
        : ReservationCancelSourceEnum.FACILITY;

      if (contract.reservationId) {
        const reservation = await this.reservationRepository.findById(
          String(contract.reservationId),
          session
        );

        if (
          reservation &&
          reservation.status !== ReservationStatusEnum.CANCELLED &&
          reservation.status !== ReservationStatusEnum.EXPIRED &&
          reservation.status !== ReservationStatusEnum.COMPLETED
        ) {
          // Compute cancellation outcome based on reservation snapshot policy (A1)
          const outcome = computeCancellationOutcome(reservation, new Date(), {
            isCustomer: true,
          });

          // Cancel the reservation
          const updatedRes =
            await this.reservationRepository.atomicUpdateStatus(
              String(contract.reservationId),
              [ReservationStatusEnum.CONFIRMED, ReservationStatusEnum.OVERDUE],
              {
                status: ReservationStatusEnum.CANCELLED,
                cancellationReason: data.cancellationReason,
                cancelledAt: new Date(),
                cancelledBy: new Types.ObjectId(actorId),
                cancellationSource,
                refundAmount: outcome.refundAmount,
                forfeitedAmount: outcome.forfeitedAmount,
                refundStatus: outcome.refundStatus,
              },
              session
            );

          if (updatedRes) {
            // Release unit and amenities
            await this.storageUnitRepository.releaseReservedUnitAtomic(
              storageUnitId,
              StorageUnitStatusEnum.AVAILABLE,
              session
            );
            await this.releaseContractAmenities(contract, session);

            // Create RefundRequest if there is refundable amount
            if (outcome.refundAmount > 0 && this.refundRequestService) {
              await this.refundRequestService.createRefundRequestInternal(
                actorId,
                {
                  reservationId: String(contract.reservationId),
                  paymentId: reservation.paymentId
                    ? String(reservation.paymentId)
                    : undefined,
                  facilityId: facilityIdStr,
                  customerId: customerIdStr,
                  amount: outcome.refundAmount,
                  reason: isCustomer
                    ? RefundReasonEnum.CUSTOMER_CANCEL
                    : RefundReasonEnum.FACILITY_CANCEL,
                  note: data.cancellationReason,
                  refundBankName: data.refundBankName,
                  refundAccountNumber: data.refundAccountNumber,
                  refundAccountHolder: data.refundAccountHolder,
                },
                session
              );
            }
          }

          contractRefundAmount = outcome.refundAmount;
          contractForfeitedAmount = outcome.forfeitedAmount;
          contractDepositStatus = outcome.isFreeCancellation
            ? ContractDepositStatusEnum.REFUNDED
            : outcome.refundAmount > 0
              ? ContractDepositStatusEnum.PARTIALLY_REFUNDED
              : ContractDepositStatusEnum.FORFEITED;
        } else {
          // Linked reservation is already closed or missing
          contractForfeitedAmount = contract.depositAmount || 0;
          contractRefundAmount = 0;
          contractDepositStatus = ContractDepositStatusEnum.FORFEITED;

          await this.storageUnitRepository.releaseReservedUnitAtomic(
            storageUnitId,
            StorageUnitStatusEnum.AVAILABLE,
            session
          );
          await this.releaseContractAmenities(contract, session);
        }
      } else {
        // WALK_IN cancel: release unit and amenities
        await this.storageUnitRepository.releaseReservedUnitAtomic(
          storageUnitId,
          StorageUnitStatusEnum.AVAILABLE,
          session
        );
        await this.releaseContractAmenities(contract, session);

        // Q1: When deposit was paid, forfeit 100%
        if (contract.depositPaidAt && contract.depositAmount > 0) {
          contractForfeitedAmount = contract.depositAmount;
          contractRefundAmount = 0;
          contractDepositStatus = ContractDepositStatusEnum.FORFEITED;
        } else {
          contractForfeitedAmount = 0;
          contractRefundAmount = 0;
        }
      }
    }

    // Atomic status update on Contract
    const updated = await this.contractRepository.atomicUpdateStatus(
      id,
      ContractStatusEnum.DRAFT,
      {
        status: ContractStatusEnum.CANCELLED,
        cancellationType,
        cancellationReason: data.cancellationReason,
        cancelledBy: new Types.ObjectId(actorId),
        cancelledAt: new Date(),
        refundAmount: contractRefundAmount,
        forfeitedAmount: contractForfeitedAmount,
        depositStatus: contractDepositStatus,
      },
      session
    );

    if (!updated) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated);

    this.auditLogService?.record({
      action:
        cancellationType === ContractCancellationTypeEnum.VOID
          ? AuditActionEnum.VOID
          : AuditActionEnum.CANCEL,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        cancellationType,
        depositForfeited: contractForfeitedAmount,
        refundAmount: contractRefundAmount,
        reservationId: contract.reservationId
          ? String(contract.reservationId)
          : null,
      },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 4. Renew contract (DEPRECATED & DISABLED - Replaced by Contract Addendum RENEW)
  async renewContract(
    id?: string,
    actorId?: string,
    data?: RenewContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    void id;
    void actorId;
    void data;
    void session;
    throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_416);
  }

  // 5a. Request contract addendum (RENEW or UNIT_CHANGE)
  @Transactional()
  async createAddendum(
    id: string,
    actorId: string,
    actorRole: string,
    data: CreateContractAddendumRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    const facilityIdStr = this.extractIdStr(contract.facilityId);
    const now = new Date();

    if (data.type === ContractAddendumTypeEnum.RENEW) {
      if (
        actorRole !== RoleEnum.CUSTOMER &&
        actorRole !== RoleEnum.FACILITY_MANAGER &&
        actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
        actorRole !== RoleEnum.SYSTEM_ADMIN
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }

      if (actorRole === RoleEnum.CUSTOMER) {
        const customerIdStr = this.extractIdStr(contract.customerId);
        if (customerIdStr !== actorId) {
          throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
        }
      } else {
        await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);
      }

      if (
        contract.status !== ContractStatusEnum.ACTIVE &&
        contract.status !== ContractStatusEnum.OVERDUE
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
      }

      if (!data.newEndDate) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
          'newEndDate is required for RENEW addendum',
        ]);
      }

      const newEndDate = new Date(data.newEndDate);
      const currentEndDate = new Date(contract.endDate);
      if (newEndDate <= currentEndDate) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_404);
      }

      const isCreatedByManagerOrAbove = actorRole !== RoleEnum.CUSTOMER;
      const initialStatus = isCreatedByManagerOrAbove
        ? ContractAddendumStatusEnum.DRAFT
        : ContractAddendumStatusEnum.PENDING_APPROVAL;

      const newAddendum: IContractAddendum = {
        _id: new Types.ObjectId(),
        addendumCode: this.generateAddendumCode(),
        type: ContractAddendumTypeEnum.RENEW,
        previousEndDate: currentEndDate,
        newEndDate,
        previousStorageUnitId: null,
        newStorageUnitId: null,
        amenities: [],
        totalPeriodicPrice: 0,
        damageFee: 0,
        status: initialStatus,
        requestedBy: new Types.ObjectId(actorId),
        requestedAt: now,
        approvedBy: isCreatedByManagerOrAbove
          ? new Types.ObjectId(actorId)
          : null,
        approvedAt: isCreatedByManagerOrAbove ? now : null,
        assignedStaffId: null,
        customerSigned: false,
        customerSignedAt: null,
        staffSigned: false,
        staffSignedAt: null,
        completedAt: null,
        rejectionReason: null,
        rejectedBy: null,
        rejectedAt: null,
        cancellationReason: null,
        cancelledBy: null,
        cancelledAt: null,
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        notes: data.notes || null,
      };

      const updated = await this.contractRepository.update(
        id,
        {
          addendums: [...(contract.addendums || []), newAddendum],
        },
        session
      );

      const populated = await this.contractRepository.findById(id, session);
      const formatted = this.formatContract(populated || updated!);

      this.auditLogService?.record({
        action: AuditActionEnum.CREATE_ADDENDUM,
        resourceType: AuditResourceEnum.CONTRACT,
        resourceId: id,
        before: this.formatContract(contract),
        after: formatted,
        metadata: {
          addendumCode: newAddendum.addendumCode,
          type: newAddendum.type,
          status: newAddendum.status,
        },
      });

      return validateResponse(contractResponseSchema, formatted);
    }

    // data.type === ContractAddendumTypeEnum.UNIT_CHANGE
    if (
      actorRole !== RoleEnum.FACILITY_MANAGER &&
      actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      actorRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        RoleEnum.FACILITY_MANAGER,
      ]);
    }

    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    if (contract.status !== ContractStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    if (!data.newStorageUnitId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'newStorageUnitId is required for UNIT_CHANGE addendum',
      ]);
    }

    const currentStorageUnitIdStr = this.extractIdStr(contract.storageUnitId);
    if (data.newStorageUnitId === currentStorageUnitIdStr) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'New storage unit must be different from current storage unit',
      ]);
    }

    const newUnit = await this.storageUnitRepository.findById(
      data.newStorageUnitId,
      session
    );
    if (!newUnit) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Storage Unit']);
    }

    const newUnitFacilityIdStr = this.extractIdStr(newUnit.facilityId);
    if (newUnitFacilityIdStr !== facilityIdStr) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_407);
    }

    const reservedUnit =
      await this.storageUnitRepository.findAndReserveUnitAtomic(
        data.newStorageUnitId,
        facilityIdStr,
        session
      );
    if (!reservedUnit) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_402);
    }

    const newAddendum: IContractAddendum = {
      _id: new Types.ObjectId(),
      addendumCode: this.generateAddendumCode(),
      type: ContractAddendumTypeEnum.UNIT_CHANGE,
      previousEndDate: null,
      newEndDate: null,
      previousStorageUnitId: new Types.ObjectId(currentStorageUnitIdStr),
      newStorageUnitId: new Types.ObjectId(data.newStorageUnitId),
      amenities: [],
      totalPeriodicPrice: 0,
      damageFee: 0,
      status: ContractAddendumStatusEnum.DRAFT,
      requestedBy: new Types.ObjectId(actorId),
      requestedAt: now,
      approvedBy: new Types.ObjectId(actorId),
      approvedAt: now,
      assignedStaffId: new Types.ObjectId(actorId),
      customerSigned: false,
      customerSignedAt: null,
      staffSigned: false,
      staffSignedAt: null,
      completedAt: null,
      rejectionReason: null,
      rejectedBy: null,
      rejectedAt: null,
      cancellationReason: null,
      cancelledBy: null,
      cancelledAt: null,
      expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      notes: data.notes || null,
    };

    const updated = await this.contractRepository.update(
      id,
      {
        addendums: [...(contract.addendums || []), newAddendum],
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE_ADDENDUM,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        addendumCode: newAddendum.addendumCode,
        type: newAddendum.type,
        previousStorageUnitId: currentStorageUnitIdStr,
        newStorageUnitId: data.newStorageUnitId,
      },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 5b. Manager approves addendum request (PENDING_APPROVAL -> DRAFT)
  @Transactional()
  async approveAddendum(
    id: string,
    addendumId: string,
    actorId: string,
    actorRole: string,
    data: ApproveContractAddendumRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (
      actorRole !== RoleEnum.FACILITY_MANAGER &&
      actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      actorRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        RoleEnum.FACILITY_MANAGER,
      ]);
    }

    const facilityIdStr = this.extractIdStr(contract.facilityId);
    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    if (
      contract.status !== ContractStatusEnum.ACTIVE &&
      contract.status !== ContractStatusEnum.OVERDUE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const addendums = [...(contract.addendums || [])];
    const index = addendums.findIndex(
      (a) => String(a._id) === String(addendumId)
    );
    if (index === -1) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_409);
    }

    const target = addendums[index];
    if (target.status !== ContractAddendumStatusEnum.PENDING_APPROVAL) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_410);
    }

    if (data.assignedStaffId) {
      const staffUser = await this.userRepository.findById(
        data.assignedStaffId
      );
      if (!staffUser) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Staff']);
      }
      await this.assertFacilityAccess(
        data.assignedStaffId,
        staffUser.role,
        facilityIdStr
      );
    }

    const defaultStaffId = contract.assignedStaffId
      ? typeof contract.assignedStaffId === 'object' &&
        '_id' in
          (contract.assignedStaffId as unknown as Record<string, unknown>)
        ? (contract.assignedStaffId as unknown as { _id: Types.ObjectId })._id
        : (contract.assignedStaffId as Types.ObjectId)
      : new Types.ObjectId(actorId);

    addendums[index] = {
      ...(typeof (target as { toObject?: () => IContractAddendum }).toObject ===
      'function'
        ? (
            target as unknown as { toObject: () => IContractAddendum }
          ).toObject()
        : target),
      status: ContractAddendumStatusEnum.DRAFT,
      approvedBy: new Types.ObjectId(actorId),
      approvedAt: new Date(),
      assignedStaffId: data.assignedStaffId
        ? new Types.ObjectId(data.assignedStaffId)
        : defaultStaffId,
      notes: data.notes || target.notes || null,
    };

    const updated = await this.contractRepository.update(
      id,
      { addendums },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.APPROVE_ADDENDUM,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: { addendumId },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 5c. Manager rejects addendum request (PENDING_APPROVAL -> REJECTED)
  @Transactional()
  async rejectAddendum(
    id: string,
    addendumId: string,
    actorId: string,
    actorRole: string,
    data: RejectContractAddendumRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (
      actorRole !== RoleEnum.FACILITY_MANAGER &&
      actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      actorRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        RoleEnum.FACILITY_MANAGER,
      ]);
    }

    const facilityIdStr = this.extractIdStr(contract.facilityId);
    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    const addendums = [...(contract.addendums || [])];
    const index = addendums.findIndex(
      (a) => String(a._id) === String(addendumId)
    );
    if (index === -1) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_409);
    }

    const target = addendums[index];
    if (target.status !== ContractAddendumStatusEnum.PENDING_APPROVAL) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_410);
    }

    if (
      target.type === ContractAddendumTypeEnum.UNIT_CHANGE &&
      target.newStorageUnitId
    ) {
      await this.storageUnitRepository.releaseReservedUnitAtomic(
        this.extractIdStr(target.newStorageUnitId),
        StorageUnitStatusEnum.AVAILABLE,
        session
      );
    }

    addendums[index] = {
      ...(typeof (target as { toObject?: () => IContractAddendum }).toObject ===
      'function'
        ? (
            target as unknown as { toObject: () => IContractAddendum }
          ).toObject()
        : target),
      status: ContractAddendumStatusEnum.REJECTED,
      rejectionReason: data.rejectionReason,
      rejectedBy: new Types.ObjectId(actorId),
      rejectedAt: new Date(),
    };

    const updated = await this.contractRepository.update(
      id,
      { addendums },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.REJECT_ADDENDUM,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: { addendumId, rejectionReason: data.rejectionReason },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 5d. Customer signs addendum on Mobile (First signing step: Customer side)
  @Transactional()
  async customerSignAddendum(
    id: string,
    addendumId: string,
    actorId: string,
    actorRole: string,
    data: SignContractAddendumRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    return this.signAddendumInternal(
      id,
      addendumId,
      actorId,
      actorRole,
      'customer',
      data,
      session
    );
  }

  // 5e. Facility Manager signs addendum & activates changes (Second signing step: Facility side)
  @Transactional()
  async staffSignAddendum(
    id: string,
    addendumId: string,
    actorId: string,
    actorRole: string,
    data: SignContractAddendumRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    return this.signAddendumInternal(
      id,
      addendumId,
      actorId,
      actorRole,
      'staff',
      data,
      session
    );
  }

  // 5f. Cancel addendum (PENDING_APPROVAL or DRAFT -> CANCELLED) & release locked unit if UNIT_CHANGE
  @Transactional()
  async cancelAddendum(
    id: string,
    addendumId: string,
    actorId: string,
    actorRole: string,
    data: CancelContractAddendumRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (
      actorRole !== RoleEnum.CUSTOMER &&
      actorRole !== RoleEnum.FACILITY_MANAGER &&
      actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      actorRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const facilityIdStr = this.extractIdStr(contract.facilityId);
    if (actorRole === RoleEnum.CUSTOMER) {
      const customerIdStr = this.extractIdStr(contract.customerId);
      if (customerIdStr !== actorId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else {
      await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);
    }

    const addendums = [...(contract.addendums || [])];
    const index = addendums.findIndex(
      (a) => String(a._id) === String(addendumId)
    );
    if (index === -1) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_409);
    }

    const target = addendums[index];
    if (
      target.status !== ContractAddendumStatusEnum.PENDING_APPROVAL &&
      target.status !== ContractAddendumStatusEnum.DRAFT
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_410);
    }

    // Release reserved replacement storage unit for UNIT_CHANGE addendums
    if (
      target.type === ContractAddendumTypeEnum.UNIT_CHANGE &&
      target.newStorageUnitId
    ) {
      await this.storageUnitRepository.releaseReservedUnitAtomic(
        this.extractIdStr(target.newStorageUnitId),
        StorageUnitStatusEnum.AVAILABLE,
        session
      );
    }

    addendums[index] = {
      ...(typeof (target as { toObject?: () => IContractAddendum }).toObject ===
      'function'
        ? (
            target as unknown as { toObject: () => IContractAddendum }
          ).toObject()
        : target),
      status: ContractAddendumStatusEnum.CANCELLED,
      cancellationReason: data.cancellationReason,
      cancelledBy: new Types.ObjectId(actorId),
      cancelledAt: new Date(),
    };

    const updated = await this.contractRepository.update(
      id,
      { addendums },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL_ADDENDUM,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: { addendumId, cancellationReason: data.cancellationReason },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 7. Check-out & Liquidation (ACTIVE or OVERDUE -> COMPLETED)
  @Transactional()
  async checkOutContract(
    id: string,
    actorId: string,
    actorRole: string,
    data: CheckOutContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (
      actorRole !== RoleEnum.FACILITY_STAFF &&
      actorRole !== RoleEnum.FACILITY_MANAGER &&
      actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      actorRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const facilityIdStr = this.extractIdStr(contract.facilityId);
    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    if (
      contract.status !== ContractStatusEnum.ACTIVE &&
      contract.status !== ContractStatusEnum.OVERDUE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    // Block normal check-out if customer inventory still remains on this contract
    if (this.customerInventoryRepository) {
      const remainingItems =
        await this.customerInventoryRepository.countRemainingByContract(
          id,
          session
        );
      if (remainingItems > 0) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_420);
      }
    }

    // Block normal check-out if contract still has open (unclosed/uncancelled) incidents ([CHỐT Q3] / X5)
    if (this.incidentRepository) {
      const openIncidents = await this.incidentRepository.countOpenByContractId(
        id,
        session
      );
      if (openIncidents > 0) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_421);
      }
    }

    const actualCheckOutDate = data.actualCheckOutDate
      ? new Date(data.actualCheckOutDate)
      : new Date();

    // Overdue fee calculation using pure function [OPEN D8]
    const overdueResult = calculateContractOverdueFee({
      endDate: contract.endDate,
      actualCheckOutDate,
      rentalPrice: contract.rentalPrice,
      billingUnit: contract.billingUnit,
    });
    const overdueFee = overdueResult.overdueFee;

    const damageFee = (contract.damageFee || 0) + (data.damageFee || 0);
    const totalDeductions = damageFee + overdueFee;

    const refundAmount = Math.max(0, contract.depositAmount - totalDeductions);
    const additionalPaymentRequired = Math.max(
      0,
      totalDeductions - contract.depositAmount
    );

    let depositStatus: ContractDepositStatusEnum;
    if (refundAmount === contract.depositAmount) {
      depositStatus = ContractDepositStatusEnum.REFUNDED;
    } else if (refundAmount > 0) {
      depositStatus = ContractDepositStatusEnum.PARTIALLY_REFUNDED;
    } else {
      depositStatus = ContractDepositStatusEnum.APPLIED;
    }

    const customerIdStr = this.extractIdStr(contract.customerId);

    // If there is deposit refund, automatically create a RefundRequest
    let refundRequestId: string | undefined;
    if (refundAmount > 0 && this.refundRequestService) {
      const refundDoc =
        await this.refundRequestService.createRefundRequestInternal(
          actorId,
          {
            contractId: id,
            facilityId: facilityIdStr,
            customerId: customerIdStr,
            amount: refundAmount,
            reason: RefundReasonEnum.DEPOSIT_SETTLEMENT,
            note: `Quyết toán tiền cọc hợp đồng ${contract.contractCode} khi trả kho`,
          },
          session
        );
      refundRequestId = refundDoc.id;
    }

    const storageUnitId =
      contract.storageUnitId && typeof contract.storageUnitId === 'object'
        ? String((contract.storageUnitId as { _id: Types.ObjectId })._id)
        : String(contract.storageUnitId);

    if (contract.rentedRackIds && contract.rentedRackIds.length > 0) {
      if (this.storageRackRepository) {
        const rackIds = contract.rentedRackIds.map((rId) =>
          String((rId as { _id?: Types.ObjectId })._id || rId)
        );
        await this.storageRackRepository.vacateRacksAtomic(
          rackIds,
          String(contract._id),
          session
        );
      }
    } else {
      // Vacate unit -> transition to UNDER_MAINTENANCE for cleaning
      await this.storageUnitRepository.updateById(
        storageUnitId,
        { status: StorageUnitStatusEnum.UNDER_MAINTENANCE },
        session
      );
    }

    // Release all active contract amenities inventory
    for (const a of contract.amenities) {
      const offeringId = String(
        (a.facilityAmenityOfferingId as unknown as { _id: Types.ObjectId })
          ._id || a.facilityAmenityOfferingId
      );
      const offering = await this.amenityOfferingRepository.findById(
        offeringId,
        session
      );
      if (offering) {
        const isService =
          offering.amenityId &&
          typeof offering.amenityId === 'object' &&
          'type' in offering.amenityId &&
          (offering.amenityId as { type?: string }).type === 'service';

        if (!isService) {
          const newInUse = Math.max(0, offering.inUseQuantity - a.quantity);
          await this.amenityOfferingRepository.updateById(
            offeringId,
            { inUseQuantity: newInUse },
            session
          );
        }
      }
    }

    // Cancel any open (PENDING_APPROVAL / DRAFT) addendums & release locked ADD inventory
    const cleanedAddendums = await this.cancelOpenAddendumsOnContractEnd(
      contract.addendums || [],
      actorId,
      'Contract checked out',
      session
    );

    const mergedInspectionPhotos = Array.from(
      new Set([
        ...(contract.inspectionPhotos || []),
        ...(data.inspectionPhotos || []),
      ])
    );

    const updated = await this.contractRepository.update(
      id,
      {
        status: ContractStatusEnum.COMPLETED,
        actualCheckOutDate,
        inspectedBy: new Types.ObjectId(actorId),
        damageFee,
        overdueFee,
        refundAmount,
        additionalPaymentRequired,
        inspectionNotes: data.inspectionNotes || null,
        inspectionPhotos: mergedInspectionPhotos,
        depositStatus,
        addendums: cleanedAddendums,
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.CHECK_OUT,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        damageFee,
        overdueFee,
        refundAmount,
        additionalPaymentRequired,
        depositStatus,
        refundRequestId: refundRequestId ?? null,
      },
    });

    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Trả kho hoàn tất [${contract.contractCode}]`,
      `Thủ tục kiểm tra và trả kho cho hợp đồng [${contract.contractCode}] đã hoàn tất. Yêu cầu hoàn cọc đang được xử lý.`,
      { contractId: id, contractCode: contract.contractCode, refundAmount }
    );

    return validateResponse(contractResponseSchema, formatted);
  }

  // 8. Terminate contract early due to violation (ACTIVE or OVERDUE -> TERMINATED)
  @Transactional()
  async terminateContract(
    id: string,
    actorId: string,
    actorRole: string,
    data: TerminateContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (
      actorRole !== RoleEnum.FACILITY_MANAGER &&
      actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      actorRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
        RoleEnum.FACILITY_MANAGER,
      ]);
    }

    const facilityIdStr = this.extractIdStr(contract.facilityId);
    await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);

    if (
      contract.status !== ContractStatusEnum.ACTIVE &&
      contract.status !== ContractStatusEnum.OVERDUE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const finalReason = data.reason || data.terminationReason;
    if (!finalReason) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    if (
      !data.reportFileUrls ||
      data.reportFileUrls.length === 0 ||
      !data.evidenceFileUrls ||
      data.evidenceFileUrls.length === 0
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_426);
    }

    if (
      data.terminationType === ContractTerminationTypeEnum.VIOLATION &&
      !data.violationCategory
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_427);
    }

    // Anti-abuse check for OVERDUE_PAYMENT: must be OVERDUE status and exceed overdueTerminationGraceDays
    if (data.violationCategory === ViolationCategoryEnum.OVERDUE_PAYMENT) {
      if (contract.status !== ContractStatusEnum.OVERDUE) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_428);
      }
      const diffMs = Date.now() - new Date(contract.endDate).getTime();
      const requiredGraceMs =
        contractConfig.overdueTerminationGraceDays * 86400000;
      if (diffMs < requiredGraceMs) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_428);
      }
    }

    const now = new Date();
    const mappedReportFiles: IContractTerminationFile[] =
      data.reportFileUrls.map((url) => ({
        url,
        fileHash: crypto.createHash('sha256').update(url).digest('hex'),
        uploadedAt: now,
      }));

    const mappedEvidenceFiles: IContractTerminationFile[] =
      data.evidenceFileUrls.map((url) => ({
        url,
        fileHash: crypto.createHash('sha256').update(url).digest('hex'),
        uploadedAt: now,
      }));

    const storageUnitId =
      contract.storageUnitId && typeof contract.storageUnitId === 'object'
        ? String((contract.storageUnitId as { _id: Types.ObjectId })._id)
        : String(contract.storageUnitId);

    const remainingInventoryItems = this.customerInventoryRepository
      ? await this.customerInventoryRepository.countRemainingByContract(
          id,
          session
        )
      : 0;

    if (contract.rentedRackIds && contract.rentedRackIds.length > 0) {
      if (this.storageRackRepository) {
        const rackIds = contract.rentedRackIds.map((rId) =>
          String((rId as { _id?: Types.ObjectId })._id || rId)
        );
        await this.storageRackRepository.vacateRacksAtomic(
          rackIds,
          String(contract._id),
          session
        );
      }
    } else {
      // Transition storage unit to PENDING_CLEARANCE [CHỐT D14]
      await this.storageUnitRepository.updateById(
        storageUnitId,
        { status: StorageUnitStatusEnum.PENDING_CLEARANCE },
        session
      );
    }

    // Release all active contract amenities inventory
    for (const a of contract.amenities) {
      const offeringId = String(
        (a.facilityAmenityOfferingId as unknown as { _id: Types.ObjectId })
          ._id || a.facilityAmenityOfferingId
      );
      const offering = await this.amenityOfferingRepository.findById(
        offeringId,
        session
      );
      if (offering) {
        const isService =
          offering.amenityId &&
          typeof offering.amenityId === 'object' &&
          'type' in offering.amenityId &&
          (offering.amenityId as { type?: string }).type === 'service';

        if (!isService) {
          const newInUse = Math.max(0, offering.inUseQuantity - a.quantity);
          await this.amenityOfferingRepository.updateById(
            offeringId,
            { inUseQuantity: newInUse },
            session
          );
        }
      }
    }

    // Cancel any open (PENDING_APPROVAL / DRAFT) addendums & release locked ADD inventory
    const cleanedAddendums = await this.cancelOpenAddendumsOnContractEnd(
      contract.addendums || [],
      actorId,
      'Contract terminated',
      session
    );

    const historyEntry: IContractTerminationHistory = {
      terminationType: data.terminationType,
      violationCategory: data.violationCategory || null,
      reason: finalReason,
      reportFiles: mappedReportFiles,
      evidenceFiles: mappedEvidenceFiles,
      terminatedBy: new Types.ObjectId(actorId),
      terminatedAt: now,
      storageUnitStatus: StorageUnitStatusEnum.PENDING_CLEARANCE,
      depositStatus: ContractDepositStatusEnum.FORFEITED,
      forfeitedAmount: contract.depositAmount,
    };
    const terminationHistory = [
      ...(contract.terminationHistory || []),
      historyEntry,
    ];

    const updated = await this.contractRepository.update(
      id,
      {
        status: ContractStatusEnum.TERMINATED,
        terminationType: data.terminationType,
        violationCategory: data.violationCategory || null,
        terminationReason: finalReason,
        terminatedBy: new Types.ObjectId(actorId),
        terminatedAt: now,
        actualCheckOutDate: now,
        reportFiles: mappedReportFiles,
        evidenceFiles: mappedEvidenceFiles,
        terminationHistory,
        depositStatus: ContractDepositStatusEnum.FORFEITED,
        refundAmount: 0,
        forfeitedAmount: contract.depositAmount,
        addendums: cleanedAddendums,
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.TERMINATE,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        remainingInventoryItems,
        terminationType: data.terminationType,
        violationCategory: data.violationCategory || null,
        reportFilesCount: mappedReportFiles.length,
        evidenceFilesCount: mappedEvidenceFiles.length,
        forfeitedAmount: contract.depositAmount,
      },
    });

    const customerIdStr = this.extractIdStr(contract.customerId);
    this.notifyCustomer(
      customerIdStr,
      facilityIdStr,
      `Hợp đồng [${contract.contractCode}] đã chấm dứt`,
      `Hợp đồng [${contract.contractCode}] đã bị chấm dứt (${data.terminationType}). Lý do: ${data.reason}.`,
      {
        contractId: id,
        contractCode: contract.contractCode,
        terminationType: data.terminationType,
      },
      NotificationPriorityEnum.HIGH
    );

    return validateResponse(contractResponseSchema, formatted);
  }

  // 8a. Customer confirms settlement after check-out
  @Transactional()
  async confirmSettlement(
    id: string,
    actorId: string,
    actorRole: string,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    const customerIdStr = this.extractIdStr(contract.customerId);
    if (actorRole !== RoleEnum.CUSTOMER || customerIdStr !== actorId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (contract.status !== ContractStatusEnum.COMPLETED) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    if (contract.settlementConfirmedAt) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_419);
    }

    const updated = await this.contractRepository.update(
      id,
      {
        settlementConfirmedAt: new Date(),
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.CONFIRM_SETTLEMENT,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 8b. Customer disputes settlement after check-out
  @Transactional()
  async disputeSettlement(
    id: string,
    actorId: string,
    actorRole: string,
    data: DisputeSettlementRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    const customerIdStr = this.extractIdStr(contract.customerId);
    if (actorRole !== RoleEnum.CUSTOMER || customerIdStr !== actorId) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (contract.status !== ContractStatusEnum.COMPLETED) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    if (contract.settlementConfirmedAt) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_419);
    }

    const updated = await this.contractRepository.update(
      id,
      {
        depositStatus: ContractDepositStatusEnum.DISPUTED,
        disputedAt: new Date(),
        disputeReason: data.disputeReason,
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.DISPUTE_SETTLEMENT,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        disputeReason: data.disputeReason,
      },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 10. Get contract by ID
  async getContractById(
    id: string,
    callerId: string,
    callerRole: string
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    // Role-based scoping: customer can only view own contract; staff/manager scoped by facility
    if (callerRole === RoleEnum.CUSTOMER) {
      const customerIdStr = this.extractIdStr(contract.customerId);
      if (customerIdStr !== callerId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER ||
      callerRole === RoleEnum.BUSINESS_OPS_MANAGER ||
      callerRole === RoleEnum.SYSTEM_ADMIN
    ) {
      const facilityIdStr = this.extractIdStr(contract.facilityId);
      await this.assertFacilityAccess(callerId, callerRole, facilityIdStr);
    } else {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    return validateResponse(
      contractResponseSchema,
      this.formatContract(contract)
    );
  }

  // 10b. Generate printable A4 draft PDF / HTML for in-person signing (T4.4)
  async getContractDraftPdf(
    id: string,
    callerId: string,
    callerRole: string
  ): Promise<{ html: string; buffer: Buffer; contractCode: string }> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    const facilityIdStr = this.extractIdStr(contract.facilityId);
    const customerIdStr = this.extractIdStr(contract.customerId);

    if (callerRole === RoleEnum.CUSTOMER) {
      if (customerIdStr !== callerId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (
      callerRole === RoleEnum.FACILITY_STAFF ||
      callerRole === RoleEnum.FACILITY_MANAGER ||
      callerRole === RoleEnum.BUSINESS_OPS_MANAGER ||
      callerRole === RoleEnum.SYSTEM_ADMIN
    ) {
      await this.assertFacilityAccess(callerId, callerRole, facilityIdStr);
    } else {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const facility = await this.facilityRepository.findById(facilityIdStr);
    let legalEntity = null;
    if (this.legalEntityRepository && facility?.legalEntityId) {
      legalEntity = await this.legalEntityRepository.findById(
        String(facility.legalEntityId)
      );
    }
    const customerUser = await this.userRepository.findById(customerIdStr);
    const profile = this.profileRepository
      ? await this.profileRepository.findByUserId(customerIdStr)
      : null;

    let signingAuth = null;
    if (this.signingAuthRepository) {
      signingAuth = await this.signingAuthRepository.findValidAuthorization(
        callerId,
        facilityIdStr
      );
    }

    const storageUnitIdStr = this.extractIdStr(contract.storageUnitId);
    const storageUnit =
      await this.storageUnitRepository.findById(storageUnitIdStr);

    const context = {
      contract,
      facility,
      customer: customerUser,
      profile,
      legalEntity,
      signingAuth,
      storageUnit,
    };

    const html = this.contractPdfService.generateContractHtml(context);
    const buffer = this.contractPdfService.generateContractPdfBuffer(context);

    return { html, buffer, contractCode: contract.contractCode };
  }

  // Walk-in contract creation with inline KYC & user provisioning (T4.6 / D10)
  @Transactional()
  async createWalkInContract(
    data: WalkInContractRequest,
    actorId: string,
    actorRole: string,
    session?: ClientSession
  ): Promise<ContractResponse> {
    if (
      actorRole !== RoleEnum.FACILITY_STAFF &&
      actorRole !== RoleEnum.FACILITY_MANAGER &&
      actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      actorRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    await this.assertFacilityAccess(actorId, actorRole, data.facilityId);

    // 1. Age check (D10 / T4.2)
    const dob = new Date(data.dateOfBirth);
    const age = calculateAgeVN(dob);
    if (age < contractConfig.minCustomerAge) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_430, [
        'Customer must be at least 18 years old',
      ]);
    }

    // 2. Validate Offering
    const offering = await this.unitTypeOfferingRepository.findById(
      data.facilityUnitTypeOfferingId,
      session
    );
    const offeringFacilityId = offering
      ? this.extractIdStr(offering.facilityId)
      : null;
    if (!offering || offeringFacilityId !== data.facilityId) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'FacilityUnitTypeOffering',
      ]);
    }

    // 3. Atomically reserve storage unit (or racks if rack rental)
    const isRackRental = Boolean(
      data.rentedRackIds && data.rentedRackIds.length > 0
    );
    let reservedRacks: IStorageRack[] = [];

    if (isRackRental) {
      const unit = await this.storageUnitRepository.findById(
        data.storageUnitId,
        session
      );
      if (!unit || this.extractIdStr(unit.facilityId) !== data.facilityId) {
        throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
          'Storage Unit',
        ]);
      }
      if (!this.storageRackRepository) {
        throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106, [
          'Storage Rack repository not configured',
        ]);
      }
      const racks = await this.storageRackRepository.findAndReserveRacksAtomic(
        data.rentedRackIds!,
        data.facilityId,
        data.storageUnitId,
        session
      );
      if (!racks || racks.length !== data.rentedRackIds!.length) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_637, [
          'One or more selected storage racks are not available',
        ]);
      }
      reservedRacks = racks;
    } else {
      const lockedUnit =
        await this.storageUnitRepository.findAndReserveUnitAtomic(
          data.storageUnitId,
          data.facilityId,
          session
        );
      if (!lockedUnit) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_306);
      }
    }

    // 4. Find or create Customer user
    let customerUser = await this.userRepository.findByEmail(
      data.customerEmail
    );
    if (!customerUser) {
      customerUser = await this.userRepository.createUser({
        name: data.customerName,
        email: data.customerEmail,
        phoneNumber: data.customerPhone,
        role: RoleEnum.CUSTOMER,
        authProvider: AuthProviderEnum.LOCAL,
        status: UserStatusEnum.ACTIVE,
        isEmailVerified: true,
        password: crypto.randomBytes(16).toString('hex'),
      });
    }

    const customerUserId = String(customerUser._id);

    // 5. Encrypt CCCD & upsert profile (D10 / T4.2)
    const encryptedIdCardNumber = encryptText(data.idCardNumber);
    const idCardLast4 = data.idCardNumber.slice(-4);

    if (this.profileRepository) {
      await this.profileRepository.upsertByUserId(
        customerUserId,
        {
          dateOfBirth: dob,
          address: data.address,
          encryptedIdCardNumber,
          idCardLast4,
          idCardFrontPhotoUrl: data.idCardFrontPhotoUrl,
          idCardBackPhotoUrl: data.idCardBackPhotoUrl,
        },
        session
      );
    }

    // 6. Build customer snapshot
    const customerSnapshot: ICustomerSnapshot = {
      customerId: new Types.ObjectId(customerUserId),
      name: data.customerName,
      email: data.customerEmail,
      phoneNumber: data.customerPhone,
      dateOfBirth: dob,
      address: data.address || null,
      idCardNumberMasked: `****${idCardLast4}`,
      idCardFrontPhotoUrl: data.idCardFrontPhotoUrl || null,
      idCardBackPhotoUrl: data.idCardBackPhotoUrl || null,
      signedAt: null,
      signedIp: null,
    };

    let rentalPrice = offering.pricePerUnit;
    if (isRackRental) {
      let rackTotalPrice = 0;
      for (const rack of reservedRacks) {
        if (typeof rack.customPrice === 'number' && rack.customPrice >= 0) {
          rackTotalPrice += rack.customPrice;
        } else if (
          offering.rackZonePricing &&
          typeof offering.rackZonePricing[
            rack.zone as keyof typeof offering.rackZonePricing
          ] === 'number'
        ) {
          rackTotalPrice +=
            offering.rackZonePricing[
              rack.zone as keyof typeof offering.rackZonePricing
            ];
        } else {
          rackTotalPrice += offering.pricePerUnit;
        }
      }
      rentalPrice = rackTotalPrice;
    }

    const depositAmount = rentalPrice * (offering.depositMultiplier || 1);
    const totalPeriodicPrice = rentalPrice;
    const contractCode = await this.generateContractCode();

    const created = await this.contractRepository.create(
      {
        contractCode,
        source: ContractSourceEnum.WALK_IN,
        customerId: new Types.ObjectId(customerUserId),
        facilityId: new Types.ObjectId(data.facilityId),
        storageUnitId: new Types.ObjectId(data.storageUnitId),
        rentalTargetType: isRackRental
          ? RentalTargetTypeEnum.STORAGE_RACK
          : RentalTargetTypeEnum.STORAGE_UNIT,
        rentedRackIds: isRackRental
          ? data.rentedRackIds!.map((id) => new Types.ObjectId(id))
          : [],
        facilityUnitTypeOfferingId: new Types.ObjectId(
          data.facilityUnitTypeOfferingId
        ),
        assignedStaffId: data.assignedStaffId
          ? new Types.ObjectId(data.assignedStaffId)
          : new Types.ObjectId(actorId),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        billingUnit: data.billingUnit,
        rentalPrice,
        depositAmount,
        totalPeriodicPrice,
        amenities: [],
        status: ContractStatusEnum.DRAFT,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        termsAccepted: false,
        customerSigned: false,
        staffSigned: false,
        customerSnapshot,
        notes: data.notes || null,
      },
      session
    );

    const populated = await this.contractRepository.findById(
      String(created._id),
      session
    );
    const formatted = this.formatContract(populated || created);

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: String(created._id),
      after: formatted,
      metadata: { source: ContractSourceEnum.WALK_IN, isWalkInCustomer: true },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 11. View contracts list (pagination + scoped filters)
  async getContracts(
    query: ContractQuery,
    callerId: string,
    callerRole: string
  ): Promise<PaginatedData<ContractResponse>> {
    const effectiveQuery = { ...query };

    // Data scoping for customer and facility staff/manager
    if (callerRole === RoleEnum.CUSTOMER) {
      effectiveQuery.customerId = callerId;
    } else if (
      callerRole === RoleEnum.FACILITY_MANAGER ||
      callerRole === RoleEnum.FACILITY_STAFF
    ) {
      const user = await this.userRepository.findById(callerId);
      if (!user?.assignedFacilityId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, [
          'Assigned Facility',
        ]);
      }
      effectiveQuery.facilityId = String(user.assignedFacilityId);
    } else if (
      callerRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
      callerRole !== RoleEnum.SYSTEM_ADMIN
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const result = await this.contractRepository.findPaginated(effectiveQuery);

    return {
      items: result.items.map((d: IContract) => this.formatContract(d)),
      pagination: result.pagination,
    };
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private extractIdStr(ref: unknown): string {
    if (ref && typeof ref === 'object' && '_id' in ref) {
      return String((ref as { _id: unknown })._id);
    }
    return String(ref);
  }

  private notifyFacilityManager(
    facilityId: string,
    title: string,
    content: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.notificationService) return;
    runAfterCommit(async () => {
      try {
        const facility = await this.facilityRepository.findById(facilityId);
        if (!facility) return;
        let managerId = facility.managerId
          ? String(
              (facility.managerId as { _id?: Types.ObjectId })._id ||
                facility.managerId
            )
          : null;

        if (!managerId) {
          const managers = await this.userRepository.findUsersByRoles([
            RoleEnum.FACILITY_MANAGER,
          ]);
          const matched = managers.find(
            (m) => String(m.assignedFacilityId) === facilityId
          );
          if (matched) {
            managerId = String(matched._id);
          }
        }

        if (managerId) {
          await this.notificationService?.sendNotification({
            recipientId: managerId,
            facilityId,
            title,
            content,
            type: NotificationTypeEnum.CONTRACT,
            priority: NotificationPriorityEnum.HIGH,
            channels: [NotificationChannelEnum.IN_APP],
            metadata: {
              ...metadata,
              facilityId,
              facilityName: facility.name,
            },
          });
        }
      } catch (err) {
        console.warn(
          'Failed to notify facility manager from contract service:',
          (err as Error)?.message || err
        );
      }
    });
  }

  private notifyAssignedStaff(
    staffId: string,
    facilityId: string,
    title: string,
    content: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.notificationService) return;
    runAfterCommit(async () => {
      try {
        await this.notificationService?.sendNotification({
          recipientId: staffId,
          facilityId,
          title,
          content,
          type: NotificationTypeEnum.CONTRACT,
          priority: NotificationPriorityEnum.HIGH,
          channels: [NotificationChannelEnum.IN_APP],
          metadata: {
            ...metadata,
            facilityId,
            staffId,
          },
        });
      } catch (err) {
        console.warn(
          'Failed to notify assigned staff from contract service:',
          (err as Error)?.message || err
        );
      }
    });
  }

  private notifyCustomer(
    customerId: string,
    facilityId: string,
    title: string,
    content: string,
    metadata?: Record<string, unknown>,
    priority: NotificationPriorityEnum = NotificationPriorityEnum.NORMAL,
    customChannels?: NotificationChannelEnum[]
  ): void {
    if (!this.notificationService) return;
    runAfterCommit(async () => {
      try {
        const customer = await this.userRepository.findById(customerId);
        if (!customer) return;
        const channels = customChannels
          ? [...customChannels]
          : [NotificationChannelEnum.IN_APP];
        if (!customChannels && customer.email) {
          channels.push(NotificationChannelEnum.EMAIL);
        }
        await this.notificationService?.sendNotification({
          recipientId: customerId,
          facilityId,
          title,
          content,
          type: NotificationTypeEnum.CONTRACT,
          priority,
          channels,
          metadata: {
            ...metadata,
            facilityId,
            customerId,
            customerEmail: customer.email,
            email: customer.email,
          },
        });
      } catch (err) {
        console.warn(
          'Failed to notify customer from contract service:',
          (err as Error)?.message || err
        );
      }
    });
  }

  private async assertFacilityAccess(
    userId: string,
    userRole: string,
    facilityId: string
  ): Promise<void> {
    if (
      userRole === RoleEnum.SYSTEM_ADMIN ||
      userRole === RoleEnum.BUSINESS_OPS_MANAGER
    ) {
      return;
    }

    if (
      userRole !== RoleEnum.FACILITY_MANAGER &&
      userRole !== RoleEnum.FACILITY_STAFF
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
    }

    if (
      !user.assignedFacilityId ||
      String(user.assignedFacilityId) !== facilityId
    ) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, ['Facility']);
    }
  }

  private async generateContractCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    let unique = false;
    let code = '';
    while (!unique) {
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      code = `CTR-${dateStr}-${randomPart}`;
      const existing = await this.contractRepository.findByCode(code);
      if (!existing) unique = true;
    }
    return code;
  }

  private generateAddendumCode(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `ADD-${dateStr}-${randomPart}`;
  }

  private async cancelOpenAddendumsOnContractEnd(
    addendums: IContractAddendum[],
    actorId: string,
    reason: string,
    session?: ClientSession
  ): Promise<IContractAddendum[]> {
    const now = new Date();
    const result: IContractAddendum[] = [];
    for (const ad of addendums) {
      const rawAd =
        typeof (ad as { toObject?: () => IContractAddendum }).toObject ===
        'function'
          ? (ad as unknown as { toObject: () => IContractAddendum }).toObject()
          : { ...ad };
      if (
        rawAd.status === ContractAddendumStatusEnum.PENDING_APPROVAL ||
        rawAd.status === ContractAddendumStatusEnum.DRAFT
      ) {
        if (
          rawAd.type === ContractAddendumTypeEnum.UNIT_CHANGE &&
          rawAd.newStorageUnitId
        ) {
          await this.storageUnitRepository.releaseReservedUnitAtomic(
            this.extractIdStr(rawAd.newStorageUnitId),
            StorageUnitStatusEnum.AVAILABLE,
            session
          );
        }
        result.push({
          ...rawAd,
          status: ContractAddendumStatusEnum.CANCELLED,
          cancellationReason: reason,
          cancelledBy: new Types.ObjectId(actorId),
          cancelledAt: now,
        });
      } else {
        result.push(rawAd);
      }
    }
    return result;
  }

  private async signAddendumInternal(
    id: string,
    addendumId: string,
    actorId: string,
    actorRole: string,
    party: 'customer' | 'staff',
    data: SignContractAddendumRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    const facilityIdStr = this.extractIdStr(contract.facilityId);
    const customerIdStr = this.extractIdStr(contract.customerId);

    if (party === 'customer') {
      if (actorRole !== RoleEnum.CUSTOMER || customerIdStr !== actorId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else {
      if (
        actorRole !== RoleEnum.FACILITY_MANAGER &&
        actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
        actorRole !== RoleEnum.SYSTEM_ADMIN
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
          RoleEnum.FACILITY_MANAGER,
        ]);
      }
      await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);
    }

    if (
      contract.status !== ContractStatusEnum.ACTIVE &&
      contract.status !== ContractStatusEnum.OVERDUE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    if (data.termsAccepted === false) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_411);
    }

    const addendums = [...(contract.addendums || [])];
    const index = addendums.findIndex(
      (a) => String(a._id) === String(addendumId)
    );
    if (index === -1) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_409);
    }

    const target = addendums[index];
    if (target.status !== ContractAddendumStatusEnum.DRAFT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_410);
    }

    const now = new Date();
    const rawTarget =
      typeof (target as { toObject?: () => IContractAddendum }).toObject ===
      'function'
        ? (
            target as unknown as { toObject: () => IContractAddendum }
          ).toObject()
        : { ...target };

    if (party === 'customer' && rawTarget.customerSigned) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_412);
    }

    if (party === 'staff') {
      if (!rawTarget.customerSigned) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_415);
      }
      if (rawTarget.staffSigned) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_412);
      }
    }

    const addendumType = rawTarget.type || ContractAddendumTypeEnum.RENEW;

    const customerSigned =
      party === 'customer' ? true : Boolean(rawTarget.customerSigned);
    const customerSignedAt =
      party === 'customer' ? now : rawTarget.customerSignedAt || null;
    const staffSigned =
      party === 'staff' ? true : Boolean(rawTarget.staffSigned);
    const staffSignedAt =
      party === 'staff' ? now : rawTarget.staffSignedAt || null;

    const bothSigned = customerSigned && staffSigned;

    let signedAddendumFiles: IContractTerminationFile[] =
      rawTarget.signedAddendumFiles || [];
    let signingAuthorizationSnapshot: ISigningAuthorizationSnapshot | null =
      rawTarget.signingAuthorizationSnapshot || null;

    if (party === 'staff') {
      if (contractConfig.requireSignedContractScan) {
        if (
          !data.signedAddendumFileUrls ||
          data.signedAddendumFileUrls.length === 0
        ) {
          throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_433);
        }
      }
      signedAddendumFiles = (data.signedAddendumFileUrls || []).map((url) => ({
        url,
        fileHash: crypto.createHash('sha256').update(url).digest('hex'),
        uploadedAt: now,
      }));

      if (
        this.signingAuthRepository &&
        contractConfig.requireSigningAuthorization
      ) {
        if (actorRole === RoleEnum.FACILITY_MANAGER) {
          const validAuth =
            await this.signingAuthRepository.findValidAuthorization(
              actorId,
              facilityIdStr,
              now
            );
          if (!validAuth) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_431);
          }
          signingAuthorizationSnapshot = {
            authorizationId: validAuth._id,
            authorizedUserId: validAuth.authorizedUserId,
            authorizationNumber: validAuth.authorizationNumber,
            issuedDate: validAuth.issuedDate,
            validFrom: validAuth.validFrom,
            validTo: validAuth.validTo,
            documentUrl: validAuth.documentUrl,
            fileHash: validAuth.fileHash ?? null,
          };
        }
      }
    }

    addendums[index] = {
      ...rawTarget,
      type: addendumType,
      customerSigned,
      customerSignedAt,
      staffSigned,
      staffSignedAt,
      assignedStaffId:
        party === 'staff'
          ? rawTarget.assignedStaffId || new Types.ObjectId(actorId)
          : rawTarget.assignedStaffId || null,
      status: bothSigned
        ? ContractAddendumStatusEnum.ACTIVE
        : ContractAddendumStatusEnum.DRAFT,
      completedAt: bothSigned ? now : null,
      signedAddendumFiles,
      signingAuthorizationSnapshot,
      notes: data.notes || rawTarget.notes || null,
    };

    const updatePayload: Partial<IContract> = {
      addendums,
    };

    if (bothSigned) {
      if (addendumType === ContractAddendumTypeEnum.RENEW) {
        const nextEndDate = rawTarget.newEndDate
          ? new Date(rawTarget.newEndDate)
          : new Date(contract.endDate);
        const prevEndDate = rawTarget.previousEndDate
          ? new Date(rawTarget.previousEndDate)
          : new Date(contract.endDate);

        const renewalEntry: IContractRenewal = {
          previousEndDate: prevEndDate,
          newEndDate: nextEndDate,
          renewedAt: now,
          renewedBy: new Types.ObjectId(actorId),
          note: rawTarget.notes || null,
        };

        updatePayload.endDate = nextEndDate;
        updatePayload.status = ContractStatusEnum.ACTIVE;
        updatePayload.renewalCount = (contract.renewalCount || 0) + 1;
        updatePayload.renewals = [...(contract.renewals || []), renewalEntry];
      } else if (addendumType === ContractAddendumTypeEnum.UNIT_CHANGE) {
        const oldUnitIdStr = rawTarget.previousStorageUnitId
          ? this.extractIdStr(rawTarget.previousStorageUnitId)
          : this.extractIdStr(contract.storageUnitId);
        const newUnitIdStr = this.extractIdStr(rawTarget.newStorageUnitId);

        // Block UNIT_CHANGE activation if old storage unit still contains customer inventory
        // (Auto-migration of inventory across units is deferred to customer-inventory/7E)
        if (this.customerInventoryRepository) {
          const remainingInOldUnit =
            await this.customerInventoryRepository.countRemainingByStorageUnit(
              oldUnitIdStr,
              session
            );
          if (remainingInOldUnit > 0) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_629);
          }
        }

        await this.storageUnitRepository.updateById(
          oldUnitIdStr,
          { status: StorageUnitStatusEnum.UNDER_MAINTENANCE },
          session
        );
        await this.storageUnitRepository.updateById(
          newUnitIdStr,
          { status: StorageUnitStatusEnum.OCCUPIED },
          session
        );

        updatePayload.storageUnitId = new Types.ObjectId(newUnitIdStr);
      }
    }

    const updated = await this.contractRepository.update(
      id,
      updatePayload,
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.SIGN_ADDENDUM,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: {
        addendumId,
        type: addendumType,
        party,
        activated: bothSigned,
      },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  private formatContract(doc: IContract): ContractResponse {
    const raw = (
      typeof doc.toObject === 'function' ? doc.toObject() : doc
    ) as Record<string, unknown>;

    const formatUserSnap = (u: unknown) => {
      if (!u || typeof u !== 'object' || !('name' in u)) return null;
      const ur = u as Record<string, unknown>;
      return {
        id: String(ur._id || ur.id),
        name: String(ur.name),
        email: String(ur.email),
        phoneNumber: (ur.phoneNumber as string) ?? null,
        role: (ur.role as string) ?? null,
      };
    };

    const formatFacilitySnap = (f: unknown) => {
      if (!f || typeof f !== 'object' || !('name' in f)) return null;
      const fr = f as Record<string, unknown>;
      return {
        id: String(fr._id || fr.id),
        name: String(fr.name),
        city: String(fr.city),
        address: String(fr.address),
        phone: (fr.phone as string) ?? null,
        email: (fr.email as string) ?? null,
        status: (fr.status as string) ?? null,
      };
    };

    const formatOfferingSnap = (o: unknown) => {
      if (!o || typeof o !== 'object' || !('pricePerUnit' in o)) return null;
      const or = o as Record<string, unknown>;
      return {
        id: String(or._id || or.id),
        unitTypeId: String(or.unitTypeId || ''),
        billingUnit: String(or.billingUnit),
        pricePerUnit: Number(or.pricePerUnit),
        depositMultiplier: (or.depositMultiplier as number) ?? null,
        minRentalDays: (or.minRentalDays as number) ?? null,
        status: (or.status as string) ?? null,
      };
    };

    const formatStorageUnitSnap = (s: unknown) => {
      if (!s || typeof s !== 'object' || !('unitNumber' in s)) return null;
      const sr = s as Record<string, unknown>;
      return {
        id: String(sr._id || sr.id),
        unitNumber: String(sr.unitNumber),
        floor: Number(sr.floor),
        zone: (sr.zone as string) ?? null,
        status: String(sr.status),
      };
    };

    const customer = formatUserSnap(raw.customerId);
    const facility = formatFacilitySnap(raw.facilityId);
    const offering = formatOfferingSnap(raw.facilityUnitTypeOfferingId);
    const storageUnit = formatStorageUnitSnap(raw.storageUnitId);
    const assignedStaff = formatUserSnap(raw.assignedStaffId);
    const inspectedBy = formatUserSnap(raw.inspectedBy);
    const cancelledBy = formatUserSnap(raw.cancelledBy);
    const terminatedBy = formatUserSnap(raw.terminatedBy);

    const renewals = (
      (raw.renewals as Array<Record<string, unknown>>) || []
    ).map((r) => ({
      previousEndDate:
        r.previousEndDate instanceof Date
          ? r.previousEndDate.toISOString()
          : new Date(String(r.previousEndDate)).toISOString(),
      newEndDate:
        r.newEndDate instanceof Date
          ? r.newEndDate.toISOString()
          : new Date(String(r.newEndDate)).toISOString(),
      renewedAt:
        r.renewedAt instanceof Date
          ? r.renewedAt.toISOString()
          : new Date(String(r.renewedAt)).toISOString(),
      renewedBy: formatUserSnap(r.renewedBy),
      note: (r.note as string) ?? null,
    }));

    const signatureHistory = (
      (raw.signatureHistory as Array<Record<string, unknown>>) || []
    ).map((h) => ({
      party: (h.party as 'customer' | 'staff') || 'customer',
      signedAt:
        h.signedAt instanceof Date
          ? h.signedAt.toISOString()
          : new Date(String(h.signedAt)).toISOString(),
      previousStartDate:
        h.previousStartDate instanceof Date
          ? h.previousStartDate.toISOString()
          : new Date(String(h.previousStartDate)).toISOString(),
      previousEndDate:
        h.previousEndDate instanceof Date
          ? h.previousEndDate.toISOString()
          : new Date(String(h.previousEndDate)).toISOString(),
      resetAt:
        h.resetAt instanceof Date
          ? h.resetAt.toISOString()
          : new Date(String(h.resetAt || new Date())).toISOString(),
      resetReason: String(h.resetReason || ''),
    }));

    const formatTerminationFiles = (list: unknown) =>
      ((list as Array<Record<string, unknown>>) || []).map((f) => ({
        url: String(f.url || ''),
        fileHash: (f.fileHash as string) ?? null,
        uploadedAt:
          f.uploadedAt instanceof Date
            ? f.uploadedAt.toISOString()
            : new Date(String(f.uploadedAt || new Date())).toISOString(),
      }));

    const reportFiles = formatTerminationFiles(raw.reportFiles);
    const evidenceFiles = formatTerminationFiles(raw.evidenceFiles);

    const terminationHistory = (
      (raw.terminationHistory as Array<Record<string, unknown>>) || []
    ).map((th) => ({
      terminationType: th.terminationType as ContractTerminationTypeEnum,
      violationCategory:
        (th.violationCategory as ViolationCategoryEnum) || null,
      reason: String(th.reason || ''),
      reportFiles: formatTerminationFiles(th.reportFiles),
      evidenceFiles: formatTerminationFiles(th.evidenceFiles),
      terminatedBy: formatUserSnap(th.terminatedBy),
      terminatedAt:
        th.terminatedAt instanceof Date
          ? th.terminatedAt.toISOString()
          : new Date(String(th.terminatedAt || new Date())).toISOString(),
      storageUnitStatus: th.storageUnitStatus as StorageUnitStatusEnum,
      depositStatus: th.depositStatus as ContractDepositStatusEnum,
      forfeitedAmount: Number(th.forfeitedAmount || 0),
    }));

    const formatAmenityList = (list: unknown) =>
      ((list as Array<Record<string, unknown>>) || []).map((a) => ({
        facilityAmenityOfferingId: String(
          a.facilityAmenityOfferingId &&
            typeof a.facilityAmenityOfferingId === 'object' &&
            '_id' in (a.facilityAmenityOfferingId as Record<string, unknown>)
            ? (a.facilityAmenityOfferingId as Record<string, unknown>)._id
            : a.facilityAmenityOfferingId
        ),
        amenityId: String(
          a.amenityId &&
            typeof a.amenityId === 'object' &&
            '_id' in (a.amenityId as Record<string, unknown>)
            ? (a.amenityId as Record<string, unknown>)._id
            : a.amenityId
        ),
        name: String(a.name),
        quantity: Number(a.quantity),
        pricePerUnit: Number(a.pricePerUnit),
        billingUnit: a.billingUnit as BillingUnitEnum,
        totalPrice: Number(a.totalPrice),
        addedAt:
          a.addedAt instanceof Date
            ? a.addedAt.toISOString()
            : new Date(String(a.addedAt || new Date())).toISOString(),
      }));

    const amenities = formatAmenityList(raw.amenities);

    const addendums = (
      (raw.addendums as Array<Record<string, unknown>>) || []
    ).map((ad) => {
      const adAssignedStaffIdStr = ad.assignedStaffId
        ? typeof ad.assignedStaffId === 'object' &&
          '_id' in (ad.assignedStaffId as Record<string, unknown>)
          ? String((ad.assignedStaffId as Record<string, unknown>)._id)
          : String(ad.assignedStaffId)
        : null;

      const prevUnitIdStr = ad.previousStorageUnitId
        ? typeof ad.previousStorageUnitId === 'object' &&
          '_id' in (ad.previousStorageUnitId as Record<string, unknown>)
          ? String((ad.previousStorageUnitId as Record<string, unknown>)._id)
          : String(ad.previousStorageUnitId)
        : null;

      const nextUnitIdStr = ad.newStorageUnitId
        ? typeof ad.newStorageUnitId === 'object' &&
          '_id' in (ad.newStorageUnitId as Record<string, unknown>)
          ? String((ad.newStorageUnitId as Record<string, unknown>)._id)
          : String(ad.newStorageUnitId)
        : null;

      return {
        id: String(ad._id || ad.id),
        addendumCode: String(ad.addendumCode),
        type:
          (ad.type as ContractAddendumTypeEnum) ||
          ContractAddendumTypeEnum.RENEW,
        previousEndDate: ad.previousEndDate
          ? ad.previousEndDate instanceof Date
            ? ad.previousEndDate.toISOString()
            : new Date(String(ad.previousEndDate)).toISOString()
          : null,
        newEndDate: ad.newEndDate
          ? ad.newEndDate instanceof Date
            ? ad.newEndDate.toISOString()
            : new Date(String(ad.newEndDate)).toISOString()
          : null,
        previousStorageUnitId: prevUnitIdStr,
        previousStorageUnit: formatStorageUnitSnap(ad.previousStorageUnitId),
        newStorageUnitId: nextUnitIdStr,
        newStorageUnit: formatStorageUnitSnap(ad.newStorageUnitId),
        amenities: formatAmenityList(ad.amenities),
        totalPeriodicPrice: Number(ad.totalPeriodicPrice || 0),
        damageFee: Number(ad.damageFee || 0),
        status: ad.status as ContractAddendumStatusEnum,
        requestedBy: formatUserSnap(ad.requestedBy),
        requestedAt:
          ad.requestedAt instanceof Date
            ? ad.requestedAt.toISOString()
            : new Date(String(ad.requestedAt || new Date())).toISOString(),
        approvedBy: formatUserSnap(ad.approvedBy),
        approvedAt: ad.approvedAt
          ? ad.approvedAt instanceof Date
            ? ad.approvedAt.toISOString()
            : new Date(String(ad.approvedAt)).toISOString()
          : null,
        assignedStaffId: adAssignedStaffIdStr,
        assignedStaff: formatUserSnap(ad.assignedStaffId),
        customerSigned: Boolean(ad.customerSigned),
        customerSignedAt: ad.customerSignedAt
          ? ad.customerSignedAt instanceof Date
            ? ad.customerSignedAt.toISOString()
            : new Date(String(ad.customerSignedAt)).toISOString()
          : null,
        staffSigned: Boolean(ad.staffSigned),
        staffSignedAt: ad.staffSignedAt
          ? ad.staffSignedAt instanceof Date
            ? ad.staffSignedAt.toISOString()
            : new Date(String(ad.staffSignedAt)).toISOString()
          : null,
        completedAt: ad.completedAt
          ? ad.completedAt instanceof Date
            ? ad.completedAt.toISOString()
            : new Date(String(ad.completedAt)).toISOString()
          : null,
        rejectionReason: (ad.rejectionReason as string) ?? null,
        rejectedBy: formatUserSnap(ad.rejectedBy),
        rejectedAt: ad.rejectedAt
          ? ad.rejectedAt instanceof Date
            ? ad.rejectedAt.toISOString()
            : new Date(String(ad.rejectedAt)).toISOString()
          : null,
        cancellationReason: (ad.cancellationReason as string) ?? null,
        cancelledBy: formatUserSnap(ad.cancelledBy),
        cancelledAt: ad.cancelledAt
          ? ad.cancelledAt instanceof Date
            ? ad.cancelledAt.toISOString()
            : new Date(String(ad.cancelledAt)).toISOString()
          : null,
        signedAddendumFiles: formatTerminationFiles(ad.signedAddendumFiles),
        notes: (ad.notes as string) ?? null,
      };
    });

    const customerIdStr =
      raw.customerId &&
      typeof raw.customerId === 'object' &&
      '_id' in (raw.customerId as Record<string, unknown>)
        ? String((raw.customerId as Record<string, unknown>)._id)
        : String(raw.customerId);

    const facilityIdStr =
      raw.facilityId &&
      typeof raw.facilityId === 'object' &&
      '_id' in (raw.facilityId as Record<string, unknown>)
        ? String((raw.facilityId as Record<string, unknown>)._id)
        : String(raw.facilityId);

    const storageUnitIdStr =
      raw.storageUnitId &&
      typeof raw.storageUnitId === 'object' &&
      '_id' in (raw.storageUnitId as Record<string, unknown>)
        ? String((raw.storageUnitId as Record<string, unknown>)._id)
        : String(raw.storageUnitId);

    const offeringIdStr =
      raw.facilityUnitTypeOfferingId &&
      typeof raw.facilityUnitTypeOfferingId === 'object' &&
      '_id' in (raw.facilityUnitTypeOfferingId as Record<string, unknown>)
        ? String(
            (raw.facilityUnitTypeOfferingId as Record<string, unknown>)._id
          )
        : String(raw.facilityUnitTypeOfferingId);

    const assignedStaffIdStr = raw.assignedStaffId
      ? typeof raw.assignedStaffId === 'object' &&
        '_id' in (raw.assignedStaffId as Record<string, unknown>)
        ? String((raw.assignedStaffId as Record<string, unknown>)._id)
        : String(raw.assignedStaffId)
      : null;

    return {
      id: String(raw._id),
      contractCode: String(raw.contractCode),
      source: raw.source as ContractSourceEnum,
      reservationId: raw.reservationId ? String(raw.reservationId) : null,
      customerId: customerIdStr,
      facilityId: facilityIdStr,
      storageUnitId: storageUnitIdStr,
      rentalTargetType: (raw.rentalTargetType as string) ?? null,
      rentedRackIds: Array.isArray(raw.rentedRackIds)
        ? raw.rentedRackIds.map((id) =>
            typeof id === 'object' && id !== null && '_id' in id
              ? String((id as { _id: unknown })._id)
              : String(id)
          )
        : [],
      facilityUnitTypeOfferingId: offeringIdStr,
      assignedStaffId: assignedStaffIdStr,
      startDate:
        raw.startDate instanceof Date
          ? raw.startDate.toISOString()
          : new Date(String(raw.startDate)).toISOString(),
      endDate:
        raw.endDate instanceof Date
          ? raw.endDate.toISOString()
          : new Date(String(raw.endDate)).toISOString(),
      actualCheckInDate: raw.actualCheckInDate
        ? raw.actualCheckInDate instanceof Date
          ? raw.actualCheckInDate.toISOString()
          : new Date(String(raw.actualCheckInDate)).toISOString()
        : null,
      earlyCheckIn:
        raw.earlyCheckIn !== undefined && raw.earlyCheckIn !== null
          ? Boolean(raw.earlyCheckIn)
          : null,
      outOfSlot:
        raw.outOfSlot !== undefined && raw.outOfSlot !== null
          ? Boolean(raw.outOfSlot)
          : null,
      actualCheckOutDate: raw.actualCheckOutDate
        ? raw.actualCheckOutDate instanceof Date
          ? raw.actualCheckOutDate.toISOString()
          : new Date(String(raw.actualCheckOutDate)).toISOString()
        : null,
      billingUnit: raw.billingUnit as BillingUnitEnum,
      rentalPrice: Number(raw.rentalPrice),
      depositAmount: Number(raw.depositAmount),
      depositPaidAt: raw.depositPaidAt
        ? raw.depositPaidAt instanceof Date
          ? raw.depositPaidAt.toISOString()
          : new Date(String(raw.depositPaidAt)).toISOString()
        : null,
      depositPaymentId: raw.depositPaymentId
        ? String(raw.depositPaymentId)
        : null,
      firstPeriodPaidAt: raw.firstPeriodPaidAt
        ? raw.firstPeriodPaidAt instanceof Date
          ? raw.firstPeriodPaidAt.toISOString()
          : new Date(String(raw.firstPeriodPaidAt)).toISOString()
        : null,
      firstPeriodPaymentId: raw.firstPeriodPaymentId
        ? String(raw.firstPeriodPaymentId)
        : null,
      totalPeriodicPrice: Number(raw.totalPeriodicPrice),
      amenities,
      addendums,
      renewals,
      renewalCount: Number(raw.renewalCount || 0),
      inspectedBy,
      damageFee: Number(raw.damageFee || 0),
      overdueFee: Number(raw.overdueFee || 0),
      refundAmount: Number(raw.refundAmount || 0),
      forfeitedAmount: Number(raw.forfeitedAmount || 0),
      additionalPaymentRequired: Number(raw.additionalPaymentRequired || 0),
      inspectionNotes: (raw.inspectionNotes as string) ?? null,
      inspectionPhotos: (raw.inspectionPhotos as string[]) || [],
      depositStatus: (raw.depositStatus as ContractDepositStatusEnum) || null,
      settlementConfirmedAt: raw.settlementConfirmedAt
        ? raw.settlementConfirmedAt instanceof Date
          ? raw.settlementConfirmedAt.toISOString()
          : new Date(String(raw.settlementConfirmedAt)).toISOString()
        : null,
      disputedAt: raw.disputedAt
        ? raw.disputedAt instanceof Date
          ? raw.disputedAt.toISOString()
          : new Date(String(raw.disputedAt)).toISOString()
        : null,
      disputeReason: (raw.disputeReason as string) ?? null,
      cancellationType:
        (raw.cancellationType as ContractCancellationTypeEnum) || null,
      cancellationReason: (raw.cancellationReason as string) ?? null,
      cancelledBy,
      cancelledAt: raw.cancelledAt
        ? raw.cancelledAt instanceof Date
          ? raw.cancelledAt.toISOString()
          : new Date(String(raw.cancelledAt)).toISOString()
        : null,
      terminationType:
        (raw.terminationType as ContractTerminationTypeEnum) || null,
      violationCategory:
        (raw.violationCategory as ViolationCategoryEnum) || null,
      terminationReason: (raw.terminationReason as string) ?? null,
      terminatedBy,
      terminatedAt: raw.terminatedAt
        ? raw.terminatedAt instanceof Date
          ? raw.terminatedAt.toISOString()
          : new Date(String(raw.terminatedAt)).toISOString()
        : null,
      reportFiles,
      evidenceFiles,
      terminationHistory,
      signedContractFiles: formatTerminationFiles(raw.signedContractFiles),
      legalEntitySnapshot:
        (raw.legalEntitySnapshot as ILegalEntitySnapshot) ?? null,
      customerSnapshot: (raw.customerSnapshot as ICustomerSnapshot) ?? null,
      signingAuthorizationSnapshot:
        (raw.signingAuthorizationSnapshot as ISigningAuthorizationSnapshot) ??
        null,
      status: raw.status as ContractStatusEnum,
      termsAccepted: Boolean(raw.termsAccepted),
      customerSigned: Boolean(raw.customerSigned),
      customerSignedAt: raw.customerSignedAt
        ? raw.customerSignedAt instanceof Date
          ? raw.customerSignedAt.toISOString()
          : new Date(String(raw.customerSignedAt)).toISOString()
        : null,
      staffSigned: Boolean(raw.staffSigned),
      staffSignedAt: raw.staffSignedAt
        ? raw.staffSignedAt instanceof Date
          ? raw.staffSignedAt.toISOString()
          : new Date(String(raw.staffSignedAt)).toISOString()
        : null,
      signatureHistory,
      notes: (raw.notes as string) ?? null,
      customer,
      facility,
      offering,
      storageUnit,
      assignedStaff,
      createdAt:
        raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : new Date(String(raw.createdAt)).toISOString(),
      updatedAt:
        raw.updatedAt instanceof Date
          ? raw.updatedAt.toISOString()
          : new Date(String(raw.updatedAt)).toISOString(),
    };
  }

  /**
   * Process overdue contracts with batching and per-record transaction isolation.
   * Can be invoked by BullMQ repeatable job or manually by OPS/ADMIN.
   */
  async processOverdueContracts(
    query?: ProcessContractOverdueQuery
  ): Promise<ProcessContractOverdueResponse> {
    const limit = query?.limit ?? 50;
    const now = new Date();
    let overdueCount = 0;
    let failedCount = 0;

    const expiredList =
      await this.contractRepository.findExpiredActiveContracts(now, { limit });

    for (const contract of expiredList) {
      try {
        const ok = await this.processSingleOverdueContract(
          contract._id.toString(),
          now
        );
        if (ok) overdueCount++;
      } catch (err: unknown) {
        failedCount++;
        console.error(
          `[ContractService ALERT] Failed to process overdue contract ${contract.contractCode} (${contract._id}):`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    const responseData = {
      overdueCount,
      processedCount: overdueCount,
      failedCount,
    };

    return validateResponse(processContractOverdueResponseSchema, responseData);
  }

  /**
   * Processes a single contract overdue transition in an isolated transaction.
   */
  @Transactional()
  async processSingleOverdueContract(
    id: string,
    now: Date = new Date(),
    session?: ClientSession
  ): Promise<boolean> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract || contract.status !== ContractStatusEnum.ACTIVE) {
      return false;
    }

    if (contract.endDate >= now) {
      return false;
    }

    const feeResult = calculateContractOverdueFee({
      rentalPrice: contract.rentalPrice,
      billingUnit: contract.billingUnit,
      endDate: contract.endDate,
      actualCheckOutDate: now,
    });

    const updated = await this.contractRepository.atomicUpdateStatus(
      id,
      ContractStatusEnum.ACTIVE,
      {
        status: ContractStatusEnum.OVERDUE,
        overdueFee: feeResult.overdueFee,
      },
      session
    );

    if (updated) {
      this.auditLogService?.record({
        action: AuditActionEnum.UPDATE,
        resourceType: AuditResourceEnum.CONTRACT,
        resourceId: id,
        before: this.formatContract(contract),
        after: this.formatContract(updated),
        actor: {
          id: 'SYSTEM',
          role: RoleEnum.SYSTEM_ADMIN,
          email: 'system@internal.cron',
        },
        metadata: {
          reason: 'Contract expired past endDate, transitioned to OVERDUE',
          overdueDays: feeResult.overdueDays,
          overdueFee: feeResult.overdueFee,
        },
      });

      const customerIdStr = this.extractIdStr(contract.customerId);
      const facilityIdStr = this.extractIdStr(contract.facilityId);
      this.notifyCustomer(
        customerIdStr,
        facilityIdStr,
        `Hợp đồng [${contract.contractCode}] đã quá hạn`,
        `Hợp đồng [${contract.contractCode}] của quý khách đã quá hạn ngày kết thúc ${contract.endDate.toLocaleDateString('vi-VN')}. Phí trễ hạn phát sinh là ${feeResult.overdueFee.toLocaleString('vi-VN')} VNĐ. Vui lòng liên hệ cơ sở để gia hạn hoặc làm thủ tục trả kho.`,
        {
          contractId: id,
          contractCode: contract.contractCode,
          overdueFee: feeResult.overdueFee,
        },
        NotificationPriorityEnum.URGENT
      );

      this.notifyFacilityManager(
        facilityIdStr,
        `Hợp đồng [${contract.contractCode}] quá hạn`,
        `Hợp đồng [${contract.contractCode}] đã chuyển sang trạng thái OVERDUE do quá hạn ngày kết thúc ${contract.endDate.toLocaleDateString('vi-VN')}. Phí trễ hạn: ${feeResult.overdueFee.toLocaleString('vi-VN')} VNĐ.`,
        {
          contractId: id,
          contractCode: contract.contractCode,
          overdueFee: feeResult.overdueFee,
        }
      );

      return true;
    }

    return false;
  }

  /**
   * Scans and prepares reminders for contracts expiring in 30, 7, and 1 days.
   */
  async processExpiryReminders(
    now: Date = new Date()
  ): Promise<{ remindedCount: number }> {
    let remindedCount = 0;
    const reminderDays = [30, 7, 1];

    for (const days of reminderDays) {
      const targetStart = startOfDayVN(addDays(now, days));
      const targetEnd = endOfDayVN(addDays(now, days));

      const expiringContracts =
        await this.contractRepository.findExpiringActiveContracts(
          targetStart,
          targetEnd,
          { limit: 100 }
        );

      for (const contract of expiringContracts) {
        const customerIdStr = this.extractIdStr(contract.customerId);
        const facilityIdStr = this.extractIdStr(contract.facilityId);
        this.notifyCustomer(
          customerIdStr,
          facilityIdStr,
          `Nhắc hạn hợp đồng [${contract.contractCode}] - Còn ${days} ngày`,
          `Hợp đồng [${contract.contractCode}] sẽ kết thúc vào ngày ${contract.endDate.toLocaleDateString('vi-VN')} (còn ${days} ngày). Quý khách vui lòng làm thủ tục gia hạn hoặc chuẩn bị kế hoạch trả kho.`,
          {
            contractId: String(contract._id),
            contractCode: contract.contractCode,
            daysRemaining: days,
          }
        );
        remindedCount++;
      }
    }

    return { remindedCount };
  }

  /**
   * Scans and processes expired Walk-in contract drafts and addendums.
   * Auto-cancels drafts and releases held storage units.
   */
  async processExpiredDrafts(now: Date = new Date()): Promise<{
    expiredContractsCount: number;
    expiredAddendumsCount: number;
    processedCount: number;
    failedCount: number;
  }> {
    let expiredContractsCount = 0;
    let expiredAddendumsCount = 0;
    let failedCount = 0;

    // 1. Expired Walk-in Contract DRAFTs (expiresAt < now)
    const expiredDraftContracts =
      await this.contractRepository.findExpiredDraftContracts(now, {
        limit: 50,
      });

    for (const contract of expiredDraftContracts) {
      try {
        const ok = await this.processSingleExpiredDraftContract(
          contract._id.toString(),
          now
        );
        if (ok) expiredContractsCount++;
      } catch (err: unknown) {
        failedCount++;
        console.error(
          `[ContractService ALERT] Failed to auto-cancel expired draft contract ${contract.contractCode}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    // 2. Contracts with Expired Addendums (expiresAt < now, status PENDING_APPROVAL or DRAFT)
    const contractsWithExpiredAddendums =
      await this.contractRepository.findContractsWithExpiredDraftAddendums(
        now,
        { limit: 50 }
      );

    for (const contract of contractsWithExpiredAddendums) {
      try {
        const count = await this.processSingleContractExpiredAddendums(
          contract._id.toString(),
          now
        );
        expiredAddendumsCount += count;
      } catch (err: unknown) {
        failedCount++;
        console.error(
          `[ContractService ALERT] Failed to process expired addendums on contract ${contract.contractCode}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    return {
      expiredContractsCount,
      expiredAddendumsCount,
      processedCount: expiredContractsCount + expiredAddendumsCount,
      failedCount,
    };
  }

  @Transactional()
  async processSingleExpiredDraftContract(
    id: string,
    now: Date = new Date(),
    session?: ClientSession
  ): Promise<boolean> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract || contract.status !== ContractStatusEnum.DRAFT) {
      return false;
    }
    if (!contract.expiresAt || contract.expiresAt >= now) {
      return false;
    }

    // Auto-cancel contract
    await this.contractRepository.update(
      id,
      {
        status: ContractStatusEnum.CANCELLED,
        cancellationReason: 'DRAFT_EXPIRED',
        cancellationType: ContractCancellationTypeEnum.CANCEL,
        cancelledAt: now,
      },
      session
    );

    // Release storage unit back to AVAILABLE
    const storageUnitIdStr = this.extractIdStr(contract.storageUnitId);
    if (storageUnitIdStr) {
      await this.storageUnitRepository.updateById(
        storageUnitIdStr,
        { status: StorageUnitStatusEnum.AVAILABLE },
        session
      );
    }

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: {
        ...this.formatContract(contract),
        status: ContractStatusEnum.CANCELLED,
        cancellationReason: 'DRAFT_EXPIRED',
      },
      metadata: {
        reason: 'DRAFT_EXPIRED',
        source: 'SYSTEM',
      },
    });

    return true;
  }

  @Transactional()
  async processSingleContractExpiredAddendums(
    id: string,
    now: Date = new Date(),
    session?: ClientSession
  ): Promise<number> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract || !contract.addendums) {
      return 0;
    }

    let expiredCount = 0;
    const updatedAddendums = [...contract.addendums];

    for (let i = 0; i < updatedAddendums.length; i++) {
      const addendum = updatedAddendums[i];
      if (
        (addendum.status === ContractAddendumStatusEnum.PENDING_APPROVAL ||
          addendum.status === ContractAddendumStatusEnum.DRAFT) &&
        addendum.expiresAt &&
        addendum.expiresAt < now
      ) {
        addendum.status = ContractAddendumStatusEnum.CANCELLED;
        addendum.cancellationReason = 'ADDENDUM_EXPIRED';
        addendum.cancelledAt = now;
        expiredCount++;

        // If unit change was proposed and reserved, release new storage unit
        if (
          addendum.type === ContractAddendumTypeEnum.UNIT_CHANGE &&
          addendum.newStorageUnitId
        ) {
          const newUnitIdStr = this.extractIdStr(addendum.newStorageUnitId);
          await this.storageUnitRepository.updateById(
            newUnitIdStr,
            { status: StorageUnitStatusEnum.AVAILABLE },
            session
          );
        }
      }
    }

    if (expiredCount > 0) {
      await this.contractRepository.update(
        id,
        { addendums: updatedAddendums },
        session
      );

      this.auditLogService?.record({
        action: AuditActionEnum.CANCEL_ADDENDUM,
        resourceType: AuditResourceEnum.CONTRACT,
        resourceId: id,
        before: this.formatContract(contract),
        after: {
          ...this.formatContract(contract),
          addendums: updatedAddendums,
        },
        metadata: {
          expiredCount,
          source: 'SYSTEM',
        },
      });
    }

    return expiredCount;
  }
}
