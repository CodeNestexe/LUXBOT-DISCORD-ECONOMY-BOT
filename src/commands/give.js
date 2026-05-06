const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const levelTimeDatabase = require('../levelTimeDatabase'); // Import level system

const luxEmoji = '<:lux:1411637514569252894>'; // Replace with your Lux emoji

// Level-based daily send limits
const sendLimits = {
  1: 50000,      // Level 1-4: 50k Lux
  5: 300000,     // Level 5-9: 300k Lux
  10: 5000000,   // Level 10-14: 5m Lux
  15: 10000000,  // Level 15-19: 10m Lux
  20: 20000000,  // Level 20-24: 20m Lux
  25: 25000000,  // Level 25-29: 25m Lux
  30: 40000000,  // Level 30-39: 40m Lux
  40: 45000000,  // Level 40-49: 45m Lux
  50: 50000000   // Level 50: 50m Lux
};

// Level-based daily receive limits
const receiveLimits = {
  1: 300000,     // Level 1-4: 300k Lux
  5: 1000000,    // Level 5-9: 1m Lux
  10: 7000000,   // Level 10-14: 7m Lux
  15: 15000000,  // Level 15-19: 15m Lux
  20: 25000000,  // Level 20-24: 25m Lux
  25: 30000000,  // Level 25-29: 30m Lux
  30: 45000000,  // Level 30-39: 45m Lux
  40: 50000000,  // Level 40-49: 50m Lux
  50: 55000000   // Level 50: 55m Lux
};

// Get limit based on user level
function getLimit(level, limitsTable) {
  if (level >= 50) return limitsTable[50];
  if (level >= 40) return limitsTable[40];
  if (level >= 30) return limitsTable[30];
  if (level >= 25) return limitsTable[25];
  if (level >= 20) return limitsTable[20];
  if (level >= 15) return limitsTable[15];
  if (level >= 10) return limitsTable[10];
  if (level >= 5) return limitsTable[5];
  return limitsTable[1];
}

