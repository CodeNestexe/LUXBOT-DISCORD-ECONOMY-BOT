const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'market',
  aliases: ['overview', 'summary'],
  async execute(message, args, db) {
    try {
      // Get current market data
      const dbInstance = await db.getDB();
      const stocksCollection = dbInstance.collection('stocks');
      const marketData = await stocksCollection.findOne({ type: 'market' });
      
      if (!marketData) {
        return message.reply('❌ Stock market is currently unavailable.');
      }

      // Calculate market statistics
      let totalMarketCap = 0;
      let totalVolume = 0;
      let gainers = 0;
      let losers = 0;
      let unchanged = 0;
      
      let stocksOverview = '';
      
      marketData.stocks.forEach(stock => {
        totalMarketCap += stock.marketCap || 0;
        totalVolume += stock.volume || 0;
        
        const changePercent = stock.changePercent || 0;
        const changeValue = stock.price - stock.previousPrice;
        
        if (changePercent > 0) {
          gainers++;
        } else if (changePercent < 0) {
          losers++;
        } else {
          unchanged++;
        }
        
        // Build individual stock display
        const trendEmoji = changePercent >= 0 ? '📈' : '📉';
        const changeSign = changePercent >= 0 ? '+' : '';
        
        stocksOverview += `${trendEmoji} **${stock.symbol}** - ${stock.price.toLocaleString()} <:lux:1411637514569252894> `;
        stocksOverview += `(${changeSign}${changePercent.toFixed(1)}%)\n`;
      });

      // Calculate market sentiment
      const totalStocks = marketData.stocks.length;
      const bullishPercent = Math.round((gainers / totalStocks) * 100);
      const bearishPercent = Math.round((losers / totalStocks) * 100);
      
      let marketSentiment = '';
      let sentimentEmoji = '';
      let sentimentColor = '';
      
      if (bullishPercent > 60) {
        marketSentiment = '🚀 **BULLISH** - Strong upward momentum';
        sentimentEmoji = '🚀';
        sentimentColor = '#00FF00';
      } else if (bearishPercent > 60) {
        marketSentiment = '📉 **BEARISH** - Significant downward pressure';
        sentimentEmoji = '📉';
        sentimentColor = '#FF0000';
      } else {
        marketSentiment = '⚖️ **NEUTRAL** - Mixed market conditions';
        sentimentEmoji = '⚖️';
        sentimentColor = '#FFD700';
      }

      // Get last update time
      const lastUpdate = new Date(marketData.lastUpdate);
      const timeAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
      const updateText = timeAgo < 1 ? 'Just now' : `${timeAgo} minutes ago`;

      // Build comprehensive market embed
      const embed = new EmbedBuilder()
        .setTitle('📊 **STOCK MARKET OVERVIEW**')
        .setDescription(
          `${marketSentiment}\n\n` +
          `**📈 MARKET STATISTICS**\n` +
          `**Total Market Cap:** ${totalMarketCap.toLocaleString()} <:lux:1411637514569252894>\n` +
          `**Trading Volume:** ${totalVolume.toLocaleString()}\n` +
          `**Gainers:** ${gainers} stocks (${bullishPercent}%)\n` +
          `**Losers:** ${losers} stocks (${bearishPercent}%)\n` +
          `**Unchanged:** ${unchanged} stocks\n\n` +
          `**📋 STOCK PRICES**\n` +
          stocksOverview
        )
        .addFields([
          {
            name: '🔄 Market Activity',
            value: `**Most Active:** ${getMostActiveStock(marketData.stocks)}\n` +
                   `**Biggest Gainer:** ${getBiggestGainer(marketData.stocks)}\n` +
                   `**Biggest Loser:** ${getBiggestLoser(marketData.stocks)}`,
            inline: false
          },
          {
            name: '💡 Quick Actions',
            value: '`X stocks` - View detailed market\n' +
                   '`X buystock {symbol} {qty}` - Buy stocks\n' +
                   '`X price {symbol}` - Check specific price\n' +
                   '`X portfolio` - View your holdings',
            inline: false
          }
        ])
        .setColor(sentimentColor)
        .setFooter({ text: `Last updated: ${updateText} • Updates every 5 minutes` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in market command:', error);
      await message.reply('❌ Error loading market overview.');
    }
  },
};

// Helper function to find most active stock
function getMostActiveStock(stocks) {
  const mostActive = stocks.reduce((prev, current) => 
    (current.volume > prev.volume) ? current : prev
  );
  return `**${mostActive.symbol}** (${mostActive.volume.toLocaleString()} volume)`;
}

// Helper function to find biggest gainer
function getBiggestGainer(stocks) {
  const gainers = stocks.filter(stock => stock.changePercent > 0);
  if (gainers.length === 0) return '**None**';
  
  const biggestGainer = gainers.reduce((prev, current) => 
    (current.changePercent > prev.changePercent) ? current : prev
  );
  return `**${biggestGainer.symbol}** (+${biggestGainer.changePercent.toFixed(1)}%)`;
}

// Helper function to find biggest loser
function getBiggestLoser(stocks) {
  const losers = stocks.filter(stock => stock.changePercent < 0);
  if (losers.length === 0) return '**None**';
  
  const biggestLoser = losers.reduce((prev, current) => 
    (current.changePercent < prev.changePercent) ? current : prev
  );
  return `**${biggestLoser.symbol}** (${biggestLoser.changePercent.toFixed(1)}%)`;
}
