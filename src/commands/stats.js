const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'stats',
  description: 'View your fishing stats',
  async execute(message, args, db) {
    try {
      const userId = message.author.id;
      const user = await db.getUser(userId);

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

      const manaCrystals = user.manaCrystals || 0;

      // Function to calculate required crystals for current level
      const getRequiredCrystals = (level) => {
        const requirements = [500, 1000, 2000, 3000, 4000];
        return requirements[level] || 0;
      };

      // Function to create progress bar
      const createProgressBar = (progress, required) => {
        const totalBars = 16;
        const filledBars = Math.floor((progress / required) * totalBars);
        const emptyBars = totalBars - filledBars;
        return '■'.repeat(filledBars) + '□'.repeat(emptyBars);
      };

      // Calculate stats display
      const rangeRequired = getRequiredCrystals(fishingStats.range.level);
      const efficiencyRequired = getRequiredCrystals(fishingStats.efficiency.level);
      const strengthRequired = getRequiredCrystals(fishingStats.strength.level);

      const rangeBar = fishingStats.range.level >= 5 ? '■'.repeat(16) : createProgressBar(fishingStats.range.progress, rangeRequired);
      const efficiencyBar = fishingStats.efficiency.level >= 5 ? '■'.repeat(16) : createProgressBar(fishingStats.efficiency.progress, efficiencyRequired);
      const strengthBar = fishingStats.strength.level >= 5 ? '■'.repeat(16) : createProgressBar(fishingStats.strength.progress, strengthRequired);

      const embed = new EmbedBuilder()
        .setTitle('**WELCOME TO FISHING STATS**')
        .setDescription(
          `Use the command \`X upgrade {stats_name} {amount}\` to get started.\n` +
          `Remember \`you need mana crystals\` to upgrade the stats.\n` +
          `To obtain mana crystals, check out \`fish and gambling command which will give you mana points\`.\n\n` +
          
          `**🧵 RANGE -**\n` +
          `\`Lvl ${fishingStats.range.level} [${fishingStats.range.progress}/${rangeRequired || 'MAX'}]\`\n` +
          `\`[${rangeBar}]\`\n\n` +
          
          `**🎯 EFFICIENCY -**\n` +
          `\`Lvl ${fishingStats.efficiency.level} [${fishingStats.efficiency.progress}/${efficiencyRequired || 'MAX'}]\`\n` +
          `\`[${efficiencyBar}]\`\n\n` +
          
          `**🔮 STRENGTH -**\n` +
          `\`Lvl ${fishingStats.strength.level} [${fishingStats.strength.progress}/${strengthRequired || 'MAX'}]\`\n` +
          `\`[${strengthBar}]\`\n\n` +
          
          `\`Remember that once you invested your mana crystals on any stats you can't go back or undo it so make sure balance your all stats.\``
        )
        .setColor('#00BFFF')
        .setFooter({ text: `Mana Crystals ${manaCrystals}` });

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in stats command:', error);
      await message.reply('❌ An error occurred while fetching your fishing stats.');
    }
  }
};
