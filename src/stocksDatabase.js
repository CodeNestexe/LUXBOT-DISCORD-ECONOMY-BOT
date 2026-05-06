const { getDB } = require('./database');
const { getUser, updateUser } = require('./database');

module.exports = {
  // Initialize stock system with default values
  initializeStocks: async () => {
    try {
      const dbInstance = await getDB();
      const stocksCollection = dbInstance.collection('stocks');
      
      const existingStocks = await stocksCollection.findOne({ type: 'market' });
      
      if (!existingStocks) {
        const initialStocks = {
          type: 'market',
          lastUpdate: new Date(),
          stocks: [
            {
              symbol: 'LOF',
              name: 'Land Of Fire',
              url: 'https://discord.gg/J3aMDpPwQt',
              price: 10000,
              previousPrice: 10000,
              changePercent: 0,
              volume: 0,
              marketCap: 50000000,
              priceHistory: [10000]
            },
            {
              symbol: 'JD',
              name: 'Jan\'s Dungeon',
              url: 'https://discord.gg/fW55pgEEbW',
              price: 25000,
              previousPrice: 25000,
              changePercent: 0,
              volume: 0,
              marketCap: 125000000,
              priceHistory: [25000]
            },
            {
              symbol: 'INDI',
              name: 'indi.host',
              url: 'https://discord.gg/XAmzFU37eC',
              price: 15000,
              previousPrice: 15000,
              changePercent: 0,
              volume: 0,
              marketCap: 75000000,
              priceHistory: [15000]
            },
            {
              symbol: 'TKI',
              name: 'Tasknode.io',
              url: 'https://discord.gg/T3sgA8bZk3',
              price: 35000,
              previousPrice: 35000,
              changePercent: 0,
              volume: 0,
              marketCap: 175000000,
              priceHistory: [35000]
            },
            {
              symbol: 'LUX',
              name: 'LUX Inc',
              url: 'https://discord.gg/VBrnjU6mfU',
              price: 50000,
              previousPrice: 50000,
              changePercent: 0,
              volume: 0,
              marketCap: 250000000,
              priceHistory: [50000]
            }
          ]
        };
        
        await stocksCollection.insertOne(initialStocks);
        console.log('Initialized stock market system');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing stocks:', error);
      return false;
    }
  },

  // Get current stock market data
  getStockMarket: async () => {
    try {
      const dbInstance = await getDB();
      const stocksCollection = dbInstance.collection('stocks');
      
      const marketData = await stocksCollection.findOne({ type: 'market' });
      return marketData;
    } catch (error) {
      console.error('Error getting stock market:', error);
      return null;
    }
  },

  // Update stock prices with balanced movement system and auto-trading
  updateStockPrices: async () => {
    try {
      const dbInstance = await getDB();
      const stocksCollection = dbInstance.collection('stocks');
      
      const marketData = await stocksCollection.findOne({ type: 'market' });
      if (!marketData) return { success: false, event: null };

      let eventTriggered = null;

      // 5% chance to trigger an event
      if (Math.random() < 0.05) {
        eventTriggered = generateRandomEvent();
      }

      // Original base prices for balance calculations
      const originalPrices = { LOF: 10000, JD: 25000, INDI: 15000, TKI: 35000, LUX: 50000 };

      // Update each stock with balanced price movement
      marketData.stocks.forEach(stock => {
        stock.previousPrice = stock.price;
        
        // NEW: Default range with upward bias (-8% to +12%)
        let changeRange = { min: -0.08, max: 0.12 };
        
        // Apply event effects
        if (eventTriggered) {
          if (eventTriggered.target === 'all' || eventTriggered.target === stock.symbol) {
            changeRange = getEventEffects(eventTriggered.type);
          }
        }

        // NEW: Apply pull-back force based on distance from original price
        const originalPrice = originalPrices[stock.symbol];
        const distanceFromOriginal = (stock.price - originalPrice) / originalPrice;
        
        // Strong upward bias if stock is more than 30% below original
        if (distanceFromOriginal < -0.3) {
          changeRange.min = Math.max(changeRange.min, -0.05); // Limit downside to 5%
          changeRange.max += 0.08; // Add 8% upward bias
          console.log(`${stock.symbol}: Applying recovery bias (${(distanceFromOriginal * 100).toFixed(1)}% below original)`);
        }
        // Moderate downward bias if stock is more than 50% above original
        else if (distanceFromOriginal > 0.5) {
          changeRange.max = Math.min(changeRange.max, 0.05); // Limit upside to 5%
          changeRange.min -= 0.05; // Add 5% downward bias
          console.log(`${stock.symbol}: Applying correction bias (${(distanceFromOriginal * 100).toFixed(1)}% above original)`);
        }
        
        // Generate price change with balanced movement
        const changePercent = Math.random() * (changeRange.max - changeRange.min) + changeRange.min;
        const priceChange = stock.price * changePercent;
        
        // Apply change
        stock.price = Math.round(stock.price + priceChange);
        
        // NEW: Improved price floors and ceilings
        const minPrice = Math.round(originalPrice * 0.25); // 25% of original (instead of 10%)
        const maxPrice = Math.round(originalPrice * 3); // 300% of original (prevents extreme inflation)
        
        if (stock.price < minPrice) {
          stock.price = minPrice;
          console.log(`${stock.symbol}: Hit minimum price floor at ${minPrice}`);
        }
        if (stock.price > maxPrice) {
          stock.price = maxPrice;
          console.log(`${stock.symbol}: Hit maximum price ceiling at ${maxPrice}`);
        }
        
        // Calculate change percentage
        stock.changePercent = ((stock.price - stock.previousPrice) / stock.previousPrice * 100);
        
        // Simulate trading volume
        stock.volume += Math.floor(Math.random() * 1000);
        
        // Update market cap
        stock.marketCap = stock.price * 5000;

        // Track price history for charts
        if (!stock.priceHistory) {
          stock.priceHistory = [];
        }
        
        stock.priceHistory.push(stock.price);
        
        // Keep only last 50 price points
        if (stock.priceHistory.length > 50) {
          stock.priceHistory = stock.priceHistory.slice(-50);
        }
      });

      marketData.lastUpdate = new Date();
      
      await stocksCollection.updateOne(
        { type: 'market' },
        { $set: marketData }
      );

      // Process auto-trades after price updates
      await processAutoTrades(dbInstance);

      return { success: true, event: eventTriggered };
      
    } catch (error) {
      console.error('Error updating stock prices:', error);
      return { success: false, event: null };
    }
  },

  // Get user portfolio
  getUserPortfolio: async (userId) => {
    try {
      const dbInstance = await getDB();
      const portfoliosCollection = dbInstance.collection('portfolios');
      
      const portfolio = await portfoliosCollection.findOne({ userId });
      return portfolio || { userId, stocks: {}, totalInvestment: 0, totalValue: 0 };
    } catch (error) {
      console.error('Error getting user portfolio:', error);
      return { userId, stocks: {}, totalInvestment: 0, totalValue: 0 };
    }
  },

  // Buy stock function
  buyStock: async (userId, symbol, quantity, pricePerShare) => {
    try {
      const dbInstance = await getDB();
      const portfoliosCollection = dbInstance.collection('portfolios');
      
      const portfolio = await portfoliosCollection.findOne({ userId }) || 
        { userId, stocks: {}, totalInvestment: 0, totalValue: 0 };
      
      // Add to portfolio
      if (!portfolio.stocks[symbol]) {
        portfolio.stocks[symbol] = { quantity: 0, avgBuyPrice: 0, totalInvestment: 0 };
      }
      
      const currentHolding = portfolio.stocks[symbol];
      const totalCost = quantity * pricePerShare;
      
      // Calculate new average buy price
      const newTotalQuantity = currentHolding.quantity + quantity;
      const newTotalInvestment = currentHolding.totalInvestment + totalCost;
      
      portfolio.stocks[symbol] = {
        quantity: newTotalQuantity,
        avgBuyPrice: Math.round(newTotalInvestment / newTotalQuantity),
        totalInvestment: newTotalInvestment
      };
      
      portfolio.totalInvestment += totalCost;
      
      await portfoliosCollection.updateOne(
        { userId },
        { $set: portfolio },
        { upsert: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error buying stock:', error);
      return false;
    }
  },

  // Repair existing portfolios to fix NaN issues - GHOST-PROOF VERSION
  repairPortfolios: async () => {
    try {
      const dbInstance = await getDB();
      const portfoliosCollection = dbInstance.collection('portfolios');
      
      // GHOST-PROOF: Only get portfolios of real, registered users
      const allPortfolios = await portfoliosCollection.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: 'userId',
            as: 'userInfo'
          }
        },
        {
          $match: {
            'userInfo.userId': { $exists: true, $ne: null },
            'userInfo.registered': true,
            'userInfo.balance': { $exists: true, $ne: null },
            'userInfo.xp': { $exists: true, $ne: null }
          }
        },
        {
          $project: {
            userId: 1,
            stocks: 1,
            totalInvestment: 1,
            totalValue: 1
          }
        }
      ]).toArray();
      
      for (const portfolio of allPortfolios) {
        let updated = false;
        
        for (const [symbol, holding] of Object.entries(portfolio.stocks || {})) {
          // Fix missing totalInvestment
          if (!holding.totalInvestment && holding.avgBuyPrice && holding.quantity) {
            holding.totalInvestment = holding.avgBuyPrice * holding.quantity;
            updated = true;
          }
          
          // Fix NaN values
          if (isNaN(holding.avgBuyPrice)) {
            holding.avgBuyPrice = 0;
            updated = true;
          }
          
          if (isNaN(holding.quantity)) {
            holding.quantity = 0;
            updated = true;
          }
          
          if (isNaN(holding.totalInvestment)) {
            holding.totalInvestment = 0;
            updated = true;
          }
        }
        
        if (updated) {
          await portfoliosCollection.updateOne(
            { userId: portfolio.userId },
            { $set: { stocks: portfolio.stocks } }
          );
        }
      }
      
      console.log('Portfolio data repair completed (ghost-proof)');
    } catch (error) {
      console.error('Error repairing portfolios:', error);
    }
  },

  // Track stock purchase for quest system
  trackStockPurchase: async (userId, stockSymbol, quantity) => {
    try {
      const dbInstance = await getDB();
      const stockTransactionsCollection = dbInstance.collection('stockTransactions');
      
      // Record the transaction
      await stockTransactionsCollection.insertOne({
        userId,
        symbol: stockSymbol,
        type: 'buy',
        quantity,
        timestamp: Date.now()
      });
      
      console.log(`Stock purchase tracked: ${userId} bought ${quantity} ${stockSymbol}`);
      
    } catch (error) {
      console.error('Error tracking stock purchase:', error);
    }
  }
};

