const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'autosell',
  aliases: ['as'],
  async execute(message, args, db) {
    try {
      if (!args[0] || !args[1] || !args[2]) {
        return message.reply('❌ Usage: `X autosell {symbol} {price} {quantity}`\nExample: `X autosell LOF 11000 3`');
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

      // Check if user owns enough shares
      const dbInstance = await db.getDB();
      const portfoliosCollection = dbInstance.collection('portfolios');
      const portfolio = await portfoliosCollection.findOne({ userId: message.author.id });
      
      if (!portfolio || !portfolio.stocks[symbol] || portfolio.stocks[symbol].quantity < quantity) {
        const owned = portfolio && portfolio.stocks[symbol] ? portfolio.stocks[symbol].quantity : 0;
        return message.reply(`❌ Insufficient shares! You want to sell ${quantity} but only own ${owned} shares of ${symbol}.`);
      }

      // Get current stock price for comparison
      const stocksCollection = dbInstance.collection('stocks');
      const marketData = await stocksCollection.findOne({ type: 'market' });
      
      const stock = marketData.stocks.find(s => s.symbol === symbol);
      const currentPrice = stock ? stock.price : 0;

      // Store auto-sell order
      const autoSellCollection = dbInstance.collection('autoSellOrders');
      
      const order = {
        userId: message.author.id,
        username: message.author.username,
        symbol: symbol,
        targetPrice: targetPrice,
        quantity: quantity,
        estimatedEarnings: targetPrice * quantity,
        createdAt: new Date(),
        active: true
      };

      await autoSellCollection.insertOne(order);

      const embed = new EmbedBuilder()
        .setTitle('✅ Auto-Sell Order Created!')
        .setDescription(
          `**Stock:** ${symbol}\n` +
          `**Target Price:** ${targetPrice.toLocaleString()} <:lux:1411637514569252894> per share\n` +
          `**Quantity:** ${quantity} shares\n` +
          `**Estimated Earnings:** ${(targetPrice * quantity).toLocaleString()} <:lux:1411637514569252894>\n\n` +
          `**Current Price:** ${currentPrice.toLocaleString()} <:lux:1411637514569252894>\n` +
          `**Trigger:** When price reaches ${targetPrice.toLocaleString()} or higher\n\n` +
          `💡 **Order will execute automatically when conditions are met!**`
        )
        .setColor('#FFD700')
        .setFooter({ text: 'Use X vieworders to see all your pending orders' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in autosell command:', error);
      await message.reply('❌ Error creating auto-sell order.');
    }
  },
};
