const itemsConfig = require('../utils/itemsConfig');

module.exports = {
  name: 'rare_crate',
  slot: '003',
  emoji: '<a:rare_crate:1375388778985951315>',
  async openCrate(userId, amount, message, db) {
    try {
      // Define crate items and their weights
      const crateItems = {
        'lux_3500': { name: '3500 Lux', weight: 72, type: 'lux', value: 3500 },
        'lux_5000': { name: '5000 Lux', weight: 69, type: 'lux', value: 5000 },
        'lux_6500': { name: '6500 Lux', weight: 67, type: 'lux', value: 6500 },
        'lux_7000': { name: '7000 Lux', weight: 62, type: 'lux', value: 7000 },
        'lux_8500': { name: '8500 Lux', weight: 60, type: 'lux', value: 8500 },
        'lux_10000': { name: '10000 Lux', weight: 59, type: 'lux', value: 10000 },
        'mana_crystal_7': { name: '7 Mana Crystals', weight: 81, type: 'mana_crystal', value: 7 },
        'mana_crystal_10': { name: '10 Mana Crystals', weight: 78, type: 'mana_crystal', value: 10 },
        'mana_crystal_14': { name: '14 Mana Crystals', weight: 76, type: 'mana_crystal', value: 14 },
        'mana_crystal_17': { name: '17 Mana Crystals', weight: 62, type: 'mana_crystal', value: 17 },
        'mana_crystal_20': { name: '20 Mana Crystals', weight: 60, type: 'mana_crystal', value: 20 },
        'mana_crystal_23': { name: '23 Mana Crystals', weight: 55, type: 'mana_crystal', value: 23 },
        'mana_crystal_25': { name: '25 Mana Crystals', weight: 50, type: 'mana_crystal', value: 25 },
        '010': { name: 'Background 010', weight: 25, type: 'item' },
        '011': { name: 'Background 011', weight: 25, type: 'item' },
        '004': { name: 'Legendary Crate', weight: 10, type: 'item' },
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
      console.error('Error in Rare Crate:', error);
      await message.reply(`Error opening Rare Crate: ${error.message}`);
      return false;
    }
  },
};