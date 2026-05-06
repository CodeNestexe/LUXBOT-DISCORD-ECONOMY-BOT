const { getDB, getCurrentTime } = require('./database');

// XP requirements for each level (cumulative XP to reach the level)
const levelXPRequirements = [
  0,      // Level 0 (not used, placeholder for easier indexing)
  3000,   // Level 1
  7000,   // Level 2
  12000,  // Level 3
  18000,  // Level 4
  25000,  // Level 5
  33000,  // Level 6
  42000,  // Level 7
  52000,  // Level 8
  63000,  // Level 9
  77000,  // Level 10
  92000,  // Level 11
  108000, // Level 12
  125000, // Level 13
  143000, // Level 14
  162000, // Level 15
  182000, // Level 16
  203000, // Level 17
  225000, // Level 18
  248000, // Level 19
  274000, // Level 20
  301000, // Level 21
  329000, // Level 22
  358000, // Level 23
  388000, // Level 24
  419000, // Level 25
  451000, // Level 26
  484000, // Level 27
  518000, // Level 28
  553000, // Level 29
  591000, // Level 30
  630000, // Level 31
  670000, // Level 32
  711000, // Level 33
  753000, // Level 34
  796000, // Level 35
  840000, // Level 36
  885000, // Level 37
  931000, // Level 38
  978000, // Level 39
  1028000,// Level 40
  1079000,// Level 41
  1131000,// Level 42
  1184000,// Level 43
  1238000,// Level 44
  1293000,// Level 45
  1349000,// Level 46
  1406000,// Level 47
  1464000,// Level 48
  1523000,// Level 49
  1585000,// Level 50
];

// **UPDATED: Level rewards with correct item IDs**
const levelRewards = {
  1: { lux: 5000, manaCrystals: 1 },
  2: { lux: 6000, manaCrystals: 1 },
  3: { lux: 7000, manaCrystals: 2 },
  4: { lux: 8000, manaCrystals: 2 },
  5: { lux: 10000, manaCrystals: 2, items: { '008': 1 } }, // Mana Crate
  6: { lux: 12000, manaCrystals: 3 },
  7: { lux: 14000, manaCrystals: 3 },
  8: { lux: 16000, manaCrystals: 4 },
  9: { lux: 18000, manaCrystals: 4 },
  10: { lux: 20000, manaCrystals: 5, items: { '008': 1, '007': 1 } }, // Mana Crate + Magic Crate
  11: { lux: 25000, manaCrystals: 10 },
  12: { lux: 30000, manaCrystals: 11 },
  13: { lux: 35000, manaCrystals: 11 },
  14: { lux: 40000, manaCrystals: 12 },
  15: { lux: 45000, manaCrystals: 12, items: { '008': 3, '007': 1 } }, // 3 Mana Crate + Magic Crate
  16: { lux: 50000, manaCrystals: 13 },
  17: { lux: 55000, manaCrystals: 13 },
  18: { lux: 60000, manaCrystals: 14 },
  19: { lux: 65000, manaCrystals: 14 },
  20: { lux: 70000, manaCrystals: 15, items: { '008': 5, '007': 2 } }, // 5 Mana Crate + 2 Magic Crate
  21: { lux: 100000, manaCrystals: 20 },
  22: { lux: 110000, manaCrystals: 20 },
  23: { lux: 120000, manaCrystals: 25 },
  24: { lux: 130000, manaCrystals: 25 },
  25: { lux: 140000, manaCrystals: 30, items: { '008': 5, '012': 1 } }, // 5 Mana Crate + Mana Zone
  26: { lux: 150000, manaCrystals: 30 },
  27: { lux: 160000, manaCrystals: 35 },
  28: { lux: 170000, manaCrystals: 35 },
  29: { lux: 180000, manaCrystals: 40 },
  30: { lux: 200000, manaCrystals: 40, items: { '008': 10, '007': 5 } }, // 10 Mana Crate + 5 Magic Crate
  31: { lux: 250000, manaCrystals: 50 },
  32: { lux: 260000, manaCrystals: 60 },
  33: { lux: 270000, manaCrystals: 70 },
  34: { lux: 280000, manaCrystals: 80 },
  35: { lux: 290000, manaCrystals: 90, items: { '008': 15, '012': 1 } }, // 15 Mana Crate + Mana Zone
  36: { lux: 300000, manaCrystals: 100 },
  37: { lux: 310000, manaCrystals: 110 },
  38: { lux: 320000, manaCrystals: 120 },
  39: { lux: 330000, manaCrystals: 130 },
  40: { lux: 350000, manaCrystals: 150, items: { '008': 20, '007': 10, '012': 1 } }, // 20 Mana Crate + 10 Magic Crate + Mana Zone
  41: { lux: 500000, manaCrystals: 200 },
  42: { lux: 550000, manaCrystals: 250 },
  43: { lux: 600000, manaCrystals: 300 },
  44: { lux: 650000, manaCrystals: 350 },
  45: { lux: 700000, manaCrystals: 400, items: { '008': 20, '007': 15, '012': 1 } }, // 20 Mana Crate + 15 Magic Crate + Mana Zone
  46: { lux: 750000, manaCrystals: 450 },
  47: { lux: 800000, manaCrystals: 500 },
  48: { lux: 850000, manaCrystals: 550 },
  49: { lux: 900000, manaCrystals: 600 },
  50: { lux: 1000000, manaCrystals: 650, items: { '008': 20, '007': 20, '012': 1, '017': 1 } }, // 20 Mana Crate + 20 Magic Crate + Mana Zone + Prime Stone
};

