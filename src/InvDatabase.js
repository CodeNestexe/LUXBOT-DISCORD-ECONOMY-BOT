const { getDB } = require('./database');

module.exports = {
  getInventory: async (userId) => {
    const dbInstance = await getDB();
    console.log(`Getting inventory for user: ${userId}`);
    let user = await dbInstance.collection('users').findOne(
      { userId },
      { projection: { items: 1 } }
    );

    // Ensure the user exists and has an items field
    if (!user) {
      console.log(`User ${userId} not found, creating new user with empty inventory`);
      await dbInstance.collection('users').insertOne({
        userId,
        items: {},
        // Minimal fields to satisfy the schema; other fields will be set by other commands
        lux: 0, // Changed from balance to lux for consistency
        lastDaily: 0,
        profile: { wins: 0, losses: 0 },
        xp: 0,
        level: 0,
        lastDailyXPReset: Date.now(),
        dailyXP: 0,
        manaPoints: 0,
        manaCrystals: 0,
        lastGambleTime: Date.now(),
        banned: false,
        banReason: null,
        collectibles: {},
        battleStats: {
          health: 1000,
          maxHealth: 1000,
          battery: 2000,
          attack: 100,
          defense: 0,
          battleLevel: 0,
          battleXP: 0,
          activeBoosts: [],
        },
      });
      user = { items: {} };
    }

    const items = user.items ?? {};
    console.log(`Inventory for user ${userId}:`, items);
    return { userId, items }; // Return the full inventory object
  },

  addItem: async (userId, slotNumber, quantity) => {
    const dbInstance = await getDB();
    const trimmedSlot = slotNumber.trim(); // Trim to remove leading/trailing spaces
    await dbInstance.collection('users').updateOne(
      { userId },
      { $inc: { [`items.${trimmedSlot}`]: quantity } },
      { upsert: true }
    );
    console.log(`Added ${quantity} items to slot ${trimmedSlot} for user ${userId}`);
  },

  removeItem: async (userId, slotNumber, quantity) => {
    const dbInstance = await getDB();
    const trimmedSlot = slotNumber.trim(); // Trim to remove leading/trailing spaces
    const user = await dbInstance.collection('users').findOne(
      { userId },
      { projection: { items: 1 } }
    );
    const currentQuantity = user?.items?.[trimmedSlot] || 0;
    const newQuantity = Math.max(0, currentQuantity - quantity);
    await dbInstance.collection('users').updateOne(
      { userId },
      { $set: { [`items.${trimmedSlot}`]: newQuantity } }
    );
    console.log(`Removed ${quantity} items from slot ${trimmedSlot} for user ${userId}. New quantity: ${newQuantity}`);
    return newQuantity;
  },
};