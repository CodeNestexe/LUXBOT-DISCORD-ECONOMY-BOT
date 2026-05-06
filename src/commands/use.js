const { EmbedBuilder } = require('discord.js');
const itemsConfig = require('../utils/itemsConfig');
const collectiblesCrate = require('../crates/collectibles_crate');
const crystalCrate = require('../crates/crystal_crate');
const obsidianCrate = require('../crates/magic_crate');
const voteCrate = require('../crates/vote_crate');
const commonCrate = require('../crates/daily_crate');
const rareCrate = require('../crates/rare_crate');
const legendaryCrate = require('../crates/legendary_crate');
const specialCrate = require('../crates/special_crate');

// **UPDATED: Stone configurations with correct item IDs**
const STONE_CONFIGS = {
  "013": { // Basic Stone
    name: "Basic Stone",
    multiplier: 2,
    fishChanceBonus: 2,
    rarityBonus: 4,
    duration: 25,
    itemDrops: null,
    maxStats: false
  },
  "014": { // Adept Stone
    name: "Adept Stone",
    multiplier: 3,
    fishChanceBonus: 4,
    rarityBonus: 8,
    duration: 50,
    itemDrops: null,
    maxStats: false
  },
  "015": { // Master Stone
    name: "Master Stone",
    multiplier: 4,
    fishChanceBonus: 6,
    rarityBonus: 12,
    duration: 75,
    itemDrops: {
      tier1: { items: ["002", "008"], chance: 10 }, // Daily Crate, Mana Crate
      tier3: { items: ["007", "014", "015", "016"], chance: 1 }, // Magic Crate, Stones
    },
    maxStats: false
  },
  "016": { // Elite Stone
    name: "Elite Stone",
    multiplier: 5,
    fishChanceBonus: 8,
    rarityBonus: 15,
    duration: 100,
    itemDrops: {
      tier1: { items: ["002", "008"], chance: 12 }, // Daily Crate, Mana Crate
      tier2: { items: ["007"], chance: 8 }, // Magic Crate
      tier3: { items: ["013", "014", "015", "016"], chance: 3 }, // All Stones
    },
    maxStats: false
  },
  "017": { // Prime Stone
    name: "Prime Stone",
    multiplier: 6,
    fishChanceBonus: 12,
    rarityBonus: 18,
    duration: 50,
    itemDrops: {
      tier1: { items: ["002", "008"], chance: 20 }, // Daily Crate, Mana Crate
      tier2: { items: ["007"], chance: 12 }, // Magic Crate
      tier3: { items: ["013", "014", "015", "016"], chance: 5 }, // All Stones
    },
    maxStats: true
  }
};