// 🔧 GHOST-PROOF: Process auto-trading when prices update
const processAutoTrades = async (dbInstance) => {
  try {
    const stocksCollection = dbInstance.collection('stocks');
    const autoBuyCollection = dbInstance.collection('autoBuyOrders');
    const autoSellCollection = dbInstance.collection('autoSellOrders');
    const portfoliosCollection = dbInstance.collection('portfolios');
    
    const marketData = await stocksCollection.findOne({ type: 'market' });
    if (!marketData) return;

    // 🔧 GHOST-PROOF: Get only auto-buy orders from real, registered users
    const activeBuyOrders = await autoBuyCollection.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'userInfo'
        }
      },
      {
        $match: {
          'userInfo.userId': { $exists: true, $ne: null },
          'userInfo.registered': true,
          'userInfo.balance': { $exists: true, $ne: null },
          'userInfo.xp': { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          userId: 1,
          symbol: 1,
          targetPrice: 1,
          quantity: 1,
          totalCost: 1,
          username: 1,
          userBalance: { $arrayElemAt: ['$userInfo.balance', 0] }
        }
      }
    ]).toArray();

    // Process verified buy orders
    for (const order of activeBuyOrders) {
      const stock = marketData.stocks.find(s => s.symbol === order.symbol);
      if (!stock) continue;

      // Check if current price is at or below target price
      if (stock.price <= order.targetPrice && order.userBalance >= order.totalCost) {
        // Execute buy order
        await updateUser(order.userId, { balance: order.userBalance - order.totalCost });
        
        // Add to portfolio
        const portfolio = await portfoliosCollection.findOne({ userId: order.userId }) || 
          { userId: order.userId, stocks: {} };
          
        if (!portfolio.stocks[order.symbol]) {
          portfolio.stocks[order.symbol] = { quantity: 0, avgBuyPrice: 0, totalInvestment: 0 };
        }
        
        const currentHolding = portfolio.stocks[order.symbol];
        const newTotalQuantity = currentHolding.quantity + order.quantity;
        const newTotalInvestment = currentHolding.totalInvestment + order.totalCost;
        
        portfolio.stocks[order.symbol] = {
          quantity: newTotalQuantity,
          avgBuyPrice: Math.round(newTotalInvestment / newTotalQuantity),
          totalInvestment: newTotalInvestment
        };
        
        await portfoliosCollection.updateOne(
          { userId: order.userId },
          { $set: portfolio },
          { upsert: true }
        );
        
        // Deactivate order
        await autoBuyCollection.updateOne(
          { _id: order._id },
          { $set: { active: false, executedAt: new Date(), executedPrice: stock.price } }
        );
        
        console.log(`Auto-buy executed: ${order.username} bought ${order.quantity} ${order.symbol} at ${stock.price}`);
      }
    }

    // 🔧 GHOST-PROOF: Get only auto-sell orders from real, registered users
    const activeSellOrders = await autoSellCollection.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'userInfo'
        }
      },
      {
        $match: {
          'userInfo.userId': { $exists: true, $ne: null },
          'userInfo.registered': true,
          'userInfo.balance': { $exists: true, $ne: null },
          'userInfo.xp': { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          userId: 1,
          symbol: 1,
          targetPrice: 1,
          quantity: 1,
          username: 1,
          userBalance: { $arrayElemAt: ['$userInfo.balance', 0] }
        }
      }
    ]).toArray();

    // Process verified sell orders
    for (const order of activeSellOrders) {
      const stock = marketData.stocks.find(s => s.symbol === order.symbol);
      if (!stock) continue;

      // Check if current price is at or above target price
      if (stock.price >= order.targetPrice) {
        // Check if user still owns the shares
        const portfolio = await portfoliosCollection.findOne({ userId: order.userId });
        if (!portfolio || !portfolio.stocks[order.symbol] || 
            portfolio.stocks[order.symbol].quantity < order.quantity) continue;

        // Execute sell order
        const earnings = stock.price * order.quantity;
        
        // Add earnings to balance
        await updateUser(order.userId, { balance: order.userBalance + earnings });
        
        // Remove from portfolio
        const newQuantity = portfolio.stocks[order.symbol].quantity - order.quantity;
        const costBasis = portfolio.stocks[order.symbol].avgBuyPrice * order.quantity;
        const newTotalInvestment = Math.max(0, portfolio.stocks[order.symbol].totalInvestment - costBasis);
        
        if (newQuantity === 0) {
          delete portfolio.stocks[order.symbol];
        } else {
          portfolio.stocks[order.symbol] = {
            quantity: newQuantity,
            avgBuyPrice: portfolio.stocks[order.symbol].avgBuyPrice,
            totalInvestment: newTotalInvestment
          };
        }
        
        await portfoliosCollection.updateOne(
          { userId: order.userId },
          { $set: portfolio }
        );
        
        // Deactivate order
        await autoSellCollection.updateOne(
          { _id: order._id },
          { $set: { active: false, executedAt: new Date(), executedPrice: stock.price } }
        );
        
        console.log(`Auto-sell executed: ${order.username} sold ${order.quantity} ${order.symbol} at ${stock.price}`);
      }
    }

    // 🔧 NEW: Clean up ghost orders
    await cleanupGhostOrders(dbInstance);
    
  } catch (error) {
    console.error('Error processing auto trades:', error);
  }
};

