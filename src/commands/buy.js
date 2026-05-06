const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'buy',
  aliases: [],
  async execute(message, args, db) {
    try {
      if (!args[0]) {
        return message.reply('Please specify an item ID to buy. Example: `X buy 002`');
      }
      
      const shopId = args[0];
      const currentShopItems = await getCurrentShopItems(db);
      const item = currentShopItems.find(shopItem => shopItem.id === shopId);
      
      if (!item) {
        return message.reply('❌ Invalid item ID or item is not currently available in the shop. Use `X shop` to see available items.');
      }
      
      let user = await db.getUser(message.author.id);
      if (!user) {
        return message.reply('❌ Please accept the Terms of Service first!');
      }
      
      // Repair user data if needed
      const dbInstance = await db.getDB();
      const usersCollection = dbInstance.collection('users');
      let needsRepair = false;
      const repairData = {};
      
      if (!Array.isArray(user.items) || user.items.length !== 50) {
        repairData.items = Array(50).fill(null);
        needsRepair = true;
      }
      
      if (typeof user.balance !== 'number') {
        repairData.balance = 0;
        needsRepair = true;
      }
      
      if (typeof user.manaCrystals !== 'number') {
        repairData.manaCrystals = 0;
        needsRepair = true;
      }
      
      if (needsRepair) {
        await usersCollection.updateOne({ userId: user.userId }, { $set: repairData });
        user = { ...user, ...repairData };
      }
      
      // **🔧 FIXED: Backward compatibility for old shop data**
      const basePrice = item.basePrice || item.price || 0;
      const totalPrice = basePrice * (item.amount || 1);
      
      // Check balance
      let userCurrency = 0;
      let currencyEmoji = '';
      let currencyField = '';
      
      if (item.priceType === 'lux') {
        userCurrency = user.balance || 0;
        currencyEmoji = '<:lux:1411637514569252894>';
        currencyField = 'balance';
      } else {
        userCurrency = user.manaCrystals || 0;
        currencyEmoji = '<a:crystals:1379010491762081933>';
        currencyField = 'manaCrystals';
      }
      
      // Check against total price
      if (userCurrency < totalPrice) {
        return message.reply(`❌ You need ${totalPrice.toLocaleString()} ${currencyEmoji} to buy **${item.name}**${item.amount > 1 ? ` x${item.amount}` : ''}, but you only have ${userCurrency.toLocaleString()} ${currencyEmoji}.`);
      }
      
      // **SPECIAL: Handle Mana Crystals purchase (currency, not inventory item)**
      if (item.id === '001' || item.isCurrency) {
        const crystalsToAdd = item.amount || 1;
        const newBalance = userCurrency - totalPrice;
        
        const updateQuery = {
          [currencyField]: newBalance,
          manaCrystals: (user.manaCrystals || 0) + crystalsToAdd
        };
        
        await usersCollection.updateOne({ userId: user.userId }, { $set: updateQuery });
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Mana Crystals Purchased!')
          .setDescription(
            `You bought **${crystalsToAdd}** ${item.emoji} **${item.name}** for ${totalPrice.toLocaleString()} ${currencyEmoji}!\n\n` +
            `💰 **New Balance:** ${newBalance.toLocaleString()} ${currencyEmoji}\n` +
            `💎 **Total Crystals:** ${((user.manaCrystals || 0) + crystalsToAdd).toLocaleString()} <a:crystals:1379010491762081933>`
          )
          .setColor('#800080')
          .setTimestamp();
          
        await message.reply({ embeds: [embed] });
        return;
      }
      
      // **REGULAR: Handle inventory items**
      let emptySlot = -1;
      for (let i = 0; i < user.items.length; i++) {
        if (user.items[i] === null || user.items[i] === undefined) {
          emptySlot = i;
          break;
        }
      }
      
      if (emptySlot === -1) {
        return message.reply('❌ Your inventory is full! Please clear some space first.');
      }
      
      const itemData = {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        amount: item.amount || 1,
        purchasedAt: new Date(),
        type: getItemType(item.id)
      };
      
      const updateQuery = {
        [`items.${emptySlot}`]: itemData
      };
      
      // Deduct total price
      updateQuery[currencyField] = userCurrency - totalPrice;
      
      const result = await usersCollection.updateOne(
        { userId: user.userId },
        { $set: updateQuery }
      );
      
      if (result.modifiedCount === 0) {
        return message.reply('❌ Failed to purchase item. Please try again.');
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Purchase Successful!')
        .setDescription(
          `You bought ${item.emoji} **${item.name}**${item.amount > 1 ? ` x${item.amount}` : ''} for ${totalPrice.toLocaleString()} ${currencyEmoji}!\n` +
          `You now have ${(userCurrency - totalPrice).toLocaleString()} ${currencyEmoji} remaining.`
        )
        .addFields(
          { name: '📦 Item', value: `${item.emoji} ${item.name}${item.amount > 1 ? ` x${item.amount}` : ''}`, inline: true },
          { name: '💰 Cost', value: `${totalPrice.toLocaleString()} ${currencyEmoji}`, inline: true },
          { name: '📍 Slot', value: `${emptySlot}`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();
        
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in buy command:', error);
      await message.reply(`❌ Error buying item: ${error.message}`);
    }
  },
};

// Helper functions
async function getCurrentShopItems(db) {
  const dbInstance = await db.getDB();
  const shopCollection = dbInstance.collection('currentShop');
  
  const currentResetPeriod = getCurrentResetPeriod();
  let shopData = await shopCollection.findOne({ resetPeriod: currentResetPeriod });
  
  if (!shopData) {
    return [];
  }
  
  return shopData.items;
}

function getCurrentResetPeriod() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const resetPeriod = Math.floor(utcHours / 6);
  return `${now.toISOString().split('T')[0]}_${resetPeriod}`;
}

function getItemType(itemId) {
  const typeMap = {
    '001': 'crate',
    '002': 'crate',
    '003': 'crate', 
    '004': 'crate',
    '005': 'crate',
    '006': 'crate',
    '007': 'crate',
    '008': 'crate',
    '009': 'crate',
    '010': 'background',
    '011': 'background',
    '012': 'buff',
    '013': 'stone',
    '014': 'stone',
    '015': 'stone',
    '016': 'stone',
    '017': 'stone'
  };
  return typeMap[itemId] || 'item';
}
