import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const TARGET_INV_IDS = [
  '6ae7262676f1be5b5b1e9756',
  '6ae726784c1b62402b2b88a9',
  '6ae726960278e90ff478a275',
  '6ae727b5bf5529d8207213a5',
  '6ae727e9d17a375e237152e5', // SKU-TASK-6135 on CON-TASK-6063
  '6ae729f7ea24080cef1bb006',
  '6ae72e53de14b6b0bdd7225a',
].map((id) => new mongoose.Types.ObjectId(id));

const TARGET_RACK_TIER_IDS = [
  '6ae7262476f1be5b5b1e9750',
  '6ae726754c1b62402b2b88a3',
  '6ae726940278e90ff478a26f',
  '6ae727b2bf5529d82072139f',
  '6ae727e5d17a375e237152df',
  '6ae729f3ea24080cef1bb000',
  '6ae72e50de14b6b0bdd72254',
].map((id) => new mongoose.Types.ObjectId(id));

const TARGET_RACK_IDS = [
  '6ae7262476f1be5b5b1e974f',
  '6ae726754c1b62402b2b88a2',
  '6ae726940278e90ff478a26e',
  '6ae727b2bf5529d82072139e',
  '6ae727e5d17a375e237152de',
  '6ae729f3ea24080cef1bafff',
  '6ae72e50de14b6b0bdd72253',
].map((id) => new mongoose.Types.ObjectId(id));

const TARGET_CONTRACT_CODES = [
  'CON-TASK-6194',
  'CON-TASK-7595',
  'CON-TASK-8248',
  'CON-TASK-4720',
  'CON-TASK-6063',
  'CON-TASK-1995',
  'CON-TASK-8264',
];

const TARGET_SKU_IDS = [
  '6ae7262476f1be5b5b1e9753', // SKU-TASK-6255
  '6ae726754c1b62402b2b88a6', // SKU-TASK-7655
  '6ae726940278e90ff478a272', // SKU-TASK-8314
  '6ae727b2bf5529d8207213a2', // SKU-TASK-4780
  '6ae727e6d17a375e237152e2', // SKU-TASK-6135
  '6ae729f4ea24080cef1bb003', // SKU-TASK-2075
  '6ae72e50de14b6b0bdd72257', // SKU-TASK-8333
].map((id) => new mongoose.Types.ObjectId(id));

async function runClean() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db!;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();
    const customerId = new mongoose.Types.ObjectId('661100000000000000000008');

    // 1. Soft delete customerinventories & set quantity = 0
    const invResult = await db.collection('customerinventories').updateMany(
      { _id: { $in: TARGET_INV_IDS } },
      {
        $set: {
          quantity: 0,
          pendingOutboundQuantity: 0,
          deleted: true,
          deletedAt: now,
          deletedBy: customerId,
          updatedAt: now,
        },
      },
      { session }
    );
    console.log(
      `Updated customerinventories: ${invResult.modifiedCount} documents`
    );

    // 2. Set RackTiers status to 'available'
    const tierResult = await db.collection('racktiers').updateMany(
      { _id: { $in: TARGET_RACK_TIER_IDS } },
      {
        $set: {
          status: 'available',
          updatedAt: now,
        },
      },
      { session }
    );
    console.log(`Updated racktiers: ${tierResult.modifiedCount} documents`);

    // 3. Set StorageRacks status to 'available' & clear currentContractId
    const rackResult = await db.collection('storageracks').updateMany(
      { _id: { $in: TARGET_RACK_IDS } },
      {
        $set: {
          status: 'available',
          currentContractId: null,
          currentCustomerId: null,
          updatedAt: now,
        },
      },
      { session }
    );
    console.log(`Updated storageracks: ${rackResult.modifiedCount} documents`);

    // 4. Update contracts rentedRackIds to empty array []
    const contractResult = await db.collection('contracts').updateMany(
      { contractCode: { $in: TARGET_CONTRACT_CODES } },
      {
        $set: {
          rentedRackIds: [],
          updatedAt: now,
        },
      },
      { session }
    );
    console.log(`Updated contracts: ${contractResult.modifiedCount} documents`);

    await session.commitTransaction();
    console.log('--- Transaction committed successfully ---');
  } catch (error) {
    await session.abortTransaction();
    console.error('Transaction aborted due to error:', error);
    throw error;
  } finally {
    await session.endSession();
  }

  // Verification step
  console.log('\n--- VERIFICATION ---');

  // Check inventories
  const activeInventories = await db
    .collection('customerinventories')
    .find({
      _id: { $in: TARGET_INV_IDS },
      deleted: { $ne: true },
    })
    .toArray();
  console.log(
    `Active target inventories remaining (should be 0): ${activeInventories.length}`
  );

  // Check SKU active stock
  for (const skuId of TARGET_SKU_IDS) {
    const totalResult = await db
      .collection('customerinventories')
      .aggregate([
        { $match: { skuId, deleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ])
      .toArray();
    const total = totalResult[0]?.total || 0;

    const skuDoc = await db.collection('customerskus').findOne({ _id: skuId });
    console.log(`SKU ${skuDoc?.skuCode} active stock: ${total}`);
  }

  // Check tiers
  const tiers = await db
    .collection('racktiers')
    .find({
      _id: { $in: TARGET_RACK_TIER_IDS },
    })
    .toArray();
  console.log(
    'Rack Tiers status:',
    tiers.map((t) => ({
      id: t._id,
      tierNumber: t.tierNumber,
      status: t.status,
    }))
  );

  // Check racks
  const racks = await db
    .collection('storageracks')
    .find({
      _id: { $in: TARGET_RACK_IDS },
    })
    .toArray();
  console.log(
    'Storage Racks status:',
    racks.map((r) => ({ id: r._id, rackCode: r.rackCode, status: r.status }))
  );

  // Check contracts
  const contracts = await db
    .collection('contracts')
    .find({
      contractCode: { $in: TARGET_CONTRACT_CODES },
    })
    .toArray();
  console.log(
    'Contracts rentedRackIds:',
    contracts.map((c) => ({
      code: c.contractCode,
      rentedRackIds: c.rentedRackIds,
    }))
  );

  await mongoose.disconnect();
}

runClean().catch((err) => {
  console.error(err);
  process.exit(1);
});
