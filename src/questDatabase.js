// questDatabase.js - COMPLETE FIXED VERSION
const { getDB, getCurrentTime } = require('./database');

// Stock symbols and names mapping
const STOCK_INFO = {
  LOF: 'Land Of Fire',
  JD: 'Jan\'s Dungeon', 
  INDI: 'indi.host',
  TKI: 'Tasknode.io',
  LUX: 'LUX Inc'
};

// Generate dynamic stock purchase quest
function generateStockPurchaseQuest() {
  const stockSymbols = Object.keys(STOCK_INFO);
  const randomStock = stockSymbols[Math.floor(Math.random() * stockSymbols.length)];
  const randomQuantity = Math.floor(Math.random() * 4) + 1; // 1-4 quantity
  
  return {
    id: `buy_stock_${randomStock}_${randomQuantity}`,
    name: `Buy ${randomQuantity} ${STOCK_INFO[randomStock]} Stock!`,
    target: randomQuantity,
    type: 'buy_stock',
    stockSymbol: randomStock
  };
}

// Available quests list (updated with stock quests, removed battle quests)
const QUEST_LIST = [
  {
    id: 'mine_5',
    name: 'Play Mine 5 Times!',
    target: 5,
    type: 'play_mine'
  },
  {
    id: 'slots_10',
    name: 'Play Spin 10 Times!',
    target: 10,
    type: 'play_slots'
  },
  {
    id: 'coinflip_5',
    name: 'Play Coinflip 5 Times!',
    target: 5,
    type: 'play_coinflip'
  },
  {
    id: 'fish_10',
    name: 'Use Fish Command 10 Times!',
    target: 10,
    type: 'use_fish'
  },
  {
    id: 'win_coinflip_5',
    name: 'Win Coinflip 5 Times!',
    target: 5,
    type: 'win_coinflip'
  },
  {
    id: 'horserace_10',
    name: 'Play HorseRace 10 Times!',
    target: 10,
    type: 'play_horserace'
  },
  {
    id: 'win_horserace_5',
    name: 'Win HorseRace 5 Times!',
    target: 5,
    type: 'win_horserace'
  },
  {
    id: 'hold_stock_30min',
    name: 'Hold Any Stock For 30 Minutes!',
    target: 1800000, // 30 minutes in milliseconds
    type: 'hold_stock'
  },
  {
    id: 'vote_lux_1',
    name: 'Vote LuxBot!',
    target: 1,
    type: 'vote_lux',
    permanent: true // NEW: Mark as permanent quest
  }
];

// **UPDATED: New quest reward system with correct item ID**
const QUEST_REWARD = {
  crystalChest: {
    item: '008', // Item ID for Mana Crate (was Crystal Crate)
    amount: 1,
    emoji: '<a:mana_crate:1375388724950728764>' // **FIXED: Use correct emoji**
  },
  manaCrystals: {
    amount: 5
  }
};

// Get next reset time (6:30 AM UTC)
function getNextResetTime() {
  const now = new Date();
  const resetTime = new Date();
  resetTime.setUTCHours(6, 30, 0, 0);
  
  if (now >= resetTime) {
    resetTime.setDate(resetTime.getDate() + 1);
  }
  
  return resetTime.getTime();
}

// Get today's reset time (6:30 AM UTC)
function getTodayResetTime() {
  const resetTime = new Date();
  resetTime.setUTCHours(6, 30, 0, 0);
  
  const now = new Date();
  if (now < resetTime) {
    resetTime.setDate(resetTime.getDate() - 1);
  }
  
  return resetTime.getTime();
}

