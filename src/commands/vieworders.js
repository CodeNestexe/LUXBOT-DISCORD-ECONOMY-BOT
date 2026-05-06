const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'vieworders',
  aliases: ['orders', 'vo'],
  async execute(message, args, db) {
    try {
      const dbInstance = await db.getDB();
      const autoBuyCollection = dbInstance.collection('autoBuyOrders');
      const autoSellCollection = dbInstance.collection('autoSellOrders');

      // Get user's pending orders
      const buyOrders = await autoBuyCollection.find({ userId: message.author.id, active: true }).toArray();
      const sellOrders = await autoSellCollection.find({ userId: message.author.id, active: true }).toArray();

      if (buyOrders.length === 0 && sellOrders.length === 0) {
        return message.reply('📋 You have no pending auto-trading orders.\nUse `X autobuy` or `X autosell` to create orders.');
      }

      let description = '';

      if (buyOrders.length > 0) {
        description += '**🛒 AUTO-BUY ORDERS**\n';
        buyOrders.forEach((order, index) => {
          description += `${index + 1}. **${order.symbol}** - ${order.quantity} shares at ${order.targetPrice.toLocaleString()} <:lux:1411637514569252894>\n`;
        });
        description += '\n';
      }

      if (sellOrders.length > 0) {
        description += '**💰 AUTO-SELL ORDERS**\n';
        sellOrders.forEach((order, index) => {
          description += `${index + 1}. **${order.symbol}** - ${order.quantity} shares at ${order.targetPrice.toLocaleString()} <:lux:1411637514569252894>\n`;
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 Your Pending Orders')
        .setDescription(description)
        .setColor('#00FFFF')
        .setFooter({ text: `Total Orders: ${buyOrders.length + sellOrders.length}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in vieworders command:', error);
      await message.reply('❌ Error loading your orders.');
    }
  },
};
