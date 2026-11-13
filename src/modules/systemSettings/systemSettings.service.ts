import { SystemSetting } from './systemSettings.model.ts';
import { RoleEnum } from '../../common/enums/user.enum.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';

export const CHECK_IN_TIME_SETTING = 'check-in-time-validation';

/** No stored setting means normal time validation remains enabled. */
export async function isCheckInTimeValidationEnabled(): Promise<boolean> {
  const setting = await SystemSetting.findById(CHECK_IN_TIME_SETTING).lean();
  return setting?.enabled ?? true;
}

export class SystemSettingsService {
  async getCheckInTimeValidation(role: string): Promise<{ enabled: boolean }> {
    this.assertAdmin(role);
    return { enabled: await isCheckInTimeValidationEnabled() };
  }

  async setCheckInTimeValidation(
    enabled: boolean,
    caller: { id: string; role: string }
  ): Promise<{ enabled: boolean }> {
    this.assertAdmin(caller.role);
    await SystemSetting.findByIdAndUpdate(
      CHECK_IN_TIME_SETTING,
      { $set: { enabled, updatedBy: caller.id } },
      { upsert: true, runValidators: true }
    );
    return { enabled };
  }

  private assertAdmin(role: string): void {
    if (role !== RoleEnum.SYSTEM_ADMIN)
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
  }
}
