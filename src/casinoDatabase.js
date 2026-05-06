const { getDB } = require('./database');

 async function getCasinoInfo(casinoName) {
  const db = await getDB();
  const casino = await db.collection('casinos').findOne({ name: casinoName });
  if (!casino) return null;

  // OPTIMIZED: Use aggregation for rank calculation instead of fetching all
  const rank = await db.collection('casinos').countDocuments({
    bankBalance: { $gt: casino.bankBalance }
  }) + 1;
  
  const totalCasinos = await db.collection('casinos').countDocuments();

  return {
    ...casino,
    rank,
    totalCasinos,
  };
}

async function createCasino(ownerId, casinoName) {
  const db = await getDB();
  console.log(`[createCasino] Checking for existing casino with name: ${casinoName}`);
  const existingCasino = await db.collection('casinos').findOne({ name: { $regex: new RegExp(`^${casinoName}$`, 'i') } });
  if (existingCasino) {
    console.log(`[createCasino] Found existing casino: ${JSON.stringify(existingCasino)}`);
    throw new Error('Casino already exists!');
  }

  try {
    console.log(`[createCasino] Attempting to insert casino: ${casinoName}, ownerId: ${ownerId}`);
    const result = await db.collection('casinos').insertOne({
      name: casinoName,
      ownerId,
      members: [],
      coOwners: [],
      bankBalance: 0,
    });
    console.log(`[createCasino] Insert result: ${JSON.stringify(result)}`);
    if (!result.insertedId) {
      throw new Error('Insertion failed, no insertedId returned');
    }
    const casino = await db.collection('casinos').findOne({ _id: result.insertedId });
    console.log(`[createCasino] Inserted casino: ${JSON.stringify(casino)}`);
    if (!casino) {
      throw new Error('Inserted casino not found after insertion');
    }
    return casino;
  } catch (error) {
    console.error(`[createCasino] Insert error: ${error.message}, Stack: ${error.stack}`);
    if (error.code === 11000 || error.message.includes('duplicate key')) {
      console.log(`[createCasino] Detected duplicate key error, throwing 'Casino already exists!'`);
      throw new Error('Casino already exists!');
    }
    throw error;
  }
}

async function addMemberToCasino(casinoName, memberId) {
  const db = await getDB();
  await db.collection('casinos').updateOne(
    { name: casinoName },
    { $addToSet: { members: memberId } }
  );
}

async function removeMemberFromCasino(casinoName, memberId) {
  const db = await getDB();
  await db.collection('casinos').updateOne(
    { name: casinoName },
    { $pull: { members: memberId, coOwners: memberId } }
  );
}

async function deleteCasino(casinoName) {
  const db = await getDB();
  await db.collection('casinos').deleteOne({ name: casinoName });
}

async function promoteToCoOwner(casinoName, memberId) {
  const db = await getDB();
  await db.collection('casinos').updateOne(
    { name: casinoName },
    { $addToSet: { coOwners: memberId }, $pull: { members: memberId } }
  );
}

async function getUserCasino(userId) {
  const db = await getDB();
  
  // OPTIMIZED: Query only casinos where user is involved
  const casino = await db.collection('casinos').findOne({
    $or: [
      { ownerId: userId },
      { members: userId },
      { coOwners: userId }
    ]
  });
  
  return casino ? casino.name : null;
}

async function updateCasinoBankBalance(casinoName, amount) {
  const db = await getDB();
  const casino = await db.collection('casinos').findOne({ name: casinoName });
  if (!casino) {
    throw new Error('Casino not found');
  }
  await db.collection('casinos').updateOne(
    { name: casinoName },
    { $inc: { bankBalance: amount } }
  );
}

async function getCasinoBankBalance(casinoName) {
  const db = await getDB();
  const casino = await db.collection('casinos').findOne({ name: casinoName });
  if (!casino) {
    throw new Error('Casino not found');
  }
  return casino.bankBalance || 0; // Return 0 if bankBalance is undefined
}

module.exports = {
  getCasinoInfo,
  createCasino,
  addMemberToCasino,
  removeMemberFromCasino,
  deleteCasino,
  promoteToCoOwner,
  getUserCasino,
  updateCasinoBankBalance,
  getCasinoBankBalance, // Export the new function
};