const { EmbedBuilder } = require('discord.js');

// Helper function to count items in inventory
async function countItemInInventory(userId, itemId, db) {
  const dbInstance = await db.getDB();
  const usersCollection = dbInstance.collection('users');
  const user = await usersCollection.findOne({ userId });
  if (!user || !user.items) return 0;

  let totalQuantity = 0;
  for (let slot = 0; slot < user.items.length; slot++) {
    const slotItem = user.items[slot];
    if (slotItem && slotItem.id === itemId) {
      totalQuantity += slotItem.amount || 0;
    }
  }
  return totalQuantity;
}

// Helper to count current shop purchases per user for max per-user limit
async function countPurchases(user, itemKey) {
  if (!user.eventShopPurchases) return 0;
  return user.eventShopPurchases[itemKey] || 0;
}

// Helper function to remove items from inventory
async function removeItemFromInventory(userId, itemId, amountToRemove, db) {
  const dbInstance = await db.getDB();
  const usersCollection = dbInstance.collection('users');
  const user = await usersCollection.findOne({ userId });
  if (!user || !user.items) return false;

  let remainingToRemove = amountToRemove;
  const updates = {};
  for (let slot = 0; slot < user.items.length && remainingToRemove > 0; slot++) {
    const slotItem = user.items[slot];
    if (slotItem && slotItem.id === itemId) {
      const slotAmount = slotItem.amount || 0;
      if (slotAmount <= remainingToRemove) {
        updates['items.' + slot] = null;
        remainingToRemove -= slotAmount;
      } else {
        updates['items.' + slot + '.amount'] = slotAmount - remainingToRemove;
        remainingToRemove = 0;
      }
    }
  }
  if (Object.keys(updates).length > 0) {
    await usersCollection.updateOne({ userId }, { $set: updates });
  }
  return remainingToRemove === 0;
}

// Helper to add items to inventory (uses itemConfig structure)
async function addItemToUserInventory(userId, itemId, quantity, itemConfig, db) {
  const dbInstance = await db.getDB();
  const usersCollection = dbInstance.collection('users');
  const user = await usersCollection.findOne({ userId });
  if (!user || !user.items) return false;
  
  // Try stacking first
  for (let slot = 0; slot < user.items.length; slot++) {
    const slotItem = user.items[slot];
    if (slotItem && slotItem.id === itemId) {
      const newAmount = (slotItem.amount || 1) + quantity;
      await usersCollection.updateOne(
        { userId },
        { $set: { [`items.${slot}.amount`]: newAmount } }
      );
      return true;
    }
  }
  // Find empty slot
  let targetSlot = -1;
  for (let slot = 0; slot < user.items.length; slot++) {
    if (!user.items[slot]) {
      targetSlot = slot;
      break;
    }
  }
  if (targetSlot === -1) return false;
  // Add new item to empty slot
  const itemData = {
    id: itemId,
    name: itemConfig.name,
    emoji: itemConfig.emoji,
    amount: quantity,
    addedAt: new Date(),
    addedBy: "eventshop"
  };
  await usersCollection.updateOne(
    { userId },
    { $set: { [`items.${targetSlot}`]: itemData } }
  );
  return true;
}

