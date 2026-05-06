const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'portfolio',
  aliases: ['pf'],
  async execute(message, args, db) {
    try {
      const dbInstance = await db.getDB();
      const portfoliosCollection = dbInstance.collection('portfolios');
      const stocksCollection = dbInstance.collection('stocks');
      
      const portfolio = await portfoliosCollection.findOne({ userId: message.author.id });
      const marketData = await stocksCollection.findOne({ type: 'market' });
      
      if (!portfolio || !portfolio.stocks || Object.keys(portfolio.stocks).length === 0) {
        return message.reply('📊 Your portfolio is empty. Start investing with `X buystock {symbol} {quantity}`');
      }

      const MAX_STOCK_HOLDING = 10; // Maximum per stock
      const MAX_DIFFERENT_STOCKS = 3; // Maximum different stocks
      
      let description = '';
      let totalValue = 0;
      let totalInvested = 0;
      let stocksHeld = 0;
      let hasAbuse = false;

      // Sort stocks by quantity (descending) for better display
      const sortedStocks = Object.entries(portfolio.stocks)
        .filter(([symbol, holding]) => holding.quantity > 0)
        .sort((a, b) => b[1].quantity - a[1].quantity);

      for (const [symbol, holding] of sortedStocks) {
        const stock = marketData.stocks.find(s => s.symbol === symbol);
        if (!stock) continue;

        stocksHeld++;
        
        const quantity = holding.quantity || 0;
        const avgPrice = holding.avgBuyPrice || 0;
        const currentValue = stock.price * quantity;
        const investedValue = holding.totalInvestment || (avgPrice * quantity);
        
        // Calculate profit/loss safely
        const profitLoss = currentValue - investedValue;
        const profitPercent = investedValue > 0 ? ((profitLoss / investedValue) * 100) : 0;
        
        totalValue += currentValue;
        totalInvested += investedValue;

        const profitEmoji = profitLoss >= 0 ? '📈' : '📉';
        const profitColor = profitLoss >= 0 ? '+' : '';

        // Format numbers safely
        const formattedProfitLoss = isNaN(profitLoss) ? '0' : profitLoss.toLocaleString();
        const formattedProfitPercent = isNaN(profitPercent) ? '0.0' : profitPercent.toFixed(1);

        // ⚠️ NEW: Check if at max or over limit
        let limitIndicator = '';
        let warningEmoji = '';
        
        if (quantity > MAX_STOCK_HOLDING) {
          limitIndicator = ` ⚠️ **OVER LIMIT** (${quantity}/${MAX_STOCK_HOLDING})`;
          warningEmoji = '🚨';
          hasAbuse = true;
        } else if (quantity === MAX_STOCK_HOLDING) {
          limitIndicator = ` 🔒 **MAX** (${quantity}/${MAX_STOCK_HOLDING})`;
        } else if (quantity >= 8) {
          limitIndicator = ` ⚡ (${quantity}/${MAX_STOCK_HOLDING})`;
        } else {
          limitIndicator = ` (${quantity}/${MAX_STOCK_HOLDING})`;
        }

        description += `${warningEmoji}**${symbol}** - ${stock.name}${limitIndicator}
`;
        description += `Shares: **${quantity}** | Avg: ${avgPrice.toLocaleString()} <:lux:1411637514569252894>
`;
        description += `Value: ${currentValue.toLocaleString()} <:lux:1411637514569252894> | ${profitEmoji} ${profitColor}${formattedProfitLoss} (${profitColor}${formattedProfitPercent}%)

`;
      }

      // Check if over different stocks limit
      let diversityWarning = '';
      if (stocksHeld > MAX_DIFFERENT_STOCKS) {
        diversityWarning = `
⚠️ **WARNING:** You hold ${stocksHeld} different stocks (max ${MAX_DIFFERENT_STOCKS})`;
        hasAbuse = true;
      }

      // Calculate total portfolio performance safely
      const totalProfitLoss = totalValue - totalInvested;
      const totalProfitPercent = totalInvested > 0 ? ((totalProfitLoss / totalInvested) * 100) : 0;
      const portfolioEmoji = totalProfitLoss >= 0 ? '📈' : '📉';

      const formattedTotalProfitLoss = isNaN(totalProfitLoss) ? '0' : totalProfitLoss.toLocaleString();
      const formattedTotalPercent = isNaN(totalProfitPercent) ? '0.0' : totalProfitPercent.toFixed(1);

      const embed = new EmbedBuilder()
        .setTitle('📊 Your Stock Portfolio')
        .setDescription(description + diversityWarning)
        .addFields([
          {
            name: '💰 Portfolio Summary',
            value: `**Total Value:** ${totalValue.toLocaleString()} <:lux:1411637514569252894>
` +
                   `**Total Invested:** ${totalInvested.toLocaleString()} <:lux:1411637514569252894>
` +
                   `${portfolioEmoji} **P&L:** ${totalProfitLoss >= 0 ? '+' : ''}${formattedTotalProfitLoss} (${formattedTotalPercent}%)

` +
                   `**Stocks Held:** ${stocksHeld}/${MAX_DIFFERENT_STOCKS}`,
            inline: false
          }
        ])
        .setColor(hasAbuse ? '#FF6B00' : (totalProfitLoss >= 0 ? '#00FF00' : '#FF0000'))
        .setFooter({ text: 'Max 10 per stock | Max 3 different stocks' })
        .setTimestamp();

      // Add warning field if abuse detected
      if (hasAbuse) {
        embed.addFields({
          name: '⚠️ Compliance Warning',
          value: 'You have exceeded stock holding limits. Contact support if this is an error.',
          inline: false
        });
      }

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in portfolio command:', error);
      await message.reply('❌ Error loading portfolio. Please try again.');
    }
  },
};