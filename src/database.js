// /home/container/src/database.js
const { MongoClient } = require('mongodb');
const dns = require('dns').promises;
const logger = require('./logger');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  logger.error('MONGODB_URI environment variable not set. Please check your .env file.');
  process.exit(1);
}
let client; // created on connect

let db;

async function connectDB(maxRetries = 5, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt === 1) {
        logger.loading('Connecting to MongoDB database...');
      }
      // create client if not already
      if (!client) {
        client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 20 });
      }
      try {
        await client.connect();
      } catch (connectErr) {
        // If SRV lookup failed (common in restricted DNS environments), attempt to build a non-SRV connection
        const errMsg = (connectErr && connectErr.message) ? connectErr.message : String(connectErr);
        if (errMsg.includes('querySrv') || errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED')) {
          try {
            // Try to parse mongodb+srv://USER:PASS@domain
            const srvMatch = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)/);
            if (srvMatch) {
              const username = srvMatch[1];
              const password = encodeURIComponent(srvMatch[2]);
              const domain = srvMatch[3];
              // resolve SRV records for the domain
              const records = await dns.resolveSrv(`_mongodb._tcp.${domain}`);
              const hosts = records.map(r => `${r.name}:${r.port}`).join(',');
              const dbName = 'luxbot';
              const replicaSet = domain.split('.')[0] + '-shard-0';
              const newUri = `mongodb://${username}:${password}@${hosts}/${dbName}?ssl=true&replicaSet=${replicaSet}&authSource=admin&retryWrites=true&w=majority`;
              client = new MongoClient(newUri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 20 });
              await client.connect();
            } else {
              throw connectErr;
            }
          } catch (fallbackErr) {
            throw connectErr;
          }
        } else {
          throw connectErr;
        }
      }

      db = client.db('luxbot');
      logger.success('MongoDB connected successfully');
      
      // SAFE INDEX CREATION - No conflicts
      try {
        await db.collection('users').createIndex({ userId: 1 }, { unique: true, sparse: true });
      } catch (indexError) {
        // silently continue if index already exists
      }
      
      try {
        await db.collection('quests').createIndex({ userId: 1, resetTime: 1 }, { unique: true });
        await db.collection('quests').createIndex({ resetTime: 1 });
        await db.collection('quests').createIndex({ userId: 1, questType: 1, completed: 1 });
      } catch (questIndexError) {
        // silently continue if indexes already exist
      }
      
      return db;
    } catch (err) {
      if (attempt === maxRetries) {
        logger.error(`Failed to connect to MongoDB: ${err.message}`);
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
}

async function getDB() {
  if (!db || typeof db.collection !== 'function') {
    console.log('DB is invalid or not connected, attempting reconnect...');
    await connectDB();
    if (!db || typeof db.collection !== 'function') {
      console.error('DB remains invalid after reconnect attempt:', db);
      throw new Error('Database connection is invalid');
    }
  }
  return db;
}

module.exports = {
  getDB,

  getUser: async (userId, projection = {}, maxRetries = 3) => {
    const dbInstance = await getDB();
    let user;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        user = await dbInstance.collection('users').findOne({ userId }, { projection });
        if (user) break;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    if (!user) {
      return null;
    }

    user.xp = user.xp ?? 0;
    user.level = user.level ?? 0;
    user.lastDailyXPReset = user.lastDailyXPReset ?? 0;
    user.dailyXP = user.dailyXP ?? 0;
    user.manaPoints = user.manaPoints ?? 0;
    user.manaCrystals = user.manaCrystals ?? 0;
    user.lastGambleTime = user.lastGambleTime ?? Date.now();
    user.banned = user.banned ?? false;
    user.banReason = user.banReason ?? null;
    user.collectibles = user.collectibles || {};
    user.buffs = user.buffs || {};
    user.balance = user.balance ?? 0;
    user.lastDaily = user.lastDaily ?? 0;

    if (!Array.isArray(user.items) || user.items.length !== 50) {
      user.items = Array(50).fill(null);
      await dbInstance.collection('users').updateOne({ userId }, { $set: { items: user.items } });
    }

    user.profile = user.profile || { wins: 0, losses: 0 };
    if (typeof user.profile.wins !== 'number') user.profile.wins = 0;
    if (typeof user.profile.losses !== 'number') user.profile.losses = 0;

    user.dailyData = user.dailyData || { lastClaim: user.lastDaily || 0, streak: 0, lastResetTime: 0 };

    if (user.registered === undefined && (user.balance > 0 || user.xp > 0 || user.items.some(item => item !== null))) {
      user.registered = true;
      user.tosAccepted = true;
      await dbInstance.collection('users').updateOne({ userId }, { $set: { registered: true, tosAccepted: true, items: user.items, profile: user.profile, dailyData: user.dailyData } });
    }

    return user;
  },

  initializeUser: async (userId, maxRetries = 3) => {
    const dbInstance = await getDB();
    const newUser = {
      userId,
      registered: true,
      tosAccepted: true,
      tosAcceptedAt: new Date(),
      balance: 1000000,
      xp: 0,
      level: 0,
      lastDailyXPReset: Date.now(),
      dailyXP: 0,
      manaPoints: 0,
      manaCrystals: 0,
      lastGambleTime: Date.now(),
      lastDaily: 0,
      banned: false,
      banReason: null,
      collectibles: {},
      buffs: {},
      items: Array(50).fill(null),
      profile: { wins: 0, losses: 0 },
      dailyData: { lastClaim: 0, streak: 0, lastResetTime: 0 },
      createdAt: new Date()
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await dbInstance.collection('users').updateOne({ userId }, { $set: newUser }, { upsert: true });
        const createdUser = await dbInstance.collection('users').findOne({ userId });
        if (createdUser) {
          logger.success(`New user initialized: ${userId} (1,000,000 LUX balance)`);
          return createdUser;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } catch (err) {
        console.error(`Error initializing user ${userId}, attempt ${attempt}/${maxRetries}:`, err.message);
        if (attempt === maxRetries) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error(`Failed to initialize user ${userId} after ${maxRetries} attempts`);
  },

  updateUser: async (userId, updates) => {
    const dbInstance = await getDB();

    if (updates.balance !== undefined) updates.balance = Number(updates.balance) || 0;
    if (updates.xp !== undefined) updates.xp = Number(updates.xp) || 0;
    if (updates.level !== undefined) updates.level = Number(updates.level) || 0;
    if (updates.manaPoints !== undefined) updates.manaPoints = Number(updates.manaPoints) || 0;
    if (updates.manaCrystals !== undefined) updates.manaCrystals = Number(updates.manaCrystals) || 0;

    if (updates.items !== undefined) {
      if (!Array.isArray(updates.items)) updates.items = Array(50).fill(null);
      else if (updates.items.length !== 50) {
        const newItems = Array(50).fill(null);
        for (let i = 0; i < Math.min(updates.items.length, 50); i++) newItems[i] = updates.items[i];
        updates.items = newItems;
      }
    }

    await dbInstance.collection('users').updateOne({ userId }, { $set: updates }, { upsert: true });
  },

  addManaPoints: async (userId, points) => {
    const dbInstance = await getDB();
    let user = await module.exports.getUser(userId);
    if (!user) {
      return;
    }
    await dbInstance.collection('users').updateOne({ userId }, { $inc: { manaPoints: Number(points) || 0 } }, { upsert: true });
  },

  addManaCrystals: async (userId, crystals) => {
    const dbInstance = await getDB();
    let user = await module.exports.getUser(userId);
    if (!user) {
      return;
    }
    await dbInstance.collection('users').updateOne({ userId }, { $inc: { manaCrystals: Number(crystals) || 0 } }, { upsert: true });
  },

  addXP: async (userId, xp) => {
    const dbInstance = await getDB();
    let user = await module.exports.getUser(userId);
    if (!user) {
      return 0;
    }

    const now = Date.now();
    const resetTimeToday = new Date();
    resetTimeToday.setUTCHours(6, 30, 0, 0);
    if (resetTimeToday.getTime() > now) resetTimeToday.setDate(resetTimeToday.getDate() - 1);

    if (user.lastDailyXPReset < resetTimeToday.getTime()) {
      console.log(`Resetting daily XP for user ${userId}`);
      await dbInstance.collection('users').updateOne({ userId }, { $set: { dailyXP: 0, lastDailyXPReset: resetTimeToday.getTime() } });
      user.dailyXP = 0;
      user.lastDailyXPReset = resetTimeToday.getTime();
    }

    let xpAwarded = Number(xp) || 0;
    const dailyXPCap = 4000;
    const currentDailyXP = user.dailyXP || 0;

    if (currentDailyXP >= dailyXPCap) xpAwarded = 0;
    else if (currentDailyXP + xpAwarded > dailyXPCap) xpAwarded = dailyXPCap - currentDailyXP;

    if (xpAwarded > 0) {
      await dbInstance.collection('users').updateOne({ userId }, { $inc: { xp: xpAwarded, dailyXP: xpAwarded } });
    }

    return xpAwarded;
  },

  transferLux: async (fromUserId, toUserId, amount) => {
    const dbInstance = await getDB();
    const numAmount = Number(amount) || 0;
    await dbInstance.collection('users').updateOne({ userId: fromUserId }, { $inc: { balance: -numAmount } }, { upsert: true });
    await dbInstance.collection('users').updateOne({ userId: toUserId }, { $inc: { balance: numAmount } }, { upsert: true });
  },

  getAllUsers: async () => {
    const dbInstance = await getDB();
    return await dbInstance.collection('users').find().toArray();
  },

  getCurrentTime: () => Date.now(),

  repairUser: async (userId) => {
    const dbInstance = await getDB();
    const user = await dbInstance.collection('users').findOne({ userId });
    if (!user) return null;

    const fixes = {};
    if (!Array.isArray(user.items) || user.items.length !== 50) fixes.items = Array(50).fill(null);
    if (typeof user.balance !== 'number') fixes.balance = 0;
    if (typeof user.xp !== 'number') fixes.xp = 0;
    if (typeof user.level !== 'number') fixes.level = 0;
    if (typeof user.manaPoints !== 'number') fixes.manaPoints = 0;
    if (typeof user.manaCrystals !== 'number') fixes.manaCrystals = 0;
    if (!user.profile || typeof user.profile !== 'object') fixes.profile = { wins: 0, losses: 0 };
    if (!user.dailyData || typeof user.dailyData !== 'object') fixes.dailyData = { lastClaim: user.lastDaily || 0, streak: 0, lastResetTime: 0 };

    if (Object.keys(fixes).length > 0) {
      await dbInstance.collection('users').updateOne({ userId }, { $set: fixes });
    }

    return { ...user, ...fixes };
  },

  repairUserInventory: async (userId) => {
    const dbInstance = await getDB();
    const usersCollection = dbInstance.collection('users');
    const user = await usersCollection.findOne({ userId });
    if (!user) return null;

    let needsUpdate = false;
    let fixedItems = user.items;

    if (!Array.isArray(user.items)) {
      fixedItems = Array(50).fill(null);
      needsUpdate = true;
    } else if (user.items.length !== 50) {
      fixedItems = Array(50).fill(null);
      for (let i = 0; i < Math.min(user.items.length, 50); i++) fixedItems[i] = user.items[i];
      needsUpdate = true;
    }

    if (needsUpdate) {
      await usersCollection.updateOne({ userId }, { $set: { items: fixedItems } });
    }

    return fixedItems;
  },

  // GHOST-PROOF FUNCTION - Only returns real, registered users
  getActiveUsers: async () => {
    try {
      const dbInstance = await getDB();
      return await dbInstance.collection('users').find({
        $and: [
          { userId: { $exists: true, $ne: null } },
          { registered: true },
          { balance: { $exists: true, $ne: null } },
          { xp: { $exists: true, $ne: null } },
          { items: { $exists: true, $type: "array" } }
        ]
      }).toArray();
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
      }
    },

    // Guild prefix helpers
    getGuildPrefix: async (guildId) => {
      try {
        const dbInstance = await getDB();
        const doc = await dbInstance.collection('guildSettings').findOne({ guildId });
        return doc && doc.prefix ? doc.prefix : null;
      } catch (err) {
        return null;
      }
    },

    setGuildPrefix: async (guildId, prefix) => {
      const dbInstance = await getDB();
      await dbInstance.collection('guildSettings').updateOne({ guildId }, { $set: { prefix } }, { upsert: true });
    },
};