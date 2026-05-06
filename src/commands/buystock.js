const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'buystock',
  aliases: ['bs'],
  async execute(message, args, db) {
    try {
      // Input validation
      if (!args[0] || !args[1]) {
        return message.reply({
          content: '❌ Usage: `X buystock {symbol} {quantity}`\nExample: `X buystock LOF 5`',
        });
      }

      const symbol = args[0].toUpperCase();
      const quantity = parseInt(args[1]);

      const validSymbols = ['LOF', 'JD', 'INDI', 'TKI', 'LUX'];
      if (!validSymbols.includes(symbol)) {
        return message.reply({
          content: `❌ Invalid stock symbol. Available: ${validSymbols.join(', ')}`,
        });
      }

      if (isNaN(quantity) || quantity <= 0) {
        return message.reply({
          content: '❌ Quantity must be a positive number.',
        });
      }

      const MAX_PURCHASE_PER_TRANSACTION = 10;
      if (quantity > MAX_PURCHASE_PER_TRANSACTION) {
        return message.reply({
          content: `❌ **Purchase Limit Exceeded!**\nYou can only buy **${MAX_PURCHASE_PER_TRANSACTION} stocks** at a time.\nRequested: **${quantity}** | Maximum: **${MAX_PURCHASE_PER_TRANSACTION}**`,
        });
      }

      const userId = message.author.id;
      const dbInstance = await db.getDB();
      const portfoliosCollection = dbInstance.collection('portfolios');

      // Check individual stock holding limit
      const MAX_STOCK_HOLDING = 10;
      const userPortfolio = await portfoliosCollection.findOne({ userId });
      
      if (userPortfolio && userPortfolio.stocks && userPortfolio.stocks[symbol]) {
        const currentQuantity = userPortfolio.stocks[symbol].quantity || 0;
        const newTotal = currentQuantity + quantity;
        
        if (newTotal > MAX_STOCK_HOLDING) {
          const canStillBuy = MAX_STOCK_HOLDING - currentQuantity;
          
          if (canStillBuy <= 0) {
            return message.reply({
              content: `❌ **Stock Holding Limit Reached!**\nYou already own **${currentQuantity}** ${symbol} stocks (MAX).\n**Maximum holding:** ${MAX_STOCK_HOLDING} per stock\nSell some ${symbol} stocks first to buy more.`,
            });
          }
          
          return message.reply({
            content: `❌ **Stock Holding Limit!**\n**Current ${symbol} holdings:** ${currentQuantity}\n**Trying to buy:** ${quantity}\n**Would result in:** ${newTotal} (exceeds max ${MAX_STOCK_HOLDING})\n**You can buy:** ${canStillBuy} more ${symbol} stocks\nTry: \`X buystock ${symbol} ${canStillBuy}\``,
          });
        }
      }

      // Check 3 different stocks limit
      if (userPortfolio && userPortfolio.stocks) {
        const currentStocks = Object.keys(userPortfolio.stocks).filter(
          stockSymbol => userPortfolio.stocks[stockSymbol].quantity > 0
        );
        
        if (!currentStocks.includes(symbol) && currentStocks.length >= 3) {
          return message.reply({
            content: `❌ **Stock Diversity Limit Reached!**\nYou can only hold **3 different stocks** at once.\n**Currently holding:** ${currentStocks.join(', ')}\n**To buy ${symbol}:** Sell all shares of one stock first.\nUse \`X sellstock {symbol} all\` to sell all.`,
          });
        }
      }

      // Get market data
      const stocksCollection = dbInstance.collection('stocks');
      const marketData = await stocksCollection.findOne({ type: 'market' });
      
      if (!marketData) {
        return message.reply({
          content: '❌ Stock market is currently unavailable.',
        });
      }

      const stock = marketData.stocks.find(s => s.symbol === symbol);
      if (!stock) {
        return message.reply({
          content: `❌ Stock ${symbol} not found.`,
        });
      }

      const totalCost = stock.price * quantity;

      // Check user balance
      const user = await db.getUser(userId);
      if (!user || user.balance < totalCost) {
        const shortfall = totalCost - (user ? user.balance : 0);
        return message.reply({
          content: `❌ **Insufficient funds!**\n**Cost:** ${totalCost.toLocaleString()} <:lux:1411637514569252894>\n**Your balance:** ${user ? user.balance.toLocaleString() : '0'} <:lux:1411637514569252894>\n**Short by:** ${shortfall.toLocaleString()} <:lux:1411637514569252894>`,
        });
      }

      // ✅ FIX 1: Calculate newHolding BEFORE purchase
      const currentHolding = userPortfolio && userPortfolio.stocks && userPortfolio.stocks[symbol] 
        ? userPortfolio.stocks[symbol].quantity 
        : 0;
      const newHolding = currentHolding + quantity;

      // ✅ FIX 2: Update balance correctly (plain object, not MongoDB operator)
      await db.updateUser(userId, { balance: user.balance - totalCost });
      await db.buyStock(userId, symbol, quantity, stock.price);

      // ✅ FIX 3: Track quest progress correctly
      if (db.trackStockPurchase) {
        await db.trackStockPurchase(userId, symbol, quantity);
      }
      if (db.updateQuestProgress) {
        await db.updateQuestProgress(userId, 'buy_stock', quantity, symbol);
      }

      const holdingStatus = newHolding >= MAX_STOCK_HOLDING ? ' (MAX 🔒)' : '';

      // Success embed with improved description
      const embed = new EmbedBuilder()
        .setTitle('✅ Stock Purchase Successful!')
        .setDescription(
          `**Stock:** ${symbol} - ${stock.name}\n` +
          `**Quantity:** ${quantity} shares\n` +
          `**Price per share:** ${stock.price.toLocaleString()} <:lux:1411637514569252894>\n` +
          `**Total cost:** ${totalCost.toLocaleString()} <:lux:1411637514569252894>\n` +
          `**New balance:** ${(user.balance - totalCost).toLocaleString()} <:lux:1411637514569252894>\n\n` +
          `**${symbol} Holdings:** ${newHolding}/10${holdingStatus}`
        )
        .setColor('#00FF00')
        .setFooter({ text: 'Max 3 different stocks | Max 10 per stock' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      
      console.log('✅ ' + message.author.tag + ' bought ' + quantity + ' ' + symbol + ' stocks. New holding: ' + newHolding + '/10');

    } catch (error) {
      console.error('Error in buystock command:', error);
      console.error('Stack trace:', error.stack);
      await message.reply({
        content: `❌ Error purchasing stock: ${error.message}`,
      }).catch(() => {});
    }
  },
};