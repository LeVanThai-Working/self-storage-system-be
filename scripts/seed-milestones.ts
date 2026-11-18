import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import {
  captureDatabase,
  readEncryptedBackup,
  restoreAndVerifyBackup,
  summarizeBackup,
  writeEncryptedBackup,
} from './seed/backup.ts';
import { SEED_MILESTONES, SEED_REFERENCE_DATE } from './seed/manifest.ts';
import {
  applyAccountFacility,
  buildAccountFacility,
  completeAccountFacility,
  ensureAccountFacilityIndexes,
  parseAccountFacilityArgs,
  readAccountFacilityCheckpoint,
  verifyAccountFacility,
} from './seed/account-facility.ts';
import { assertLocalApiStopped, beginSeedMaintenance } from './seed/runtime.ts';
import { runCatalog } from './seed/catalog.ts';
import { runStorageLayout } from './seed/storage-layout.ts';
import { runContractsFinance } from './seed/contracts-finance.ts';

type PreparationArgs =
  { mode: 'inspect' } | { mode: 'backup' } | { mode: 'verify'; stem: string };

export function parsePreparationArgs(args: string[]): PreparationArgs {
  let mode: PreparationArgs = { mode: 'inspect' };
  let selected = false;
  let milestoneSelected = false;
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (argument === '--milestone' && !milestoneSelected && args[++i] === '1') {
      milestoneSelected = true;
      continue;
    }
    if (
      !selected &&
      ['--dry-run', '--backup', '--verify-backup'].includes(argument)
    ) {
      selected = true;
      if (argument === '--backup') mode = { mode: 'backup' };
      if (argument === '--verify-backup') {
        const stem = args[++i];
        if (!stem || stem.startsWith('--'))
          throw new Error('Backup stem is required');
        mode = { mode: 'verify', stem };
      }
      continue;
    }
    throw new Error(
      'Only milestone 1 preparation is supported; reset/apply/seed is disabled'
    );
  }
  return mode;
}

