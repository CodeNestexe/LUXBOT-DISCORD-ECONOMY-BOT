const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'vote',
  aliases: ['voting', 'topgg', 'support'],
  description: 'Check your voting status and vote for LuxBot',
  async execute(message, args, db) {
    try {
      const user = await db.getUser(message.author.id);
      
      if (!user) {
        return message.reply('❌ Please use any LuxBot command first to register!');
      }

      // **🔧 Calculate vote status**
      const now = new Date();
      const lastVote = user.lastVote ? new Date(user.lastVote) : null;
      const voteStreak = user.voteStreak || 0;
      const totalVotes = user.totalVotes || 0;
      const maxStreak = user.maxStreak || 0;
      
      let canVote = true;
      let nextVoteTime = 'Now';
      let voteStatus = '✅ Ready to vote';
      
      if (lastVote) {
        const hoursSinceLastVote = (now - lastVote) / (1000 * 60 * 60);
        
        if (hoursSinceLastVote < 12) {
          canVote = false;
          const hoursLeft = 12 - hoursSinceLastVote;
          const hoursLeftRounded = Math.ceil(hoursLeft);
          nextVoteTime = `${hoursLeftRounded}h`;
          voteStatus = '⏰ Vote again in ' + nextVoteTime;
        } else if (hoursSinceLastVote > 36) {
          voteStatus = '⚠️ Streak will reset on next vote';
        }
      }

      // **🎁 Build reward info**
      let rewardInfo = '🎁 **Vote Rewards:**\n';
      rewardInfo += `• <a:vote_crate:1375388998721077359> **Vote Crate** (every vote)\n`;
      
      if (voteStreak > 0) {
        rewardInfo += `• 💎 **7 Mana Crystals** (streak bonus)\n`;
      } else {
        rewardInfo += `• 💎 **7 Mana Crystals** (from 2nd vote streak)\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🗳️ Vote for LuxBot')
        .setDescription(
          `**Support LuxBot by voting on Top.gg!**\n\n` +
          `**Your Voting Stats:**\n` +
          `• Status: ${voteStatus}\n` +
          `• Current Streak: ${voteStreak} day${voteStreak !== 1 ? 's' : ''}\n` +
          `• Best Streak: ${maxStreak} day${maxStreak !== 1 ? 's' : ''}\n` +
          `• Total Votes: ${totalVotes}\n\n` +
          rewardInfo + `\n` +
          `[**🗳️ VOTE NOW**](https://top.gg/bot/1414566436763996290/vote)`
        )
        .setColor(canVote ? '#00FF00' : (voteStreak > 0 ? '#800080' : '#FFD700'))
        .addFields(
          { 
            name: '🔥 Streak System', 
            value: 'Vote every 12-36 hours to maintain your streak!\nStreak users get **7 Mana Crystals** per vote!',
            inline: false 
          }
        )
        .setFooter({ text: 'Help LuxBot grow by voting daily!' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in vote command:', error);
      await message.reply('❌ Error checking vote status.');
    }
  }
};