// **UPDATED: Item names with correct IDs and emojis**
const itemNames = {
  '002': 'Daily Crate <a:daily_crate:1375389184357044316>',
  '003': 'Rare Crate <a:rare_crate:1375388778985951315>',
  '004': 'Legendary Crate <a:legendary_crate:1375388503512191057>',
  '007': 'Magic Crate <a:magic_crate:1375391772699656203>', // Updated from Stone Chest
  '008': 'Mana Crate <a:mana_crate:1375388724950728764>', // Updated from Crystal Chest
  '009': 'Collectibles Crate <a:collectibles_crate:1375389071110574120>',
  '010': 'Background 010 <a:lux_backgrounds:1377824626733744189>',
  '011': 'Background 011 <a:lux_backgrounds:1377824626733744189>',
  '012': 'Mana Zone <a:mana_zone:1376890534806683758>',
  '013': 'Basic Stone <:basic_stone:1410589277494186044>',
  '014': 'Adept Stone <:adept_stone:1410589320263368774>',
  '015': 'Master Stone <:master_stone:1410589354660728922>',
  '016': 'Elite Stone <:elite_stone:1410589401574277171>',
  '017': 'Prime Stone <:prime_stone:1410589447598243850>',
};

// **NEW: Helper function to add items to 50-slot inventory**
async function addItemToInventory(userId, itemId, quantity) {
  try {
    const itemsConfig = require('./utils/itemsConfig');
    const dbInstance = await getDB();
    const usersCollection = dbInstance.collection('users');
    
    const user = await usersCollection.findOne({ userId });
    if (!user || !user.items) return false;

    // Try to stack with existing item first
    for (let slot = 0; slot < user.items.length; slot++) {
      const slotItem = user.items[slot];
      if (slotItem && slotItem.id === itemId) {
        const newAmount = (slotItem.amount || 1) + quantity;
        await usersCollection.updateOne(
          { userId },
          { $set: { [`items.${slot}.amount`]: newAmount } }
        );
        return true;
      }
    }

    // Find first empty slot for new item
    let emptySlot = -1;
    for (let slot = 0; slot < user.items.length; slot++) {
      if (user.items[slot] === null || user.items[slot] === undefined) {
        emptySlot = slot;
        break;
      }
    }
    
    if (emptySlot === -1) {
      console.log(`No empty inventory slots for user ${userId}`);
      return false;
    }
    
    const itemConfig = itemsConfig.items[itemId];
    if (!itemConfig) {
      console.log(`Unknown item ID: ${itemId}`);
      return false;
    }
    
    const itemData = {
      id: itemId,
      name: itemConfig.name,
      emoji: itemConfig.emoji,
      amount: quantity,
      addedAt: new Date(),
      source: 'level_reward'
    };
    
    await usersCollection.updateOne(
      { userId },
      { $set: { [`items.${emptySlot}`]: itemData } }
    );
    
    return true;
    
  } catch (error) {
    console.error('Error adding item to inventory:', error);
    return false;
  }
}