// 🔧 NEW: Clean up ghost orders function
const cleanupGhostOrders = async (dbInstance) => {
  try {
    const autoBuyCollection = dbInstance.collection('autoBuyOrders');
    const autoSellCollection = dbInstance.collection('autoSellOrders');
    
    // Find and deactivate ghost buy orders
    const ghostBuyOrders = await autoBuyCollection.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'userInfo'
        }
      },
      {
        $match: {
          $or: [
            { 'userInfo': { $size: 0 } },
            { 'userInfo.registered': { $ne: true } },
            { 'userInfo.userId': { $exists: false } }
          ]
        }
      },
      { $project: { _id: 1, userId: 1 } }
    ]).toArray();

    if (ghostBuyOrders.length > 0) {
      const ghostIds = ghostBuyOrders.map(order => order._id);
      await autoBuyCollection.updateMany(
        { _id: { $in: ghostIds } },
        { $set: { active: false, deactivatedReason: 'Ghost user cleanup' } }
      );
      console.log(`Cleaned up ${ghostBuyOrders.length} ghost buy orders`);
    }

    // Find and deactivate ghost sell orders
    const ghostSellOrders = await autoSellCollection.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'userInfo'
        }
      },
      {
        $match: {
          $or: [
            { 'userInfo': { $size: 0 } },
            { 'userInfo.registered': { $ne: true } },
            { 'userInfo.userId': { $exists: false } }
          ]
        }
      },
      { $project: { _id: 1, userId: 1 } }
    ]).toArray();

    if (ghostSellOrders.length > 0) {
      const ghostIds = ghostSellOrders.map(order => order._id);
      await autoSellCollection.updateMany(
        { _id: { $in: ghostIds } },
        { $set: { active: false, deactivatedReason: 'Ghost user cleanup' } }
      );
      console.log(`Cleaned up ${ghostSellOrders.length} ghost sell orders`);
    }
    
  } catch (error) {
    console.error('Error cleaning up ghost orders:', error);
  }
};

