import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  RefundReasonEnum,
  RefundRequestStatusEnum,
} from '../src/common/enums/refundRequest.enum.ts';
import { PaymentStatusEnum } from '../src/common/enums/payment.enum.ts';

const isDryRun = process.argv.includes('--dry-run');

export async function runPartiallyPaidMigration(
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

  const paymentCollection = mongoose.connection.collection('payments');
  const refundRequestCollection =
    mongoose.connection.collection('refundrequests');

  // Search for payments with status 'partially_paid'
  const targetDocs = await paymentCollection
    .find({
      status: 'partially_paid',
    })
    .toArray();

  console.log(
    `[Migration] Found ${targetDocs.length} payments with partially_paid status.`
  );

  let migratedCount = 0;
  const skippedCount = 0;

  for (const doc of targetDocs) {
    const paymentId = doc._id;
    const paidAmount = Number(doc.paidAmount || 0);

    // Idempotency: check if RefundRequest for this payment already exists
    const existingRefund = await refundRequestCollection.findOne({
      paymentId: paymentId,
      reason: RefundReasonEnum.AMOUNT_MISMATCH,
    });

    const now = new Date();

    if (paidAmount > 0 && !existingRefund) {
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const refundCode = `REF-MIG-PARTIAL-${Date.now().toString().slice(-6)}-${randomSuffix}`;

      const refundDoc: Record<string, unknown> = {
        refundCode,
        reservationId: doc.reservationId || null,
        contractId: doc.contractId || null,
        paymentId: paymentId,
        facilityId: doc.facilityId,
        customerId: doc.customerId,
        amount: paidAmount,
        reason: RefundReasonEnum.AMOUNT_MISMATCH,
        status: RefundRequestStatusEnum.PENDING_APPROVAL,
        refundBankName: null,
        refundAccountNumberEncrypted: null,
        refundAccountNumberMasked: null,
        refundAccountHolder: null,
        referenceCode: null,
        proofImageUrl: null,
        note: `Auto-refund generated during migration from legacy PARTIALLY_PAID payment (${paidAmount}/${doc.amount})`,
        requestedBy: doc.customerId,
        requestedAt: doc.updatedAt || now,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        paidBy: null,
        paidAt: null,
        cancelledBy: null,
        cancelledAt: null,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      };

      if (!isDryRun) {
        await refundRequestCollection.insertOne(refundDoc);
      }
    }

    if (!isDryRun) {
      await paymentCollection.updateOne(
        { _id: paymentId },
        {
          $set: {
            status: PaymentStatusEnum.CANCELLED,
            cancellationReason: `Migrated from legacy PARTIALLY_PAID. Refund created for paid amount (${paidAmount}).`,
            cancelledAt: now,
            updatedAt: now,
          },
        }
      );
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

if (process.argv[1]?.includes('migrate-partially-paid-payments.ts')) {
  runPartiallyPaidMigration()
    .then(() => {
      console.log('[Migration] Finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