// **NEW: Function to distribute level rewards using new inventory system**
async function distributeLevelRewards(userId, level) {
  try {
    const reward = levelRewards[level];
    if (!reward) {
      console.log(`No reward defined for level ${level}`);
      return false;
    }

    // **FIXED: Ensure user has proper inventory structure**
    const { getUser, updateUser } = require('./database');
    let user = await getUser(userId);
    
    if (!Array.isArray(user.items) || user.items.length !== 50) {
      // Repair user inventory if corrupted
      const dbInstance = await getDB();
      const usersCollection = dbInstance.collection('users');
      await usersCollection.updateOne({ userId }, { $set: { items: Array(50).fill(null) } });
      user = await getUser(userId); // Refresh user data
    }

    // Prepare balance updates
    const balanceUpdates = {};
    
    // Add LUX to balance
    if (reward.lux) {
      balanceUpdates.balance = (user.balance || 0) + reward.lux;
    }
    
    // **FIXED: Add Mana Crystals to balance, not inventory**
    if (reward.manaCrystals) {
      balanceUpdates.manaCrystals = (user.manaCrystals || 0) + reward.manaCrystals;
    }
    
    // Update balances atomically
    if (Object.keys(balanceUpdates).length > 0) {
      await updateUser(userId, balanceUpdates);
    }
    
    // **FIXED: Add items to inventory using new system**
    if (reward.items) {
      let allItemsAdded = true;
      const addedItems = [];
      
      for (const [itemId, quantity] of Object.entries(reward.items)) {
        const success = await addItemToInventory(userId, itemId, quantity);
        if (success) {
          addedItems.push({ itemId, quantity });
        } else {
          allItemsAdded = false;
          console.log(`Failed to add level ${level} reward item ${itemId} x${quantity} for user ${userId} - inventory might be full`);
        }
      }
      
      if (!allItemsAdded) {
        console.log(`Some level ${level} reward items could not be added for user ${userId}`);
      }
    }
    
    console.log(`Level ${level} rewards distributed to user ${userId}: ${reward.lux || 0} LUX, ${reward.manaCrystals || 0} Mana Crystals`);
    return true;
    
  } catch (error) {
    console.error(`Error distributing level ${level} rewards for user ${userId}:`, error);
    return false;
  }
}

module.exports = {
  calculateLevel: (xp) => {
    if (typeof xp !== 'number' || isNaN(xp) || xp < 0) {
      console.error(`Invalid XP value: ${xp}`);
      throw new Error('Invalid XP value');
    }

    // Find the highest level the user has achieved based on their XP
    for (let level = 1; level <= 50; level++) {
      if (xp < levelXPRequirements[level]) {
        return level - 1; // Return the previous level if XP is less than required for this level
      }
    }
    return 50; // Cap at level 50 if XP exceeds the requirement for level 50
  },

  getLevelProgress: async (userId) => {
  const user = await require('./database').getUser(userId);
  
  // GHOST USER PROTECTION
  if (!user) {
    console.log('🚫 Ghost user in getLevelProgress: ' + userId);
    throw new Error('User not found');
  }
  
  console.log(`getLevelProgress for user ${userId}: user.xp = ${user.xp}`);

    if (typeof user.xp !== 'number') {
      console.error(`Invalid XP for user ${userId}: ${user.xp}`);
      throw new Error('User XP is invalid');
    }

    const currentLevel = module.exports.calculateLevel(user.xp);
    console.log(`Calculated level for user ${userId}: currentLevel = ${currentLevel}`);

    if (typeof currentLevel !== 'number' || isNaN(currentLevel)) {
      console.error(`Invalid level calculated for user ${userId}: ${currentLevel}`);
      throw new Error('Calculated level is invalid');
    }

    // Corrected: Use proper indices
    const xpForCurrentLevel = levelXPRequirements[currentLevel] || 0;
    const xpForNextLevel = currentLevel < 50 ? levelXPRequirements[currentLevel + 1] : levelXPRequirements[50];
    const xpProgress = user.xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = xpNeeded > 0 ? (xpProgress / xpNeeded) * 100 : 100;

    return {
      currentLevel,
      xpProgress,
      xpNeeded,
      progressPercentage,
      totalXP: user.xp,
    };
  },

  getRank: async (userId) => {
  const dbInstance = await getDB();
  console.log(`Calculating rank for user ${userId}`);

  // GHOST-PROOF: Only get real, registered users
  const users = await dbInstance.collection('users').find({
    $and: [
      { userId: { $exists: true, $ne: null } },
      { registered: true },
      { balance: { $exists: true, $ne: null } },
      { xp: { $exists: true, $ne: null } }
    ]
  }).toArray();
  
  const sortedUsers = users.sort((a, b) => (b.xp || 0) - (a.xp || 0));

    const rank = sortedUsers.findIndex(user => user.userId === userId) + 1;
    const totalUsers = sortedUsers.length;

    console.log(`Rank for user ${userId}: ${rank}/${totalUsers}`);
    return { rank, totalUsers };
  },

  // **UPDATED: Get rewards for a given level**
  getRewards: (level) => {
    return level < 1 || level > 50 ? null : levelRewards[level];
  },

  // **NEW: Function to distribute level rewards**
  distributeLevelRewards,

  // **UPDATED: Expose itemNames with correct mappings**
  itemNames,

  getCurrentTime,
};
