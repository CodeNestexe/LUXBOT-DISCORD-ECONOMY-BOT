const banSystem = require('./banSystem.js');

module.exports = {
  name: 'unban',
  aliases: [],
  description: 'Unban a user from Lux Bot (Admin Only)',
  adminOnly: true,
  
  async execute(message, args, db) {
    // **FIXED: Use the shared executeUnban function**
    return await banSystem.executeUnban(message, args, db);
  }
};