// Format time remaining
function formatTimeRemaining(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Check if user has held any stock for 30+ minutes
async function checkStockHoldingTime(userId) {
  try {
    const dbInstance = await getDB();
    const portfoliosCollection = dbInstance.collection('portfolios');
    const stockTransactionsCollection = dbInstance.collection('stockTransactions');
    
    const portfolio = await portfoliosCollection.findOne({ userId });
    if (!portfolio || !portfolio.stocks || Object.keys(portfolio.stocks).length === 0) {
      return false; // No stocks held
    }
    
    const now = getCurrentTime();
    
    // Check each stock in portfolio
    for (const [symbol, holding] of Object.entries(portfolio.stocks)) {
      if (holding.quantity > 0) {
        // Find the earliest purchase transaction for this stock
        const earliestTransaction = await stockTransactionsCollection.findOne(
          { 
            userId, 
            symbol, 
            type: 'buy',
            timestamp: { $exists: true }
          },
          { sort: { timestamp: 1 } }
        );
        
        if (earliestTransaction) {
          const holdingTime = now - earliestTransaction.timestamp;
          if (holdingTime >= 1800000) { // 30 minutes
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking stock holding time:', error);
    return false;
  }
}

// **NEW: Helper function to add items to 50-slot inventory**
async function addItemToInventory(userId, itemId, quantity) {
  try {
    const itemsConfig = require('./utils/itemsConfig');
    const dbInstance = await getDB();
    const usersCollection = dbInstance.collection('users');
    
    const user = await usersCollection.findOne({ userId });
    if (!user || !user.items) return false;

    // Find first empty slot
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
      source: 'quest_reward'
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

module.exports = {
  // **🔧 FIXED: Get user's current quests (dual quest system with duplicate prevention)**
  getUserQuest: async (userId) => {
    const dbInstance = await getDB();
    const questsCollection = dbInstance.collection('quests');
    
    const todayReset = getTodayResetTime();
    let userQuests = await questsCollection.find({ userId, resetTime: todayReset }).toArray();
    
    if (userQuests.length === 0) {
      try {
        // **🎯 1. Random quest (existing logic)**
        let randomQuest;
        const questTypeRandom = Math.random();
        if (questTypeRandom < 0.3) {
          randomQuest = generateStockPurchaseQuest();
        } else if (questTypeRandom < 0.5) {
          randomQuest = QUEST_LIST.find(q => q.type === 'hold_stock');
        } else {
          const nonStockQuests = QUEST_LIST.filter(q => q.type !== 'hold_stock' && q.type !== 'vote_lux');
          randomQuest = nonStockQuests[Math.floor(Math.random() * nonStockQuests.length)];
        }
        
        // **🎯 2. Permanent vote quest**
        const voteQuest = QUEST_LIST.find(q => q.type === 'vote_lux');
        
        // **🔧 FIXED: Create quests individually with upsert to prevent duplicates**
        for (const questTemplate of [randomQuest, voteQuest]) {
          const questDoc = {
            userId,
            questId: questTemplate.id,
            questName: questTemplate.name,
            questType: questTemplate.type,
            target: questTemplate.target,
            progress: 0,
            completed: false,
            resetTime: todayReset,
            createdAt: getCurrentTime(),
            stockSymbol: questTemplate.stockSymbol || null,
            permanent: questTemplate.type === 'vote_lux'
          };
          
          // Auto-complete hold stock quest if applicable
          if (questTemplate.type === 'hold_stock') {
            const hasHeldStockLongEnough = await checkStockHoldingTime(userId);
            if (hasHeldStockLongEnough) {
              questDoc.progress = questTemplate.target;
              questDoc.completed = true;
              questDoc.completedAt = getCurrentTime();
            }
          }
          
          // **🔧 CRITICAL FIX: Use upsert to prevent duplicate key errors**
          await questsCollection.updateOne(
            { 
              userId, 
              resetTime: todayReset, 
              questType: questTemplate.type 
            },
            { $setOnInsert: questDoc },
            { upsert: true }
          );
        }
        
        // **🔧 Fetch the created quests**
        userQuests = await questsCollection.find({ userId, resetTime: todayReset }).toArray();
        
      } catch (error) {
        console.error('Error creating user quests:', error);
        
        // **🔧 Fallback: Try to fetch existing quests in case of race condition**
        userQuests = await questsCollection.find({ userId, resetTime: todayReset }).toArray();
        
        if (userQuests.length === 0) {
          // **🔧 Last resort: Create a simple single quest to prevent errors**
          const fallbackQuest = {
            userId,
            questId: 'vote_lux_1',
            questName: 'Vote LuxBot!',
            questType: 'vote_lux',
            target: 1,
            progress: 0,
            completed: false,
            resetTime: todayReset,
            createdAt: getCurrentTime(),
            stockSymbol: null,
            permanent: true
          };
          
          try {
            await questsCollection.insertOne(fallbackQuest);
            userQuests = [fallbackQuest];
          } catch (fallbackError) {
            console.error('Fallback quest creation failed:', fallbackError);
            // Return empty array to prevent crashes
            userQuests = [];
          }
        }
      }
    }
    
    // **🔧 Always return array of quests (dual quest system)**
    return Array.isArray(userQuests) ? userQuests : [];
  },

  // **🔧 UPDATED: Update quest progress (handles multiple quests)**
  updateQuestProgress: async (userId, questType, amount = 1, stockSymbol = null) => {
    const dbInstance = await getDB();
    const questsCollection = dbInstance.collection('quests');
    
    const todayReset = getTodayResetTime();
    const query = { 
      userId, 
      resetTime: todayReset,
      questType,
      completed: false 
    };
    
    // For stock purchase quests, also match the specific stock symbol
    if (questType === 'buy_stock' && stockSymbol) {
      query.stockSymbol = stockSymbol;
    }
    
    const userQuest = await questsCollection.findOne(query);
    
    if (userQuest) {
      const newProgress = Math.min(userQuest.progress + amount, userQuest.target);
      const isCompleted = newProgress >= userQuest.target;
      
      await questsCollection.updateOne(
        { _id: userQuest._id },
        { 
          $set: { 
            progress: newProgress,
            completed: isCompleted,
            completedAt: isCompleted ? getCurrentTime() : null
          }
        }
      );
      
      console.log(`✅ Quest progress updated: ${userId} - ${questType} - ${newProgress}/${userQuest.target}`);
      return { updated: true, completed: isCompleted, progress: newProgress, target: userQuest.target };
    }
    
    return { updated: false };
  },

  // **🔧 UPDATED: Complete quest (dual quest reward system)**
  completeQuest: async (userId) => {
    const dbInstance = await getDB();
    const questsCollection = dbInstance.collection('quests');
    
    const todayReset = getTodayResetTime();
    const userQuests = await questsCollection.find({ 
      userId, 
      resetTime: todayReset 
    }).toArray();
    
    // **🎯 Check if BOTH quests are completed**
    const completedQuests = userQuests.filter(q => q.completed && !q.rewarded);
    const totalQuests = userQuests.length;
    
    // **🔧 Only give rewards when BOTH quests are completed**
    if (completedQuests.length === totalQuests && totalQuests >= 2) {
      try {
        // **🔧 Ensure user has proper inventory structure**
        const { getUser, updateUser } = require('./database');
        let user = await getUser(userId);
        
        if (!Array.isArray(user.items) || user.items.length !== 50) {
          // Repair user inventory if corrupted
          const usersCollection = dbInstance.collection('users');
          await usersCollection.updateOne({ userId }, { $set: { items: Array(50).fill(null) } });
          user = await getUser(userId); // Refresh user data
        }
        
        // **🔧 Add Mana Crate (008) using new inventory system**
        const crateAdded = await addItemToInventory(userId, QUEST_REWARD.crystalChest.item, QUEST_REWARD.crystalChest.amount);
        
        if (!crateAdded) {
          console.log(`Failed to add quest reward to inventory for user ${userId} - inventory might be full`);
          return false;
        }
        
        // **🔧 Add 5 Mana Crystals to balance (not inventory)**
        const currentManaCrystals = user.manaCrystals || 0;
        await updateUser(userId, { manaCrystals: currentManaCrystals + QUEST_REWARD.manaCrystals.amount });
        
        console.log(`✅ Quest rewards given to user ${userId}: 1x Mana Crate + 5 Mana Crystals (both quests completed)`);
        
        // **🔧 Mark ALL quests as rewarded**
        await questsCollection.updateMany(
          { userId, resetTime: todayReset },
          { $set: { rewarded: true, rewardedAt: getCurrentTime() } }
        );
        
        return true;
      } catch (error) {
        console.error('Error giving quest rewards:', error);
        return false;
      }
    } else if (completedQuests.length > 0 && completedQuests.length < totalQuests) {
      // **🔧 Some quests completed but not all - no rewards yet**
      console.log(`User ${userId} completed ${completedQuests.length}/${totalQuests} quests - waiting for all quests`);
      return false;
    }
    
    return false;
  },

  // **🔧 NEW: Check if all quests are completed**
  checkAllQuestsCompleted: async (userId) => {
    const dbInstance = await getDB();
    const questsCollection = dbInstance.collection('quests');
    
    const todayReset = getTodayResetTime();
    const userQuests = await questsCollection.find({ 
      userId, 
      resetTime: todayReset 
    }).toArray();
    
    if (userQuests.length === 0) return false;
    
    const completedQuests = userQuests.filter(q => q.completed);
    return completedQuests.length === userQuests.length;
  },

  // **🔧 NEW: Get quest completion status**
  getQuestStatus: async (userId) => {
    const dbInstance = await getDB();
    const questsCollection = dbInstance.collection('quests');
    
    const todayReset = getTodayResetTime();
    const userQuests = await questsCollection.find({ 
      userId, 
      resetTime: todayReset 
    }).toArray();
    
    const completed = userQuests.filter(q => q.completed).length;
    const total = userQuests.length;
    const allCompleted = completed === total && total > 0;
    const canClaimReward = allCompleted && userQuests.some(q => !q.rewarded);
    
    return {
      completed,
      total,
      allCompleted,
      canClaimReward,
      quests: userQuests
    };
  },

  // Get quest constants
  getQuestReward: () => QUEST_REWARD,
  getNextResetTime,
  formatTimeRemaining,
  
  // Clean up old quests (optional, for maintenance)
  cleanupOldQuests: async () => {
    const dbInstance = await getDB();
    const weekAgo = getCurrentTime() - (7 * 24 * 60 * 60 * 1000);
    await dbInstance.collection('quests').deleteMany({ resetTime: { $lt: weekAgo } });
  },

  // Helper function to track stock purchase transactions
  trackStockPurchase: async (userId, stockSymbol, quantity) => {
    try {
      const dbInstance = await getDB();
      const stockTransactionsCollection = dbInstance.collection('stockTransactions');
      
      // Record the transaction
      await stockTransactionsCollection.insertOne({
        userId,
        symbol: stockSymbol,
        type: 'buy',
        quantity,
        timestamp: getCurrentTime()
      });
      
      // Update quest progress if there's an active stock purchase quest
      await module.exports.updateQuestProgress(userId, 'buy_stock', quantity, stockSymbol);
      
    } catch (error) {
      console.error('Error tracking stock purchase:', error);
    }
  }
};
