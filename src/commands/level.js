const { EmbedBuilder } = require('discord.js');
const { generateLevelImage } = require('../utils/generateLevelImage');
const levelTimeDatabase = require('../levelTimeDatabase');

module.exports = {
  name: 'level',
  description: 'Displays your current level, XP, and rank with level-up notifications',
  aliases: ['lvl'],
  async execute(message, args, db) {
    const userId = message.author.id;
    const avatarURL = message.author.displayAvatarURL({ size: 128, format: 'png' });

    try {
      // **FIXED: Ensure user has proper inventory structure**
      let user = await db.getUser(userId);
      if (!user) {
        return message.reply('User data not found! Start chatting to earn XP.');
      }

      // **DEBUG: Check user XP and level data**
      console.log(`DEBUG: User ${userId} - XP: ${user.xp}, Current Level in DB: ${user.level || 0}`);

      // **FIXED: Repair inventory if corrupted**
      if (!Array.isArray(user.items) || user.items.length !== 50) {
        await db.repairUserInventory(userId);
        user = await db.getUser(userId); // Refresh user data
      }

      // Calculate the correct level and XP progress
      const progress = await db.getLevelProgress(userId);
      const previousLevel = user.level || 0;
      const currentLevel = progress.currentLevel;
      const xpCurrent = progress.xpProgress;
      const xpTotal = progress.xpNeeded;

      // **DEBUG: Log level comparison**
      console.log(`DEBUG: User ${userId} - Previous Level: ${previousLevel}, Calculated Level: ${currentLevel}`);

      // Check if user leveled up
      if (currentLevel > previousLevel) {
        console.log(`🎉 DEBUG: User ${userId} leveled up from ${previousLevel} to ${currentLevel}!`);

        // **FIXED: Check bot permissions before sending**
        if (message.guild) {
          const botMember = message.guild.members.me;
          const canSend = message.channel.permissionsFor(botMember).has('SendMessages');
          
          if (!canSend) {
            console.log(`❌ Bot lacks SendMessages permission in channel ${message.channel.id}`);
            // Still update level in database, but can't send notification
            await db.updateUser(userId, { level: currentLevel });
            return;
          }
        }

        // Update user's level in database
        await db.updateUser(userId, { level: currentLevel });
        console.log(`✅ DEBUG: Updated user ${userId} level to ${currentLevel} in database`);

        // Get level-up rewards
        const rewards = levelTimeDatabase.getRewards(currentLevel);
        
        let rewardText = '';
        if (rewards) {
          rewardText += `💰 **${rewards.lux.toLocaleString()} LUX Coins**\n`;
          
          if (rewards.manaCrystals) {
            rewardText += `💎 **${rewards.manaCrystals} Mana Crystals**\n`;
          }
          
          if (rewards.items) {
            for (const [itemId, quantity] of Object.entries(rewards.items)) {
              const itemName = levelTimeDatabase.itemNames[itemId] || `Item ${itemId}`;
              rewardText += `${itemName} **x${quantity}**\n`;
            }
          }
        } else {
          rewardText = 'No rewards for this level.';
        }

        // Create level-up notification embed
        const levelUpEmbed = new EmbedBuilder()
          .setTitle('🎉 LEVEL UP! 🎉')
          .setDescription(
            `${message.author} **Congratulations!** You leveled up to **Level ${currentLevel}**!\n\n` +
            `**🎁 Level ${currentLevel} Rewards:**\n${rewardText}\n` +
            `**📊 Level Perks:**\n` +
            `• Increased daily send limit\n` +
            `• Better stock trading limits\n` +
            `• Enhanced casino privileges\n` +
            `• Exclusive high-level content access`
          )
          .setColor('#FFD700')
          .setThumbnail(avatarURL)
          .setFooter({ text: 'Keep playing to reach even higher levels!' })
          .setTimestamp();

        // **FIXED: Send level-up notification with proper error handling**
        try {
          await message.channel.send({ 
            content: `🎉 ${message.author} leveled up!`, 
            embeds: [levelUpEmbed] 
          });
          console.log(`✅ DEBUG: Level up embed sent successfully for user ${userId}`);
        } catch (error) {
          console.error(`❌ DEBUG: Failed to send level up embed for user ${userId}:`, error.message);
          // Continue with reward distribution even if embed fails
        }

        // **FIXED: Give rewards using new system with proper error handling**
        if (rewards) {
          try {
            const success = await distributeLevelRewards(userId, currentLevel, db);
            if (!success) {
              console.log(`⚠️ Failed to distribute level ${currentLevel} rewards for user ${userId}`);
              try {
                await message.channel.send(`⚠️ ${message.author}, there was an issue distributing some of your level rewards. Please contact support.`);
              } catch (err) {
                console.error('Failed to send reward error message:', err.message);
              }
            } else {
              console.log(`✅ DEBUG: Successfully distributed level ${currentLevel} rewards for user ${userId}`);
            }
          } catch (error) {
            console.error(`❌ DEBUG: Error distributing rewards for user ${userId}:`, error.message);
          }
        }
      } else {
        console.log(`DEBUG: User ${userId} did not level up (${previousLevel} -> ${currentLevel})`);
      }

      // Get the user's rank
      const rankData = await db.getRank(userId);
      const rank = `${rankData.rank}/${rankData.totalUsers}`;

      // Calculate daily XP progress
      const dailyXPCap = 4000;
      const dailyXP = user.dailyXP || 0;
      const now = Date.now();
      const nextReset = new Date();
      nextReset.setUTCHours(6, 30, 0, 0);
      if (nextReset.getTime() < now) {
        nextReset.setDate(nextReset.getDate() + 1);
      }

      const displayName = message.member?.displayName || message.author.username;

      // Generate level card image
      const imageAttachment = await generateLevelImage(displayName, currentLevel, rank, xpCurrent, xpTotal, avatarURL);

      // Create level info embed
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setDescription(
          `**Daily XP Progress:** ${dailyXP}/${dailyXPCap}\n` +
          `**Next Level:** ${xpTotal - xpCurrent} XP needed\n` +
          `Resets at <t:${Math.floor(nextReset.getTime() / 1000)}:R>`
        )
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });

      await message.channel.send({ embeds: [embed], files: [imageAttachment] });

    } catch (error) {
      console.error(`❌ Error in level command: ${error.message}`);
      await message.reply(`Error generating level card: ${error.message}`);
    }
  },
};

