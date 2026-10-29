import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IContractTemplate } from './contractTemplate.model.ts';

export class ContractTemplateRepository {
  constructor(
    private readonly contractTemplate: SoftDeleteModel<IContractTemplate>
  ) {}

  async create(
    data: Partial<IContractTemplate>,
    session?: ClientSession
  ): Promise<IContractTemplate> {
    const docs = await this.contractTemplate.create([data], { session });
    return docs[0];
  }

  async findById(
    id: string,
    session?: ClientSession
  ): Promise<IContractTemplate | null> {
    return this.contractTemplate.findById(id).session(session ?? null);
  }

  async findByCode(
    templateCode: string,
    version?: string,
    session?: ClientSession
  ): Promise<IContractTemplate | null> {
    const filter: FilterQuery<IContractTemplate> = {
      templateCode: templateCode.trim().toUpperCase(),
    };
    if (version) filter.version = version;
    return this.contractTemplate.findOne(filter).session(session ?? null);
  }

  async getActiveTemplate(
    templateCode = 'STORAGE_RENTAL_V1',
    session?: ClientSession
  ): Promise<IContractTemplate | null> {
    return this.contractTemplate
      .findOne({
        templateCode: templateCode.trim().toUpperCase(),
        isActive: true,
      })
      .session(session ?? null);
  }

  async findAll(session?: ClientSession): Promise<IContractTemplate[]> {
    return this.contractTemplate.find().session(session ?? null);
  }

  async update(
    id: string,
    data: Partial<IContractTemplate>,
    session?: ClientSession
  ): Promise<IContractTemplate | null> {
    return this.contractTemplate.findByIdAndUpdate(id, data, {
      new: true,
      session: session ?? null,
    });
  }
}
