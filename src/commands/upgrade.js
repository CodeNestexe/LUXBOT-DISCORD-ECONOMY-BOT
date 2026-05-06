const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'upgrade',
  description: 'Upgrade your fishing stats using mana crystals',
  async execute(message, args, db) {
    try {
      const userId = message.author.id;

      // Validate arguments
      if (args.length !== 2) {
        return message.reply('Usage: `X upgrade {stats_name} {amount}`\nValid stats: `range`, `efficiency`, `strength`');
      }

      const statName = args[0].toLowerCase();
      const amount = parseInt(args[1]);

      // Validate stat name
      const validStats = ['range', 'efficiency', 'strength'];
      if (!validStats.includes(statName)) {
        return message.reply('❌ Invalid stat name! Valid stats: `range`, `efficiency`, `strength`');
      }

      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        return message.reply('❌ Please provide a valid positive number for the amount of mana crystals.');
      }

      const user = await db.getUser(userId);
      const manaCrystals = user.manaCrystals || 0;

      // Check if user has enough mana crystals
      if (manaCrystals < amount) {
        return message.reply(`❌ You don't have enough mana crystals! You have ${manaCrystals}, but need ${amount}.`);
      }

      // Initialize fishing stats if they don't exist
      if (!user.fishingStats) {
        await db.updateUser(userId, {
          fishingStats: {
            range: { level: 0, progress: 0 },
            efficiency: { level: 0, progress: 0 },
            strength: { level: 0, progress: 0 }
          }
        });
      }

      const fishingStats = user.fishingStats || {
        range: { level: 0, progress: 0 },
        efficiency: { level: 0, progress: 0 },
        strength: { level: 0, progress: 0 }
      };

      const currentStat = fishingStats[statName];

      // Check if stat is already maxed
      if (currentStat.level >= 5) {
        return message.reply(`❌ Your ${statName} is already at maximum level (5)!`);
      }

      // Level requirements
      const levelRequirements = [500, 1000, 2000, 3000, 4000]; // Level 0->1, 1->2, 2->3, 3->4, 4->5

      let newProgress = currentStat.progress + amount;
      let newLevel = currentStat.level;
      let levelUpMessage = '';

      // Process level ups
      while (newLevel < 5) {
        const requiredForNextLevel = levelRequirements[newLevel];
        
        if (newProgress >= requiredForNextLevel) {
          newProgress -= requiredForNextLevel;
          newLevel++;
          levelUpMessage += `\n🎉 Your ${statName} leveled up to Level ${newLevel}!`;
          
          if (newLevel >= 5) {
            newProgress = 0; // Max level reached
            break;
          }
        } else {
          break;
        }
      }

      // Update user data
      const newManaCrystals = manaCrystals - amount;
      const updatedFishingStats = { ...fishingStats };
      updatedFishingStats[statName] = { level: newLevel, progress: newProgress };

      await db.updateUser(userId, {
        manaCrystals: newManaCrystals,
        fishingStats: updatedFishingStats
      });

      // Create progress bar for display
      const createProgressBar = (progress, required) => {
        const totalBars = 16;
        const filledBars = Math.floor((progress / required) * totalBars);
        const emptyBars = totalBars - filledBars;
        return '■'.repeat(filledBars) + '□'.repeat(emptyBars);
      };

      const nextLevelRequired = newLevel < 5 ? levelRequirements[newLevel] : 0;
      const progressBar = newLevel >= 5 ? '■'.repeat(16) : createProgressBar(newProgress, nextLevelRequired);

      // Get emoji for stat
      const statEmojis = {
        range: '🧵',
        efficiency: '🎯',
        strength: '🔮'
      };

      const embed = new EmbedBuilder()
        .setTitle('✅ Stat Upgrade Successful!')
        .setDescription(
          `You invested **${amount}** mana crystals into **${statName}**!\n\n` +
          `**${statEmojis[statName]} ${statName.toUpperCase()} -**\n` +
          `\`Lvl ${newLevel} [${newProgress}/${nextLevelRequired || 'MAX'}]\`\n` +
          `\`[${progressBar}]\`\n` +
          (levelUpMessage || '') +
          `\n**Remaining Mana Crystals:** ${newManaCrystals}`
        )
        .setColor('#00FF00')
        .setFooter({ text: `Upgraded by ${message.author.username}` });

      await message.reply({ embeds: [embed] });

      console.log(`User ${userId} upgraded ${statName} with ${amount} mana crystals. New level: ${newLevel}, progress: ${newProgress}`);

    } catch (error) {
      console.error('Error in upgrade command:', error);
      await message.reply('❌ An error occurred while upgrading your stats. Please try again.');
    }
  }
};
