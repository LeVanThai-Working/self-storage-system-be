import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Reservation } from '../src/modules/reservation/reservation.model.ts';
import { StorageUnitStatusEnum } from '../src/common/enums/storageUnit.enum.ts';
import {
  RefundStatusEnum,
  ReservationCancelSourceEnum,
  ReservationStatusEnum,
} from '../src/common/enums/reservation.enum.ts';

const isDryRun = process.argv.includes('--dry-run');

async function runMigration() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI in environment.');
    process.exit(1);
  }

  console.log(`[Migration] Connecting to MongoDB... (dryRun = ${isDryRun})`);
  await mongoose.connect(uri);

  const rawCollection = mongoose.connection.collection('reservations');
  const unitCollection = mongoose.connection.collection('storageunits');

  // 1. Find obsolete status reservations
  const obsoleteDocs = await rawCollection
    .find({
      status: {
        $in: ['pending', 'received', 'rejected', 'payment_failed'],
      },
    })
    .toArray();

  console.log(
    `[Migration] Found ${obsoleteDocs.length} reservations with obsolete statuses.`
  );

  for (const doc of obsoleteDocs) {
    const docId = doc._id;
    let newStatus = ReservationStatusEnum.CANCELLED;
    let cancelSource = ReservationCancelSourceEnum.SYSTEM;

    if (doc.status === 'rejected') {
      newStatus = ReservationStatusEnum.CANCELLED;
      cancelSource = ReservationCancelSourceEnum.FACILITY;
    } else if (
      doc.status === 'pending' ||
      doc.status === 'received' ||
      doc.status === 'payment_failed'
    ) {
      newStatus = ReservationStatusEnum.EXPIRED;
    }

    // Release storage unit if currently reserved
    if (doc.storageUnitId) {
      const unit = await unitCollection.findOne({ _id: doc.storageUnitId });
      if (unit && unit.status === StorageUnitStatusEnum.RESERVED) {
        console.log(
          `[Migration] Releasing storage unit ${doc.storageUnitId} to AVAILABLE.`
        );
        if (!isDryRun) {
          await unitCollection.updateOne(
            { _id: doc.storageUnitId },
            { $set: { status: StorageUnitStatusEnum.AVAILABLE } }
          );
        }
      }
    }

    console.log(
      `[Migration] Updating reservation ${docId} from ${doc.status} -> ${newStatus}.`
    );
    if (!isDryRun) {
      await rawCollection.updateOne(
        { _id: docId },
        {
          $set: {
            status: newStatus,
            cancellationSource: cancelSource,
          },
        }
      );
    }
  }

  // 2. Set default refundStatus and align totalAmount = depositAmount
  console.log(
    '[Migration] Updating refundStatus and totalAmount across records...'
  );
  if (!isDryRun) {
    // Set refundStatus PENDING for cancelled docs with refundAmount > 0
    await rawCollection.updateMany(
      {
        status: ReservationStatusEnum.CANCELLED,
        refundAmount: { $gt: 0 },
        refundStatus: { $in: [null, undefined, 'none'] },
      },
      {
        $set: { refundStatus: RefundStatusEnum.PENDING },
      }
    );

    // Set refundStatus NONE for all other records missing refundStatus
    await rawCollection.updateMany(
      {
        refundStatus: { $in: [null, undefined] },
      },
      {
        $set: { refundStatus: RefundStatusEnum.NONE },
      }
    );

    // Backfill forfeitedAmount = 0 if missing
    await rawCollection.updateMany(
      {
        forfeitedAmount: { $in: [null, undefined] },
      },
      {
        $set: { forfeitedAmount: 0 },
      }
    );

    // Backfill forfeitedAmount for historical No-show cancellations
    await rawCollection.updateMany(
      {
        cancellationReason: { $regex: /No-show/i },
        forfeitedAmount: 0,
      },
      [
        {
          $set: { forfeitedAmount: '$depositAmount' },
        },
      ]
    );

    // Unset deprecated fields
    await rawCollection.updateMany(
      {},
      {
        $unset: {
          receivedBy: '',
          receivedAt: '',
          assignedBy: '',
          assignedAt: '',
          rejectionReason: '',
          lastPaymentError: '',
        },
      }
    );
  }

  // 3. Drop and rebuild storageUnitId partial unique index
  console.log(
    '[Migration] Rebuilding partial unique index on storageUnitId...'
  );
  if (!isDryRun) {
    try {
      await rawCollection.dropIndex('storageUnitId_1');
      console.log('[Migration] Dropped old storageUnitId_1 index.');
    } catch {
      console.log(
        '[Migration] Old index storageUnitId_1 not found or already dropped.'
      );
    }
    await Reservation.syncIndexes();
    console.log(
      '[Migration] Successfully synced indexes on Reservation model.'
    );
  }

  console.log('[Migration] Migration complete.');
  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
