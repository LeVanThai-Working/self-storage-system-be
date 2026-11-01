/**
 * Migration Script: Backfill FIRST_PERIOD PAID Invoices for active legacy contracts (billing/T4.2)
 *
 * Usage:
 *   npx tsx scripts/migrate-contract-first-period-invoices.ts --dry-run
 *   npx tsx scripts/migrate-contract-first-period-invoices.ts
 *   npx tsx scripts/migrate-contract-first-period-invoices.ts --rollback
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
  BillingUnitEnum,
} from '../src/common/enums/billing.enum.ts';
import { PaymentMethodEnum } from '../src/common/enums/payment.enum.ts';
import { addDays, endOfDayVN, startOfDayVN } from '../src/utils/date.util.ts';
import { billingConfig } from '../src/config/billing.config.ts';

export interface MigrationResult {
  scannedContracts: number;
  migratedInvoices: number;
  skippedContracts: number;
}

export async function runMigrateContractFirstPeriodInvoices(
  customUri?: string,
  options?: { isDryRun?: boolean; isRollback?: boolean }
): Promise<MigrationResult> {
  const isAlreadyConnected = mongoose.connection.readyState === 1;
  const uri = customUri || process.env.MONGODB_URI;
  const isDryRun = options?.isDryRun ?? process.argv.includes('--dry-run');
  const isRollback = options?.isRollback ?? process.argv.includes('--rollback');

  if (!isAlreadyConnected) {
    if (!uri) {
      throw new Error('Missing MONGODB_URI in environment.');
    }
    console.log(
      `[Migration T4.2] Connecting to MongoDB... (dryRun = ${isDryRun}, rollback = ${isRollback})`
    );
    await mongoose.connect(uri);
  }

  const contractCollection = mongoose.connection.collection('contracts');
  const invoiceCollection = mongoose.connection.collection('invoices');

  let scannedContracts = 0;
  let migratedInvoices = 0;
  let skippedContracts = 0;

  // 1. Rollback mode
  if (isRollback) {
    console.log('[Migration T4.2] Running rollback mode...');
    const deleteResult = isDryRun
      ? { deletedCount: 0 }
      : await invoiceCollection.deleteMany({
          isMigrationBackfilled: true,
        });

    if (!isDryRun) {
      await contractCollection.updateMany(
        { t42BackfilledAt: { $exists: true } },
        { $unset: { t42BackfilledAt: '' } }
      );
    }

    console.log(
      `[Migration T4.2] Rollback complete. Invoices removed: ${deleteResult.deletedCount}`
    );
    return {
      scannedContracts: 0,
      migratedInvoices: deleteResult.deletedCount,
      skippedContracts: 0,
    };
  }

  // 2. Forward migration: Scan contracts with firstPeriodPaidAt
  const contractsCursor = contractCollection.find({
    firstPeriodPaidAt: { $exists: true, $ne: null },
  });

  const now = new Date();

  for await (const contract of contractsCursor) {
    scannedContracts++;

    // Idempotency check: see if FIRST_PERIOD invoice already exists for this contract
    const existingInvoice = await invoiceCollection.findOne({
      contractId: contract._id,
      type: InvoiceTypeEnum.FIRST_PERIOD,
    });

    if (existingInvoice) {
      skippedContracts++;
      continue;
    }

    const paidAt = new Date(contract.firstPeriodPaidAt);
    const datePart = paidAt.toISOString().slice(2, 10).replace(/-/g, '');
    const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
    const invoiceCode = `INV-MIG-${datePart}-${randPart}`;

    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);

    let periodEndDate: Date;
    let rentQuantity = 1;

    if (contract.billingUnit === BillingUnitEnum.DAY) {
      const durationDays = Math.max(
        1,
        Math.round(
          (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
        )
      );
      if (durationDays <= billingConfig.dailyRentalThresholdDays) {
        periodEndDate = endOfDayVN(endDate);
        rentQuantity = durationDays;
      } else {
        periodEndDate = endOfDayVN(
          addDays(startDate, billingConfig.dailyCycleDays - 1)
        );
        rentQuantity = billingConfig.dailyCycleDays;
      }
    } else {
      const candidateEnd = endOfDayVN(addDays(startDate, 30 - 1));
      periodEndDate =
        candidateEnd.getTime() > endDate.getTime()
          ? endOfDayVN(endDate)
          : candidateEnd;
    }

    const rentalPrice = Number(contract.rentalPrice || 0);
    const items = [
      {
        name: `Tiền thuê kỳ 1 (${contract.contractCode || 'HD'})`,
        description: `Thuê không gian lưu trữ (${contract.billingUnit || BillingUnitEnum.MONTH})`,
        quantity: rentQuantity,
        unitPrice: rentalPrice,
        amount: Math.round(rentQuantity * rentalPrice),
        itemType: InvoiceItemTypeEnum.RENT,
      },
    ];

    if (Array.isArray(contract.amenities)) {
      for (const a of contract.amenities) {
        const amenityQtyMultiplier =
          contract.billingUnit === BillingUnitEnum.DAY &&
          a.billingUnit === BillingUnitEnum.DAY
            ? rentQuantity
            : 1;
        items.push({
          name: a.name || 'Tiện ích',
          description: 'Tiện ích đi kèm kỳ 1',
          quantity: (a.quantity || 1) * amenityQtyMultiplier,
          unitPrice: Number(a.pricePerUnit || a.totalPrice || 0),
          amount: Math.round(Number(a.totalPrice || 0) * amenityQtyMultiplier),
          itemType: InvoiceItemTypeEnum.AMENITY,
        });
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = Number(contract.totalPeriodicPrice || subtotal);

    const invoiceDoc: Record<string, unknown> = {
      invoiceCode,
      contractId: contract._id,
      customerId: contract.customerId,
      facilityId: contract.facilityId,
      type: InvoiceTypeEnum.FIRST_PERIOD,
      status: InvoiceStatusEnum.PAID,
      billingPeriodIndex: 1,
      periodStartDate: startOfDayVN(startDate),
      periodEndDate,
      dueDate: startOfDayVN(startDate),
      items,
      subtotal,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount,
      paidAmount: totalAmount,
      paidAt,
      paymentId: contract.firstPeriodPaymentId || null,
      paymentMethod: contract.firstPeriodPaymentId
        ? PaymentMethodEnum.SEPAY_QR
        : PaymentMethodEnum.CASH,
      issuedAt: contract.createdAt ? new Date(contract.createdAt) : paidAt,
      notes: 'Tự động tạo từ migration backfill hợp đồng đã thanh toán kỳ đầu',
      isMigrationBackfilled: true,
      deleted: false,
      createdAt: paidAt,
      updatedAt: now,
    };

    if (!isDryRun) {
      await invoiceCollection.insertOne(invoiceDoc);
      await contractCollection.updateOne(
        { _id: contract._id },
        { $set: { t42BackfilledAt: now } }
      );
    }

    migratedInvoices++;
  }

  console.log(
    `[Migration T4.2] Completed. Scanned: ${scannedContracts}, Migrated: ${migratedInvoices}, Skipped: ${skippedContracts} (dryRun = ${isDryRun})`
  );

  if (!isAlreadyConnected) {
    await mongoose.disconnect();
  }

  return {
    scannedContracts,
    migratedInvoices,
    skippedContracts,
  };
}

if (process.argv[1]?.includes('migrate-contract-first-period-invoices')) {
  runMigrateContractFirstPeriodInvoices().catch((err) => {
    console.error('[Migration T4.2] Failed:', err);
    process.exit(1);
  });
}
