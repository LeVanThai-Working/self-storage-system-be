/**
 * Inspect legacy racks left in maintenance after a completed repair.
 * Default is read-only. Run on the server with its existing MONGODB_URI:
 *   npx tsx scripts/repair-closed-incident-racks.ts --contract-id=<id>
 *   npx tsx scripts/repair-closed-incident-racks.ts --contract-id=<id> --apply
 * Contract codes can also be used: --contract-code=SEED-M5-Q2-08
 */
import 'dotenv/config';
import mongoose, { Types, type ClientSession } from 'mongoose';
import { Contract } from '../src/modules/contract/contract.model.ts';
import { StorageRack } from '../src/modules/storageRack/storageRack.model.ts';
import { Incident } from '../src/modules/incident/incident.model.ts';
import { AuditLog } from '../src/modules/auditLog/auditLog.model.ts';
import { ContractStatusEnum } from '../src/common/enums/contract.enum.ts';
import { IncidentStatusEnum } from '../src/common/enums/incident.enum.ts';
import { RackStatusEnum } from '../src/common/enums/storageRack.enum.ts';
import {
  AuditActionEnum,
  AuditResourceEnum,
} from '../src/common/enums/auditLog.enum.ts';

export interface RackRepairResult {
  rackId: string;
  rackCode: string;
  outcome: 'eligible' | 'repaired' | 'skipped';
  reason: string;
}

/** Never changes tiers, goods, incident history or racks belonging to a different contract. */
export async function repairClosedIncidentRacks(
  contractId: string,
  apply = false
): Promise<RackRepairResult[]> {
  if (!Types.ObjectId.isValid(contractId))
    throw new Error('A valid --contract-id is required');

  const scan = async (session?: ClientSession): Promise<RackRepairResult[]> => {
    const contract = await Contract.findById(contractId).session(
      session ?? null
    );
    if (
      !contract ||
      ![ContractStatusEnum.ACTIVE, ContractStatusEnum.OVERDUE].includes(
        contract.status
      )
    ) {
      throw new Error('Contract must exist and be ACTIVE or OVERDUE');
    }
    const racks = await StorageRack.find({
      _id: { $in: contract.rentedRackIds || [] },
      currentContractId: contract._id,
      status: RackStatusEnum.MAINTENANCE,
      deleted: { $ne: true },
    }).session(session ?? null);
    const results: RackRepairResult[] = [];
    for (const rack of racks) {
      const cases = await Incident.find({
        storageRackId: rack._id,
        deleted: { $ne: true },
      })
        .sort({ closedAt: -1 })
        .session(session ?? null);
      let reason = '';
      const proof = cases.find(
        (incident) => incident.status === IncidentStatusEnum.CLOSED
      );
      if (
        cases.some(
          (incident) =>
            ![IncidentStatusEnum.CLOSED, IncidentStatusEnum.CANCELLED].includes(
              incident.status
            )
        )
      ) {
        reason = 'Rack still has an open incident';
      } else if (
        !proof ||
        proof.requiresRelocation ||
        !proof.preEvacuationManifest ||
        !proof.restorationManifestDocUrl ||
        !proof.customerAcknowledgedAt ||
        !proof.closedAt ||
        String(proof.contractId) !== contractId ||
        String(proof.storageUnitId) !== String(rack.storageUnitId) ||
        String(proof.facilityId) !== String(rack.facilityId) ||
        String(rack.currentCustomerId) !== String(contract.customerId)
      ) {
        reason =
          'Missing matching closed repair, document, acknowledgment or current ownership';
      } else if (
        !rack.updatedAt ||
        new Date(rack.updatedAt) > new Date(proof.closedAt)
      ) {
        reason =
          'Rack was changed after closure; inspect its maintenance manually';
      }
      if (reason) {
        results.push({
          rackId: String(rack._id),
          rackCode: rack.rackCode,
          outcome: 'skipped',
          reason,
        });
        continue;
      }
      if (apply) {
        const updated = await StorageRack.findOneAndUpdate(
          {
            _id: rack._id,
            status: RackStatusEnum.MAINTENANCE,
            currentContractId: contract._id,
            updatedAt: rack.updatedAt,
          },
          { $set: { status: RackStatusEnum.RENTED } },
          { session, returnDocument: 'after' }
        );
        if (!updated)
          throw new Error(
            'Rack changed during repair; rerun the read-only inspection'
          );
        await AuditLog.create(
          [
            {
              action: AuditActionEnum.UPDATE,
              resourceType: AuditResourceEnum.STORAGE_RACK,
              resourceId: String(rack._id),
              changes: {
                before: { status: RackStatusEnum.MAINTENANCE },
                after: { status: RackStatusEnum.RENTED },
              },
              metadata: {
                source: 'repair-closed-incident-racks',
                contractId,
                incidentId: String(proof!._id),
              },
            },
          ],
          { session }
        );
      }
      results.push({
        rackId: String(rack._id),
        rackCode: rack.rackCode,
        outcome: apply ? 'repaired' : 'eligible',
        reason: 'Closed acknowledged repair; current rental still matches',
      });
    }
    return results;
  };

  if (!apply) return scan();
  // Explicitly require real transaction support; never fall back to non-transactional writes.
  return mongoose.connection.transaction((session) => scan(session));
}

if (
  process.argv[1]
    ?.replaceAll('\\', '/')
    .endsWith('/repair-closed-incident-racks.ts')
) {
  let contractId =
    process.argv
      .find((arg) => arg.startsWith('--contract-id='))
      ?.slice('--contract-id='.length) ?? '';
  const contractCode = process.argv
    .find((arg) => arg.startsWith('--contract-code='))
    ?.slice('--contract-code='.length);
  const apply = process.argv.includes('--apply');
  try {
    if (
      (!contractId && !contractCode) ||
      (contractId && contractCode) ||
      (contractId && !Types.ObjectId.isValid(contractId))
    ) {
      throw new Error(
        'Specify either --contract-id=<id> or --contract-code=<code>'
      );
    }
    const uri = process.env.MONGODB_URI;
    if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri))
      throw new Error('Set MONGODB_URI to the intended server database');
    await mongoose.connect(uri);
    if (contractCode) {
      const contract = await Contract.findOne({ contractCode });
      if (!contract) throw new Error('Contract code was not found');
      contractId = String(contract._id);
    }
    console.log(
      JSON.stringify(
        {
          apply,
          contractId,
          racks: await repairClosedIncidentRacks(contractId, apply),
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      error instanceof Error && !/mongodb/i.test(error.message)
        ? error.message
        : 'Database operation failed; check the server configuration'
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
