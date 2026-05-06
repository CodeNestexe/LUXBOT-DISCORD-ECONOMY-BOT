const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'price',
  aliases: ['p'],
  async execute(message, args, db) {
    try {
      if (!args[0]) {
        return message.reply('❌ Usage: `X price {stock_symbol}`\nExample: `X price LOF`');
      }

      const symbol = args[0].toUpperCase();

      // Stock data for validation and names
      const STOCKS = {
        LOF: 'LAND OF FIRE',
        JD: 'JAN\'S DUNGEON',
        INDI: 'INDI.HOST',
        TKI: 'TASKNODE.IO',
        LUX: 'LUX INC'
      };

      if (!STOCKS[symbol]) {
        const validSymbols = Object.keys(STOCKS).join(', ');
        return message.reply(`❌ Invalid stock symbol. Available stocks: ${validSymbols}`);
      }

      // Get current market data
      const dbInstance = await db.getDB();
      const stocksCollection = dbInstance.collection('stocks');
      const marketData = await stocksCollection.findOne({ type: 'market' });
      
      if (!marketData) {
        return message.reply('❌ Stock market is currently unavailable.');
      }

      const stock = marketData.stocks.find(s => s.symbol === symbol);
      if (!stock) {
        return message.reply(`❌ Stock data not found for ${symbol}.`);
      }

      // Calculate price changes
      const currentPrice = stock.price;
      const previousPrice = stock.previousPrice;
      const changeValue = currentPrice - previousPrice;
      const changePercent = stock.changePercent || 0;
      
      // Determine if stock is going up or down
      const isUp = changeValue >= 0;
      const titleEmoji = isUp ? '📈' : '📉';
      const changeSign = isUp ? '+' : '';

      // Build embed
      const embed = new EmbedBuilder()
        .setTitle(`${titleEmoji} ${symbol} - ${STOCKS[symbol]}`)
        .setDescription(
          `**${currentPrice.toLocaleString()} <:lux:1411637514569252894>**\n\n` +
          `**Previous Price**\n` +
          `${previousPrice.toLocaleString()} <:lux:1411637514569252894>\n` +
          `**Changes**\n` +
          `${changeSign}${changeValue.toLocaleString()} <:lux:1411637514569252894>\n` +
          `**Changes %**\n` +
          `${changeSign}${changePercent.toFixed(1)}%`
        )
        .setColor(isUp ? '#00FF00' : '#FF0000')
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in price command:', error);
      await message.reply('❌ Error fetching stock price data.');
    }
  },
};
