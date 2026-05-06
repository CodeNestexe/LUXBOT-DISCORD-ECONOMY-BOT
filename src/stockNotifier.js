const { EmbedBuilder } = require('discord.js');

class StockNotifier {
  constructor() {
    this.eventEmojis = {
      bullRun: '🚀',
      dump: '📉', 
      earnings: '📊',
      partnership: '🤝',
      recession: '🌊',
      rally: '📈'
    };
  }

  async getNotificationChannels(db) {
    try {
      const dbInstance = await db.getDB();
      const notificationsCollection = dbInstance.collection('stockNotifications');
      const channels = await notificationsCollection.find({}).toArray();
      return channels.map(ch => ch.channelId);
    } catch (error) {
      console.error('Error getting notification channels:', error);
      return [];
    }
  }

  async notifyEvent(client, eventData) {
    try {
      const channelIds = await this.getNotificationChannels(client.db);
      
      if (channelIds.length === 0) return;

      const embed = new EmbedBuilder()
        .setTitle(`${this.eventEmojis[eventData.type]} Stock Market Event!`)
        .setDescription(eventData.message)
        .setColor(this.getEventColor(eventData.type))
        .setFooter({ text: 'Use X stocks to see current prices' })
        .setTimestamp();

      // Send to all notification channels
      for (const channelId of channelIds) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] });
          }
        } catch (error) {
          console.error(`Failed to send notification to channel ${channelId}:`, error);
        }
      }

    } catch (error) {
      console.error('Error sending event notifications:', error);
    }
  }

  getEventColor(eventType) {
    const colors = {
      bullRun: '#00FF00',
      dump: '#FF0000',
      earnings: '#FFD700',
      partnership: '#00FFFF',
      recession: '#800080',
      rally: '#32CD32'
    };
    return colors[eventType] || '#FFFF00';
  }
}

module.exports = new StockNotifier();