// **Helper functions remain the same**
async function addItemToInventory(userId, itemId, quantity, db) {
  try {
    const itemsConfig = require('../utils/itemsConfig');
    const dbInstance = await db.getDB();
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

async function distributeLevelRewards(userId, level, db) {
  try {
    const rewards = levelTimeDatabase.getRewards(level);
    if (!rewards) {
      return false;
    }

    const user = await db.getUser(userId);
    if (!user) {
      return false;
    }

    // **FIXED: Atomic balance updates**
    const balanceUpdates = {};
    
    if (rewards.lux) {
      balanceUpdates.balance = (user.balance || 0) + rewards.lux;
    }
    
    // **FIXED: Add Mana Crystals to balance, not inventory**
    if (rewards.manaCrystals) {
      balanceUpdates.manaCrystals = (user.manaCrystals || 0) + rewards.manaCrystals;
    }
    
    // Update balances atomically
    if (Object.keys(balanceUpdates).length > 0) {
      await db.updateUser(userId, balanceUpdates);
    }
    
    // **FIXED: Add items using new inventory system**
    if (rewards.items) {
      let allItemsAdded = true;
      
      for (const [itemId, quantity] of Object.entries(rewards.items)) {
        const success = await addItemToInventory(userId, itemId, quantity, db);
        if (!success) {
          allItemsAdded = false;
          console.log(`Failed to add level ${level} reward item ${itemId} x${quantity} for user ${userId} - inventory might be full`);
        }
      }
      
      if (!allItemsAdded) {
        console.log(`Some level ${level} reward items could not be added for user ${userId}`);
        return false;
      }
    }
    
    console.log(`Level ${level} rewards distributed to user ${userId}: ${rewards.lux || 0} LUX, ${rewards.manaCrystals || 0} Mana Crystals`);
    return true;
    
  } catch (error) {
    console.error(`Error distributing level ${level} rewards for user ${userId}:`, error);
    return false;
  }
}
