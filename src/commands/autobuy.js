const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'autobuy',
  aliases: ['ab'],
  async execute(message, args, db) {
    try {
      if (!args[0] || !args[1] || !args[2]) {
        return message.reply('❌ Usage: `X autobuy {symbol} {price} {quantity}`\nExample: `X autobuy LOF 9900 3`');
      }

      const symbol = args[0].toUpperCase();
      const targetPrice = parseInt(args[1]);
      const quantity = parseInt(args[2]);

      // Validate inputs
      const validSymbols = ['LOF', 'JD', 'INDI', 'TKI', 'LUX'];
      if (!validSymbols.includes(symbol)) {
        return message.reply(`❌ Invalid stock symbol. Available: ${validSymbols.join(', ')}`);
      }

      if (isNaN(targetPrice) || targetPrice <= 0) {
        return message.reply('❌ Target price must be a positive number.');
      }

      if (isNaN(quantity) || quantity <= 0) {
        return message.reply('❌ Quantity must be a positive number.');
      }

      // Check if user has enough balance for potential purchase
      const user = await db.getUser(message.author.id);
      const totalCost = targetPrice * quantity;
      
      if (user.balance < totalCost) {
        return message.reply(`❌ Insufficient funds! You need ${totalCost.toLocaleString()} <:lux:1411637514569252894> but have ${user.balance.toLocaleString()} <:lux:1411637514569252894>.`);
      }

      // Get current stock price for comparison
      const dbInstance = await db.getDB();
      const stocksCollection = dbInstance.collection('stocks');
      const marketData = await stocksCollection.findOne({ type: 'market' });
      
      const stock = marketData.stocks.find(s => s.symbol === symbol);
      const currentPrice = stock ? stock.price : 0;

      // Store auto-buy order
      const autoBuyCollection = dbInstance.collection('autoBuyOrders');
      
      const order = {
        userId: message.author.id,
        username: message.author.username,
        symbol: symbol,
        targetPrice: targetPrice,
        quantity: quantity,
        totalCost: totalCost,
        createdAt: new Date(),
        active: true
      };

      await autoBuyCollection.insertOne(order);

      const embed = new EmbedBuilder()
        .setTitle('✅ Auto-Buy Order Created!')
        .setDescription(
          `**Stock:** ${symbol}\n` +
          `**Target Price:** ${targetPrice.toLocaleString()} <:lux:1411637514569252894> per share\n` +
          `**Quantity:** ${quantity} shares\n` +
          `**Total Cost:** ${totalCost.toLocaleString()} <:lux:1411637514569252894>\n\n` +
          `**Current Price:** ${currentPrice.toLocaleString()} <:lux:1411637514569252894>\n` +
          `**Trigger:** When price reaches ${targetPrice.toLocaleString()} or lower\n\n` +
          `💡 **Order will execute automatically when conditions are met!**`
        )
        .setColor('#00FFFF')
        .setFooter({ text: 'Use X vieworders to see all your pending orders' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in autobuy command:', error);
      await message.reply('❌ Error creating auto-buy order.');
    }
  },
};
