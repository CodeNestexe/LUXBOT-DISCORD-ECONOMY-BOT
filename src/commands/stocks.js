const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'stocks',
  aliases: ['stock'],
  async execute(message, args, db) {
    try {
      // Get current stock market data
      const marketData = await getStockMarket(db);
      
      if (!marketData) {
        return message.reply('❌ Stock market is currently unavailable.');
      }

      // Build the embed description
      let description = '';
      
      marketData.stocks.forEach(stock => {
        const trendEmoji = stock.changePercent >= 0 ? '📈' : '📉';
        const changeColor = stock.changePercent >= 0 ? '+' : '';
        const changeFormatted = `(${changeColor}${stock.changePercent.toFixed(1)}%)`;
        
        description += `${trendEmoji} **${stock.symbol}** - [${stock.name}](${stock.url})\n`;
        description += `${stock.price.toLocaleString()} <:lux:1411637514569252894> ${changeFormatted}\n\n`;
      });

      const embed = new EmbedBuilder()
        .setTitle('📊 Available Stocks')
        .setDescription(description)
        .setColor('#00FFFF')
        .setFooter({ text: '💡 Use X buystock {symbol} {amount} to purchase stocks' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in stocks command:', error);
      await message.reply('❌ Error loading stock market data.');
    }
  },
};

// Get stock market data
async function getStockMarket(db) {
  try {
    const dbInstance = await db.getDB();
    const stocksCollection = dbInstance.collection('stocks');
    
    const marketData = await stocksCollection.findOne({ type: 'market' });
    return marketData;
  } catch (error) {
    console.error('Error getting stock market:', error);
    return null;
  }
}
