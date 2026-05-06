// commands/quest.js
const { EmbedBuilder } = require('discord.js');
const { getUserQuest, getQuestReward, getNextResetTime, formatTimeRemaining, completeQuest, getQuestStatus } = require('../questDatabase');
const itemsConfig = require('../utils/itemsConfig');

module.exports = {
  name: 'quest',
  aliases: ['q', 'quests'],
  description: 'View your daily quests',
  
  async execute(message, args, db) {
    try {
      const userId = message.author.id;
      const user = await db.getUser(userId);
      
      // **FIXED: Ensure user has proper inventory structure**
      if (!user) {
        return message.reply('❌ Please accept the Terms of Service first!');
      }

      if (!Array.isArray(user.items) || user.items.length !== 50) {
        await db.repairUserInventory(userId);
      }
      
      // **🔧 NEW: Get user's current quests (dual system)**
      const userQuests = await getUserQuest(userId);
      const questStatus = await getQuestStatus(userId);
      const reward = getQuestReward();
      
      // **🔧 Get reward info for Mana Crate (008)**
      const manaCrateItem = itemsConfig.items['008'];
      const manaCrateName = manaCrateItem ? manaCrateItem.name : 'Mana Crate';
      const manaCrateEmoji = manaCrateItem ? manaCrateItem.emoji : '<a:mana_crate:1375388724950728764>';
      
      // **🔧 Check if all quests are completed and reward can be claimed**
      if (questStatus.canClaimReward) {
        const rewarded = await completeQuest(userId);
        if (rewarded) {
          // **🔧 Quest completion message in server (not here)**
          const completionEmbed = new EmbedBuilder()
            .setTitle('🎉 All Quests Completed!')
            .setDescription(
              `**Congratulations!** You've completed both daily quests!\n\n` +
              `**Rewards Received:**\n` +
              `${manaCrateEmoji} **1x ${manaCrateName}**\n` +
              `💎 **5x Mana Crystals**\n\n` +
              `New quests will be available tomorrow!`
            )
            .setColor('#00FF00')
            .setTimestamp();
          
          await message.reply({ embeds: [completionEmbed] });
          return;
        }
      }
      
      // **🔧 Separate quests by type**
      const randomQuest = userQuests.find(q => q.questType !== 'vote_lux');
      const voteQuest = userQuests.find(q => q.questType === 'vote_lux');
      
      // **🔧 Build quest display**
      let questDescription = '';
      
      // **🎯 1. Random Quest Display**
      if (randomQuest) {
        const randomProgressPercentage = Math.floor((randomQuest.progress / randomQuest.target) * 100);
        const randomProgressBar = '█'.repeat(Math.floor(randomProgressPercentage / 10)) + '░'.repeat(10 - Math.floor(randomProgressPercentage / 10));
        const randomStatus = randomQuest.completed ? '✅' : '🔄';
        
        questDescription += `${randomStatus} **Quest 1:** ${randomQuest.questName}\n`;
        questDescription += `**Progress:** ${randomQuest.progress}/${randomQuest.target}\n`;
        questDescription += `[${randomProgressBar}] ${randomProgressPercentage}%\n\n`;
      }
      
      // **🎯 2. Vote Quest Display**
      if (voteQuest) {
        const voteProgressPercentage = Math.floor((voteQuest.progress / voteQuest.target) * 100);
        const voteProgressBar = '█'.repeat(Math.floor(voteProgressPercentage / 10)) + '░'.repeat(10 - Math.floor(voteProgressPercentage / 10));
        const voteStatus = voteQuest.completed ? '✅' : '🗳️';
        
        questDescription += `${voteStatus} **Quest 2:** ${voteQuest.questName}\n`;
        questDescription += `**Progress:** ${voteQuest.progress}/${voteQuest.target}\n`;
        questDescription += `[${voteProgressBar}] ${voteProgressPercentage}%\n\n`;
      }
      
      // **🔧 Add reward information**
      questDescription += `**🎁 Complete BOTH quests for:**\n`;
      questDescription += `${manaCrateEmoji} **1x ${manaCrateName}**\n`;
      questDescription += `💎 **5x Mana Crystals**`;
      
      // Calculate time until next reset
      const nextReset = getNextResetTime();
      const timeRemaining = formatTimeRemaining(nextReset - Date.now());
      
      // **🔧 Determine embed color based on completion status**
      let embedColor = '#FFD700'; // Default yellow
      if (questStatus.allCompleted) {
        embedColor = '#00FF00'; // Green if all completed
      } else if (questStatus.completed > 0) {
        embedColor = '#FFA500'; // Orange if partially completed
      }
      
      // **🔧 Build main embed**
      const embed = new EmbedBuilder()
        .setTitle(`${user.username || message.author.username}'s Daily Quests`)
        .setDescription(questDescription)
        .setColor(embedColor)
        .setFooter({ text: `Next quest reset: ${timeRemaining}` })
        .setTimestamp();
      
      // **🔧 Add status field**
      let statusText = '';
      if (questStatus.allCompleted) {
        if (questStatus.canClaimReward) {
          statusText = '🎁 **All quests completed!** Run this command again to claim rewards!';
        } else {
          statusText = '✅ **All quests completed and rewarded!** New quests tomorrow!';
        }
      } else {
        statusText = `📋 **Progress:** ${questStatus.completed}/${questStatus.total} quests completed`;
        
        // Add voting reminder if vote quest not completed
        if (voteQuest && !voteQuest.completed) {
          statusText += '\n🗳️ **Don\'t forget to vote:** Use `X vote` to vote on Top.gg!';
        }
      }
      
      embed.addFields({
        name: '📊 Status',
        value: statusText,
        inline: false
      });
      
      // **🔧 Add helpful tips**
      if (!questStatus.allCompleted) {
        let tipsText = '';
        
        if (randomQuest && !randomQuest.completed) {
          if (randomQuest.questType === 'play_mine') {
            tipsText += '⛏️ Use `X mine` to progress your mining quest\n';
          } else if (randomQuest.questType === 'play_slots') {
            tipsText += '🎰 Use `X spin` or `X slots` to progress your slots quest\n';
          } else if (randomQuest.questType === 'play_coinflip') {
            tipsText += '🪙 Use `X coinflip` or `X cf` to progress your coinflip quest\n';
          } else if (randomQuest.questType === 'play_horserace') {
            tipsText += '🐎 Use `X horserace` or `X hr` to progress your horse racing quest\n';
          } else if (randomQuest.questType === 'use_fish') {
            tipsText += '🎣 Use `X fish` to progress your fishing quest\n';
          } else if (randomQuest.questType === 'buy_stock') {
            tipsText += `📈 Use \`X stock buy ${randomQuest.stockSymbol} [amount]\` to buy the required stock\n`;
          } else if (randomQuest.questType === 'hold_stock') {
            tipsText += '⏰ Hold any stock for 30+ minutes (automatically checked)\n';
          }
        }
        
        if (voteQuest && !voteQuest.completed) {
          tipsText += '🗳️ Use `X vote` to get the Top.gg voting link\n';
        }
        
        if (tipsText) {
          embed.addFields({
            name: '💡 Tips',
            value: tipsText.trim(),
            inline: false
          });
        }
      }
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in quest command:', error);
      await message.reply('❌ An error occurred while fetching your quests. Please try again later.');
    }
  }
};
