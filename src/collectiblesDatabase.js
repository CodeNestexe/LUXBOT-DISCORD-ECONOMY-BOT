const { getDB } = require('./database');

module.exports = {
  addCollectible: async (userId, itemName, rarity) => {
    const dbInstance = await getDB();
    const user = await require('./database').getUser(userId);
    const collectibles = user.collectibles || {};

    collectibles[itemName] = {
      quantity: (collectibles[itemName]?.quantity || 0) + 1,
      rarity: rarity || 'common',
    };

    await require('./database').updateUser(userId, { collectibles });
    console.error(`Added ${itemName} to ${userId}'s collectibles:`, collectibles[itemName]);
    return collectibles[itemName];
  },
  removeCollectible: async (userId, itemName, quantity = 1) => {
    const dbInstance = await getDB();
    const user = await require('./database').getUser(userId);
    const collectibles = user.collectibles || {};

    if (collectibles[itemName]) {
      collectibles[itemName].quantity = Math.max(0, collectibles[itemName].quantity - quantity);
      await require('./database').updateUser(userId, { collectibles });
      console.error(`Removed ${quantity} of ${itemName} from ${userId}'s collectibles:`, collectibles[itemName]);
    }
    return collectibles[itemName] || { quantity: 0, rarity: 'common' };
  },
  getCollectibles: async (userId) => {
    const dbInstance = await getDB();
    const user = await require('./database').getUser(userId);
    const collectibles = user.collectibles || {};
    return collectibles; // Return all collectibles, including those with quantity 0
  },
};