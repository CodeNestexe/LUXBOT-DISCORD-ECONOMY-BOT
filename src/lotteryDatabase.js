const { getDB } = require('./database');

module.exports = {
  // Get lottery system data
  getLotteries: async () => {
    try {
      const dbInstance = await getDB();
      const lotteryCollection = dbInstance.collection('lotteries');
      return await lotteryCollection.findOne({ type: 'system' });
    } catch (error) {
      console.error('Error getting lottery data:', error);
      return null;
    }
  },

  // Set lottery data
  setLotteries: async (lotteryData) => {
    try {
      const dbInstance = await getDB();
      const lotteryCollection = dbInstance.collection('lotteries');
      return await lotteryCollection.updateOne(
        { type: 'system' },
        { $set: lotteryData },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error setting lottery data:', error);
      return null;
    }
  },

  // Initialize lottery system - FIXED to match lottery.js expectations
  initializeLottery: async () => {
    try {
      const dbInstance = await getDB();
      const lotteryCollection = dbInstance.collection('lotteries');
      
      const existing = await lotteryCollection.findOne({ type: 'system' });
      if (!existing) {
        const now = new Date();
        const nextReset = new Date();
        nextReset.setUTCHours(6, 30, 0, 0);
        if (nextReset <= now) {
          nextReset.setDate(nextReset.getDate() + 1);
        }

        await lotteryCollection.insertOne({
          type: 'system',
          timeBased: {
            id: 1,
            number: 1,
            totalAmount: 0,
            participants: [],
            startTime: now,
            endTime: nextReset,
            resetTime: nextReset
          },
          userBased1: {
            id: 2,
            number: 2,
            users: [],
            participants: [],
            totalAmount: 0,
            startTime: now,
            endTime: null
          },
          userBased2: {
            id: 3,
            number: 3,
            users: [],
            participants: [],
            totalAmount: 0,
            startTime: now,
            endTime: null
          },
          nextLotteryId: 4
        });
      }
      return true;
    } catch (error) {
      console.error('Error initializing lottery:', error);
      return false;
    }
  }
};
