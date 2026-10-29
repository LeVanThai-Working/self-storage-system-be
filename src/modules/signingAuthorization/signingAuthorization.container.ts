import { SigningAuthorization } from './signingAuthorization.model.ts';
import { SigningAuthorizationRepository } from './signingAuthorization.repository.ts';
import { SigningAuthorizationService } from './signingAuthorization.service.ts';
import { SigningAuthorizationController } from './signingAuthorization.controller.ts';
import { legalEntityRepository } from '../legalEntity/legalEntity.container.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

export const signingAuthRepository = new SigningAuthorizationRepository(
  SigningAuthorization
);
export const signingAuthService = new SigningAuthorizationService(
  signingAuthRepository,
  legalEntityRepository,
  auditLogService
);
export const signingAuthorizationController =
  new SigningAuthorizationController(signingAuthService);
