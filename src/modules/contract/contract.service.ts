import { Types, type ClientSession } from 'mongoose';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { BillingUnitEnum } from '../../common/enums/billing.enum.ts';
import {
  ContractSourceEnum,
  ContractStatusEnum,
} from '../../common/enums/contract.enum.ts';
import { StorageUnitStatusEnum } from '../../common/enums/storageUnit.enum.ts';
import { ReservationStatusEnum } from '../../common/enums/reservation.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { ContractRepository } from './contract.repository.ts';
import type { ReservationRepository } from '../reservation/reservation.repository.ts';
import type { StorageUnitRepository } from '../storageUnit/storageUnit.repository.ts';
import type { FacilityAmenityOfferingRepository } from '../facilityAmenityOffering/facilityAmenityOffering.repository.ts';
import type { FacilityUnitTypeOfferingRepository } from '../facilityUnitTypeOffering/facilityUnitTypeOffering.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type {
  IContract,
  IContractAmenity,
  IContractRenewal,
} from './contract.model.ts';
import {
  contractResponseSchema,
  type ContractResponse,
} from './schemas/contract.response.schema.ts';
import type {
  AddContractAmenityRequest,
  CancelContractRequest,
  CheckInContractRequest,
  CheckOutContractRequest,
  ContractQuery,
  CreateContractRequest,
  RenewContractRequest,
  TerminateContractRequest,
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
    private readonly auditLogService?: AuditLogService
  ) {}

  // 1. Create contract (From RESERVATION or WALK_IN)
  @Transactional()
  async createContract(
    data: CreateContractRequest,
    actorId: string,
    actorRole: string,
    session?: ClientSession
  ): Promise<ContractResponse> {
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

      // Reservation must be CONFIRMED or COMPLETED
      if (
        reservation.status !== ReservationStatusEnum.CONFIRMED &&
        reservation.status !== ReservationStatusEnum.COMPLETED
      ) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_406);
      }

      if (!reservation.storageUnitId) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_305);
      }

      const customerId =
        reservation.customerId && typeof reservation.customerId === 'object'
          ? (reservation.customerId as { _id: Types.ObjectId })._id
          : (reservation.customerId as Types.ObjectId);

      const facilityId =
        reservation.facilityId && typeof reservation.facilityId === 'object'
          ? (reservation.facilityId as { _id: Types.ObjectId })._id
          : (reservation.facilityId as Types.ObjectId);

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
          totalPeriodicPrice,
          amenities: contractAmenities,
          status: ContractStatusEnum.DRAFT,
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

          const available =
            amenityOffering.totalQuantity - amenityOffering.inUseQuantity;
          if (amenityOffering.totalQuantity > 0 && available < item.quantity) {
            throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_408);
          }

          // Lock amenity inventory
          await this.amenityOfferingRepository.updateById(
            String(amenityOffering._id),
            { inUseQuantity: amenityOffering.inUseQuantity + item.quantity },
            session
          );

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

  // 2. Check-in & Activate contract (DRAFT -> ACTIVE)
  @Transactional()
  async checkInContract(
    id: string,
    actorId: string,
    data: CheckInContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (contract.status !== ContractStatusEnum.DRAFT) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    // Require walk-in contracts to have paid deposit before check-in
    if (
      contract.source === ContractSourceEnum.WALK_IN &&
      !contract.depositPaidAt
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_506);
    }

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
      await this.reservationRepository.update(
        String(contract.reservationId),
        { status: ReservationStatusEnum.COMPLETED },
        session
      );
    }

    const actualCheckInDate = data.actualCheckInDate
      ? new Date(data.actualCheckInDate)
      : new Date();

    const updated = await this.contractRepository.update(
      id,
      {
        status: ContractStatusEnum.ACTIVE,
        actualCheckInDate,
        termsAccepted: data.termsAccepted ?? true,
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

  // 3. Cancel contract (DRAFT -> CANCELLED) with 100% deposit forfeiture
  @Transactional()
  async cancelContract(
    id: string,
    actorId: string,
    data: CancelContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
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
        const newInUse = Math.max(0, offering.inUseQuantity - a.quantity);
        await this.amenityOfferingRepository.updateById(
          offeringId,
          { inUseQuantity: newInUse },
          session
        );
      }
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

  // 4. Renew contract (Extend endDate on ACTIVE or OVERDUE)
  @Transactional()
  async renewContract(
    id: string,
    actorId: string,
    data: RenewContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (
      contract.status !== ContractStatusEnum.ACTIVE &&
      contract.status !== ContractStatusEnum.OVERDUE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const newEndDate = new Date(data.newEndDate);
    if (newEndDate <= new Date(contract.endDate)) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_404);
    }

    const renewalEntry: IContractRenewal = {
      previousEndDate: new Date(contract.endDate),
      newEndDate,
      renewedAt: new Date(),
      renewedBy: new Types.ObjectId(actorId),
      note: data.note || null,
    };

    const updated = await this.contractRepository.update(
      id,
      {
        endDate: newEndDate,
        status: ContractStatusEnum.ACTIVE,
        renewalCount: contract.renewalCount + 1,
        renewals: [...contract.renewals, renewalEntry],
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.RENEW,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 5. Add amenity to active contract
  @Transactional()
  async addAmenity(
    id: string,
    actorId: string,
    data: AddContractAmenityRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (contract.status !== ContractStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const offering = await this.amenityOfferingRepository.findById(
      data.facilityAmenityOfferingId,
      session
    );
    if (!offering) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Facility Amenity Offering',
      ]);
    }

    const facilityId =
      contract.facilityId && typeof contract.facilityId === 'object'
        ? String((contract.facilityId as { _id: Types.ObjectId })._id)
        : String(contract.facilityId);
    const offeringFacilityId =
      offering.facilityId && typeof offering.facilityId === 'object'
        ? String((offering.facilityId as { _id: Types.ObjectId })._id)
        : String(offering.facilityId);

    if (facilityId !== offeringFacilityId) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Amenity offering does not belong to the contract facility',
      ]);
    }

    const available = offering.totalQuantity - offering.inUseQuantity;
    if (offering.totalQuantity > 0 && available < data.quantity) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_408);
    }

    // Lock inventory
    await this.amenityOfferingRepository.updateById(
      String(offering._id),
      { inUseQuantity: offering.inUseQuantity + data.quantity },
      session
    );

    const amenityName =
      offering.amenityId &&
      typeof offering.amenityId === 'object' &&
      'name' in offering.amenityId
        ? String(offering.amenityId.name)
        : 'Amenity';

    const amenityId =
      offering.amenityId &&
      typeof offering.amenityId === 'object' &&
      '_id' in offering.amenityId
        ? (offering.amenityId as { _id: Types.ObjectId })._id
        : (offering.amenityId as Types.ObjectId);

    const existingIndex = contract.amenities.findIndex(
      (a) =>
        String(
          (a.facilityAmenityOfferingId as unknown as { _id: Types.ObjectId })
            ._id || a.facilityAmenityOfferingId
        ) === data.facilityAmenityOfferingId
    );

    const amenities = [...contract.amenities];
    if (existingIndex >= 0) {
      const existing = amenities[existingIndex];
      const newQuantity = existing.quantity + data.quantity;
      const totalPrice = newQuantity * existing.pricePerUnit;
      amenities[existingIndex] = {
        ...existing,
        quantity: newQuantity,
        totalPrice,
      };
    } else {
      const totalPrice = data.quantity * offering.pricePerUnit;
      amenities.push({
        facilityAmenityOfferingId: offering._id,
        amenityId,
        name: amenityName,
        quantity: data.quantity,
        pricePerUnit: offering.pricePerUnit,
        billingUnit: offering.billingUnit,
        totalPrice,
        addedAt: new Date(),
      });
    }

    const amenitiesTotal = amenities.reduce((sum, a) => sum + a.totalPrice, 0);
    const totalPeriodicPrice = contract.rentalPrice + amenitiesTotal;

    const updated = await this.contractRepository.update(
      id,
      {
        amenities,
        totalPeriodicPrice,
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.ADD_AMENITY,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 6. Remove amenity from active contract
  @Transactional()
  async removeAmenity(
    id: string,
    amenityOfferingId: string,
    actorId: string,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (contract.status !== ContractStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const existingIndex = contract.amenities.findIndex(
      (a) =>
        String(
          (a.facilityAmenityOfferingId as unknown as { _id: Types.ObjectId })
            ._id || a.facilityAmenityOfferingId
        ) === amenityOfferingId
    );
    if (existingIndex === -1) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Amenity in contract',
      ]);
    }

    const targetAmenity = contract.amenities[existingIndex];

    // Release inventory
    const offering = await this.amenityOfferingRepository.findById(
      amenityOfferingId,
      session
    );
    if (offering) {
      const newInUse = Math.max(
        0,
        offering.inUseQuantity - targetAmenity.quantity
      );
      await this.amenityOfferingRepository.updateById(
        amenityOfferingId,
        { inUseQuantity: newInUse },
        session
      );
    }

    const amenities = contract.amenities.filter(
      (_, index) => index !== existingIndex
    );
    const amenitiesTotal = amenities.reduce((sum, a) => sum + a.totalPrice, 0);
    const totalPeriodicPrice = contract.rentalPrice + amenitiesTotal;

    const updated = await this.contractRepository.update(
      id,
      {
        amenities,
        totalPeriodicPrice,
      },
      session
    );

    const populated = await this.contractRepository.findById(id, session);
    const formatted = this.formatContract(populated || updated!);

    this.auditLogService?.record({
      action: AuditActionEnum.REMOVE_AMENITY,
      resourceType: AuditResourceEnum.CONTRACT,
      resourceId: id,
      before: this.formatContract(contract),
      after: formatted,
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 7. Check-out & Liquidation (ACTIVE or OVERDUE -> COMPLETED)
  @Transactional()
  async checkOutContract(
    id: string,
    actorId: string,
    data: CheckOutContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

    if (
      contract.status !== ContractStatusEnum.ACTIVE &&
      contract.status !== ContractStatusEnum.OVERDUE
    ) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_401);
    }

    const actualCheckOutDate = data.actualCheckOutDate
      ? new Date(data.actualCheckOutDate)
      : new Date();

    // Overdue fee calculation
    let overdueFee = 0;
    const endDate = new Date(contract.endDate);
    if (actualCheckOutDate.getTime() > endDate.getTime()) {
      const diffMs = actualCheckOutDate.getTime() - endDate.getTime();
      const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Calculate approximate daily rate
      let dailyRate = contract.rentalPrice;
      if (contract.billingUnit === BillingUnitEnum.MONTH) {
        dailyRate = Math.round(contract.rentalPrice / 30);
      }

      // Penalty multiplier = 1.5x daily rate
      const penaltyDailyRate = Math.round(dailyRate * 1.5);
      overdueFee = overdueDays * penaltyDailyRate;
    }

    const damageFee = data.damageFee || 0;
    const totalDeductions = damageFee + overdueFee;

    const refundAmount = Math.max(0, contract.depositAmount - totalDeductions);
    const additionalPaymentRequired = Math.max(
      0,
      totalDeductions - contract.depositAmount
    );

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

    // Release all amenities inventory
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
        const newInUse = Math.max(0, offering.inUseQuantity - a.quantity);
        await this.amenityOfferingRepository.updateById(
          offeringId,
          { inUseQuantity: newInUse },
          session
        );
      }
    }

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
      },
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 8. Terminate contract early due to violation (ACTIVE or OVERDUE -> TERMINATED)
  @Transactional()
  async terminateContract(
    id: string,
    actorId: string,
    data: TerminateContractRequest,
    session?: ClientSession
  ): Promise<ContractResponse> {
    const contract = await this.contractRepository.findById(id, session);
    if (!contract) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_400);
    }

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

    // Transition storage unit to UNDER_MAINTENANCE
    await this.storageUnitRepository.updateById(
      storageUnitId,
      { status: StorageUnitStatusEnum.UNDER_MAINTENANCE },
      session
    );

    // Release all amenities inventory
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
        const newInUse = Math.max(0, offering.inUseQuantity - a.quantity);
        await this.amenityOfferingRepository.updateById(
          offeringId,
          { inUseQuantity: newInUse },
          session
        );
      }
    }

    const updated = await this.contractRepository.update(
      id,
      {
        status: ContractStatusEnum.TERMINATED,
        terminationReason: data.terminationReason,
        terminatedBy: new Types.ObjectId(actorId),
        terminatedAt: new Date(),
        actualCheckOutDate: new Date(),
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
    });

    return validateResponse(contractResponseSchema, formatted);
  }

  // 9. Batch process overdue contracts
  async processOverdueContracts(): Promise<{ processedCount: number }> {
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

    // Role-based scoping: customer can only view own contract
    if (callerRole === RoleEnum.CUSTOMER) {
      const customerIdStr = String(
        (contract.customerId as unknown as { _id: Types.ObjectId })._id ||
          contract.customerId
      );
      if (customerIdStr !== callerId) {
        throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
      }
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

    // Data scoping for customer
    if (callerRole === RoleEnum.CUSTOMER) {
      effectiveQuery.customerId = callerId;
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

    const amenities = (
      (raw.amenities as Array<Record<string, unknown>>) || []
    ).map((a) => ({
      facilityAmenityOfferingId: String(a.facilityAmenityOfferingId),
      amenityId: String(a.amenityId),
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
      totalPeriodicPrice: Number(raw.totalPeriodicPrice),
      amenities,
      renewals,
      renewalCount: Number(raw.renewalCount || 0),
      inspectedBy,
      damageFee: Number(raw.damageFee || 0),
      overdueFee: Number(raw.overdueFee || 0),
      refundAmount: Number(raw.refundAmount || 0),
      additionalPaymentRequired: Number(raw.additionalPaymentRequired || 0),
      inspectionNotes: (raw.inspectionNotes as string) ?? null,
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
