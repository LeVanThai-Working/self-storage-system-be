import { describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { SupportTicket } from '../src/modules/support/supportTicket.model.ts';
import { SupportTicketRepository } from '../src/modules/support/supportTicket.repository.ts';
import { SupportTicketService } from '../src/modules/support/supportTicket.service.ts';
import { RoleEnum } from '../src/common/enums/user.enum.ts';
import {
  SupportTicketCategoryEnum,
  SupportTicketStatusEnum,
} from '../src/common/enums/supportTicket.enum.ts';
import {
  createSupportTicketSchema,
  supportTicketQuerySchema,
} from '../src/modules/support/schemas/supportTicket.request.schema.ts';

const facilityId = new Types.ObjectId().toString();
const caller = {
  id: new Types.ObjectId().toString(),
  role: RoleEnum.FACILITY_MANAGER,
  assignedFacilityId: facilityId,
};

function fixture(category?: SupportTicketCategoryEnum) {
  const ticket = new SupportTicket({
    ticketCode: 'TCK-202611-0003',
    customerId: new Types.ObjectId(),
    facilityId,
    category,
    title: 'Request assistance at the facility gate',
    description: 'Please help coordinate vehicle access.',
    status: SupportTicketStatusEnum.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const repository = new SupportTicketRepository();
  vi.spyOn(repository, 'findById').mockResolvedValue(ticket);
  vi.spyOn(repository, 'findPaginated').mockResolvedValue({
    items: [ticket],
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  });
  return { ticket, repository, service: new SupportTicketService(repository) };
}

describe('Facility manager support queue with legacy tickets', () => {
  it.each([undefined, SupportTicketStatusEnum.PENDING])(
    'loads the queue with status %s when a ticket has no category',
    async (status) => {
      const { service, repository } = fixture();
      const result = await service.findTickets(
        supportTicketQuerySchema.parse({ status }),
        caller
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe(
        SupportTicketCategoryEnum.GENERAL_INQUIRY
      );
      expect(result.pagination.totalItems).toBe(1);
      expect(repository.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId, status })
      );
    }
  );

  it('opens the detail of a ticket with no category', async () => {
    const { service, ticket } = fixture();
    const result = await service.getTicketById(String(ticket._id), caller);
    expect(result.id).toBe(String(ticket._id));
    expect(result.category).toBe(SupportTicketCategoryEnum.GENERAL_INQUIRY);
  });

  it('preserves a valid category', async () => {
    const { service, ticket } = fixture(
      SupportTicketCategoryEnum.INVENTORY_MOVE_REQUEST
    );
    const result = await service.getTicketById(String(ticket._id), caller);
    expect(result.category).toBe(
      SupportTicketCategoryEnum.INVENTORY_MOVE_REQUEST
    );
  });

  it('still rejects new tickets without a category', () => {
    expect(
      createSupportTicketSchema.safeParse({
        title: 'Gate assistance',
        description: 'Please coordinate vehicle access.',
      }).success
    ).toBe(false);
  });
});
