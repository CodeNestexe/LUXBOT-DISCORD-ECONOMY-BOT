const { EmbedBuilder } = require('discord.js');
const gamblingDatabase = require('../gamblingDatabase');

module.exports = {
  name: 'hr',
  async execute(message, args, db) {
    try {
      console.log('Executing horseRace for:', message.author.id);
      if (args.length < 2) return message.reply('Usage: X hr {horse} {amount}');
      const horse = args[0].toUpperCase();
      const amount = parseInt(args[1]);
      if (!['A', 'B', 'C', 'D'].includes(horse)) return message.reply('Choose horse A, B, C, or D!');
      if (isNaN(amount) || amount <= 0) return message.reply('Invalid bet amount!');

      // Validate the bet (max 300,000 and sufficient balance)
      await db.validateBet(message.author.id, amount);

      // Deduct the bet amount with Mana Zone buff
      await gamblingDatabase.deductBalance(message.author.id, amount, true);

      // Update quest progress for playing horse race
      await db.updateQuestProgress(message.author.id, 'play_horserace');

      // Refresh user data to get the updated balance
      const user = await db.getUser(message.author.id);
      if (typeof user.balance !== 'number' || isNaN(user.balance)) {
        throw new Error('Balance is invalid after deduction. Please contact support.');
      }

      // Simulate the race with emoji-based animation, sent as a reply
      const horses = ['A', 'B', 'C', 'D'];
      let positions = { A: 0, B: 0, C: 0, D: 0 };
      const trackLength = 10;

      // Initial race message (sent as a reply)
      let raceMessageContent = '🏁 Race Starting! 🏁\n' +
        '👥👥👥👥👥👥👥👥👥👥 [Crowd]\n' +
        horses.map(h => `${h}: 🐎 ${'—'.repeat(trackLength)} 🏁`).join('\n') +
        '\n🏞️🏞️🏞️🏞️🏞️🏞️🏞️🏞️🏞️🏞️ [Field]';

      const raceMessage = await message.reply(raceMessageContent);

      // Simulate race with 3 frames, editing the reply
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        horses.forEach(h => {
          positions[h] += Math.floor(Math.random() * 3);
          if (positions[h] > trackLength) positions[h] = trackLength;
        });

        raceMessageContent = '🏁 Race in Progress! 🏁\n' +
          '👥👥👥👥👥👥👥👥👥👥 [Crowd]\n' +
          horses.map(h => `${h}: ${' '.repeat(positions[h])}🐎 ${'—'.repeat(trackLength - positions[h])} 🏁`).join('\n') +
          '\n🏞️🏞️🏞️🏞️🏞️🏞️🏞️🏞️🏞️🏞️ [Field]';

        await raceMessage.edit(raceMessageContent);
      }

      // Update the race message to indicate the race is finished
      raceMessageContent = '🏁 Race Finished! 🏁\n' +
        '👥👥👥👥👥👥👥👥👥👥 [Crowd]\n' +
        horses.map(h => `${h}: ${' '.repeat(positions[h])}🐎 ${'—'.repeat(trackLength - positions[h])} 🏁`).join('\n') +
        '\n🏞️🏞️🏞️🏞️🏞️🏞️🏞️🏞️🏞️🏞️ [Field]';
      await raceMessage.edit(raceMessageContent);

      // Determine the top 3 horses
      const sortedHorses = horses.sort((a, b) => positions[b] - positions[a]);
      const winner = sortedHorses[0];
      const secondPlace = sortedHorses[1];
      const thirdPlace = sortedHorses[2];

      // Calculate prize with Mana Zone buff
      let prize = 0;
      let didWin = false;
      if (horse === winner) {
        prize = amount * 2; // Base prize for first place
        prize = await gamblingDatabase.adjustBalanceWithManaZone(message.author.id, prize, true);
        didWin = true;
      } else if (horse === secondPlace) {
        prize = amount * 1.5; // Base prize for second place
        prize = await gamblingDatabase.adjustBalanceWithManaZone(message.author.id, prize, true);
        didWin = true;
      }

      // Update quest progress for winning horse race
      if (didWin) {
        await db.updateQuestProgress(message.author.id, 'win_horserace');
      }

      if (typeof prize !== 'number' || isNaN(prize)) {
        throw new Error('Calculated prize is invalid!');
      }

      // Update user balance and stats
      const updatedUser = await db.getUser(message.author.id); // Refresh user data
      if (typeof updatedUser.balance !== 'number' || isNaN(updatedUser.balance)) {
        throw new Error('Balance is invalid after race. Please contact support.');
      }
      const newBalance = updatedUser.balance + prize;
      if (typeof newBalance !== 'number' || isNaN(newBalance)) {
        console.error(`Calculated newBalance is invalid for user ${message.author.id}. Updated user balance: ${updatedUser.balance}, Prize: ${prize}`);
        throw new Error('Invalid balance calculation. Please contact support.');
      }
      const newProfile = {
        ...updatedUser.profile,
        wins: prize > 0 ? (updatedUser.profile?.wins || 0) + 1 : (updatedUser.profile?.wins || 0),
        losses: prize === 0 ? (updatedUser.profile?.losses || 0) + 1 : (updatedUser.profile?.losses || 0),
      };
      await db.updateUser(message.author.id, {
        balance: newBalance,
        profile: newProfile,
      });

      // Check if Mana Zone buff is active
      const userWithBuffs = await db.getUser(message.author.id);
      let isManaZoneActive = false;
      if (userWithBuffs.buffs?.manaZone?.active) {
        const now = Date.now();
        const buffStartTime = new Date(userWithBuffs.buffs.manaZone.startTime).getTime();
        const buffDuration = userWithBuffs.buffs.manaZone.duration;
        if (now < buffStartTime + buffDuration) {
          isManaZoneActive = true;
        } else {
          // Buff has expired, deactivate it
          await db.updateUser(message.author.id, {
            'buffs.manaZone.active': false,
          });
          console.log(`Mana Zone buff expired for user ${message.author.id}`);
        }
      }

      // Send the final result as a reply to the user
      const resultEmbed = new EmbedBuilder()
        .setTitle('🏁 Race Results! 🏁')
        .setDescription(
          '📏 **Podium Results** 📏\n' +
          `🥇 1st: Horse ${winner}\n` +
          `🥈 2nd: Horse ${secondPlace}\n` +
          `🥉 3rd: Horse ${thirdPlace}\n\n` +
          (prize > 0
            ? `🎉 You won ${prize.toLocaleString()}!${isManaZoneActive ? ' (25% extra)' : ''}`
            : `😔 You lost ${amount.toLocaleString()}.${isManaZoneActive ? ' (25% amount refunded)' : ''}`) +
          `\nYour new balance: ${newBalance.toLocaleString()}`
        )
        .setColor(prize > 0 ? '#00ff00' : '#ff0000')
        .setFooter({ text: `Played by ${message.author.username}` });

      await message.reply({
        embeds: [resultEmbed],
      });

    } catch (error) {
      console.error('Error in horseRace command:', error.message);
      await message.reply(`Error: ${error.message}`);
    }
  },
};
