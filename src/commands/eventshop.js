const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'eventshop',
  aliases: ['es'],
  async execute(message, args, db) {
    try {
      const userId = message.author.id;
      const dbInstance = await db.getDB();
      const usersCollection = dbInstance.collection('users');
      const user = await usersCollection.findOne({ userId });

      if (!user) {
        return message.reply({
          content: '❌ Please accept the Terms of Service first with `X tos accept`',
        });
      }

      // Token count in inventory (id: '018')
      let totalTokens = 0;
      if (user.items && Array.isArray(user.items)) {
        for (let slot = 0; slot < user.items.length; slot++) {
          const slotItem = user.items[slot];
          if (slotItem && slotItem.id === '018') {
            totalTokens += slotItem.amount || 0;
          }
        }
      }

      // Max per-user for each shop item
      const shopItems = [
        {
          display: '🔮 Mana Crystals',
          buyName: 'mana crystal',
          cost: 3,
          maxQty: 99,
          command: '`X buyevent mana crystal`',
        },
        {
          display: '💰 10,000 LUX',
          buyName: 'lux',
          cost: 10,
          maxQty: 10,
          command: '`X buyevent lux`',
        },
        {
          display: '🔵 Mana Crate',
          buyName: 'mana crate',
          cost: 15,
          maxQty: 5,
          command: '`X buyevent mana crate`',
        },
        {
          display: '🎁 Special Crate',
          buyName: 'special crate',
          cost: 15,
          maxQty: 5,
          command: '`X buyevent special crate`',
        },
        {
          display: '🌄 Diwali Background',
          buyName: 'diwali background',
          cost: 50,
          maxQty: 1,
          command: '`X buyevent diwali background`',
        },
        {
          display: '🏆 2025-Diwali Collectible',
          buyName: '2025-diwali',
          cost: 100,
          maxQty: 1,
          command: '`X buyevent 2025-diwali`',
        },
      ];

      // Generate afford line for each shop item
      let shopString = '';
      for (const item of shopItems) {
        const canAfford = totalTokens >= item.cost;
        const affordStatus = canAfford
          ? '✅ Can afford!'
          : '❌ Need ' + (item.cost - totalTokens) + ' more';
        shopString +=
          `${item.display}
` +
          `├─ <:lux_ticket:1425455943134478426> Cost: ${item.cost} tickets ${affordStatus}
` +
          `├─ ⛔ Max per user: ${item.maxQty}
` +
          `└─ 🛒 Buy: ${item.command}

`;
      }

      // Final shop embed
      const embed = new EmbedBuilder()
        .setTitle('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')
        .setDescription(
          '┃  🪔 DIWALI EVENT SHOP 🪔   ┃\n' +
          '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n' +

          '⏰ Event Ends: Oct 25, 2025\n' +
          '💎 Your Tokens: ' + totalTokens + '\n\n' +

          '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '🎁 SPECIAL ITEMS\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

          shopString + '\n' +

          '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '💡 How to get more tokens:\n' +
          '• Open Special Crates (`X use 005`)\n' +
          '• Participate in Diwali events\n' +
          '• Spin the wheel on website\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

          '🛒 Ready to buy? Use: `X buyevent {item}`\n' +
          '📦 Check your tokens: `X inv`'
        )
        .setColor('#FFD700')
        .setFooter({ text: 'Event Shop • Use X buyevent {item} to purchase' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in eventshop command:', error);
      console.error('Stack trace:', error.stack);
      await message.reply({
        content: '❌ Error loading event shop: ' + error.message,
      }).catch(() => {});
    }
  },
};