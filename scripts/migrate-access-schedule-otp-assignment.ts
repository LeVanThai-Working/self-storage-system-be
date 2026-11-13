import 'dotenv/config';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AccessSchedule } from '../src/modules/customerInventory/accessSchedule.model.ts';
import { User } from '../src/modules/user/user.model.ts';
import { Notification } from '../src/modules/notification/notification.model.ts';
import { AccessScheduleStatusEnum } from '../src/common/enums/customerInventory.enum.ts';
import {
  NotificationTypeEnum,
  NotificationChannelEnum,
} from '../src/common/enums/notification.enum.ts';
import { encryptText } from '../src/utils/encryption.util.ts';

/** Run during a maintenance window, after a database backup. Never prints OTPs. */
export async function migrateAccessSchedules(apply = false) {
  const result = { scanned: 0, updated: 0, missingStaff: 0 };
  const cursor = AccessSchedule.collection.find({}).batchSize(50);
  for await (const raw of cursor) {
    result.scanned++;
    const pending = raw.status === AccessScheduleStatusEnum.PENDING;
    const needsOtp =
      pending &&
      !raw.deleted &&
      new Date(raw.expiresAt) >= new Date() &&
      !raw.otpEncrypted;
    const needsStaff =
      [
        AccessScheduleStatusEnum.CHECKED_IN,
        AccessScheduleStatusEnum.COMPLETED,
      ].includes(raw.status) && !raw.assignedStaffId;
    if (needsStaff && !raw.checkedInBy) result.missingStaff++;
    if (!apply) continue;
    // Retry the complete transaction with a fresh OTP after unique-index collision.
    for (let attempt = 0; attempt < 10; attempt++) {
      const session = await mongoose.startSession();
      let modified = false;
      try {
        await session.withTransaction(async () => {
          const set: Record<string, unknown> = {};
          if (raw.assignmentVersion === undefined) set.assignmentVersion = 0;
          if (needsStaff && raw.checkedInBy) {
            const staff = await User.findById(raw.checkedInBy).session(session);
            set.assignedStaffId = raw.checkedInBy;
            set.assignedBy = raw.checkedInBy;
            set.assignedAt = raw.checkedInAt ?? null;
            set.assignedStaffNameSnapshot = staff?.name ?? null;
          }
          if (needsOtp) {
            const secret = process.env.OTP_SECRET;
            if (!secret && process.env.NODE_ENV === 'production')
              throw new Error('OTP_SECRET is required');
            const otp = String(crypto.randomInt(100000, 1000000));
            set.otpHash = crypto
              .createHmac('sha256', secret || 'self-storage-secret-key-2026')
              .update(otp)
              .digest('hex');
            set.otpEncrypted = encryptText(otp);
          } else if (
            !pending ||
            new Date(raw.expiresAt) < new Date() ||
            raw.deleted
          ) {
            set.otpHash = null;
            set.otpEncrypted = null;
          }
          const changed = await AccessSchedule.collection.updateOne(
            { _id: raw._id, updatedAt: raw.updatedAt },
            { $set: set, $unset: { qrToken: '' } },
            { session }
          );
          modified = changed.modifiedCount > 0;
          if (changed.modifiedCount && needsOtp) {
            await Notification.create(
              [
                {
                  recipientId: raw.customerId,
                  facilityId: raw.facilityId,
                  type: NotificationTypeEnum.ACCESS_SCHEDULE,
                  title: 'Access OTP updated',
                  content: 'Open your scheduled visit to view your new OTP.',
                  channels: [NotificationChannelEnum.IN_APP],
                  metadata: {
                    accessScheduleId: String(raw._id),
                    scheduleCode: raw.scheduleCode,
                  },
                },
              ],
              { session }
            );
          }
        });
        if (modified) result.updated++;
        break;
      } catch (error: unknown) {
        if (
          !(error instanceof Error) ||
          !('code' in error) ||
          error.code !== 11000 ||
          attempt === 9
        )
          throw error;
      } finally {
        await session.endSession();
      }
    }
  }
  return result;
}

if (process.argv[1]?.endsWith('migrate-access-schedule-otp-assignment.ts')) {
  const apply = process.argv.includes('--apply');
  if (apply && !process.argv.includes('--backup-confirmed'))
    throw new Error('Back up the database before --apply --backup-confirmed');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(await migrateAccessSchedules(apply));
  } finally {
    await mongoose.disconnect();
  }
}
