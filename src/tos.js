const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const userCache = require('./utils/userCache.js'); // 🚀 Cache system integration

const activeTOSRequests = new Map();

module.exports = {
  name: 'tos',
  description: 'Handle Terms of Service acceptance for new users',

  async checkAcceptance(message, db) {
    const userId = message.author.id;

    try {
      const user = await db.getUser(userId);

            // 🎯 GHOST USER CHECK: If user doesn't exist, show TOS
      if (!user) {
        console.log('👻 User ' + userId + ' not found - showing TOS for ghost user');
        // Continue to TOS display logic below
      } else if (user && (user.registered === true || user.balance !== undefined || user.xp !== undefined)) {
        return true; 
      }

      if (activeTOSRequests.has(userId)) {
        await message.reply('⏳ You already have a pending Terms of Service request. Please accept it first or wait for it to expire.');
        return false;
      }

      if (!user || user.registered !== true) {
        const tosEmbed = new EmbedBuilder()
          .setColor('#00FFFF')
          .setTitle('LUX TOS')
          .setDescription('Welcome to Lux Bot, a Discord-based virtual gambling and economy bot by **LUX BOT**! By using Lux Bot, you agree to these Terms. If you do not agree, you cannot use the Bot.\
\
**What You Need to Know:**\
\
**Eligibility:** You must be 13+ to use Lux Bot (per Discord rules).\
\
**Use:** Lux Bot is for fun only—no real money or gambling. Do not cheat, hack, or misuse the Bot (e.g., no harassment or spamming).\
\
**Virtual Stuff:** Coins, crystals, and items have no real-world value and cannot be traded outside the Bot.\
\
**Direct Messages:** Using LuxBot grants us permission to DM you for casino commands, lottery results, stock alerts, and many more - no spam or promotional messages.\
\
**Privacy:** We collect minimal data (like your Discord ID) to run the Bot. See our Privacy Policy [WEBSITE](https://luxbot.xyz).\
\
**Rules:** We can suspend or remove your access if you break these Terms. The Bot is "as is"—no guarantees.\
\
**Liability:** We are not responsible for losses (like virtual items) or issues from using the Bot.')
          .setFooter({ text: 'Read the terms & conditions and click on accept to play lux • Expires in 120 seconds' })
          .setTimestamp();

        const acceptButton = new ButtonBuilder()
          .setCustomId('accept_tos_' + userId)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(acceptButton);

        const tosMessage = await message.reply({ 
          content: '<@' + userId + '>, please read and accept the Terms of Service:',
          embeds: [tosEmbed], 
          components: [row] 
        });

        activeTOSRequests.set(userId, {
          messageId: tosMessage.id,
          channelId: message.channel.id,
          timestamp: Date.now()
        });

        setTimeout(async () => {
          if (activeTOSRequests.has(userId)) {
            activeTOSRequests.delete(userId);
            try {
              const expiredButton = new ButtonBuilder()
                .setCustomId('expired_tos')
                .setLabel('Expired')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);
              const expiredRow = new ActionRowBuilder().addComponents(expiredButton);
              const expiredEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⏰ TOS Request Expired')
                .setDescription('This Terms of Service request has expired. Please use the command again to get a new one.')
                .setFooter({ text: 'LUX BOT OFFICIAL' });
              await tosMessage.edit({ 
                content: '<@' + userId + '>, your TOS request has expired.',
                embeds: [expiredEmbed], 
                components: [expiredRow] 
              });
            } catch (error) {
              console.error('Error updating expired TOS message:', error);
            }
          }
        }, 120000);

        return false;
      }

      return true;

    } catch (error) {
      console.error('Error checking TOS acceptance:', error);
      await message.reply('❌ Error checking Terms of Service. Please try again.');
      return false;
    }
  },

  async handleAcceptance(interaction, db) {
    if (!interaction.isButton() || !interaction.customId.startsWith('accept_tos_')) {
      return false;
    }

    const buttonUserId = interaction.customId.replace('accept_tos_', '');
    const clickingUserId = interaction.user.id;

    if (buttonUserId !== clickingUserId) {
      await interaction.reply({ 
        content: '❌ This Terms of Service acceptance is not for you!', 
        ephemeral: true 
      });
      return false;
    }

    activeTOSRequests.delete(interaction.user.id);
    const userId = interaction.user.id;

    try {
      const existingUser = await db.getUser(userId);
      if (existingUser && (existingUser.registered === true || existingUser.balance !== undefined)) {
        // 🚀 User already registered - make sure cache is updated
        userCache.cacheRegistered(userId);
        console.log('🎉 Existing user cache updated: User ' + userId + ' cached as REGISTERED');
        
        await interaction.reply({ 
          content: '✅ You have already accepted the Terms of Service and are registered!', 
          ephemeral: true 
        });
        return true;
      }

      console.log('🎯 TOS: Creating new user ' + userId + ' with starting balance...');
      const newUser = await db.initializeUser(userId);
      
      if (!newUser) {
        throw new Error('Failed to initialize user');
      }

      console.log('✅ TOS: User ' + userId + ' created successfully with balance: ' + newUser.balance);
      
      // 🚀 CRITICAL: Immediately update cache after registration
      userCache.cacheRegistered(userId);
      console.log('🎉 Cache updated: User ' + userId + ' cached as REGISTERED');

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Terms of Service Accepted!')
        .setDescription('Welcome to LuxBot! Your account has been created and you can now use all commands.\
\
🎉 **You received 1,000,000 LUX as a welcome bonus!**')
        .addFields(
          { name: '🎮 Get Started', value: 'Use `X help` to see available commands!', inline: false },
          { name: '💰 Economy', value: 'Start earning LUX coins and level up!', inline: false },
          { name: '🎯 Have Fun', value: 'Enjoy gambling, quests, and more!', inline: false }
        )
        .setFooter({ text: 'Thank you for choosing LuxBot!' })
        .setTimestamp();

      await interaction.update({ 
        content: '<@' + userId + '> successfully accepted the Terms of Service!',
        embeds: [successEmbed], 
        components: [] 
      });

      // Send welcome DM
      try {
        const welcomeDMEmbed = new EmbedBuilder()
          .setColor('#00FFFF')
          .setTitle('Lux Bot')
          .setDescription('Welcome To LUX,\
\
Your id has been successfully created\
\
User id - <@' + userId + '>\
\
Added 1M Lux to your account as a welcome balance\
\
Use X help command in any channel to begin the game')
          .setFooter({ text: 'LUX BOT OFFICIAL' })
          .setTimestamp();
        const dmChannel = await interaction.user.createDM();
        await dmChannel.send({ embeds: [welcomeDMEmbed] });
        console.log('📩 Welcome DM sent to ' + interaction.user.tag);
      } catch (dmError) {
        console.error('Could not send welcome DM:', dmError);
      }

      console.log('[TOS ACCEPTED] ' + interaction.user.tag + ' (' + userId + ') accepted TOS and registered with 1M LUX');
      return true;

    } catch (error) {
      console.error('Error handling TOS acceptance:', error);
      await interaction.reply({ 
        content: '❌ Error processing your acceptance. Please try again.', 
        ephemeral: true 
      });
      return false;
    }
  }
};