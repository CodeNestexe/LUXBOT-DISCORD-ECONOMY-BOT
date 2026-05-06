const { EmbedBuilder } = require('discord.js');
const userCache = require('../utils/userCache.js');

module.exports = {
  name: 'cachestats',
  description: '[ADMIN] Display user cache performance statistics',
  
  async execute(message, args, db) {
    try {
      // 🔒 ADMIN CHECK - Using .env variables
      const botOwnerId = process.env.BOT_OWNER_ID;
      const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
      
      // Combine owner and admin IDs
      const authorizedUsers = [botOwnerId, ...adminIds].filter(Boolean);
      
      if (!authorizedUsers.includes(message.author.id)) {
        return message.reply('❌ This command is restricted to bot administrators only.');
      }
      
      const stats = userCache.getStats();
      
      // Calculate performance metrics
      const totalUsers = stats.registeredCount + stats.unregisteredCount;
      const performanceGain = stats.totalQueries > 0 ? 
        ((stats.hits / stats.totalQueries) * 100).toFixed(1) : 0;
      
      const embed = new EmbedBuilder()
        .setTitle('🔧 [ADMIN] User Cache Performance')
        .setDescription('Real-time performance metrics for the caching system')
        .addFields([
          { name: '📊 Cache Overview', value: '━━━━━━━━━━━━━━━━━━━━', inline: false },
          { name: '👥 Total Cached Users', value: `${totalUsers.toLocaleString()}`, inline: true },
          { name: '✅ Registered Users', value: `${stats.registeredCount.toLocaleString()}`, inline: true },
          { name: '❌ Unregistered Users', value: `${stats.unregisteredCount.toLocaleString()}`, inline: true },
          
          { name: '⚡ Performance Metrics', value: '━━━━━━━━━━━━━━━━━━━━', inline: false },
          { name: '🎯 Hit Rate', value: `**${stats.hitRate}**`, inline: true },
          { name: '📈 Total Queries', value: `${stats.totalQueries.toLocaleString()}`, inline: true },
          { name: '🚀 Speed Improvement', value: `**${performanceGain}x faster**`, inline: true },
          
          { name: '💾 Database Impact', value: '━━━━━━━━━━━━━━━━━━━━', inline: false },
          { name: '⚡ Cache Hits', value: `${stats.hits.toLocaleString()} (avoided DB calls)`, inline: true },
          { name: '🔍 Database Queries', value: `${stats.misses.toLocaleString()} (actual DB calls)`, inline: true },
          { name: '💰 Resource Savings', value: `**${stats.databaseSavings.toLocaleString()}** DB calls saved`, inline: true }
        ])
        .setColor('#FF6B35') // Admin command color
        .setTimestamp()
        .setFooter({ 
          text: '🔒 ADMIN ONLY | Cache TTL: Registered (24h) | Unregistered (30m)',
          iconURL: message.author.displayAvatarURL()
        });

      await message.reply({ embeds: [embed] });
      
      // Log admin usage for security
      console.log(`📊 Cache stats accessed by ${message.author.tag} (${message.author.id})`);
      
    } catch (error) {
      console.error('Error displaying cache stats:', error);
      await message.reply('❌ Error retrieving cache statistics. Check console for details.');
    }
  },
};