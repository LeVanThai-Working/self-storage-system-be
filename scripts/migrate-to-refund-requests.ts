import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  RefundReasonEnum,
  RefundRequestStatusEnum,
} from '../src/common/enums/refundRequest.enum.ts';
import { RefundStatusEnum } from '../src/common/enums/reservation.enum.ts';

const isDryRun = process.argv.includes('--dry-run');

export async function runRefundRequestMigration(
  customUri?: string
): Promise<{ scanned: number; migrated: number; skipped: number }> {
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
  const refundRequestCollection =
    mongoose.connection.collection('refundrequests');

  // Tìm các đơn đặt chỗ có refundStatus là pending hoặc refunded
  const targetDocs = await reservationCollection
    .find({
      refundStatus: {
        $in: [RefundStatusEnum.PENDING, RefundStatusEnum.REFUNDED],
      },
    })
    .toArray();

  console.log(
    `[Migration] Found ${targetDocs.length} reservations with pending/refunded status.`
  );

  let migratedCount = 0;
  let skippedCount = 0;

  for (const doc of targetDocs) {
    const reservationId = doc._id;

    // Idempotency: Kiểm tra nếu đã có RefundRequest liên kết với reservation này
    const existing = await refundRequestCollection.findOne({
      reservationId: reservationId,
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    const amount = Number(doc.refundAmount || doc.depositAmount || 0);
    if (amount <= 0) {
      skippedCount++;
      continue;
    }

    const isRefunded = doc.refundStatus === RefundStatusEnum.REFUNDED;
    const now = new Date();
    const actionDate =
      doc.refundedAt || doc.cancelledAt || doc.updatedAt || now;
    const actorId =
      doc.refundedBy || doc.cancelledBy || doc.customerId || doc._id;

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const refundCode = `REF-MIG-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const reason =
      doc.cancellationSource === 'facility'
        ? RefundReasonEnum.FACILITY_CANCEL
        : RefundReasonEnum.CUSTOMER_CANCEL;

    const refundDoc: Record<string, unknown> = {
      refundCode,
      reservationId: reservationId,
      contractId: null,
      paymentId: doc.paymentId || null,
      facilityId: doc.facilityId,
      customerId: doc.customerId,
      amount,
      reason,
      status: isRefunded
        ? RefundRequestStatusEnum.PAID
        : RefundRequestStatusEnum.PENDING_APPROVAL,
      refundBankName: null,
      refundAccountNumberEncrypted: null,
      refundAccountNumberMasked: null,
      refundAccountHolder: null,
      referenceCode: isRefunded
        ? doc.refundReference ||
          `MIGRATED-REF-${String(reservationId).slice(-6)}`
        : null,
      proofImageUrl: null,
      note: doc.refundNote || 'Migrated from legacy reservation record',
      requestedBy: doc.cancelledBy || doc.customerId || actorId,
      requestedAt: doc.cancelledAt || doc.createdAt || now,
      approvedBy: isRefunded ? actorId : null,
      approvedAt: isRefunded ? actionDate : null,
      rejectionReason: null,
      paidBy: isRefunded ? actorId : null,
      paidAt: isRefunded ? actionDate : null,
      cancelledBy: null,
      cancelledAt: null,
      deleted: false,
      createdAt: doc.createdAt || now,
      updatedAt: now,
    };

    if (!isDryRun) {
      await refundRequestCollection.insertOne(refundDoc);
    }

    migratedCount++;
  }

  console.log(
    `[Migration] Completed. Scanned: ${targetDocs.length}, Migrated: ${migratedCount}, Skipped: ${skippedCount}`
  );

  if (!isAlreadyConnected) {
    await mongoose.disconnect();
  }

  return {
    scanned: targetDocs.length,
    migrated: migratedCount,
    skipped: skippedCount,
  };
}

if (process.argv[1]?.includes('migrate-to-refund-requests.ts')) {
  runRefundRequestMigration()
    .then(() => {
      console.log('[Migration] Finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
