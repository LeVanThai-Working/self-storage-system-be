import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../../common/enums/auditLog.enum.ts';
import type { AuditLogService } from '../auditLog/auditLog.service.ts';
import type { LegalEntityRepository } from './legalEntity.repository.ts';
import type { ILegalEntity } from './legalEntity.model.ts';
import type {
  CreateLegalEntityRequest,
  LegalEntityQuery,
  UpdateLegalEntityRequest,
} from './schemas/legalEntity.request.schema.ts';
import type { LegalEntityResponse } from './schemas/legalEntity.response.schema.ts';
import type { PaginateResult } from '../../utils/pagination.util.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';

export class LegalEntityService {
  constructor(
    private readonly legalEntityRepository: LegalEntityRepository,
    private readonly auditLogService?: AuditLogService
  ) {}

  @Transactional()
  async createLegalEntity(
    data: CreateLegalEntityRequest
  ): Promise<LegalEntityResponse> {
    const existing = await this.legalEntityRepository.findByTaxCode(
      data.taxCode
    );
    if (existing) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, ['Tax Code']);
    }

    const created = await this.legalEntityRepository.create({
      ...data,
      phone: data.phone ?? null,
      email: data.email ?? null,
      legalRepresentative: {
        ...data.legalRepresentative,
        idNumber: data.legalRepresentative.idNumber ?? undefined,
      },
    });

    this.auditLogService?.record({
      action: AuditActionEnum.CREATE,
      resourceType: AuditResourceEnum.LEGAL_ENTITY,
      resourceId: String(created._id),
      after: created,
    });

    return this.formatLegalEntity(created);
  }

  async findLegalEntityById(id: string): Promise<LegalEntityResponse> {
    const entity = await this.legalEntityRepository.findById(id);
    if (!entity) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_429);
    }
    return this.formatLegalEntity(entity);
  }

  async findAllLegalEntities(
    query?: LegalEntityQuery
  ): Promise<PaginateResult<LegalEntityResponse>> {
    const result = await this.legalEntityRepository.findAll(query);
    return {
      ...result,
      items: result.items.map((item) => this.formatLegalEntity(item)),
    };
  }

  @Transactional()
  async updateLegalEntity(
    id: string,
    data: UpdateLegalEntityRequest
  ): Promise<LegalEntityResponse> {
    const existing = await this.legalEntityRepository.findById(id);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_429);
    }

    if (data.taxCode && data.taxCode !== existing.taxCode) {
      const duplicate = await this.legalEntityRepository.findByTaxCode(
        data.taxCode
      );
      if (duplicate && String(duplicate._id) !== id) {
        throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, ['Tax Code']);
      }
    }

    const updated = await this.legalEntityRepository.update(id, {
      ...data,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
      legalRepresentative: data.legalRepresentative
        ? {
            ...existing.legalRepresentative,
            ...data.legalRepresentative,
          }
        : undefined,
      bankAccount: data.bankAccount
        ? {
            ...existing.bankAccount,
            ...data.bankAccount,
          }
        : undefined,
    });

    if (!updated) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_429);
    }

    this.auditLogService?.record({
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceEnum.LEGAL_ENTITY,
      resourceId: id,
      before: existing,
      after: updated,
    });

    return this.formatLegalEntity(updated);
  }

  @Transactional()
  async deleteLegalEntity(
    id: string,
    deletedBy?: string
  ): Promise<LegalEntityResponse> {
    const existing = await this.legalEntityRepository.findById(id);
    if (!existing) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_429);
    }

    await this.legalEntityRepository.delete(id, deletedBy);

    this.auditLogService?.record({
      action: AuditActionEnum.DELETE,
      resourceType: AuditResourceEnum.LEGAL_ENTITY,
      resourceId: id,
      before: existing,
    });

    return this.formatLegalEntity(existing);
  }

  formatLegalEntity(doc: ILegalEntity): LegalEntityResponse {
    return {
      id: String(doc._id),
      companyName: doc.companyName,
      taxCode: doc.taxCode,
      registeredAddress: doc.registeredAddress,
      legalRepresentative: {
        name: doc.legalRepresentative.name,
        title: doc.legalRepresentative.title,
        idNumber: doc.legalRepresentative.idNumber ?? null,
      },
      bankAccount: {
        bankName: doc.bankAccount.bankName,
        accountNumber: doc.bankAccount.accountNumber,
        accountHolder: doc.bankAccount.accountHolder,
      },
      phone: doc.phone ?? null,
      email: doc.email ?? null,
      status: doc.status,
      createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}
