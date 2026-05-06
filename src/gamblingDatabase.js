const { getDB, getUser, updateUser } = require('./database');

module.exports = {
  getMineGame: async (userId) => {
    const dbInstance = await getDB();
    const game = await dbInstance.collection('mineGames').findOne({ userId });
    if (game) {
      if (!Array.isArray(game.grid) || !Array.isArray(game.revealed)) {
        console.error(`Invalid game state for ${userId}: grid or revealed is not an array`, game);
        await dbInstance.collection('mineGames').deleteOne({ userId });
        return null;
      }
      console.log(`Fetched mine game for ${userId}:`, game);
    } else {
      console.log(`No mine game found for ${userId}`);
    }
    return game || null;
  },

  startMineGame: async (userId, bet, bombCount) => {
    const dbInstance = await getDB();
    if (bombCount < 0 || bombCount > 9) {
      throw new Error('Invalid number of bombs');
    }
    const grid = Array(9).fill('safe');
    const bombs = [];
    while (bombs.length < bombCount) {
      const pos = Math.floor(Math.random() * 9);
      if (!bombs.includes(pos)) bombs.push(pos);
    }
    bombs.forEach(pos => (grid[pos] = 'bomb'));
    const game = {
      userId,
      active: true,
      bet,
      grid,
      revealed: Array(9).fill(false),
      safePicks: 0,
      multiplier: 1.0,
      updatedAt: new Date(),
    };
    try {
      await dbInstance.collection('mineGames').replaceOne(
        { userId },
        game,
        { upsert: true }
      );
      console.log(`Started mine game for ${userId}:`, {
        userId: game.userId,
        bet: game.bet,
        grid: game.grid,
        revealed: game.revealed,
        safePicks: game.safePicks,
        multiplier: game.multiplier,
        active: game.active,
      });
    } catch (error) {
      console.error(`Error starting mine game for ${userId}: ${error.message}`);
      throw error;
    }
    return game;
  },

  updateMineGame: async (userId, updates) => {
    const dbInstance = await getDB();
    if (updates.safePicks > 6) {
      throw new Error('Invalid safePicks value');
    }
    try {
      updates.updatedAt = new Date();
      const result = await dbInstance.collection('mineGames').updateOne(
        { userId },
        { $set: updates }
      );
      console.log(`Updated mine game for ${userId}:`, result);
    } catch (error) {
      console.error(`Error updating mine game for ${userId}: ${error.message}`);
      throw error;
    }
  },

  endMineGame: async (userId) => {
    const dbInstance = await getDB();
    try {
      await dbInstance.collection('mineGames').deleteOne({ userId });
      console.log(`Ended mine game for ${userId}`);
    } catch (error) {
      console.error(`Error ending mine game for ${userId}: ${error.message}`);
      throw error;
    }
  },

  validateBet: async (userId, bet) => {
    const MAX_BET = 300000;
    if (typeof bet !== 'number' || isNaN(bet) || bet <= 0) {
      throw new Error('Invalid bet amount!');
    }
    const user = await getUser(userId);
    if (!user) throw new Error('User not found');
    if (typeof user.balance !== 'number' || isNaN(user.balance)) {
      // Initialize balance if undefined or invalid
      await updateUser(userId, { balance: 0 });
      throw new Error('Balance was invalid and has been reset to 0. Please try again.');
    }
    if (bet > MAX_BET) {
      throw new Error(`Max bet limit is ${MAX_BET}! Please choose a lower amount.`);
    }
    if (user.balance < bet) {
      throw new Error(`Insufficient balance to place this bet! You have ${user.balance.toLocaleString()}.`);
    }
    return true;
  },

  deductBalance: async (userId, amount, applyManaZoneBuff = false) => {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid deduction amount!');
    }
    let user = await getUser(userId);
    if (!user) throw new Error('User not found');
    if (typeof user.balance !== 'number' || isNaN(user.balance)) {
      // Initialize balance if undefined or invalid
      await updateUser(userId, { balance: 0 });
      throw new Error('Balance was invalid and has been reset to 0. Please try again.');
    }
    if (user.balance < amount) {
      throw new Error(`Insufficient balance! You have ${user.balance.toLocaleString()}.`);
    }

    let adjustedAmount = amount;
    if (applyManaZoneBuff) {
      adjustedAmount = await module.exports.adjustBalanceWithManaZone(userId, amount, false);
    }

    if (typeof adjustedAmount !== 'number' || isNaN(adjustedAmount)) {
      throw new Error('Adjusted deduction amount is invalid!');
    }

    const newBalance = user.balance - adjustedAmount;
    if (typeof newBalance !== 'number' || isNaN(newBalance)) {
      throw new Error('Calculated new balance is invalid!');
    }

    await updateUser(userId, { balance: newBalance });
    console.log(`Deducted ${adjustedAmount} from ${userId}. New balance: ${newBalance}`);
    return newBalance;
  },

  adjustBalanceWithManaZone: async (userId, amount, isWin) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Invalid amount for adjustment!');
    }
    const user = await getUser(userId);
    if (!user) throw new Error('User not found');
    let adjustedAmount = amount;

    if (user.buffs?.manaZone?.active) {
      const now = Date.now();
      const buffStartTime = new Date(user.buffs.manaZone.startTime).getTime();
      const buffDuration = user.buffs.manaZone.duration;
      if (now < buffStartTime + buffDuration) {
        if (isWin) {
          adjustedAmount = Math.floor(amount * 1.25); // 25% more on win
          console.log(`Applied 25% extra for user ${userId}: ${amount} -> ${adjustedAmount}`);
        } else {
          adjustedAmount = Math.floor(amount * 0.75); // 25% less deduction on loss
          console.log(`Applied 25% less deduction for user ${userId}: ${amount} -> ${adjustedAmount}`);
        }
      } else {
        // Buff has expired, deactivate it
        await updateUser(userId, {
          'buffs.manaZone.active': false,
        });
        console.log(`Mana Zone buff expired during adjustment for user ${userId}`);
      }
    }

    return adjustedAmount;
  },
};