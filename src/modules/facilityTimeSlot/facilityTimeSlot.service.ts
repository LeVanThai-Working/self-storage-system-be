import type { FacilityTimeSlotRepository } from './facilityTimeSlot.repository.ts';
import type { FacilityRepository } from '../facility/facility.repository.ts';
import type { ReservationRepository } from '../reservation/reservation.repository.ts';
import type { IFacilityTimeSlot } from './facilityTimeSlot.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { FacilityStatusEnum } from '../../common/enums/facility.enum.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  facilityTimeSlotResponseSchema,
  availableTimeSlotItemResponseSchema,
  type FacilityTimeSlotResponse,
  type AvailableTimeSlotItemResponse,
} from './schemas/facilityTimeSlot.response.schema.ts';
import type {
  CreateFacilityTimeSlotRequest,
  UpdateFacilityTimeSlotRequest,
} from './schemas/facilityTimeSlot.request.schema.ts';
import { Types } from 'mongoose';
import { z } from 'zod';

export class FacilityTimeSlotService {
  constructor(
    private readonly facilityTimeSlotRepository: FacilityTimeSlotRepository,
    private readonly facilityRepository: FacilityRepository,
    private readonly reservationRepository: ReservationRepository
  ) {}

  private formatTimeSlot(slot: IFacilityTimeSlot): FacilityTimeSlotResponse {
    const raw = (typeof slot.toObject === 'function'
      ? slot.toObject()
      : slot) as unknown as Record<string, unknown>;

    return {
      id: String(raw._id || raw.id),
      facilityId: String(raw.facilityId),
      slotName: String(raw.slotName),
      startTime: String(raw.startTime),
      endTime: String(raw.endTime),
      maxCapacity: Number(raw.maxCapacity),
      isActive: Boolean(raw.isActive),
      notes: (raw.notes as string) ?? null,
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

  // Get available check-in slots for a specific date in a facility
  async getAvailableSlots(
    facilityId: string,
    dateStr: string
  ): Promise<AvailableTimeSlotItemResponse[]> {
    const facility = await this.facilityRepository.findById(facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }
    if (facility.status !== FacilityStatusEnum.ACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_110, ['Facility']);
    }

    const checkInDate = new Date(dateStr);
    if (isNaN(checkInDate.getTime())) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [
        'Invalid check-in date',
      ]);
    }

    const activeSlots = await this.facilityTimeSlotRepository.findByFacilityId(
      facilityId,
      true
    );

    const results: AvailableTimeSlotItemResponse[] = [];

    for (const slot of activeSlots) {
      const bookedCount =
        await this.reservationRepository.countBookedInTimeSlot(
          facilityId,
          checkInDate,
          slot.slotName
        );

      const availableCapacity = Math.max(0, slot.maxCapacity - bookedCount);

      results.push({
        id: slot._id.toString(),
        facilityId: slot.facilityId.toString(),
        slotName: slot.slotName,
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxCapacity: slot.maxCapacity,
        bookedCount,
        availableCapacity,
        isAvailable: availableCapacity > 0,
      });
    }

    return validateResponse(
      z.array(availableTimeSlotItemResponseSchema),
      results
    );
  }

  // Get all slots of facility (for manager/admin configuration)
  async getSlotsByFacility(
    facilityId: string
  ): Promise<FacilityTimeSlotResponse[]> {
    const slots = await this.facilityTimeSlotRepository.findByFacilityId(
      facilityId,
      false
    );
    return slots.map((s) =>
      validateResponse(facilityTimeSlotResponseSchema, this.formatTimeSlot(s))
    );
  }

  // Create new time slot for a facility
  async createTimeSlot(
    data: CreateFacilityTimeSlotRequest
  ): Promise<FacilityTimeSlotResponse> {
    const facility = await this.facilityRepository.findById(data.facilityId);
    if (!facility) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Facility']);
    }

    const existing =
      await this.facilityTimeSlotRepository.findByFacilityAndSlotName(
        data.facilityId,
        data.slotName
      );
    if (existing) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, [
        'Time slot name in this facility',
      ]);
    }

    const created = await this.facilityTimeSlotRepository.create({
      ...data,
      facilityId: new Types.ObjectId(data.facilityId),
    });
    return validateResponse(
      facilityTimeSlotResponseSchema,
      this.formatTimeSlot(created)
    );
  }

  // Update time slot
  async updateTimeSlot(
    id: string,
    data: UpdateFacilityTimeSlotRequest
  ): Promise<FacilityTimeSlotResponse> {
    const slot = await this.facilityTimeSlotRepository.findById(id);
    if (!slot) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Time Slot']);
    }

    if (data.slotName && data.slotName !== slot.slotName) {
      const existing =
        await this.facilityTimeSlotRepository.findByFacilityAndSlotName(
          slot.facilityId.toString(),
          data.slotName
        );
      if (existing) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, [
          'Time slot name in this facility',
        ]);
      }
    }

    const updated = await this.facilityTimeSlotRepository.updateById(id, data);
    return validateResponse(
      facilityTimeSlotResponseSchema,
      this.formatTimeSlot(updated!)
    );
  }

  // Delete time slot
  async deleteTimeSlot(id: string, deletedBy?: string): Promise<void> {
    const slot = await this.facilityTimeSlotRepository.findById(id);
    if (!slot) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Time Slot']);
    }
    await this.facilityTimeSlotRepository.deleteById(id, deletedBy);
  }
}
