const itemsConfig = require('../utils/itemsConfig');

module.exports = {
  name: 'legendary_crate',
  slot: '004',
  emoji: '<a:legendary_crate:1375388503512191057>',
  async openCrate(userId, amount, message, db) {
    try {
      // Define crate items and their weights
      const crateItems = {
        'lux_10000': { name: '10000 Lux', weight: 81, type: 'lux', value: 10000 },
        'lux_15000': { name: '15000 Lux', weight: 72, type: 'lux', value: 15000 },
        'lux_23000': { name: '23000 Lux', weight: 71, type: 'lux', value: 23000 },
        'lux_25000': { name: '25000 Lux', weight: 69, type: 'lux', value: 25000 },
        'lux_35000': { name: '35000 Lux', weight: 59, type: 'lux', value: 35000 },
        'lux_50000': { name: '50000 Lux', weight: 51, type: 'lux', value: 50000 },
        'mana_crystal_35': { name: '35 Mana Crystals', weight: 85, type: 'mana_crystal', value: 35 },
        'mana_crystal_45': { name: '45 Mana Crystals', weight: 74, type: 'mana_crystal', value: 45 },
        'mana_crystal_50': { name: '50 Mana Crystals', weight: 63, type: 'mana_crystal', value: 50 },
        'mana_crystal_75': { name: '75 Mana Crystals', weight: 61, type: 'mana_crystal', value: 75 },
        'mana_crystal_100': { name: '100 Mana Crystals', weight: 41, type: 'mana_crystal', value: 100 },
        '010': { name: 'Background 010', weight: 25, type: 'item' },
        '011': { name: 'Background 011', weight: 15, type: 'item' },
        '012': { name: 'Mana Zone', weight: 5, type: 'item' },
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
        for (const [itemId, { weight, name, type, value, itemId: actualItemId, quantity }] of Object.entries(crateItems)) {
          cumulative += weight;
          if (roll < cumulative) {
            return { itemId, name, type, value, actualItemId: actualItemId || itemId, quantity: quantity || 1 };
          }
        }
        // Fallback (should never happen with correct weights)
        const firstItem = Object.entries(crateItems)[0];
        return {
          itemId: firstItem[0],
          name: firstItem[1].name,
          type: firstItem[1].type,
          value: firstItem[1].value,
          actualItemId: firstItem[1].itemId || firstItem[0],
          quantity: firstItem[1].quantity || 1,
        };
      };

      // Roll for each crate
      const rewards = [];
      for (let i = 0; i < amount; i++) {
        const result = rollForItem();
        rewards.push(result);
      }

      // Fetch the user's current balance and manaCrystals
      const user = await db.getUser(userId);
      let balance = user.balance || 0;
      let manaCrystals = user.manaCrystals || 0;

      // Process rewards (add Lux, Mana Crystals, or items to inventory)
      const rewardCounts = {};
      for (const reward of rewards) {
        rewardCounts[reward.itemId] = (rewardCounts[reward.itemId] || 0) + 1;

        if (reward.type === 'lux') {
          // Increment Lux (balance) manually
          balance += reward.value * rewardCounts[reward.itemId];
        } else if (reward.type === 'mana_crystal') {
          // Increment Mana Crystals manually
          manaCrystals += reward.value * rewardCounts[reward.itemId];
        } else if (reward.type === 'item') {
          // Add item to inventory
          await db.addItem(userId, reward.actualItemId, reward.quantity * rewardCounts[reward.itemId]);
        }
      }

      // Update the user's balance and manaCrystals in the database
      await db.updateUser(userId, {
        balance: balance,
        manaCrystals: manaCrystals,
      });

      // Format the reward message
      const rewardSummary = Object.entries(rewardCounts)
        .map(([itemId, count]) => `${crateItems[itemId].name} x${count}`)
        .join(', ');
      const rewardMessage = rewardSummary;

      // Send the response
      await message.reply(
        `**${message.author.username}** opens ${amount} ${this.emoji} crates\n` +
        `<a:opening:1375388258397061120> And got ${rewardMessage}`
      );

      return true; // Indicate success
    } catch (error) {
      console.error('Error in Legendary Crate:', error);
      await message.reply(`Error opening Legendary Crate: ${error.message}`);
      return false;
    }
  },
};