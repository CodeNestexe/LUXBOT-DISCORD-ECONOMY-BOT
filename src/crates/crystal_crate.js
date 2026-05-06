const itemsConfig = require('../utils/itemsConfig');

module.exports = {
  name: 'crystal_crate',
  slot: '008',
  emoji: '<a:crystal_crate:1375388724950728764>',
  async openCrate(userId, amount, message, db) {
    try {
      // Define crate items and their weights (UPDATED WITH NEW ITEMS AND WEIGHTS)
      const crateItems = {
        'mana_crystal_1': { name: '1 Mana Crystal', weight: 62, type: 'mana_crystal', value: 1, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_2': { name: '2 Mana Crystals', weight: 60, type: 'mana_crystal', value: 2, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_5': { name: '5 Mana Crystals', weight: 58, type: 'mana_crystal', value: 5, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_10': { name: '10 Mana Crystals', weight: 56, type: 'mana_crystal', value: 10, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_20': { name: '20 Mana Crystals', weight: 54, type: 'mana_crystal', value: 20, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_25': { name: '25 Mana Crystals', weight: 38, type: 'mana_crystal', value: 25, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_50': { name: '50 Mana Crystals', weight: 28, type: 'mana_crystal', value: 50, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_100': { name: '100 Mana Crystals', weight: 7, type: 'mana_crystal', value: 100, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_500': { name: '500 Mana Crystals', weight: 0.1, type: 'mana_crystal', value: 500, emoji: '<a:crystals:1379010491762081933>' },
        'mana_crystal_1000': { name: '1000 Mana Crystals', weight: 0.1, type: 'mana_crystal', value: 1000, emoji: '<a:crystals:1379010491762081933>' },
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
            return { itemId, name, type, value, emoji };
          }
        }
        // Fallback (should never happen with correct weights)
        const firstItem = Object.entries(crateItems)[0];
        return {
          itemId: firstItem[0],
          name: firstItem[1].name,
          type: firstItem[1].type,
          value: firstItem[1].value,
          emoji: firstItem[1].emoji,
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

      // **FIXED: Ensure user has proper numeric fields**
      if (typeof user.manaCrystals !== 'number') {
        await db.updateUser(userId, { manaCrystals: 0 });
        user.manaCrystals = 0;
      }

      let manaCrystals = user.manaCrystals || 0;

      // Process rewards and group them by value
      const groupedRewards = {};

      for (const reward of rewards) {
        if (reward.type === 'mana_crystal') {
          manaCrystals += reward.value;
          const key = `mana_crystal_${reward.value}`;
          if (!groupedRewards[key]) {
            groupedRewards[key] = { emoji: reward.emoji, value: reward.value, count: 0 };
          }
          groupedRewards[key].count++;
        }
      }

      // Update the user's manaCrystals in the database
      await db.updateUser(userId, {
        manaCrystals: manaCrystals,
      });

      // Format the reward message with emojis and superscript
      const rewardParts = [];
      
      Object.values(groupedRewards).forEach(group => {
        // Show emoji with total value in superscript
        const totalValue = group.value * group.count;
        rewardParts.push(`${group.emoji}${toSuperscript(totalValue)}`);
      });

      const rewardMessage = rewardParts.length > 0 ? rewardParts.join(' ') : 'nothing';

      // Send the response
      await message.reply(
        `**${message.author.username}** opens ${amount} ${this.emoji} crates\n` +
        `<a:opening:1375388258397061120> And got ${rewardMessage}`
      );

      return true; // Indicate success
    } catch (error) {
      console.error('Error in Crystal Crate:', error);
      await message.reply(`Error opening Crystal Crate: ${error.message}`);
      return false;
    }
  },
};
