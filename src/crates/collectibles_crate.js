const itemsConfig = require('../utils/itemsConfig');

module.exports = {
  name: 'collectibles_crate',
  slot: '009',
  emoji: '<a:collectibles_crate:1375389071110574120>',
  async openCrate(userId, amount, message, db) {
    try {
      // Define crate items and their weights
      const crateItems = {
        '010': { name: 'Background 010', weight: 11 }, // Weight of 11
        '011': { name: 'Background 011', weight: 5 },  // Weight of 5
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
        for (const [itemId, { weight, name }] of Object.entries(crateItems)) {
          cumulative += weight;
          if (roll < cumulative) {
            return { itemId, name };
          }
        }
        // Fallback (should never happen with correct weights)
        const firstItem = Object.entries(crateItems)[0];
        return { itemId: firstItem[0], name: firstItem[1].name };
      };

      // Roll for each crate
      const rewards = [];
      for (let i = 0; i < amount; i++) {
        const result = rollForItem();
        rewards.push(result);
      }

      // Add rewarded items to the user's inventory
      const rewardCounts = {};
      for (const reward of rewards) {
        rewardCounts[reward.itemId] = (rewardCounts[reward.itemId] || 0) + 1;
        await db.addItem(userId, reward.itemId, 1);
      }

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
      console.error('Error in Collectibles Crate:', error);
      await message.reply(`Error opening Collectibles Crate: ${error.message}`);
      return false;
    }
  },
};