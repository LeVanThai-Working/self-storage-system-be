/**
 * Migration Script: Backfill cancellationType and forfeitedAmount for cancelled contracts (booking/T2.3)
 *
 * Usage:
 *   npx tsx scripts/migrate-contract-cancellation-type.ts --dry-run
 *   npx tsx scripts/migrate-contract-cancellation-type.ts
 *   npx tsx scripts/migrate-contract-cancellation-type.ts --rollback
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import {
  ContractCancellationTypeEnum,
  ContractDepositStatusEnum,
  ContractStatusEnum,
} from '../src/common/enums/contract.enum.ts';

export async function runContractCancellationTypeMigration(
  customUri?: string,
  options?: { isDryRun?: boolean; isRollback?: boolean }
): Promise<{
  scannedContracts: number;
  updatedContracts: number;
  scannedReservations: number;
  updatedReservations: number;
}> {
  const isAlreadyConnected = mongoose.connection.readyState === 1;
  const uri = customUri || process.env.MONGODB_URI;
  const isDryRun = options?.isDryRun ?? process.argv.includes('--dry-run');
  const isRollback = options?.isRollback ?? process.argv.includes('--rollback');

  if (!isAlreadyConnected) {
    if (!uri) {
      throw new Error('Missing MONGODB_URI in environment.');
    }
    console.log(
      `[Migration T2.3] Connecting to MongoDB... (dryRun = ${isDryRun}, rollback = ${isRollback})`
    );
    await mongoose.connect(uri);
  }

  const contractCollection = mongoose.connection.collection('contracts');
  const reservationCollection = mongoose.connection.collection('reservations');

  let scannedContracts = 0;
  let updatedContracts = 0;
  let scannedReservations = 0;
  let updatedReservations = 0;

  if (isRollback) {
    console.log('[Migration T2.3] Running rollback mode...');

    const contractsCursor = contractCollection.find({
      t23BackfilledAt: { $exists: true, $ne: null },
    });
    for await (const doc of contractsCursor) {
      scannedContracts++;
      if (!isDryRun) {
        await contractCollection.updateOne(
          { _id: doc._id },
          {
            $unset: {
              t23BackfilledAt: '',
              cancellationType: '',
            },
          }
        );
      }
      updatedContracts++;
    }

    const reservationsCursor = reservationCollection.find({
      t23BackfilledAt: { $exists: true, $ne: null },
    });
    for await (const doc of reservationsCursor) {
      scannedReservations++;
      if (!isDryRun) {
        await reservationCollection.updateOne(
          { _id: doc._id },
          {
            $set: { forfeitedAmount: 0 },
            $unset: { t23BackfilledAt: '' },
          }
        );
      }
      updatedReservations++;
    }

    console.log(
      `[Migration T2.3] Rollback completed. Contracts reverted: ${updatedContracts}, Reservations reverted: ${updatedReservations}`
    );
    return {
      scannedContracts,
      updatedContracts,
      scannedReservations,
      updatedReservations,
    };
  }

  // Forward migration
  const now = new Date();

  // 1. Backfill cancelled contracts
  const contractFilter = {
    status: ContractStatusEnum.CANCELLED,
    $or: [{ cancellationType: { $exists: false } }, { cancellationType: null }],
  };

  const contractsCursor = contractCollection.find(contractFilter);
  for await (const doc of contractsCursor) {
    scannedContracts++;
    const isForfeited =
      doc.depositStatus === ContractDepositStatusEnum.FORFEITED;
    const forfeitedAmount = isForfeited ? Number(doc.depositAmount || 0) : 0;

    if (!isDryRun) {
      await contractCollection.updateOne(
        { _id: doc._id },
        {
          $set: {
            cancellationType: ContractCancellationTypeEnum.CANCEL,
            forfeitedAmount,
            t23BackfilledAt: now,
          },
        }
      );
    }
    updatedContracts++;
  }

  // 2. Backfill linked reservations that were forfeited when DRAFT contract was cancelled
  const reservationFilter = {
    status: 'cancelled',
    cancellationReason:
      'Hợp đồng khởi tạo từ đơn đặt chỗ đã bị huỷ (mất 100% tiền cọc)',
    forfeitedAmount: { $in: [0, null, undefined] },
    depositAmount: { $gt: 0 },
  };

  const reservationsCursor = reservationCollection.find(reservationFilter);
  for await (const doc of reservationsCursor) {
    scannedReservations++;
    if (!isDryRun) {
      await reservationCollection.updateOne(
        { _id: doc._id },
        {
          $set: {
            forfeitedAmount: Number(doc.depositAmount || 0),
            t23BackfilledAt: now,
          },
        }
      );
    }
    updatedReservations++;
  }

  console.log(
    `[Migration T2.3] Completed. Contracts updated: ${updatedContracts}/${scannedContracts}, Reservations updated: ${updatedReservations}/${scannedReservations} (dryRun = ${isDryRun})`
  );

  return {
    scannedContracts,
    updatedContracts,
    scannedReservations,
    updatedReservations,
  };
}

if (
  process.argv[1] &&
  process.argv[1].includes('migrate-contract-cancellation-type')
) {
  runContractCancellationTypeMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration T2.3] Error:', err);
      process.exit(1);
    });
}