module.exports = {
  name: 'use',
  aliases: [],
  async execute(message, args, db) {
    try {
      const userId = message.author.id;

      // Check if an item ID was provided
      if (!args[0]) {
        return message.reply('Please specify an item to use. Example: `X use 012`');
      }

      const itemId = args[0].toLowerCase();

      // Special case for resetting to default background
      if (itemId === 'default') {
        await db.updateUser(userId, {
          'profile.background': 'profile.jpg',
        });
        return message.reply('Profile background reset to default!');
      }

      // Validate item ID against itemsConfig
      if (!itemsConfig.items[itemId]) {
        return message.reply('Invalid item ID. Use `X inv` to see your items.');
      }

      const item = itemsConfig.items[itemId];

      // **FIXED: Get user with proper 50-slot inventory system**
      let user = await db.getUser(userId);
      if (!user) {
        return message.reply('❌ Please accept the Terms of Service first!');
      }

      // **FIXED: Ensure proper inventory structure**
      if (!Array.isArray(user.items) || user.items.length !== 50) {
        await db.repairUserInventory(userId);
        user = await db.getUser(userId);
      }

      // **FIXED: Count total quantity of the item in inventory**
      let totalQuantity = 0;
      const itemSlots = [];

      for (let slot = 0; slot < user.items.length; slot++) {
        const slotItem = user.items[slot];
        if (slotItem && slotItem.id === itemId) {
          totalQuantity += slotItem.amount || 1;
          itemSlots.push({ slot: slot, amount: slotItem.amount || 1 });
        }
      }

      if (totalQuantity < 1) {
        return message.reply(`You do not have a ${item.name} (${itemId}) in your inventory.`);
      }

      // Determine the amount to use
      let amountToUse;
      if (args[1] && args[1].toLowerCase() === 'all') {
        amountToUse = totalQuantity;
      } else {
        amountToUse = parseInt(args[1]) || 1;
        if (isNaN(amountToUse) || amountToUse <= 0) {
          return message.reply('Please specify a valid amount to use. Example: `X use 004 3` or `X use 004 all`');
        }
        if (amountToUse > totalQuantity) {
          return message.reply(`You only have ${totalQuantity} ${item.name} (${itemId}) in your inventory.`);
        }
      }

      // **FIXED: Handle Fishing Stones (013-017)**
      if (STONE_CONFIGS[itemId]) {
        // Initialize fishing buffs if not exists
        if (!user.fishingBuffs) {
          await db.updateUser(userId, { fishingBuffs: {} });
          user.fishingBuffs = {};
        }

        // Check if user already has an active stone
        const fishingBuffs = user.fishingBuffs || {};
        const activeStone = Object.keys(fishingBuffs).find(key => fishingBuffs[key].active);
        
        if (activeStone) {
          const activeStoneConfig = STONE_CONFIGS[activeStone];
          const remaining = fishingBuffs[activeStone].remaining;
          return message.reply(
            `❌ You already have **${activeStoneConfig.name}** active!\n` +
            `Remaining uses: **${remaining}**\n` +
            `Wait for it to expire before using another stone.`
          );
        }

        const stone = STONE_CONFIGS[itemId];

        // **FIXED: Remove item from inventory using new system**
        await removeItemFromInventory(userId, itemId, 1, db);

        // Activate stone
        const newFishingBuffs = { ...fishingBuffs };
        newFishingBuffs[itemId] = {
          active: true,
          remaining: stone.duration,
          activatedAt: Date.now()
        };

        await db.updateUser(userId, { fishingBuffs: newFishingBuffs });

        // Success embed
        const embed = new EmbedBuilder()
          .setTitle('✨ Stone Activated!')
          .setDescription(
            `You activated **${stone.name}** ${item.emoji}!\n\n` +
            `**Buffs Active:**\n` +
            `🐟 **Multiplier**: ${stone.multiplier}x fish per catch\n` +
            `🎯 **Fish Chance**: +${stone.fishChanceBonus}% chance to detect fish\n` +
            `⭐ **Rarity Bonus**: +${stone.rarityBonus}% chance for rare+ fish\n` +
            (stone.itemDrops ? `🎁 **Item Drops**: Chance for bonus items\n` : '') +
            (stone.maxStats ? `📈 **Max Stats**: All fishing stats at maximum level\n` : '') +
            `\n⏱️ **Duration**: ${stone.duration} fishing attempts\n` +
            `🔄 **Remaining**: ${stone.duration} uses`
          )
          .setColor('#FFD700')
          .setFooter({ text: `Activated by ${message.author.username}` });

        await message.reply({ embeds: [embed] });
        console.log(`User ${userId} activated ${stone.name} (${itemId})`);
        return;
      }

      // **FIXED: Handle Mana Zone (012)**
      if (itemId === '012') {
        // Check if the user already has an active Mana Zone buff
        if (user.buffs?.manaZone?.active) {
          const remainingTime = Math.ceil((new Date(user.buffs.manaZone.startTime).getTime() + user.buffs.manaZone.duration - Date.now()) / 1000 / 60);
          return message.reply(`You already have an active Mana Zone buff! It will expire in ${remainingTime} minutes.`);
        }

        // Remove the item from inventory
        await removeItemFromInventory(userId, itemId, 1, db);

        // Activate the Mana Zone buff
        const buffDuration = 20 * 60 * 1000; // 20 minutes in milliseconds
        const startTime = new Date();
        await db.updateUser(userId, {
          buffs: {
            manaZone: {
              active: true,
              startTime: startTime.toISOString(),
              duration: buffDuration,
            },
          },
        });

        // Send initial message with GIF
        const gifUrl = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGZxZG5xN2c2cDJmNjd0b2k0a2Q5d3M4cHRkOXB2dzR2NWFiZGQzOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT9IgzoW7tP4k8c9qM/giphy.gif';
        const initialMessage = await message.reply(gifUrl);

        // Wait for 4 seconds
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Create the embed
        const embed = new EmbedBuilder()
          .setTitle('Mana Zone Activated For Next 20min')
          .setDescription(
            '• 2x level boost\n' +
            '• 25% extra lux after winning in any gambling game\n' +
            '• 25% less deduction of lux if you lose in any gambling game'
          )
          .setColor('#00FF00')
          .setTimestamp();

        // Edit the initial message to show the embed
        await initialMessage.edit({ content: null, embeds: [embed] });
        return;
      }
        // **Handle Event Token (018) - Display info only, can't be "used"**
if (itemId === '018') {
  return message.reply({
    content: 
      '💎 **Event Tokens**\n' +
      'Event Tokens are special currency for the **Event Shop**!\n\n' +
      '**How to use:**\n' +
      '• `X eventshop` - View available event items\n' +
      '• `X buyevent {item}` - Purchase items from event shop\n\n' +
      '**You currently have:** ' + (totalQuantity || 0) + ' Event Tokens <:lux_ticket:1425455943134478426>\n\n' +
      '**How to get more:**\n' +
      '• Open Special Crates (`X use 005`)\n' +
      '• Participate in events\n' +
      '• Random drops during events',
  });
}

      // **FIXED: Handle Backgrounds (010, 011)**
      if (itemId === '010') {
        await db.updateUser(userId, { 'profile.background': 'background010.jpg' });
        return message.reply('Profile background set to Background 010!');
      } else if (itemId === '011') {
        await db.updateUser(userId, { 'profile.background': 'background011.jpg' });
        return message.reply('Profile background set to Background 011!');
      } else if (itemId === '019') {
        await db.updateUser(userId, { 'profile.background': 'diwali-background.jpg' });
        return message.reply('Profile background set to Diwali Special Background!');
      }

      // **FIXED: Handle Crates with new inventory system**
      const crateHandlers = {
        '009': collectiblesCrate,
        '008': crystalCrate,
        '007': obsidianCrate,
        '001': voteCrate,
        '002': commonCrate,
        '003': rareCrate,
        '004': legendaryCrate,
        '005': specialCrate
      };

      if (crateHandlers[itemId]) {
        // Remove items from inventory first
        await removeItemFromInventory(userId, itemId, amountToUse, db);
        
        const success = await crateHandlers[itemId].openCrate(userId, amountToUse, message, db);
        
        if (!success) {
          // If crate opening failed, add items back
          await addItemToInventory(userId, itemId, amountToUse, db);
        }
        return;
      }

      return message.reply(`The item ${item.name} (${itemId}) cannot be used yet.`);

    } catch (error) {
      console.error('Error in use command:', error);
      await message.reply(`Error using item: ${error.message}`).catch(err => {
        console.error('Failed to send error reply to Discord:', err);
      });
    }
  },
};

// **NEW: Helper function to remove items from 50-slot inventory**
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
      const slotAmount = slotItem.amount || 1;
      
      if (slotAmount <= remainingToRemove) {
        // Remove entire stack
        updates[`items.${slot}`] = null;
        remainingToRemove -= slotAmount;
      } else {
        // Reduce stack
        updates[`items.${slot}.amount`] = slotAmount - remainingToRemove;
        remainingToRemove = 0;
      }
    }
  }
  
  if (Object.keys(updates).length > 0) {
    await usersCollection.updateOne({ userId }, { $set: updates });
  }
  
  return remainingToRemove === 0;
}

// **NEW: Helper function to add items back to inventory**
async function addItemToInventory(userId, itemId, amount, db) {
  const dbInstance = await db.getDB();
  const usersCollection = dbInstance.collection('users');
  
  const user = await usersCollection.findOne({ userId });
  if (!user || !user.items) return false;
  
  // Find first empty slot
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
        { $set: { [`items.${slot}`]: itemData } }
      );
      return true;
    }
  }
  
  return false; // No empty slots
}