export async function runPreparation(args: string[]) {
  const options = parsePreparationArgs(args);
  if (options.mode === 'verify') {
    // This branch never reads MONGODB_URI or connects to the configured database.
    const snapshot = await readEncryptedBackup(path.resolve(options.stem));
    const verified = await restoreAndVerifyBackup(snapshot);
    await writeFile(
      `${path.resolve(options.stem)}.verified.json`,
      JSON.stringify(verified, null, 2),
      { mode: 0o600 }
    );
    console.log(JSON.stringify(verified, null, 2));
    return;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  const client = new mongoose.mongo.MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  let snapshot;
  try {
    await client.connect();
    snapshot = await captureDatabase(client, client.db().databaseName);
  } finally {
    await client.close();
  }
  console.log(
    JSON.stringify(
      {
        milestone: 1,
        mode: options.mode,
        sourceDatabaseMutated: false,
        referenceDate: SEED_REFERENCE_DATE,
        inventory: summarizeBackup(snapshot),
        checkpoints: SEED_MILESTONES,
      },
      null,
      2
    )
  );
  if (options.mode === 'inspect') return;
  const files = await writeEncryptedBackup(
    snapshot,
    path.resolve('.agents/memory/backups')
  );
  console.log(
    JSON.stringify({ backupPath: files.backupPath, keyPath: files.keyPath })
  );
  // Verify what was persisted, not the in-memory snapshot.
  const verified = await restoreAndVerifyBackup(
    await readEncryptedBackup(files.stem)
  );
  await writeFile(
    `${files.stem}.verified.json`,
    JSON.stringify(
      {
        milestone: 1,
        sourceDatabaseMutated: false,
        nextMilestone: 2,
        nextMilestoneRequiresUserApproval: true,
        ...verified,
      },
      null,
      2
    ),
    { flag: 'wx', mode: 0o600 }
  );
  console.log(
    JSON.stringify(
      { verified, next: 'STOP: wait for user review before milestone 2' },
      null,
      2
    )
  );
}

export async function runAccountFacility(args: string[]) {
  const options = parseAccountFacilityArgs(args);
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI_REQUIRED');
  const client = new mongoose.mongo.MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  let maintenance: Awaited<ReturnType<typeof beginSeedMaintenance>> | undefined;
  try {
    await client.connect();
    const db = client.db();
    if (options.apply && db.databaseName !== options.database)
      throw new Error('DATABASE_NAME_MISMATCH');
    const checkpoint = await readAccountFacilityCheckpoint(db);
    if (!options.apply) {
      console.log(
        JSON.stringify(
          {
            milestone: 2,
            dryRun: true,
            database: db.databaseName,
            checkpointStatus: checkpoint?.status ?? 'not-started',
            expected: SEED_MILESTONES[1].expected,
            next: 'No database or Redis mutations performed',
          },
          null,
          2
        )
      );
      return;
    }
    if (checkpoint?.status === 'complete') {
      await ensureAccountFacilityIndexes(db);
      console.log(
        JSON.stringify(
          {
            milestone: 2,
            alreadyApplied: true,
            resetPerformed: false,
            counts: await verifyAccountFacility(db),
            next: 'STOP: review Account + Facility',
          },
          null,
          2
        )
      );
      return;
    }
    console.log(
      'Milestone 2: checking stopped API/workers and pausing application queues...'
    );
    maintenance = await beginSeedMaintenance();
    let result;
    if (checkpoint) {
      result = {
        oldUserIds: checkpoint.oldUserIds,
        backupStem: checkpoint.backupStem,
        alreadyApplied: true,
      };
    } else {
      const fixtures = await buildAccountFacility();
      console.log(
        'Milestone 2: capturing a fresh backup and verifying restore before reset...'
      );
      const snapshot = await captureDatabase(client, db.databaseName);
      const files = await writeEncryptedBackup(
        snapshot,
        path.resolve('.agents/memory/backups')
      );
      const persisted = await readEncryptedBackup(files.stem);
      const verified = await restoreAndVerifyBackup(persisted);
      await writeFile(
        `${files.stem}.verified.json`,
        JSON.stringify(
          { ...verified, purpose: 'before-milestone-2-reset' },
          null,
          2
        ),
        { flag: 'wx', mode: 0o600 }
      );
      console.log(
        JSON.stringify({
          backupStem: files.stem,
          database: db.databaseName,
          totalCollections: verified.totalCollections,
          totalDocuments: verified.totalDocuments,
          restoreVerified: true,
        })
      );
      await assertLocalApiStopped();
      console.log(
        'Milestone 2: resetting old data and seeding Account + Facility in one transaction...'
      );
      result = await applyAccountFacility(
        client,
        persisted,
        fixtures,
        files.stem
      );
      for (const collection of snapshot.collections) {
        if (
          ![
            'users',
            'profiles',
            'facilities',
            'auditlogs',
            'seedmilestones',
          ].includes(collection.name) &&
          (await db.collection(collection.name).countDocuments())
        )
          throw new Error('OLD_BUSINESS_DATA_REMAINS');
      }
    }
    await ensureAccountFacilityIndexes(db);
    const counts = await verifyAccountFacility(db);
    console.log(
      'Milestone 2: clearing old application jobs and removed-user sessions...'
    );
    const validUserIds = (
      await db
        .collection('users')
        .find({}, { projection: { _id: 1 } })
        .toArray()
    ).map((user) => String(user._id));
    const cleanup = await maintenance.cleanup(result.oldUserIds, validUserIds);
    await completeAccountFacility(client, db.databaseName, cleanup);
    const report = {
      milestone: 2,
      database: db.databaseName,
      completedAt: new Date().toISOString(),
      backupStem: result.backupStem,
      resetPerformed: !result.alreadyApplied,
      counts,
      cleanup,
      next: 'STOP: wait for user review before milestone 3',
    };
    await writeFile(
      `${result.backupStem}.milestone-2.json`,
      JSON.stringify(report, null, 2),
      { mode: 0o600 }
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    try {
      if (maintenance) {
        // A committed seed with unfinished cleanup stays paused. Reruns finish cleanup only.
        let resume = false;
        try {
          const marker = await readAccountFacilityCheckpoint(client.db());
          resume = !marker || marker.status === 'complete';
        } catch {
          /* Keep queues paused if commit state cannot be established. */
        }
        await maintenance.close(resume);
      }
    } finally {
      await client.close();
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  const milestoneIndex = args.indexOf('--milestone');
  const run =
    milestoneIndex >= 0 && args[milestoneIndex + 1] === '5'
      ? runContractsFinance
      : milestoneIndex >= 0 && args[milestoneIndex + 1] === '4'
        ? runStorageLayout
        : milestoneIndex >= 0 && args[milestoneIndex + 1] === '3'
          ? runCatalog
          : milestoneIndex >= 0 && args[milestoneIndex + 1] === '2'
            ? runAccountFacility
            : runPreparation;
  run(args).catch((error: unknown) => {
    // Driver errors may contain connection details or document values: do not print them.
    console.error(
      `Seed command failed${error instanceof Error && /^[A-Z_]+$/.test(error.message) ? `: ${error.message}` : ''}. Check the last reported phase and checkpoint. A committed milestone 2 rerun resumes cleanup without another reset.`
    );
    process.exitCode = 1;
  });
}