// Generate random market events
function generateRandomEvent() {
  const eventTypes = [
    { type: 'bullRun', weight: 25 },
    { type: 'dump', weight: 20 },
    { type: 'earnings', weight: 30 },
    { type: 'partnership', weight: 15 },
    { type: 'recession', weight: 5 },
    { type: 'rally', weight: 5 }
  ];

  const totalWeight = eventTypes.reduce((sum, event) => sum + event.weight, 0);
  let random = Math.random() * totalWeight;
  
  let selectedEvent = null;
  for (const event of eventTypes) {
    if (random < event.weight) {
      selectedEvent = event;
      break;
    }
    random -= event.weight;
  }

  if (!selectedEvent) return null;

  const stockSymbols = ['LOF', 'JD', 'INDI', 'TKI', 'LUX'];
  const target = ['recession', 'rally'].includes(selectedEvent.type) ? 'all' : 
    stockSymbols[Math.floor(Math.random() * stockSymbols.length)];

  return {
    type: selectedEvent.type,
    target: target,
    message: generateEventMessage(selectedEvent.type, target)
  };
}

// Get event price effects
function getEventEffects(eventType) {
  const effects = {
    bullRun: { min: 0.05, max: 0.35 }, // +5% to +35%
    dump: { min: -0.45, max: -0.10 }, // -45% to -10%
    earnings: { min: -0.20, max: 0.25 }, // ±20-25%
    partnership: { min: 0.15, max: 0.30 }, // +15% to +30%
    recession: { min: -0.25, max: -0.05 }, // -25% to -5%
    rally: { min: 0.08, max: 0.25 } // +8% to +25%
  };

  return effects[eventType] || { min: -0.15, max: 0.15 };
}

// Generate event messages
function generateEventMessage(eventType, target) {
  const messages = {
    bullRun: target === 'all' ? 
      'Bull Run Alert! All stocks are surging due to positive market sentiment!' :
      `${target} Bull Run! Major partnership announcement sends ${target} soaring!`,
    
    dump: target === 'all' ?
      'Market Dump! Panic selling hits all stocks!' :
      `${target} Dump! Technical issues cause ${target} to plummet!`,
    
    earnings: `Earnings Report: ${target} releases quarterly results affecting stock price!`,
    
    partnership: `Partnership News: ${target} announces major collaboration!`,
    
    recession: 'Economic Recession: Global market downturn affects all stocks!',
    
    rally: 'Market Rally: Bull market confirmed! All stocks rising!'
  };

  return messages[eventType] || `Market event affecting ${target}`;
}