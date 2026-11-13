import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SystemSetting } from '../src/modules/systemSettings/systemSettings.model.ts';
import {
  SystemSettingsService,
  isCheckInTimeValidationEnabled,
} from '../src/modules/systemSettings/systemSettings.service.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import { setupTestDB, teardownTestDB } from './helpers/db.helper.ts';
import express from 'express';
import request from 'supertest';
import { RegisterRoutes } from '../src/routes/routes.ts';
import { errorMiddleware } from '../src/middlewares/error.middleware.ts';
import {
  getAuthHeaders,
  seedTestUsers,
  TEST_USERS,
} from './helpers/auth.helper.ts';

describe('Admin check-in time validation setting', () => {
  const service = new SystemSettingsService();
  const admin = { id: 'admin-test', role: RoleEnum.SYSTEM_ADMIN };
  const app = express();
  app.use(express.json());
  RegisterRoutes(app);
  app.use(errorMiddleware);
  const endpoint = '/system-settings/check-in-time-validation';
  beforeAll(async () => {
    await setupTestDB();
    await seedTestUsers();
  });
  afterAll(teardownTestDB);
  beforeEach(async () => {
    await SystemSetting.deleteMany({});
  });

  it('enables normal validation when there is no saved setting', async () => {
    expect(await isCheckInTimeValidationEnabled()).toBe(true);
  });

  it('persists disabling and re-enabling across service instances', async () => {
    await service.setCheckInTimeValidation(false, admin);
    expect(
      await new SystemSettingsService().getCheckInTimeValidation(admin.role)
    ).toEqual({ enabled: false });
    await service.setCheckInTimeValidation(true, admin);
    expect(await isCheckInTimeValidationEnabled()).toBe(true);
  });

  it('requires authenticated admin access at the HTTP endpoint', async () => {
    expect((await request(app).get(endpoint)).status).toBe(401);
    expect(
      (
        await request(app)
          .patch(endpoint)
          .set('x-user-role', 'system_admin')
          .send({ enabled: false })
      ).status
    ).toBe(401);
    expect(
      (
        await request(app)
          .patch(endpoint)
          .set(getAuthHeaders(TEST_USERS.managerFacilityA))
          .send({ enabled: false })
      ).status
    ).toBe(403);
    expect(await isCheckInTimeValidationEnabled()).toBe(true);
  });

  it('updates and reads the setting through authenticated admin routes', async () => {
    const headers = getAuthHeaders(TEST_USERS.systemAdmin);
    const changed = await request(app)
      .patch(endpoint)
      .set(headers)
      .send({ enabled: false });
    expect(changed.status).toBe(200);
    expect(changed.body.data).toEqual({ enabled: false });
    const loaded = await request(app).get(endpoint).set(headers);
    expect(loaded.body.data).toEqual({ enabled: false });
    expect(
      (
        await request(app)
          .patch(endpoint)
          .set(headers)
          .send({ enabled: 'false' })
      ).status
    ).toBe(400);
  });

  it.each([
    RoleEnum.CUSTOMER,
    RoleEnum.FACILITY_STAFF,
    RoleEnum.FACILITY_MANAGER,
  ])('rejects settings access for %s', async (role) => {
    await expect(service.getCheckInTimeValidation(role)).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(
      service.setCheckInTimeValidation(false, { id: 'non-admin', role })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(await isCheckInTimeValidationEnabled()).toBe(true);
  });
});
