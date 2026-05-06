const { EmbedBuilder } = require('discord.js');
const itemsConfig = require('../utils/itemsConfig');

module.exports = {
  name: 'daily',
  description: 'Claim your daily reward with streak bonuses',
  async execute(message, args, db) {
    try {
      console.log('Executing daily for:', message.author.id);
      const userId = message.author.id;
      const user = await db.getUser(userId);
      const now = Date.now();

      // Get today's reset time (6:30 AM UTC)
      const getTodayResetTime = () => {
        const resetTime = new Date();
        resetTime.setUTCHours(6, 30, 0, 0);
        
        const currentTime = new Date();
        if (currentTime < resetTime) {
          resetTime.setDate(resetTime.getDate() - 1);
        }
        
        return resetTime.getTime();
      };

      // Get next reset time (6:30 AM UTC)
      const getNextResetTime = () => {
        const resetTime = new Date();
        resetTime.setUTCHours(6, 30, 0, 0);
        
        if (new Date() >= resetTime) {
          resetTime.setDate(resetTime.getDate() + 1);
        }
        
        return resetTime.getTime();
      };

      // Format time remaining
      const formatTimeRemaining = (ms) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
      };

      const todayReset = getTodayResetTime();
      const nextReset = getNextResetTime();
      const timeUntilNextReset = formatTimeRemaining(nextReset - now);

      // Initialize daily data if not exists
      if (!user.dailyData) {
        user.dailyData = {
          lastClaim: 0,
          streak: 0,
          lastResetTime: 0
        };
      }

      // Check if user already claimed today
      if (user.dailyData.lastClaim >= todayReset) {
        // User already claimed today
        const alreadyClaimedEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setDescription(
            `💎 ${message.author}\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `You Already Claimed Today's Reward Please Come Back Tomorrow!\n` +
            `**Streak:** ${user.dailyData.streak} Days 🔥\n\n` +
            `**⏳ Next Daily:** ${timeUntilNextReset}\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `**Vote To Get More Reward:** [VOTE NOW](https://top.gg/bot/1414566436763996290/vote)`
          )
          .setImage('https://cdn.discordapp.com/attachments/1405132437239103561/1405134316618387506/IMG-20250813-WA0013.jpg?ex=689db8cf&is=689c674f&hm=1c293a9dfb08828a4020dbec05d37e6a2956d5c0b1d97a730a1fb54fae323870&');

        return message.reply({ embeds: [alreadyClaimedEmbed] });
      }

      // Calculate streak
      let newStreak = user.dailyData.streak || 0;
      const yesterday = todayReset - (24 * 60 * 60 * 1000);
      
      if (user.dailyData.lastClaim >= yesterday && user.dailyData.lastClaim < todayReset) {
        // User claimed yesterday, continue streak
        newStreak += 1;
      } else if (user.dailyData.lastClaim < yesterday) {
        // User missed a day, reset streak
        newStreak = 1;
      } else {
        // First time claiming or same day
        newStreak = 1;
      }

      // Calculate reward based on streak
      let reward = 0;
      if (newStreak >= 1 && newStreak <= 10) {
        // 1-10 days: 5000-10000 LUX
        reward = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
      } else if (newStreak >= 11 && newStreak <= 30) {
        // 11-30 days: 10000-20000 LUX
        reward = Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;
      } else if (newStreak >= 31) {
        // 31+ days: 20000-50000 LUX
        reward = Math.floor(Math.random() * (50000 - 20000 + 1)) + 20000;
      }

      // **NEW: Add Daily Crate (item 002) to inventory**
      await addDailyCrateToInventory(userId, db);

      // Update user data
      const updatedDailyData = {
        lastClaim: now,
        streak: newStreak,
        lastResetTime: todayReset
      };

      await db.updateUser(userId, {
        balance: user.balance + reward,
        dailyData: updatedDailyData
      });

      // **UPDATED: Get Daily Crate emoji to show in success message**
      const dailyCrateEmoji = itemsConfig.items['002'].emoji;

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setDescription(
          `💎 ${message.author}\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `You earned **${reward.toLocaleString()} LUX!** ${dailyCrateEmoji}¹\n` +
          `**Streak:** ${newStreak} Days 🔥\n\n` +
          `**⏳ Next Daily:** ${timeUntilNextReset}\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `**Vote To Get More Reward:** [VOTE NOW](https://top.gg/bot/1414566436763996290/vote)`
        )
        .setImage('https://cdn.discordapp.com/attachments/1405132437239103561/1405134316618387506/IMG-20250813-WA0013.jpg?ex=689db8cf&is=689c674f&hm=1c293a9dfb08828a4020dbec05d37e6a2956d5c0b1d97a730a1fb54fae323870&');

      await message.reply({ embeds: [successEmbed] });

      console.log(`Daily reward claimed by ${userId}: ${reward} LUX, Streak: ${newStreak}, Daily Crate added`);

    } catch (error) {
      console.error('Error in daily command:', error);
      await message.reply('❌ An error occurred while processing your daily reward. Please try again later.');
    }
  }
};

// **Helper function to add Daily Crate (item 002) to inventory**
async function addDailyCrateToInventory(userId, db) {
  try {
    const dbInstance = await db.getDB();
    const usersCollection = dbInstance.collection('users');
    
    const user = await usersCollection.findOne({ userId });
    if (!user || !user.items) return false;

    const itemId = '002'; // Daily Crate
    const quantity = 1;

    // Try to stack with existing Daily Crate first
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

    // Find first empty slot for new Daily Crate
    let emptySlot = -1;
    for (let slot = 0; slot < user.items.length; slot++) {
      if (user.items[slot] === null || user.items[slot] === undefined) {
        emptySlot = slot;
        break;
      }
    }
    
    if (emptySlot === -1) {
      console.log(`No empty inventory slots for user ${userId} - Daily Crate not added`);
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
      source: 'daily_reward'
    };
    
    await usersCollection.updateOne(
      { userId },
      { $set: { [`items.${emptySlot}`]: itemData } }
    );
    
    return true;
    
  } catch (error) {
    console.error('Error adding Daily Crate to inventory:', error);
    return false;
  }
}