module.exports = {
  name: 'give',
  description: 'Give LUX to another user (with daily limits based on level)',
  async execute(message, args, db) {
    if (args.length !== 2) {
      return message.reply('Usage: X give @user <amount>');
    }

    const target = message.mentions.users.first();
    if (!target) {
      return message.reply('Please mention a user!');
    }

    if (target.id === message.author.id) {
      return message.reply('You cannot give LUX to yourself!');
    }

    if (target.bot) {
      return message.reply('You Cannot Send Your Precious Lux To Bots!');
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply('Invalid amount!');
    }

    // Get sender and receiver data
    const sender = await db.getUser(message.author.id);
    const receiver = await db.getUser(target.id);

    if (!sender || !receiver) {
      return message.reply('❌ User data not found!');
    }

    // Check sender balance
    if (sender.balance < amount) {
      return message.reply('You Do Not Have Enough Lux To Send.');
    }

    // **FIXED: Get actual calculated levels from levelTimeDatabase**
    const senderLevel = levelTimeDatabase.calculateLevel(sender.xp || 0);
    const receiverLevel = levelTimeDatabase.calculateLevel(receiver.xp || 0);

    console.log(`Sender Level: ${senderLevel} (XP: ${sender.xp})`);
    console.log(`Receiver Level: ${receiverLevel} (XP: ${receiver.xp})`);

    // Get daily limits based on calculated levels
    const senderDailyLimit = getLimit(senderLevel, sendLimits);
    const receiverDailyLimit = getLimit(receiverLevel, receiveLimits);

    // Get database instance for limits collection
    const dbInstance = await db.getDB();
    const limitsCollection = dbInstance.collection('userLimits');

    // Calculate today's reset time (6:30 AM UTC)
    const now = new Date();
    const todayReset = new Date();
    todayReset.setUTCHours(6, 30, 0, 0);
    if (now < todayReset) {
      todayReset.setDate(todayReset.getDate() - 1);
    }

    // Helper function to get/create daily limit record
    async function getLimitRecord(userId, type) {
      let record = await limitsCollection.findOne({ 
        userId, 
        type, 
        resetTime: todayReset.getTime() 
      });
      
      if (!record) {
        record = { 
          userId, 
          type, 
          dailyAmount: 0, 
          resetTime: todayReset.getTime() 
        };
        await limitsCollection.insertOne(record);
      }
      
      return record;
    }

    // Get current daily amounts
    let senderRecord = await getLimitRecord(message.author.id, 'send');
    let receiverRecord = await getLimitRecord(target.id, 'receive');

    // Check if sender would exceed their daily send limit
    if (senderRecord.dailyAmount + amount > senderDailyLimit) {
      const remainingAmount = senderDailyLimit - senderRecord.dailyAmount;
      return message.reply(`❌ ${message.author} you can only send ${remainingAmount.toLocaleString()} more ${luxEmoji} today based on your level (Level ${senderLevel}). Daily limit: ${senderDailyLimit.toLocaleString()} ${luxEmoji}.`);
    }

    // Check if receiver would exceed their daily receive limit
    if (receiverRecord.dailyAmount + amount > receiverDailyLimit) {
      const remainingAmount = receiverDailyLimit - receiverRecord.dailyAmount;
      return message.reply(`❌ ${target} can only receive ${remainingAmount.toLocaleString()} more ${luxEmoji} today based on their level (Level ${receiverLevel}). Daily limit: ${receiverDailyLimit.toLocaleString()} ${luxEmoji}.`);
    }

    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('⚡ Transaction Pending ⚡')
      .setDescription(`• Click Confirm to complete this transaction.\n• Click Cancel to abort.\n\n**${message.author} → ${target}:**\n\`\`\`\n${amount.toLocaleString()} LUX\n\`\`\``)
      .addFields(
        { name: '📤 Sender Info', value: `Level ${senderLevel}\n${(senderRecord.dailyAmount + amount).toLocaleString()}/${senderDailyLimit.toLocaleString()} ${luxEmoji}`, inline: true },
        { name: '📥 Receiver Info', value: `Level ${receiverLevel}\n${(receiverRecord.dailyAmount + amount).toLocaleString()}/${receiverDailyLimit.toLocaleString()} ${luxEmoji}`, inline: true }
      )
      .setFooter({ text: 'Daily limits reset at 6:30 AM UTC' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accept')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger)
      );

    const reply = await message.reply({
      embeds: [embed],
      components: [row]
    });

    const collector = reply.createMessageComponentCollector({
      time: 60000
    });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: 'Only the person who initiated this transaction can use these buttons!',
          ephemeral: true
        });
      }

      if (interaction.customId === 'accept') {
        // Re-check everything to prevent race conditions
        const currentSender = await db.getUser(message.author.id);
        if (currentSender.balance < amount) {
          await interaction.update({
            content: '❌ Transaction failed: You no longer have enough LUX.',
            embeds: [],
            components: []
          });
          return;
        }

        // Re-fetch limit records
        senderRecord = await getLimitRecord(message.author.id, 'send');
        receiverRecord = await getLimitRecord(target.id, 'receive');

        // Re-check limits
        if (senderRecord.dailyAmount + amount > senderDailyLimit) {
          await interaction.update({
            content: `❌ Transaction failed: You would exceed your daily send limit.`,
            embeds: [],
            components: []
          });
          return;
        }

        if (receiverRecord.dailyAmount + amount > receiverDailyLimit) {
          await interaction.update({
            content: `❌ Transaction failed: Receiver would exceed their daily receive limit.`,
            embeds: [],
            components: []
          });
          return;
        }

        // Execute transfer
        await db.transferLux(message.author.id, target.id, amount);

        // Update daily limit records
        await limitsCollection.updateOne(
          { _id: senderRecord._id },
          { $inc: { dailyAmount: amount } }
        );

        await limitsCollection.updateOne(
          { _id: receiverRecord._id },
          { $inc: { dailyAmount: amount } }
        );

        await interaction.update({
          content: `✅ ${message.author} gave \`${amount.toLocaleString()} LUX\` to ${target}`,
          embeds: [],
          components: []
        });

      } else {
        await interaction.update({
          content: `❌ ${message.author} cancelled the transaction.`,
          embeds: [],
          components: []
        });
      }
    });

    collector.on('end', () => {
      reply.edit({
        content: '⏰ Transaction timed out.',
        embeds: [],
        components: []
      }).catch(console.error);
    });
  }
};
