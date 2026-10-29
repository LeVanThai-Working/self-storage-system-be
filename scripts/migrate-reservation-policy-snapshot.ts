/**
 * Migration Script: Backfill policySnapshot & terms fields for legacy Reservations (booking/T2.2)
 *
 * Usage:
 *   npx tsx scripts/migrate-reservation-policy-snapshot.ts --dry-run
 *   npx tsx scripts/migrate-reservation-policy-snapshot.ts
 *
 * Rollback (MongoDB shell or mongosh):
 *   db.reservations.updateMany(
 *     { policyVersion: 'legacy' },
 *     {
 *       $unset: {
 *         termsAccepted: '',
 *         policyVersion: '',
 *         acceptedAt: '',
 *         acceptedIp: '',
 *         policySnapshot: '',
 *       },
 *     }
 *   );
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import {
  getReservationConfig,
  buildReservationPolicySnapshot,
} from '../src/config/reservation.config.ts';

const isDryRun = process.argv.includes('--dry-run');

export async function runReservationPolicySnapshotMigration(
  customUri?: string
): Promise<{ scanned: number; migrated: number }> {
  const isAlreadyConnected = mongoose.connection.readyState === 1;
  const uri = customUri || process.env.MONGODB_URI;

  if (!isAlreadyConnected) {
    if (!uri) {
      throw new Error('Missing MONGODB_URI in environment.');
    }
    console.log(`[Migration] Connecting to MongoDB... (dryRun = ${isDryRun})`);
    await mongoose.connect(uri);
  }

  const reservationCollection = mongoose.connection.collection('reservations');
  const config = getReservationConfig();
  const snapshot = buildReservationPolicySnapshot(config);

  const filter = {
    $or: [{ policySnapshot: { $exists: false } }, { policySnapshot: null }],
  };

  const targetCount = await reservationCollection.countDocuments(filter);
  console.log(
    `[Migration] Found ${targetCount} reservations missing policySnapshot.`
  );

  let migratedCount = 0;

  if (targetCount > 0 && !isDryRun) {
    const result = await reservationCollection.updateMany(filter, {
      $set: {
        termsAccepted: false,
        policyVersion: 'legacy',
        acceptedAt: null,
        acceptedIp: null,
        policySnapshot: snapshot,
      },
    });
    migratedCount = result.modifiedCount;
  } else if (isDryRun) {
    migratedCount = targetCount;
  }

  console.log(
    `[Migration] Completed. Scanned: ${targetCount}, Migrated: ${migratedCount} (dryRun = ${isDryRun})`
  );

  if (!isAlreadyConnected) {
    await mongoose.disconnect();
  }

  return {
    scanned: targetCount,
    migrated: migratedCount,
  };
}

if (process.argv[1]?.includes('migrate-reservation-policy-snapshot.ts')) {
  runReservationPolicySnapshotMigration()
    .then(() => {
      console.log('[Migration] Finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
