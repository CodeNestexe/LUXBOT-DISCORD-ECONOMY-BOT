const { items } = require('../utils/itemsConfig');

module.exports = {
  name: 'inventory',
  aliases: ['inv'],
  async execute(message, args, db) {
    try {
      console.log('Executing inventory for:', message.author.id);

      // **FIXED: Get user with proper 50-slot inventory**
      const user = await db.getUser(message.author.id);
      if (!user) {
        return message.reply('❌ Please accept the Terms of Service first!');
      }

      // **FIXED: Ensure proper inventory structure**
      if (!Array.isArray(user.items) || user.items.length !== 50) {
        return message.reply('❌ Your inventory needs to be initialized. Please use any shop command first.');
      }

      // **FIXED: Convert to old-style display format**
      const userItems = {};
      
      for (let slot = 0; slot < user.items.length; slot++) {
        const item = user.items[slot];
        if (item && item !== null) {
          const itemId = item.id;
          if (userItems[itemId]) {
            userItems[itemId] += item.amount || 1;
          } else {
            userItems[itemId] = item.amount || 1;
          }
        }
      }

      // **OLD UI STYLE: Convert quantities to superscript**
      const superscriptDigits = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
      const toSuperscript = (num) => {
        return num.toString().split('').map(digit => superscriptDigits[parseInt(digit)] || digit).join('');
      };

      // **OLD UI STYLE: Build the inventory display**
      const inventoryLines = [];
      let currentLine = [];
      let itemCountInLine = 0;

      // Sort inventory items by their slot number (old style)
      const sortedItems = Object.keys(userItems).sort((a, b) => {
        const slotA = parseInt(a);
        const slotB = parseInt(b);
        return slotA - slotB;
      });

      for (const slot of sortedItems) {
        const quantity = userItems[slot] || 0;
        if (quantity <= 0) continue; // Skip items with 0 quantity

        const item = items[slot];
        let display = `\`${slot}\` (Unknown Item)${toSuperscript(quantity)}`; // Fallback display

        if (item) {
          display = `\`${slot}\`${item.emoji}${toSuperscript(quantity)}`;
        }

        // **OLD UI STYLE: 4 items per line**
        let itemsPerLine = 4;
        if (parseInt(slot) >= 109) {
          itemsPerLine = 2; // Slots 109+ have 2 items per line
        }

        currentLine.push(display);
        itemCountInLine++;

        if (itemCountInLine >= itemsPerLine) {
          inventoryLines.push(currentLine.join('    '));
          currentLine = [];
          itemCountInLine = 0;
        }
      }

      // Add any remaining items in the last line
      if (currentLine.length > 0) {
        inventoryLines.push(currentLine.join('    '));
      }

      // If the inventory is empty
      if (inventoryLines.length === 0) {
        inventoryLines.push('Your inventory is empty.');
      }

      // **OLD UI STYLE: Send the inventory message (plain text)**
      const inventoryMessage = `**====== ${message.author}'s Inventory ======**\n${inventoryLines.join('\n')}`;
      await message.reply(inventoryMessage);

    } catch (error) {
      console.error('Error in inventory command:', error);
      await message.reply(`Error: ${error.message}`);
    }
  },
};
