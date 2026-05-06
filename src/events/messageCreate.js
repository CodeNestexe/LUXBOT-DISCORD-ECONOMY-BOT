const { EmbedBuilder } = require('discord.js');
const levelTimeDatabase = require('../levelTimeDatabase.js');
const { generateLevelImage } = require('../utils/generateLevelImage.js');
const userCache = require('../utils/userCache.js'); // 🚀 Import cache system

module.exports = {
  name: 'messageCreate',

  async execute(message, db) {
    if (message.author.bot || !message.guild) return;

    try {
      const userId = message.author.id;
      
      // 🚀 STEP 1: Check cache first (LIGHTNING FAST - 0.001ms)
      const cacheResult = userCache.checkUser(userId);
      
      if (cacheResult === 'UNREGISTERED') {
        // User is definitely not registered - skip instantly with zero database calls
        return;
      }
      
      if (cacheResult === 'REGISTERED') {
        // User is definitely registered - process XP directly
        await this.processXPGain(userId, db, message);
        return;
      }
      
      // 🔍 STEP 2: Cache miss - ULTRA-SAFE direct database check (NO RETRY SPAM)
      let user;
      try {
        const dbInstance = await db.getDB();
        
        // 🛡️ ULTRA SAFE: Direct query with complete validation
        user = await dbInstance.collection('users').findOne({ 
          $and: [
            { userId: userId },
            { userId: { $exists: true, $ne: null } },
            { registered: true },
            { balance: { $exists: true, $ne: null } },
            { xp: { $exists: true, $ne: null } },
            { items: { $exists: true, $type: "array" } }
          ]
        });
        
      } catch (error) {
        // Silent fail - no console spam, just cache as unregistered
        userCache.cacheUnregistered(userId);
        return;
      }

      if (!user) {
        // Cache as unregistered for 30 minutes
        userCache.cacheUnregistered(userId);
        return;
      }

      // Cache as registered for 24 hours
      userCache.cacheRegistered(userId);

      // Process XP gain
      await this.processXPGain(userId, db, message);
      
    } catch (error) {
      console.error('Error in messageCreate event:', error.message);
    }
  },
  
  // 🎯 XP Processing Logic (OPTIMIZED)
  async processXPGain(userId, db, message) {
    try {
      // Get user data (this will be fast since user is cached as registered)
      const user = await db.getUser(userId);
      if (!user || !user.registered) return;

      const xpToAdd = 20;
      const oldLevel = levelTimeDatabase.calculateLevel(user.xp || 0);

      // Award XP with daily cap check
      const xpAwarded = await db.addXP(userId, xpToAdd, 'regular');
      if (xpAwarded === 0) {
        // User hit daily XP cap - no XP awarded
        return;
      }

      // Small delay to ensure database update is committed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get updated user data after XP addition
      const updatedUser = await db.getUser(userId);
      if (!updatedUser) {
        console.error(`User became null after XP addition: ${userId}`);
        return;
      }
      
      // Calculate new level based on updated XP
      const newLevel = levelTimeDatabase.calculateLevel(updatedUser.xp);
      
      // Update level field to match XP-based calculation
      await db.updateUser(userId, { level: newLevel });
      updatedUser.level = newLevel;

      // Check for level up
      if (newLevel > oldLevel) {
        console.log(`🎉 User ${userId} leveled up from ${oldLevel} to ${newLevel}`);
        await this.handleLevelUp(updatedUser, newLevel, oldLevel, message, db);
      }
      
    } catch (error) {
      console.error('Error processing XP gain:', error);
    }
  },
  
  // 🎉 Level Up Handler (COMPLETE WITH REWARDS)
  async handleLevelUp(user, newLevel, oldLevel, message, db) {
    try {
      const rewards = levelTimeDatabase.getRewards(newLevel);
      if (!rewards) return;

      // Apply level up rewards
      await db.updateUser(user.userId, {
        balance: (user.balance || 0) + (rewards.lux || 0),
      });

      // Add bonus rewards
      if (rewards.manaPoints) await db.addManaPoints(user.userId, rewards.manaPoints);
      if (rewards.manaCrystals) await db.addManaCrystals(user.userId, rewards.manaCrystals);

      // Add item rewards
      if (rewards.items) {
        for (const [itemId, quantity] of Object.entries(rewards.items)) {
          await db.addItem(user.userId, itemId, quantity);
        }
      }

      // Format reward message
      const rewardMessage = [
        rewards.lux ? `${rewards.lux} Lux` : null,
        rewards.manaPoints ? `${rewards.manaPoints} Mana Points` : null,
        rewards.manaCrystals ? `${rewards.manaCrystals} <a:crystals:1379010491762081933> Mana Crystals` : null,
        rewards.items
          ? Object.entries(rewards.items)
              .map(([itemId, quantity]) => `${levelTimeDatabase.itemNames[itemId]} x${quantity}`)
              .join(', ')
          : null,
      ]
        .filter(Boolean)
        .join(', ');

      // Prepare level up notification
      const displayName = message.member?.displayName || message.author.username;
      const avatarURL = message.author.displayAvatarURL({ size: 128, format: 'png' });
      
      // Get progress data for level up image
      const progress = await levelTimeDatabase.getLevelProgress(user.userId);
      const xpCurrent = progress.xpProgress;
      const xpTotal = progress.xpNeeded;
      
      // Get rank data
      const rankData = await levelTimeDatabase.getRank(user.userId);
      const rank = `${rankData.rank}/${rankData.totalUsers}`;
      
      // Generate level up image
      const imageAttachment = await generateLevelImage(displayName, newLevel, rank, xpCurrent, xpTotal, avatarURL);

      // Create level up embed
      const embed = new EmbedBuilder()
        .setTitle('🎉 Congratulations! You leveled up!')
        .setDescription(`You're now **Level ${newLevel}**!
**Rewards:** ${rewardMessage}`)
        .setColor('#00FF00')
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });

      // Send level up notification
      await message.channel.send({ embeds: [embed], files: [imageAttachment] });
      
      console.log(`✅ Level up notification sent for user ${user.userId} (Level ${newLevel})`);
      
    } catch (error) {
      console.error('Error handling level up:', error);
    }
  }
};