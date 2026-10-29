/**
 * Migration Script: Normalize checkInDate and startDate to startOfDayVN for Reservations (booking/T2.1)
 *
 * Usage:
 *   npx tsx scripts/migrate-reservation-checkin-date.ts --dry-run
 *   npx tsx scripts/migrate-reservation-checkin-date.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { startOfDayVN } from '../src/utils/date.util.ts';

export async function runReservationCheckInDateMigration(
  customUri?: string,
  options?: { isDryRun?: boolean }
): Promise<{ scanned: number; updated: number }> {
  const isAlreadyConnected = mongoose.connection.readyState === 1;
  const uri = customUri || process.env.MONGODB_URI;
  const isDryRun = options?.isDryRun ?? process.argv.includes('--dry-run');

  if (!isAlreadyConnected) {
    if (!uri) {
      throw new Error('Missing MONGODB_URI in environment.');
    }
    console.log(
      `[Migration T2.1] Connecting to MongoDB... (dryRun = ${isDryRun})`
    );
    await mongoose.connect(uri);
  }

  const reservationCollection = mongoose.connection.collection('reservations');
  const cursor = reservationCollection.find({});

  let scanned = 0;
  let updated = 0;

  for await (const doc of cursor) {
    scanned++;
    const updates: Record<string, unknown> = {};

    if (doc.checkInDate) {
      const currentCheckIn = new Date(doc.checkInDate);
      const normalizedCheckIn = startOfDayVN(currentCheckIn);
      if (currentCheckIn.getTime() !== normalizedCheckIn.getTime()) {
        updates.checkInDate = normalizedCheckIn;
      }
    }

    if (doc.startDate) {
      const currentStart = new Date(doc.startDate);
      const normalizedStart = startOfDayVN(currentStart);
      if (currentStart.getTime() !== normalizedStart.getTime()) {
        updates.startDate = normalizedStart;
      }
    }

    if (Object.keys(updates).length > 0) {
      updated++;
      if (!isDryRun) {
        await reservationCollection.updateOne(
          { _id: doc._id },
          { $set: updates }
        );
      }
    }
  }

  console.log(
    `[Migration T2.1] Completed. Scanned: ${scanned}, Updated: ${updated} (dryRun = ${isDryRun})`
  );

  if (!isAlreadyConnected) {
    await mongoose.disconnect();
  }

  return {
    scanned,
    updated,
  };
}

if (process.argv[1]?.includes('migrate-reservation-checkin-date.ts')) {
  runReservationCheckInDateMigration()
    .then(() => {
      console.log('[Migration T2.1] Finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration T2.1] Failed:', err);
      process.exit(1);
    });
}
