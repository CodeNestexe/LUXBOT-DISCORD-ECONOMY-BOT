const itemsConfig = require('../utils/itemsConfig');

module.exports = {
  name: 'magic_crate',
  slot: '007',
  emoji: '<a:magic_crate:1375391772699656203>',
  async openCrate(userId, amount, message, db) {
    try {
      // **UPDATED: Crate items with correct weights and IDs**
      const crateItems = {
        '013': { name: 'Basic Stone', weight: 56, type: 'item', emoji: '<:basic_stone:1410589277494186044>' },
        '014': { name: 'Adept Stone', weight: 50, type: 'item', emoji: '<:adept_stone:1410589320263368774>' },
        '015': { name: 'Master Stone', weight: 38, type: 'item', emoji: '<:master_stone:1410589354660728922>' },
        '016': { name: 'Elite Stone', weight: 22, type: 'item', emoji: '<:elite_stone:1410589401574277171>' },
        '011': { name: 'Background 011', weight: 16, type: 'item', emoji: '<a:lux_backgrounds:1377824626733744189>' },
        '010': { name: 'Background 010', weight: 8, type: 'item', emoji: '<a:lux_backgrounds:1377824626733744189>' },
        '017': { name: 'Prime Stone', weight: 1, type: 'item', emoji: '<:prime_stone:1410589447598243850>' },
        '012': { name: 'Mana Zone', weight: 0.1, type: 'item', emoji: '<a:mana_zone:1376890534806683758>' },
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
        for (const [itemId, { weight, name, type, emoji }] of Object.entries(crateItems)) {
          cumulative += weight;
          if (roll < cumulative) {
            return { itemId, name, type, emoji, actualItemId: itemId, quantity: 1 };
          }
        }
        // Fallback (should never happen with correct weights)
        const firstItem = Object.entries(crateItems)[0];
        return {
          itemId: firstItem[0],
          name: firstItem[1].name,
          type: firstItem[1].type,
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

      // **FIXED: Process rewards using new inventory system**
      const groupedRewards = {};
      let successfulRewards = 0;
      let failedRewards = 0;

      for (const reward of rewards) {
        if (reward.type === 'item') {
          // **FIXED: Add item to inventory using new 50-slot system**
          const success = await addItemToInventory(userId, reward.actualItemId, reward.quantity, db);
          
          if (success) {
            successfulRewards++;
            const key = `item_${reward.actualItemId}`;
            if (!groupedRewards[key]) {
              groupedRewards[key] = { emoji: reward.emoji, count: 0, name: reward.name };
            }
            groupedRewards[key].count++;
          } else {
            failedRewards++;
            console.log(`Failed to add ${reward.name} to inventory for user ${userId} - inventory might be full`);
          }
        }
      }

      // **FIXED: Format the reward message with proper grouping**
      const rewardParts = [];
      
      Object.values(groupedRewards).forEach(group => {
        // Show emoji with count in superscript
        rewardParts.push(`${group.emoji}${toSuperscript(group.count)}`);
      });

      let rewardMessage = rewardParts.length > 0 ? rewardParts.join(' ') : 'nothing';
      
      // **ENHANCED: Add warning if some rewards failed**
      let warningMessage = '';
      if (failedRewards > 0) {
        warningMessage = `\n⚠️ ${failedRewards} item${failedRewards > 1 ? 's' : ''} could not be added (inventory full)`;
      }

      // Send the response
      await message.reply(
        `**${message.author.username}** opens ${amount} ${this.emoji} crates\n` +
        `<a:opening:1375388258397061120> And got ${rewardMessage}${warningMessage}`
      );

      return true; // Indicate success
    } catch (error) {
      console.error('Error in Magic Crate:', error);
      await message.reply(`Error opening Magic Crate: ${error.message}`);
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
      source: 'magic_crate'
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
