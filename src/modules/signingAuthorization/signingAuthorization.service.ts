import crypto from 'node:crypto';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { SigningAuthorizationRepository } from './signingAuthorization.repository.ts';
import type { LegalEntityRepository } from '../legalEntity/legalEntity.repository.ts';
import type { ISigningAuthorization } from './signingAuthorization.model.ts';
import type {
  CreateSigningAuthorizationRequest,
  SigningAuthorizationQuery,
  UpdateSigningAuthorizationRequest,
} from './schemas/signingAuthorization.request.schema.ts';
import type { SigningAuthorizationResponse } from './schemas/signingAuthorization.response.schema.ts';
import type { PaginateResult } from '../../utils/pagination.util.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';
import { Types } from 'mongoose';

export class SigningAuthorizationService {
  constructor(
    private readonly signingAuthRepository: SigningAuthorizationRepository,
    private readonly legalEntityRepository: LegalEntityRepository,
    private readonly auditLogService?: AuditLogService
  ) {}

  @Transactional()
  async createSigningAuthorization(
    data: CreateSigningAuthorizationRequest
  ): Promise<SigningAuthorizationResponse> {
    const legalEntity = await this.legalEntityRepository.findById(
      data.legalEntityId
    );
    if (!legalEntity || legalEntity.status !== 'active') {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_429);
    }

    const fileHash = crypto
      .createHash('sha256')
      .update(data.documentUrl)
      .digest('hex');

    const created = await this.signingAuthRepository.create({
      legalEntityId: new Types.ObjectId(data.legalEntityId),
      authorizedUserId: new Types.ObjectId(data.authorizedUserId),
      facilityIds: data.facilityIds.map((id) => new Types.ObjectId(id)),
      authorizationNumber: data.authorizationNumber.trim(),
      issuedDate: data.issuedDate,
      validFrom: data.validFrom,
      validTo: data.validTo,
      documentUrl: data.documentUrl,
      fileHash,
      status: 'active',
      notes: data.notes ?? null,
    });

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE,
      resourceType: AuditResourceEnum.SIGNING_AUTHORIZATION,
      resourceId: String(created._id),
      after: created,
    });

    const populated = await this.signingAuthRepository.findById(
      String(created._id)
    );
    return this.formatSigningAuthorization(populated ?? created);
  }

  async findSigningAuthorizationById(
    id: string
  ): Promise<SigningAuthorizationResponse> {
    const auth = await this.signingAuthRepository.findById(id);
    if (!auth) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Signing Authorization',
      ]);
    }
    return this.formatSigningAuthorization(auth);
  }

  async findValidAuthorization(
    userId: string,
    facilityId: string,
    date: Date = new Date()
  ): Promise<ISigningAuthorization | null> {
    return this.signingAuthRepository.findValidAuthorization(
      userId,
      facilityId,
      date
    );
  }

  async findAllSigningAuthorizations(
    query?: SigningAuthorizationQuery
  ): Promise<PaginateResult<SigningAuthorizationResponse>> {
    const result = await this.signingAuthRepository.findAll(query);
    return {
      ...result,
      items: result.items.map((item) => this.formatSigningAuthorization(item)),
    };
  }

  @Transactional()
  async updateSigningAuthorization(
    id: string,
    data: UpdateSigningAuthorizationRequest
  ): Promise<SigningAuthorizationResponse> {
    const existing = await this.signingAuthRepository.findById(id);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Signing Authorization',
      ]);
    }

    let fileHash: string | undefined = undefined;
    if (data.documentUrl) {
      fileHash = crypto
        .createHash('sha256')
        .update(data.documentUrl)
        .digest('hex');
    }

    const updated = await this.signingAuthRepository.update(id, {
      ...data,
      fileHash,
      notes: data.notes ?? undefined,
    });

    if (!updated) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Signing Authorization',
      ]);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.SIGNING_AUTHORIZATION,
      resourceId: id,
      before: existing,
      after: updated,
    });

    return this.formatSigningAuthorization(updated);
  }

  @Transactional()
  async revokeSigningAuthorization(
    id: string
  ): Promise<SigningAuthorizationResponse> {
    const existing = await this.signingAuthRepository.findById(id);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Signing Authorization',
      ]);
    }

    const revoked = await this.signingAuthRepository.revoke(id);
    if (!revoked) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, [
        'Signing Authorization',
      ]);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.REVOKE_AUTHORIZATION,
      resourceType: AuditResourceEnum.SIGNING_AUTHORIZATION,
      resourceId: id,
      before: existing,
      after: revoked,
    });

    return this.formatSigningAuthorization(revoked);
  }

  formatSigningAuthorization(
    doc: ISigningAuthorization
  ): SigningAuthorizationResponse {
    return {
      id: String(doc._id),
      legalEntityId: doc.legalEntityId,
      authorizedUserId: doc.authorizedUserId,
      facilityIds: doc.facilityIds,
      authorizationNumber: doc.authorizationNumber,
      issuedDate: doc.issuedDate?.toISOString?.() ?? new Date().toISOString(),
      validFrom: doc.validFrom?.toISOString?.() ?? new Date().toISOString(),
      validTo: doc.validTo?.toISOString?.() ?? new Date().toISOString(),
      documentUrl: doc.documentUrl,
      fileHash: doc.fileHash ?? null,
      status: doc.status,
      notes: doc.notes ?? null,
      createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}
