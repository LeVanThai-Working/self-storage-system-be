import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { FacilityTimeSlot } from '../src/modules/facilityTimeSlot/facilityTimeSlot.model.ts';
import { Facility } from '../src/modules/facility/facility.model.ts';

const TARGET_FACILITY_ID = process.argv[2] || '660000000000000000000002';

export const DEFAULT_SLOTS = [
  {
    slotName: '07:00 - 09:00',
    startTime: '07:00',
    endTime: '09:00',
    maxCapacity: 2,
    isActive: true,
    notes: 'Ca sáng sớm',
  },
  {
    slotName: '09:00 - 11:00',
    startTime: '09:00',
    endTime: '11:00',
    maxCapacity: 2,
    isActive: true,
    notes: 'Ca sáng',
  },
  {
    slotName: '11:00 - 13:00',
    startTime: '11:00',
    endTime: '13:00',
    maxCapacity: 2,
    isActive: true,
    notes: 'Ca trưa',
  },
  {
    slotName: '13:00 - 15:00',
    startTime: '13:00',
    endTime: '15:00',
    maxCapacity: 2,
    isActive: true,
    notes: 'Ca đầu giờ chiều',
  },
  {
    slotName: '15:00 - 17:00',
    startTime: '15:00',
    endTime: '17:00',
    maxCapacity: 2,
    isActive: true,
    notes: 'Ca chiều',
  },
  {
    slotName: '17:00 - 19:00',
    startTime: '17:00',
    endTime: '19:00',
    maxCapacity: 2,
    isActive: true,
    notes: 'Ca chiều tối',
  },
  {
    slotName: '19:00 - 21:00',
    startTime: '19:00',
    endTime: '21:00',
    maxCapacity: 2,
    isActive: true,
    notes: 'Ca tối',
  },
];

export async function seedFacilityTimeSlots(
  facilityIdStr: string = TARGET_FACILITY_ID
) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI in environment.');
  }

  if (mongoose.connection.readyState !== 1) {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(uri);
  }

  const facilityObjectId = new mongoose.Types.ObjectId(facilityIdStr);
  const facility = await Facility.findById(facilityObjectId);
  if (!facility) {
    console.warn(
      `[Seed] Warning: Facility with id ${facilityIdStr} not found in database.`
    );
  } else {
    console.log(
      `[Seed] Target Facility found: "${facility.name}" (Status: ${facility.status})`
    );
  }

  console.log(`[Seed] Seeding time slots for facilityId: ${facilityIdStr}...`);
  const results = [];

  for (const slotData of DEFAULT_SLOTS) {
    const existing = await FacilityTimeSlot.findOne({
      facilityId: facilityObjectId,
      slotName: slotData.slotName,
      deleted: { $ne: true },
    });

    if (existing) {
      console.log(
        `[Seed] Slot "${slotData.slotName}" already exists (id: ${existing._id}). Updating...`
      );
      existing.startTime = slotData.startTime;
      existing.endTime = slotData.endTime;
      existing.maxCapacity = slotData.maxCapacity;
      existing.isActive = slotData.isActive;
      existing.notes = slotData.notes;
      await existing.save();
      results.push(existing);
    } else {
      console.log(`[Seed] Creating slot "${slotData.slotName}"...`);
      const newSlot = await FacilityTimeSlot.create({
        facilityId: facilityObjectId,
        ...slotData,
      });
      results.push(newSlot);
    }
  }

  console.log(
    `[Seed] Successfully seeded ${results.length} time slots for facility ${facilityIdStr}.`
  );
  return results;
}

const isDirectRun =
  process.argv[1]?.includes('seed-facility-timeslots') ||
  process.argv[1]?.endsWith('seed-facility-timeslots.ts');

if (isDirectRun) {
  seedFacilityTimeSlots()
    .then(async () => {
      await mongoose.disconnect();
      console.log('[Seed] Done and disconnected.');
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Error during seeding:', err);
      await mongoose.disconnect();
      process.exit(1);
    });
}