module.exports = {
  name: 'buyevent',
  aliases: ['be'],
  async execute(message, args, db) {
    try {
      if (!args[0]) {
        return message.reply({
          content: '❌ **Usage:** `X buyevent {item}`\n' +
                   'Example: `X buyevent lux`\n' +
                   'Use `X eventshop` to see available items!',
        });
      }

      const itemName = args.join(' ').toLowerCase();
      const userId = message.author.id;
      const itemsConfig = require('../utils/itemsConfig'); // adjust path as needed

      // All available shop items (all lowercase for .buyName!)
      const shopItems = {
        'mana crystal': {
          key: 'mana_crystal',
          name: 'Mana Crystals',
          cost: 3,
          perUser: 99,
          buyName: 'mana crystal',
          type: 'manacrystal',
          amount: 1,
          emoji: '<a:crystals:1379010491762081933>'
        },
        'lux': {
          key: 'lux',
          name: '10,000 LUX',
          cost: 10,
          perUser: 10,
          buyName: 'lux',
          type: 'lux',
          amount: 10000,
          emoji: '<:lux:1411637514569252894>'
        },
        'mana crate': {
          key: 'mana_crate',
          name: 'Mana Crate',
          cost: 15,
          perUser: 5,
          buyName: 'mana crate',
          type: 'crate',
          itemId: '007',
          emoji: '<:manacrate:1419011002200647680>'
        },
        'special crate': {
          key: 'special_crate',
          name: 'Special Crate',
          cost: 15,
          perUser: 5,
          buyName: 'special crate',
          type: 'crate',
          itemId: '005',
          emoji: '<a:special_crate:1375388931016626177>'
        }
      };

      // Resolve the item (allow flexible spaces/cases)
      const matchedItemKey = Object.keys(shopItems).find(
        key => key === itemName
      );
      const item = matchedItemKey ? shopItems[matchedItemKey] : null;

      if (!item) {
        return message.reply({
          content: '❌ **Item not found!**\n' +
                   'Use `X eventshop` to see available items.',
        });
      }

      // Get user
      const user = await db.getUser(userId);
      if (!user) {
        return message.reply({
          content: '❌ **Please accept the Terms of Service first!**\n' +
                   'Use `X tos accept` to proceed.',
        });
      }

      // Count tokens
      const currentTokens = await countItemInInventory(userId, '018', db);

      if (currentTokens < item.cost) {
        const needMore = item.cost - currentTokens;
        return message.reply({
          content: '❌ **Insufficient tokens!**\n\n' +
                   '**Item:** ' + item.name + '\n' +
                   '**Cost:** ' + item.cost + ' <:lux_ticket:1425455943134478426>\n' +
                   '**You have:** ' + currentTokens + ' <:lux_ticket:1425455943134478426>\n' +
                   '**Need:** ' + needMore + ' more tokens',
        });
      }

      // Check max quantity per user for each item
      // Use user.eventShopPurchases in user profile to track purchases
      const shopKey = item.key;
      const alreadyBought = user.eventShopPurchases ? (user.eventShopPurchases[shopKey] || 0) : 0;
      if (alreadyBought >= item.perUser) {
        return message.reply({
          content: '❌ **Purchase limit reached!**\n' +
                   'Max allowed: **' + item.perUser + '**\n' +
                   'Already bought: **' + alreadyBought + '**',
        });
      }

      // Remove tokens from inventory
      const success = await removeItemFromInventory(userId, '018', item.cost, db);
      if (!success) {
        return message.reply({
          content: '❌ **Error removing tokens!**\n' +
                   'Please try again.',
        });
      }

      // Default embed reward string
      let rewardString = '';
      let updateOps = {};

      // Grant the reward
      if (item.type === 'lux') {
        const newBalance = user.balance + item.amount;
        await db.updateUser(userId, { balance: newBalance });
        rewardString = `${item.amount.toLocaleString()} ${item.emoji}\n**New balance:** ${newBalance.toLocaleString()} ${item.emoji}`;
      }
      else if (item.type === 'manacrystal') {
        await db.addManaCrystals(userId, item.amount);
        rewardString = `${item.amount} ${item.emoji}\n**Check your inventory or stats!**`;
      }
      else if (item.type === 'crate' || item.type === 'background') {
        await addItemToUserInventory(userId, item.itemId, 1, itemsConfig.items[item.itemId], db);
        rewardString = `${item.emoji} ${item.name} x1\n**Check your inventory!**`;
      }
      else if (item.type === 'collectible') {
        // Award collectible only if not already in user collectibles
        const collectibles = await db.getCollectibles(userId);
        if (collectibles[item.collectibleId]) {
          return message.reply('❌ **You already own this collectible!**');
        }
        await db.addCollectible(userId, item.collectibleId, 'special');
        rewardString = `${item.emoji} Collectible granted!\nCheck your `/collectibles`.`;
      } 

      // Update purchase tracking in user document
      updateOps = { $set: { [`eventShopPurchases.${shopKey}`]: alreadyBought + 1 } };
      await db.getDB().then(dbInstance =>
        dbInstance.collection('users').updateOne({ userId }, updateOps)
      );

      // Success embed
      const embed = new EmbedBuilder()
        .setTitle('✅ **Purchase Successful!**')
        .setDescription(
          `**Item:** ${item.emoji} ${item.name}\n` +
          `**Cost:** ${item.cost} <:lux_ticket:1425455943134478426>\n\n` +

          `**You received:**\n${rewardString}\n\n` +

          `**Tokens remaining:** ${(currentTokens - item.cost)} <:lux_ticket:1425455943134478426>\n`
        )
        .setColor('#00FF00')
        .setFooter({ text: 'Thank you for shopping! 🎉 • Event Shop' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      console.log('✅ User ' + message.author.tag + ' bought ' + item.name + ' for ' + item.cost + ' tokens');

    } catch (error) {
      console.error('Error in buyevent command:', error);
      console.error('Stack trace:', error.stack);
      await message.reply({
        content: '❌ **Error processing purchase!**\n' +
                 'Details: ' + error.message,
      }).catch(() => {});
    }
  },
};