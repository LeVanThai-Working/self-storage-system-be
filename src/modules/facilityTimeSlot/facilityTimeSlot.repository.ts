import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IFacilityTimeSlot } from './facilityTimeSlot.model.ts';

export class FacilityTimeSlotRepository {
  constructor(
    private readonly facilityTimeSlot: SoftDeleteModel<IFacilityTimeSlot>
  ) {}

  async findByFacilityId(
    facilityId: string,
    onlyActive: boolean = true
  ): Promise<IFacilityTimeSlot[]> {
    const filter: FilterQuery<IFacilityTimeSlot> = { facilityId };
    if (onlyActive) {
      filter.isActive = true;
    }
    return this.facilityTimeSlot.find(filter).sort({ startTime: 1 });
  }

  async findById(
    id: string,
    session?: ClientSession
  ): Promise<IFacilityTimeSlot | null> {
    const q = this.facilityTimeSlot.findById(id);
    if (session) q.session(session);
    return q;
  }

  async findByFacilityAndSlotName(
    facilityId: string,
    slotName: string,
    session?: ClientSession
  ): Promise<IFacilityTimeSlot | null> {
    const q = this.facilityTimeSlot.findOne({
      facilityId,
      slotName: slotName.trim(),
    });
    if (session) q.session(session);
    return q;
  }

  async create(
    data: Partial<IFacilityTimeSlot>,
    session?: ClientSession
  ): Promise<IFacilityTimeSlot> {
    if (session) {
      const created = await this.facilityTimeSlot.create([data], { session });
      return created[0];
    }
    return this.facilityTimeSlot.create(data);
  }

  async updateById(
    id: string,
    data: Partial<IFacilityTimeSlot>,
    session?: ClientSession
  ): Promise<IFacilityTimeSlot | null> {
    const q = this.facilityTimeSlot.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
    });
    if (session) q.session(session);
    return q;
  }

  async deleteById(id: string, deletedBy?: string) {
    return this.facilityTimeSlot.deleteById(id, deletedBy);
  }
}
