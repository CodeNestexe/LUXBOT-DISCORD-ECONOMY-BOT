const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'sellstock',
  aliases: ['sells'],
  async execute(message, args, db) {
    try {
      if (!args[0] || !args[1]) {
        return message.reply('❌ Usage: `X sellstock {symbol} {quantity}`\nExample: `X sellstock LOF 3`');
      }

      const symbol = args[0].toUpperCase();
      const quantity = parseInt(args[1]);

      if (quantity <= 0 || isNaN(quantity)) {
        return message.reply('❌ Quantity must be a positive number.');
      }

      // Get user portfolio
      const dbInstance = await db.getDB();
      const portfoliosCollection = dbInstance.collection('portfolios');
      const portfolio = await portfoliosCollection.findOne({ userId: message.author.id });
      
      if (!portfolio || !portfolio.stocks[symbol] || portfolio.stocks[symbol].quantity <= 0) {
        return message.reply(`❌ You don't own any **${symbol}** stocks!`);
      }

      const userStock = portfolio.stocks[symbol];
      if (userStock.quantity < quantity) {
        return message.reply(`❌ Insufficient shares!\nYou want to sell: **${quantity}**\nYou own: **${userStock.quantity}**`);
      }

      // Get current market data
      const stocksCollection = dbInstance.collection('stocks');
      const marketData = await stocksCollection.findOne({ type: 'market' });
      
      if (!marketData) {
        return message.reply('❌ Stock market is currently unavailable.');
      }

      const stock = marketData.stocks.find(s => s.symbol === symbol);
      if (!stock) {
        return message.reply(`❌ Stock ${symbol} not found in market data.`);
      }

      const totalEarnings = stock.price * quantity;
      const costBasis = userStock.avgBuyPrice * quantity;
      const profitLoss = totalEarnings - costBasis;

      // Update user balance
      const user = await db.getUser(message.author.id);
      await db.updateUser(message.author.id, { balance: user.balance + totalEarnings });

      // Update portfolio
      const newQuantity = userStock.quantity - quantity;
      const newTotalInvested = Math.max(0, userStock.totalInvested - costBasis);

      if (newQuantity === 0) {
        delete portfolio.stocks[symbol];
      } else {
        portfolio.stocks[symbol] = {
          quantity: newQuantity,
          avgBuyPrice: userStock.avgBuyPrice, // Keep same average
          totalInvested: newTotalInvested
        };
      }

      await portfoliosCollection.updateOne(
        { userId: message.author.id },
        { $set: portfolio }
      );

      // Update stock volume
      stock.volume += quantity;
      await stocksCollection.updateOne({ type: 'market' }, { $set: marketData });

      const profitEmoji = profitLoss >= 0 ? '📈' : '📉';
      const profitText = profitLoss >= 0 ? `+${profitLoss.toLocaleString()}` : profitLoss.toLocaleString();

      const embed = new EmbedBuilder()
        .setTitle('✅ Stock Sale Successful!')
        .setDescription(
          `You sold **${quantity}** shares of **[${stock.name}](${stock.url})**\n\n` +
          `💰 **Earnings:** ${totalEarnings.toLocaleString()} <:lux:1411637514569252894>\n` +
          `📊 **Price per share:** ${stock.price.toLocaleString()} <:lux:1411637514569252894>\n` +
          `${profitEmoji} **Profit/Loss:** ${profitText} <:lux:1411637514569252894>\n` +
          `💼 **Remaining ${symbol} shares:** ${newQuantity}\n` +
          `💳 **New balance:** ${(user.balance + totalEarnings).toLocaleString()} <:lux:1411637514569252894>`
        )
        .setColor(profitLoss >= 0 ? '#00FF00' : '#FF0000')
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in sellstock command:', error);
      await message.reply('❌ Error processing stock sale.');
    }
  },
};
