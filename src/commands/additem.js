// /home/container/src/commands/additem.js
const { items } = require('../utils/itemsConfig');

module.exports = {
  name: 'additem',
  async execute(message, args, db) {
    try {
      // **FIXED: Enhanced admin permission check**
      const botOwnerId = process.env.BOT_OWNER_ID;
      const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
      const userId = message.author.id;

      if (!botOwnerId) {
        return message.reply('❌ Bot owner ID is not configured.');
      }

      if (userId !== botOwnerId && !adminIds.includes(userId)) {
        return message.reply('❌ You do not have permission to use this command.');
      }

      // **FIXED: Improved argument validation**
      if (args.length < 3) {
        return message.reply('❌ **Usage:** `X additem <slot> <quantity> <@user>`\n**Example:** `X additem 001 5 @username`');
      }

      const slot = args[0];
      const quantity = parseInt(args[1]);
      const userMatch = args[2].match(/^<@!?(\d+)>$/);

      // **FIXED: Enhanced slot validation**
      if (!items[slot]) {
        const availableSlots = Object.keys(items).slice(0, 10).join(', ');
        return message.reply(`❌ Invalid slot ID: **${slot}**\n\n**Available slots:** ${availableSlots}...\nUse \`X shop\` to see current items.`);
      }

      // **FIXED: Enhanced quantity validation**
      if (isNaN(quantity) || quantity <= 0 || quantity > 1000) {
        return message.reply('❌ Quantity must be a positive integer between 1 and 1000.');
      }

      // **FIXED: Enhanced user validation**
      if (!userMatch) {
        return message.reply('❌ Please mention a valid user.\n**Example:** `X additem 001 5 @username`');
      }

      const targetUserId = userMatch[1];
      
      let targetUser;
      try {
        targetUser = await message.client.users.fetch(targetUserId);
      } catch (error) {
        return message.reply('❌ Could not find the mentioned user. Please check the user mention.');
      }

      // **FIXED: Check if target user is registered and repair if needed**
      let targetUserData = await db.getUser(targetUserId);
      
      if (!targetUserData) {
        return message.reply(`❌ **${targetUser.tag}** is not registered in LuxBot.\nThey need to accept the Terms of Service first.`);
      }

      // **FIXED: Ensure target user has proper inventory structure**
      const dbInstance = await db.getDB();
      const usersCollection = dbInstance.collection('users');

      let needsRepair = false;
      const repairData = {};

      if (!Array.isArray(targetUserData.items) || targetUserData.items.length !== 50) {
        repairData.items = Array(50).fill(null);
        needsRepair = true;
      }

      // Ensure numeric fields exist
      if (typeof targetUserData.balance !== 'number') {
        repairData.balance = targetUserData.balance || 0;
        needsRepair = true;
      }

      if (needsRepair) {
        await usersCollection.updateOne({ userId: targetUserId }, { $set: repairData });
        targetUserData = { ...targetUserData, ...repairData };
        console.log(`Repaired inventory for user ${targetUserId} during additem`);
      }

      // **FIXED: Add item to inventory using new 50-slot system**
      const item = items[slot];
      const success = await addItemToUserInventory(targetUserId, slot, quantity, item, db);

      if (!success) {
        return message.reply(`❌ Could not add item to **${targetUser.tag}**'s inventory.\n**Reason:** Inventory might be full or there was a database error.`);
      }

      // **FIXED: Enhanced success message**
      const embed = {
        title: '✅ Item Added Successfully!',
        description: `Added **${quantity}** ${item.emoji} **${item.name}** (slot ${slot}) to **${targetUser.tag}**'s inventory.`,
        color: 0x00FF00,
        fields: [
          { name: '👤 Target User', value: targetUser.tag, inline: true },
          { name: '📦 Item', value: `${item.emoji} ${item.name}`, inline: true },
          { name: '🔢 Quantity', value: quantity.toString(), inline: true },
          { name: '🏷️ Slot ID', value: slot, inline: true },
          { name: '👑 Admin', value: message.author.tag, inline: true },
          { name: '📅 Added At', value: new Date().toLocaleString(), inline: true }
        ],
        footer: { text: 'Admin Command Executed' },
        timestamp: new Date().toISOString()
      };

      await message.reply({ embeds: [embed] });

      // **FIXED: Enhanced user notification**
      try {
        const userEmbed = {
          title: '🎁 You Received an Item!',
          description: `An admin has given you **${quantity}** ${item.emoji} **${item.name}**!`,
          color: 0x00FF00,
          fields: [
            { name: '📦 Item', value: `${item.emoji} ${item.name}`, inline: true },
            { name: '🔢 Quantity', value: quantity.toString(), inline: true },
            { name: '🏷️ Slot ID', value: slot, inline: true }
          ],
          footer: { text: 'Use X inv to see your inventory' },
          timestamp: new Date().toISOString()
        };

        await targetUser.send({ embeds: [userEmbed] });
      } catch (dmError) {
        console.log(`Could not DM ${targetUser.tag}: DMs might be disabled`);
        // Don't fail the command if DM fails
      }

      // **Log admin action**
      console.log(`[ADMIN ACTION] ${message.author.tag} (${userId}) added ${quantity} ${item.name} (${slot}) to ${targetUser.tag} (${targetUserId})`);

    } catch (error) {
      console.error('Error in additem command:', error);
      await message.reply(`❌ **Error:** ${error.message}\n\nPlease try again or contact the bot developer if this persists.`);
    }
  },
};

// **NEW: Helper function to add items to 50-slot inventory**
async function addItemToUserInventory(userId, itemId, quantity, itemConfig, db) {
  try {
    const dbInstance = await db.getDB();
    const usersCollection = dbInstance.collection('users');
    
    const user = await usersCollection.findOne({ userId });
    if (!user || !user.items) return false;

    // Find first available slot or existing item to stack
    let targetSlot = -1;
    
    // First, try to find existing item to stack
    for (let slot = 0; slot < user.items.length; slot++) {
      const slotItem = user.items[slot];
      if (slotItem && slotItem.id === itemId) {
        // Stack with existing item
        const newAmount = (slotItem.amount || 1) + quantity;
        await usersCollection.updateOne(
          { userId },
          { $set: { [`items.${slot}.amount`]: newAmount } }
        );
        return true;
      }
    }
    
    // If no existing item found, find empty slot
    for (let slot = 0; slot < user.items.length; slot++) {
      if (user.items[slot] === null || user.items[slot] === undefined) {
        targetSlot = slot;
        break;
      }
    }
    
    if (targetSlot === -1) {
      return false; // No empty slots
    }
    
    // Add new item to empty slot
    const itemData = {
      id: itemId,
      name: itemConfig.name,
      emoji: itemConfig.emoji,
      amount: quantity,
      addedAt: new Date(),
      addedBy: 'admin'
    };
    
    await usersCollection.updateOne(
      { userId },
      { $set: { [`items.${targetSlot}`]: itemData } }
    );
    
    return true;
    
  } catch (error) {
    console.error('Error adding item to inventory:', error);
    return false;
  }
}
