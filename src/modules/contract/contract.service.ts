import { Types, type ClientSession } from 'mongoose';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { startOfDayVN } from '../../utils/date.util.ts';
import { calculateContractOverdueFee } from '../../utils/contractFee.util.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
  ContractDepositStatusEnum,
  ContractSourceEnum,
  ContractStatusEnum,
} from '../../common/enums/contract.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';
import {
  RefundStatusEnum,
  ReservationCancelSourceEnum,
  ReservationStatusEnum,
} from '../../common/enums/reservation.enum.ts';
import { RefundReasonEnum } from '../../common/enums/refundRequest.enum.ts';
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
import type {
  IContract,
  IContractAddendum,
  IContractAmenity,
  IContractRenewal,
} from './contract.model.ts';
import {
  contractResponseSchema,
  type ContractResponse,
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
  RejectContractAddendumRequest,
  RenewContractRequest,
  SignContractAddendumRequest,
  TerminateContractRequest,
  DisputeSettlementRequest,
} from './schemas/contract.request.schema.ts';
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
    private readonly customerInventoryRepository?: CustomerInventoryRepository
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

      // Check if a contract already exists for this reservation
      const existingContract =
        await this.contractRepository.findByReservationId(
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

      // Reservation must be CONFIRMED or OVERDUE (within grace period)
      if (
        reservation.status !== ReservationStatusEnum.CONFIRMED &&
        reservation.status !== ReservationStatusEnum.OVERDUE
      ) {
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
    const bothSigned = Boolean(contract.staffSigned);

    if (bothSigned) {
      const storageUnitId =
        contract.storageUnitId && typeof contract.storageUnitId === 'object'
          ? String((contract.storageUnitId as { _id: Types.ObjectId })._id)
          : String(contract.storageUnitId);

      await this.storageUnitRepository.updateById(
        storageUnitId,
        { status: StorageUnitStatusEnum.OCCUPIED },
        session
      );

      if (contract.reservationId) {
        await this.reservationRepository.atomicUpdateStatus(
          String(contract.reservationId),
          [ReservationStatusEnum.CONFIRMED, ReservationStatusEnum.OVERDUE],
          { status: ReservationStatusEnum.COMPLETED },
          session
        );
      }
    }

    const updated = await this.contractRepository.update(
      id,
      {
        customerSigned: true,
        customerSignedAt: now,
        termsAccepted: true,
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
      metadata: { party: 'customer', activated: bothSigned },
    });

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

    // Late check-in date adjustment [OPEN D6]
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
    }
    const bothSigned = Boolean(contract.customerSigned);

    if (bothSigned) {
      const storageUnitId =
        contract.storageUnitId && typeof contract.storageUnitId === 'object'
          ? String((contract.storageUnitId as { _id: Types.ObjectId })._id)
          : String(contract.storageUnitId);

      // Transition storage unit to OCCUPIED
      await this.storageUnitRepository.updateById(
        storageUnitId,
        { status: StorageUnitStatusEnum.OCCUPIED },
        session
      );

      // If contract was created from Reservation, complete the reservation
      if (contract.reservationId) {
        await this.reservationRepository.atomicUpdateStatus(
          String(contract.reservationId),
          [ReservationStatusEnum.CONFIRMED, ReservationStatusEnum.OVERDUE],
          { status: ReservationStatusEnum.COMPLETED },
          session
        );
      }
    }

    const updated = await this.contractRepository.update(
      id,
      {
        staffSigned: true,
        staffSignedAt: now,
        status: bothSigned
          ? ContractStatusEnum.ACTIVE
          : ContractStatusEnum.DRAFT,
        startDate: finalStartDate,
        endDate: finalEndDate,
        actualCheckInDate,
        termsAccepted: bothSigned ? true : contract.termsAccepted,
        notes: data.notes || contract.notes,
        assignedStaffId:
          contract.assignedStaffId || new Types.ObjectId(actorId),
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.CHECK_IN,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: { party: 'staff', activated: bothSigned },
    });

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

  // 3. Cancel contract (DRAFT -> CANCELLED) with 100% deposit forfeiture
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

    if (actorRole === RoleEnum.CUSTOMER) {
      const customerIdStr = this.extractIdStr(contract.customerId);
      if (customerIdStr !== actorId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
    } else if (
      actorRole === RoleEnum.FACILITY_STAFF ||
      actorRole === RoleEnum.FACILITY_MANAGER ||
      actorRole === RoleEnum.BUSINESS_OPS_MANAGER ||
      actorRole === RoleEnum.SYSTEM_ADMIN
    ) {
      const facilityIdStr = this.extractIdStr(contract.facilityId);
      await this.assertFacilityAccess(actorId, actorRole, facilityIdStr);
    } else {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    if (contract.status !== ContractStatusEnum.DRAFT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const storageUnitId =
      contract.storageUnitId && typeof contract.storageUnitId === 'object'
        ? String((contract.storageUnitId as { _id: Types.ObjectId })._id)
        : String(contract.storageUnitId);

    // Release storage unit back to AVAILABLE
    await this.storageUnitRepository.updateById(
      storageUnitId,
      { status: StorageUnitStatusEnum.AVAILABLE },
      session
    );

    // Release amenity inventory
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

    // If contract was created from Reservation, cancel the reservation (deposit forfeited)
    if (contract.reservationId) {
      await this.reservationRepository.atomicUpdateStatus(
        String(contract.reservationId),
        [ReservationStatusEnum.CONFIRMED, ReservationStatusEnum.OVERDUE],
        {
          status: ReservationStatusEnum.CANCELLED,
          cancellationReason:
            'Hợp đồng khởi tạo từ đơn đặt chỗ đã bị huỷ (mất 100% tiền cọc)',
          cancelledAt: new Date(),
          cancelledBy: new Types.ObjectId(actorId),
          cancellationSource: ReservationCancelSourceEnum.SYSTEM,
          refundAmount: 0,
          refundStatus: RefundStatusEnum.NONE,
        },
        session
      );
    }

    // Deposit is forfeited (refundAmount = 0)
    const updated = await this.contractRepository.update(
      id,
      {
        status: ContractStatusEnum.CANCELLED,
        cancellationReason: data.cancellationReason,
        cancelledBy: new Types.ObjectId(actorId),
        cancelledAt: new Date(),
        refundAmount: 0,
        depositStatus: ContractDepositStatusEnum.FORFEITED,
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.CANCEL,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
      metadata: { depositForfeited: contract.depositAmount },
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

    // Vacate unit -> transition to UNDER_MAINTENANCE for cleaning
    await this.storageUnitRepository.updateById(
      storageUnitId,
      { status: StorageUnitStatusEnum.UNDER_MAINTENANCE },
      session
    );

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
        inspectionPhotos: data.inspectionPhotos || [],
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

    // Transition storage unit to UNDER_MAINTENANCE
    // NOTE (linked to booking/T2.10): When PENDING_CLEARANCE is introduced in T2.10,
    // units with remainingInventoryItems > 0 will transition to PENDING_CLEARANCE.
    // Until then, UNDER_MAINTENANCE combined with StorageUnitService.toggleMaintenance's
    // inventory guard (MESSAGE_CODE_629) prevents releasing the unit to AVAILABLE while goods remain.
    await this.storageUnitRepository.updateById(
      storageUnitId,
      { status: StorageUnitStatusEnum.UNDER_MAINTENANCE },
      session
    );

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

    const updated = await this.contractRepository.update(
      id,
      {
        status: ContractStatusEnum.TERMINATED,
        terminationReason: data.terminationReason,
        terminatedBy: new Types.ObjectId(actorId),
        terminatedAt: new Date(),
        actualCheckOutDate: new Date(),
        depositStatus: ContractDepositStatusEnum.FORFEITED,
        refundAmount: 0,
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
      },
    });

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

  // 9. Batch process overdue contracts
  async processOverdueContracts(
    actorId?: string,
    actorRole?: string
  ): Promise<{ processedCount: number }> {
    if (actorId !== undefined || actorRole !== undefined) {
      if (
        actorRole !== RoleEnum.FACILITY_MANAGER &&
        actorRole !== RoleEnum.BUSINESS_OPS_MANAGER &&
        actorRole !== RoleEnum.SYSTEM_ADMIN
      ) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_121, [
          RoleEnum.FACILITY_MANAGER,
        ]);
      }

      if (actorRole === RoleEnum.FACILITY_MANAGER) {
        const user = actorId
          ? await this.userRepository.findById(actorId)
          : null;
        if (!user) {
          throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
        }
        if (!user.assignedFacilityId) {
          throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_122, [
            'Assigned Facility',
          ]);
        }
      }
    }

    const overdueContracts =
      await this.contractRepository.findExpiredActiveContracts(new Date());

    let count = 0;
    for (const c of overdueContracts) {
      await this.contractRepository.update(String(c._id), {
        status: ContractStatusEnum.OVERDUE,
      });
      count++;
    }

    return { processedCount: count };
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
      cancellationReason: (raw.cancellationReason as string) ?? null,
      cancelledBy,
      cancelledAt: raw.cancelledAt
        ? raw.cancelledAt instanceof Date
          ? raw.cancelledAt.toISOString()
          : new Date(String(raw.cancelledAt)).toISOString()
        : null,
      terminationReason: (raw.terminationReason as string) ?? null,
      terminatedBy,
      terminatedAt: raw.terminatedAt
        ? raw.terminatedAt instanceof Date
          ? raw.terminatedAt.toISOString()
          : new Date(String(raw.terminatedAt)).toISOString()
        : null,
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
}
