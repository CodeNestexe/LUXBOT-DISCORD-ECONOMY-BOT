const itemsConfig = require('../utils/itemsConfig');

module.exports = {
  name: 'daily_crate',
  slot: '002',
  emoji: '<a:daily_crate:1375389184357044316>',
  async openCrate(userId, amount, message, db) {
    try {
      // **UPDATED: Crate items with correct reward types**
      const crateItems = {
        'lux_3000': { name: '3000 Lux', weight: 52, type: 'lux', value: 3000, emoji: '<:lux:1411637514569252894>' },
        'lux_3700': { name: '3700 Lux', weight: 50, type: 'lux', value: 3700, emoji: '<:lux:1411637514569252894>' },
        'lux_4000': { name: '4000 Lux', weight: 47, type: 'lux', value: 4000, emoji: '<:lux:1411637514569252894>' },
        'lux_4500': { name: '4500 Lux', weight: 42, type: 'lux', value: 4500, emoji: '<:lux:1411637514569252894>' },
        'lux_5000': { name: '5000 Lux', weight: 30, type: 'lux', value: 5000, emoji: '<:lux:1411637514569252894>' },
        'lux_6500': { name: '6500 Lux', weight: 28, type: 'lux', value: 6500, emoji: '<:lux:1411637514569252894>' },
        'lux_7800': { name: '7800 Lux', weight: 27, type: 'lux', value: 7800, emoji: '<:lux:1411637514569252894>' },
        'lux_8999': { name: '8999 Lux', weight: 26, type: 'lux', value: 8999, emoji: '<:lux:1411637514569252894>' },
        'lux_10000': { name: '10000 Lux', weight: 22, type: 'lux', value: 10000, emoji: '<:lux:1411637514569252894>' },
        'mana_crystal_2': { name: '2 Mana Crystals', weight: 70, type: 'mana_crystal', value: 2, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_4': { name: '4 Mana Crystals', weight: 68, type: 'mana_crystal', value: 4, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_6': { name: '6 Mana Crystals', weight: 62, type: 'mana_crystal', value: 6, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_8': { name: '8 Mana Crystals', weight: 59, type: 'mana_crystal', value: 8, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_9': { name: '9 Mana Crystals', weight: 43, type: 'mana_crystal', value: 9, emoji: '<a:crystals:1379010491762081933>' },
        '013': { name: 'Basic Stone', weight: 1, type: 'item', emoji: '<:basic_stone:1410589277494186044>' },
        '014': { name: 'Adept Stone', weight: 1, type: 'item', emoji: '<:adept_stone:1410589320263368774>' },
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
        for (const [itemId, { weight, name, type, value, emoji }] of Object.entries(crateItems)) {
          cumulative += weight;
          if (roll < cumulative) {
            return { itemId, name, type, value, emoji, actualItemId: itemId, quantity: 1 };
          }
        }
        // Fallback
        const firstItem = Object.entries(crateItems)[0];
        return {
          itemId: firstItem[0],
          name: firstItem[1].name,
          type: firstItem[1].type,
          value: firstItem[1].value,
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

      // **FIXED: Get user and ensure proper inventory structure**
      const user = await db.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // **FIXED: Ensure user has proper inventory structure**
      if (!Array.isArray(user.items) || user.items.length !== 50) {
        await db.repairUserInventory(userId);
      }

      // **FIXED: Process rewards by type - NO currency items in inventory**
      let totalLux = user.balance || 0;
      let totalManaCrystals = user.manaCrystals || 0;
      
      const groupedRewards = {};
      let successfulItemRewards = 0;
      let failedItemRewards = 0;

      for (const reward of rewards) {
        if (reward.type === 'lux') {
          // **FIXED: Add to balance, not inventory**
          totalLux += reward.value;
          const key = `lux_${reward.value}`;
          if (!groupedRewards[key]) {
            groupedRewards[key] = { emoji: reward.emoji, value: reward.value, count: 0, type: 'lux' };
          }
          groupedRewards[key].count++;
        } 
        else if (reward.type === 'mana_crystal') {
          // **FIXED: Add to mana crystals balance, not inventory**
          totalManaCrystals += reward.value;
          const key = `mana_crystal_${reward.value}`;
          if (!groupedRewards[key]) {
            groupedRewards[key] = { emoji: reward.emoji, value: reward.value, count: 0, type: 'mana_crystal' };
          }
          groupedRewards[key].count++;
        } 
        else if (reward.type === 'item') {
          // **FIXED: Add item to inventory using new 50-slot system**
          const success = await addItemToInventory(userId, reward.actualItemId, reward.quantity, db);
          
          if (success) {
            successfulItemRewards++;
            const key = `item_${reward.actualItemId}`;
            if (!groupedRewards[key]) {
              groupedRewards[key] = { emoji: reward.emoji, count: 0, type: 'item', name: reward.name };
            }
            groupedRewards[key].count++;
          } else {
            failedItemRewards++;
            console.log(`Failed to add ${reward.name} to inventory for user ${userId} - inventory might be full`);
          }
        }
      }

      // **FIXED: Update user balances with all totals at once**
      await db.updateUser(userId, {
        balance: totalLux,
        manaCrystals: totalManaCrystals,
      });

      // **FIXED: Format the reward message with proper grouping**
      const rewardParts = [];
      
      Object.values(groupedRewards).forEach(group => {
        if (group.type === 'lux' || group.type === 'mana_crystal') {
          // For currency: show emoji with total value in superscript
          const totalValue = group.value * group.count;
          rewardParts.push(`${group.emoji}${toSuperscript(totalValue)}`);
        } else if (group.type === 'item') {
          // For items: show emoji with count in superscript
          rewardParts.push(`${group.emoji}${toSuperscript(group.count)}`);
        }
      });

      let rewardMessage = rewardParts.length > 0 ? rewardParts.join(' ') : 'nothing';
      
      // **ENHANCED: Add warning if some rewards failed**
      let warningMessage = '';
      if (failedItemRewards > 0) {
        warningMessage = `\n⚠️ ${failedItemRewards} item${failedItemRewards > 1 ? 's' : ''} could not be added (inventory full)`;
      }

      // Send the response
      await message.reply(
        `**${message.author.username}** opens ${amount} ${this.emoji} crates\n` +
        `<a:opening:1375388258397061120> And got ${rewardMessage}${warningMessage}`
      );

      return true; // Indicate success
    } catch (error) {
      console.error('Error in Daily Crate:', error);
      await message.reply(`Error opening Daily Crate: ${error.message}`);
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

    // **ENHANCED: Try to stack with existing item first**
    for (let slot = 0; slot < user.items.length; slot++) {
      const slotItem = user.items[slot];
      if (slotItem && slotItem.id === itemId) {
        // Found existing item, add to its amount
        const newAmount = (slotItem.amount || 1) + quantity;
        await usersCollection.updateOne(
          { userId },
          { $set: { [`items.${slot}.amount`]: newAmount } }
        );
        return true;
      }
    }

    // **FALLBACK: Find first empty slot for new item**
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
      source: 'daily_crate'
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
