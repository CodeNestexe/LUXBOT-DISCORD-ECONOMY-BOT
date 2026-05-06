const itemsConfig = require('../utils/itemsConfig');

module.exports = {
  name: 'vote_crate',
  slot: '001',
  emoji: '<a:vote_crate:1375388998721077359>',
  async openCrate(userId, amount, message, db) {
    try {
      // **UPDATED: Crate items with correct reward handling**
      const crateItems = {
        'lux_1000': { name: '1000 Lux', weight: 62, type: 'lux', value: 1000, emoji: '<:lux:1411637514569252894>' },
        'lux_3000': { name: '3000 Lux', weight: 61, type: 'lux', value: 3000, emoji: '<:lux:1411637514569252894>' },
        'lux_5000': { name: '5000 Lux', weight: 59, type: 'lux', value: 5000, emoji: '<:lux:1411637514569252894>' },
        'lux_7000': { name: '7000 Lux', weight: 45, type: 'lux', value: 7000, emoji: '<:lux:1411637514569252894>' },
        'lux_10000': { name: '10000 Lux', weight: 40, type: 'lux', value: 10000, emoji: '<:lux:1411637514569252894>' },
        'mana_crystal_5': { name: '5 Mana Crystals', weight: 60, type: 'mana_crystal', value: 5, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_10': { name: '10 Mana Crystals', weight: 63, type: 'mana_crystal', value: 10, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_15': { name: '15 Mana Crystals', weight: 56, type: 'mana_crystal', value: 15, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_25': { name: '25 Mana Crystals', weight: 51, type: 'mana_crystal', value: 25, emoji: '<a:crystals:1379010491762081933>' },
        'mana_point_100': { name: '100 Mana Points', weight: 78, type: 'mana_point', value: 100, emoji: '<a:mana:1411641046873542709>' },
        'mana_point_700': { name: '700 Mana Points', weight: 65, type: 'mana_point', value: 700, emoji: '<a:mana:1411641046873542709>' },
        'mana_point_1000': { name: '1000 Mana Points', weight: 42, type: 'mana_point', value: 1000, emoji: '<a:mana:1411641046873542709>' },
        'level_xp_boost': { name: '2x Level XP Code (10min)', weight: 25, type: 'buff', buffType: 'levelXPBoost', duration: 10 * 60 * 1000, emoji: '<:2x_boost:1411637847508647976>' },
        // **UPDATED: Items with correct IDs for new inventory system**
        '002': { name: 'Daily Crate', weight: 20, type: 'item', emoji: '<a:daily_crate:1375389184357044316>' },
        '012': { name: 'Mana Zone', weight: 2, type: 'item', emoji: '<a:mana_zone:1376890534806683758>' },
        '013': { name: 'Basic Stone', weight: 0.1, type: 'item', emoji: '<:basic_stone:1410589277494186044>' },
        '014': { name: 'Adept Stone', weight: 0.1, type: 'item', emoji: '<:adept_stone:1410589320263368774>' },
      };

      // Unicode superscript characters for displaying values
      const superscriptMap = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
      };

      const toSuperscript = (num) => {
        return num.toString().split('').map(digit => superscriptMap[digit] || digit).join('');
      };

      // Calculate total weight
      const totalWeight = Object.values(crateItems).reduce((sum, { weight }) => sum + weight, 0);
      if (totalWeight <= 0) {
        throw new Error('Total weight must be greater than 0');
      }

      // Function to roll for an item based on weights
      const rollForItem = () => {
        const roll = Math.random() * totalWeight;
        let cumulative = 0;
        for (const [itemId, { weight, name, type, value, buffType, duration, emoji }] of Object.entries(crateItems)) {
          cumulative += weight;
          if (roll < cumulative) {
            return { itemId, name, type, value, buffType, duration, emoji, actualItemId: itemId, quantity: 1 };
          }
        }
        // Fallback
        const firstItem = Object.entries(crateItems)[0];
        return {
          itemId: firstItem[0],
          name: firstItem[1].name,
          type: firstItem[1].type,
          value: firstItem[1].value,
          buffType: firstItem[1].buffType,
          duration: firstItem[1].duration,
          emoji: firstItem[1].emoji,
          actualItemId: firstItem[0],
          quantity: 1,
        };
      };

      // Roll for each crate
      const rewards = [];
      for (let i = 0; i < amount; i++) {
        const result = rollForItem();
        rewards.push(result);
      }

      // **FIXED: Get user and ensure proper data structure**
      const user = await db.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // **FIXED: Ensure user has proper inventory structure**
      if (!Array.isArray(user.items) || user.items.length !== 50) {
        await db.repairUserInventory(userId);
      }

      // **FIXED: Initialize totals for different reward types**
      let totalLux = user.balance || 0;
      let totalManaCrystals = user.manaCrystals || 0;
      let totalManaPoints = user.manaPoints || 0;
      
      const groupedRewards = {};
      const buffRewards = [];
      const failedBuffs = [];

      // **FIXED: Process rewards by type without adding currency to inventory**
      for (const reward of rewards) {
        if (reward.type === 'lux') {
          totalLux += reward.value;
          const key = `lux_${reward.value}`;
          if (!groupedRewards[key]) {
            groupedRewards[key] = { emoji: reward.emoji, value: reward.value, count: 0, type: 'lux' };
          }
          groupedRewards[key].count++;
        } 
        else if (reward.type === 'mana_crystal') {
          // **FIXED: Add to mana crystals balance, NOT inventory**
          totalManaCrystals += reward.value;
          const key = `mana_crystal_${reward.value}`;
          if (!groupedRewards[key]) {
            groupedRewards[key] = { emoji: reward.emoji, value: reward.value, count: 0, type: 'mana_crystal' };
          }
          groupedRewards[key].count++;
        } 
        else if (reward.type === 'mana_point') {
          // **FIXED: Add to mana points balance, NOT inventory**
          totalManaPoints += reward.value;
          const key = `mana_point_${reward.value}`;
          if (!groupedRewards[key]) {
            groupedRewards[key] = { emoji: reward.emoji, value: reward.value, count: 0, type: 'mana_point' };
          }
          groupedRewards[key].count++;
        } 
        else if (reward.type === 'buff') {
          // Check if the user already has an active buff of this type
          if (user.buffs?.[reward.buffType]?.active) {
            failedBuffs.push(reward);
          } else {
            // Apply the buff
            const startTime = new Date();
            await db.updateUser(userId, {
              [`buffs.${reward.buffType}`]: {
                active: true,
                startTime: startTime.toISOString(),
                duration: reward.duration,
              },
            });
            buffRewards.push({ emoji: reward.emoji, name: reward.name, count: 1 });
          }
        } 
        else if (reward.type === 'item') {
          // **FIXED: Add item to inventory using new system**
          const success = await addItemToInventory(userId, reward.actualItemId, reward.quantity, db);
          if (success) {
            const key = `item_${reward.actualItemId}`;
            if (!groupedRewards[key]) {
              groupedRewards[key] = { emoji: reward.emoji, value: 1, count: 0, type: 'item', name: reward.name };
            }
            groupedRewards[key].count++;
          }
        }
      }

      // **FIXED: Update user balances with all totals at once**
      await db.updateUser(userId, {
        balance: totalLux,
        manaCrystals: totalManaCrystals,
        manaPoints: totalManaPoints,
      });

      // **FIXED: Format the reward message with proper grouping**
      const rewardParts = [];
      
      // Add grouped rewards (currency and items)
      Object.values(groupedRewards).forEach(group => {
        if (group.type === 'lux' || group.type === 'mana_crystal' || group.type === 'mana_point') {
          // For currency: show emoji with total value in superscript
          const totalValue = group.value * group.count;
          rewardParts.push(`${group.emoji}${toSuperscript(totalValue)}`);
        } else if (group.type === 'item') {
          // For items: show emoji with count in superscript
          rewardParts.push(`${group.emoji}${toSuperscript(group.count)}`);
        }
      });

      // Add buff rewards
      buffRewards.forEach(buff => {
        rewardParts.push(`${buff.emoji}${toSuperscript(buff.count)}`);
      });

      const rewardMessage = rewardParts.length > 0 ? rewardParts.join(' ') : 'nothing (some buffs were not applied due to active effects)';

      // **ENHANCED: Show warning for failed buffs**
      let warningMessage = '';
      if (failedBuffs.length > 0) {
        const buffNames = failedBuffs.map(buff => buff.name).join(', ');
        warningMessage = `\n⚠️ Some buffs (${buffNames}) were not applied because they're already active.`;
      }

      // Send the response
      await message.reply(
        `**${message.author.username}** opens ${amount} ${this.emoji} crates\n` +
        `<a:opening:1375388258397061120> And got ${rewardMessage}${warningMessage}`
      );

      return true; // Indicate success
    } catch (error) {
      console.error('Error in Vote Crate:', error);
      await message.reply(`Error opening Vote Crate: ${error.message}`);
      return false;
    }
  },
};

// **NEW: Helper function to add items to inventory using 50-slot system**
async function addItemToInventory(userId, itemId, quantity, db) {
  try {
    const dbInstance = await db.getDB();
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
      return false; // No empty slots
    }
    
    // Get item config
    const itemsConfig = require('../utils/itemsConfig');
    const itemConfig = itemsConfig.items[itemId];
    
    if (!itemConfig) {
      console.log(`Unknown item ID: ${itemId}`);
      return false;
    }
    
    // Add new item to empty slot
    const itemData = {
      id: itemId,
      name: itemConfig.name,
      emoji: itemConfig.emoji,
      amount: quantity,
      addedAt: new Date(),
      source: 'vote_crate'
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
