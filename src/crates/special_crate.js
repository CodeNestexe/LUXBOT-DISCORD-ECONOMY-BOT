const itemsConfig = require('../utils/itemsConfig');

// Helper function to add items to inventory
async function addItemToInventory(userId, itemId, amount, db) {
  const dbInstance = await db.getDB();
  const usersCollection = dbInstance.collection('users');
  
  const user = await usersCollection.findOne({ userId });
  if (!user || !user.items) return false;
  
  // Check if item already exists in inventory, stack it
  for (let slot = 0; slot < user.items.length; slot++) {
    const slotItem = user.items[slot];
    if (slotItem && slotItem.id === itemId) {
      const newAmount = (slotItem.amount || 1) + amount;
      await usersCollection.updateOne(
        { userId },
        { $set: { ['items.' + slot + '.amount']: newAmount } }
      );
      return true;
    }
  }
  
  // Find first empty slot if item doesn't exist
  for (let slot = 0; slot < user.items.length; slot++) {
    if (user.items[slot] === null || user.items[slot] === undefined) {
      const itemData = {
        id: itemId,
        name: itemsConfig.items[itemId].name,
        emoji: itemsConfig.items[itemId].emoji,
        amount: amount,
        addedAt: new Date()
      };
      
      await usersCollection.updateOne(
        { userId },
        { $set: { ['items.' + slot]: itemData } }
      );
      return true;
    }
  }
  
  return false; // No empty slots
}

module.exports = {
  name: 'special_crate',
  slot: '005',
  emoji: '<a:special_crate:1375388931016626177>',
  async openCrate(userId, amount, message, db) {
    try {
      // Define crate items and their weights
      const crateItems = {
        'token_1': { name: '1 Event Token', weight: 40, type: 'event_token', value: 1, emoji: '<:lux_ticket:1425455943134478426>' },
        'token_4': { name: '4 Event Tokens', weight: 35, type: 'event_token', value: 4, emoji: '<:lux_ticket:1425455943134478426>' },
        'token_10': { name: '10 Event Tokens', weight: 15, type: 'event_token', value: 10, emoji: '<:lux_ticket:1425455943134478426>' },
        'token_25': { name: '25 Event Tokens', weight: 7, type: 'event_token', value: 25, emoji: '<:lux_ticket:1425455943134478426>' },
        'token_50': { name: '50 Event Tokens', weight: 2, type: 'event_token', value: 50, emoji: '<:lux_ticket:1425455943134478426>' },
        'token_100': { name: '100 Event Tokens', weight: 1, type: 'event_token', value: 100, emoji: '<:lux_ticket:1425455943134478426>' },
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
      const totalWeight = Object.values(crateItems).reduce((sum, item) => sum + item.weight, 0);
      if (totalWeight <= 0) {
        throw new Error('Total weight must be greater than 0');
      }

      // Function to roll for an item based on weights
      const rollForItem = () => {
        const roll = Math.random() * totalWeight;
        let cumulative = 0;
        for (const [itemId, itemData] of Object.entries(crateItems)) {
          cumulative += itemData.weight;
          if (roll < cumulative) {
            return { itemId, name: itemData.name, type: itemData.type, value: itemData.value, emoji: itemData.emoji };
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

      // Get user and ensure proper data structure
      const user = await db.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Process rewards and group them by value
      const groupedRewards = {};

      for (const reward of rewards) {
        if (reward.type === 'event_token') {
          // Add tokens to inventory
          const success = await addItemToInventory(userId, '018', reward.value, db);
          if (!success) {
            console.error('Failed to add tokens to inventory for user ' + userId);
          }
          
          const key = 'token_' + reward.value;
          if (!groupedRewards[key]) {
            groupedRewards[key] = { emoji: reward.emoji, value: reward.value, count: 0 };
          }
          groupedRewards[key].count++;
        }
      }

      // Format the reward message with emojis and superscript
      const rewardParts = [];
      
      Object.values(groupedRewards).forEach(group => {
        // Show emoji with total value in superscript
        const totalValue = group.value * group.count;
        rewardParts.push(group.emoji + toSuperscript(totalValue));
      });

      const rewardMessage = rewardParts.length > 0 ? rewardParts.join(' ') : 'nothing';

      // Send the response
      await message.reply(
        '**' + message.author.username + '** opens ' + amount + ' ' + this.emoji + ' crates\n' +
        '<a:opening:1375388258397061120> And got ' + rewardMessage
      );

      return true; // Indicate success
    } catch (error) {
      console.error('Error in Special Crate:', error);
      console.error('Stack trace:', error.stack);
      await message.reply('❌ Error opening Special Crate: ' + error.message);
      return false;
    }
  },
};