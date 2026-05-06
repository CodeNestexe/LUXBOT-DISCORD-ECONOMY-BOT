const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  aliases: ['h'],
  description: 'Get help with LuxBot commands',
  async execute(message, args, db) {
    try {
      // Main help embed
      const mainEmbed = new EmbedBuilder()
        .setTitle('🎮 LUX BOT HELP MENU')
        .setImage('https://cdn.discordapp.com/attachments/1405132437239103561/1414227281697837086/Lucid_Origin_Create_a_vibrant_animestyle_banner_featuring_a_co_1_1.jpg')
        .setDescription(
          `🌟 **Lux Bot** is a comprehensive Discord bot designed to bring excitement, engagement, and a thriving virtual economy to your server. Whether you're looking for casual fun or competitive gameplay, Lux Bot has something for everyone!\n\n` +
          `💰 **Economy System:** Earn and manage Lux coins and Mana Crystals through various activities. Trade stocks, participate in lotteries, and build your virtual wealth.\n\n` +
          `🎲 **Interactive Games:** Enjoy slots, coin flips, horse racing, dungeon adventures, and magical lake fishing. Each game offers unique rewards and progression opportunities.\n\n` +
          `📦 **Inventory & Items:** Collect rare items, crates, stones, and collectibles using our advanced 50-slot inventory system. Open crates to discover valuable rewards and customize your experience.\n\n` +
          `📈 **Progression System:** Level up your profile, complete daily quests, earn XP, and unlock exclusive perks. Climb the leaderboards and show off your achievements.\n\n` +
          `🎁 **Rewards & Events:** Participate in seasonal events, claim daily rewards, and enjoy special bonuses. Activate Mana Zones and use enhancement stones for better gameplay outcomes.\n\n` +
          `🎨 **Customization:** Personalize your profile with unique backgrounds and showcase your rare collectibles to other players.\n\n` +
          `🏆 **Competitive Features:** Track your rank, compete on leaderboards, and participate in community challenges to prove your skills.\n\n` +
          `**Select a category below to explore specific commands:**`
        )
        .setColor('#FFD700')
        .setFooter({ text: 'POWERED BY INDI.HOST' });

      // Create dropdown menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📋 Select a command category...')
        .addOptions([
          {
            label: '🎲 Gambling & Fishing',
            description: 'Gaming commands for gambling and fishing',
            value: 'gambling_fishing'
          },
          {
            label: '🏦 Casino Commands',
            description: 'Casino management and gameplay',
            value: 'casino'
          },
          {
            label: '📈 Stock Commands',
            description: 'Stock market and trading features',
            value: 'stocks'
          },
          {
            label: '🛠️ Utility Commands',
            description: 'Profile, inventory, and utility features',
            value: 'utility'
          },
          {
            label: '🏠 Back to Main Menu',
            description: 'Return to the main help menu',
            value: 'main_menu'
          }
        ]);

      const actionRow = new ActionRowBuilder().addComponents(selectMenu);

      // Send the main help message
      const helpMessage = await message.channel.send({
        embeds: [mainEmbed],
        components: [actionRow]
      });

      // Create collector for dropdown interactions
      const collector = helpMessage.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === message.author.id,
        time: 300000 // 5 minutes
      });

      collector.on('collect', async (interaction) => {
        let embed;

        switch (interaction.values[0]) {
          case 'gambling_fishing':
            embed = new EmbedBuilder()
              .setTitle('🎲 GAMBLING & FISHING COMMANDS')
              .setDescription(
                `### 🎰 GAMBLING COMMANDS\n` +
                `• **MINE**\n| \`X mine <amount>\`\n\n` +
                `• **HORSE RACE**\n| \`X HorseRace {horse_name A,B,C,D} {Amount}\`\n\n` +
                `• **COIN FLIP**\n| \`X coinflip <Amount> <heads/tails>\`\n\n` +
                `• **SLOTS**\n| \`X slot <amount>\`\n\n` +
                `### 🎣 FISHING COMMANDS\n` +
                `• **FISH**\n| \`X fish\`\n\n` +
                `• **LAKE**\n| \`X lake\`\n\n` +
                `• **SELLING FISH**\n| \`X sell <Fish_name>\`\n\n` +
                `• **SACRIFICE FISH**\n| \`X sacrifice <Fish_name>\`\n\n` +
                `• **STATS**\n| \`X stats\`\n\n` +
                `• **UPGRADE**\n| \`X upgrade <Stats_name>\``
              )
              .setColor('#FF6B35')
              .setFooter({ text: 'POWERED BY INDI.HOST' });
            break;

          case 'casino':
            embed = new EmbedBuilder()
              .setTitle('🏦 CASINO COMMANDS')
              .setDescription(
                `• **CREATE CASINO**\n| \`X create <casino_name>\`\n\n` +
                `• **CASINO INFORMATION**\n| \`X casino info\`\n\n` +
                `• **TO CHECK CASINO BANK BALANCE**\n| \`X casino bank\`\n\n` +
                `• **TO LEAVE CASINO**\n| \`X casino leave <casino name>\`\n\n` +
                `• **TO JOIN SOMEONE'S CASINO**\n| \`X casino join <casino name>\`\n\n` +
                `• **TO DONATE IN CASINO BANK**\n| \`X casino donate\`\n\n` +
                `### 👑 OWNER/ADMIN COMMANDS\n` +
                `• **DELETE CASINO**\n| \`X casino delete <casino name>\`\n\n` +
                `• **ADD MEMBER TO CASINO**\n| \`X casino add <player_name>\`\n\n` +
                `• **TO KICK SOMEONE FROM CASINO**\n| \`X casino kick\`\n\n` +
                `• **DO GIVEAWAY WITH CASINO BANK CASH**\n| \`X casino drop\`\n\n` +
                `• **TO MAKE CASINO ADMIN**\n| \`X casino promote <user>\`\n\n` +
                `• **TO DEMOTE ADMIN**\n| \`X casino demote\``
              )
              .setColor('#9B59B6')
              .setFooter({ text: 'POWERED BY INDI.HOST' });
            break;

          case 'stocks':
            embed = new EmbedBuilder()
              .setTitle('📈 STOCKS COMMANDS')
              .setDescription(
                `• **TO SEE ALL STOCKS**\n| \`X stocks\`\n\n` +
                `• **TO SEE DETAILED MARKET**\n| \`X market\`\n\n` +
                `• **TO SEE SPECIFIC STOCK**\n| \`X price <stock_name>\`\n\n` +
                `• **TO SEE CHART OF SPECIFIC STOCK**\n| \`X chart <stock_name>\`\n\n` +
                `• **TO BUY STOCKS**\n| \`X buystock <stock_name> <quantity>\`\n\n` +
                `• **TO SELL STOCKS**\n| \`X sellstock <stock_name> <quantity>\`\n\n` +
                `• **AUTOBUY STOCK WHEN STOCK DROP TO DESIRE PRICE**\n| \`X autobuy <stock_name> <price> <quantity>\`\n\n` +
                `• **AUTOSELL STOCK WHEN STOCK RISE TO DESIRE PRICE**\n| \`X autosell <stock_name> <price> <quantity>\`\n\n` +
                `• **TO SEE PORTFOLIO**\n| \`X portfolio\`\n\n` +
                `• **SET STOCK NOTIFIER**\n| \`X stocknotify <#channel>\`\n\n` +
                `• **REMOVE NOTIFIER**\n| \`X removenotifier <#channel>\``
              )
              .setColor('#2ECC71')
              .setFooter({ text: 'POWERED BY INDI.HOST' });
            break;

          case 'utility':
            embed = new EmbedBuilder()
              .setTitle('🛠️ UTILITY COMMANDS')
              .setDescription(
                `• **DISABLE LUX FROM CERTAIN CHANNEL**\n| \`X disable <#channel>\`\n\n` +
                `• **ENABLE LUX IN DISABLED CHANNEL**\n| \`X enable <#channel>\`\n\n` +
                `• **LEADERBOARD**\n| \`X leaderboard\`\n\n` +
                `• **LOTTERY**\n| \`X lottery\`\n\n` +
                `• **TO SEE ALL PROFILE BANNERS**\n| \`X banners\`\n\n` +
                `• **SHOP COMMAND**\n| \`X shop\`\n\n` +
                `• **TO BUY ITEM FROM SHOP**\n| \`X buy 001\`\n\n` +
                `• **TO SEE BALANCE**\n| \`X cash\`\n\n` +
                `• **TO CUSTOMIZE PROFILE BIO**\n| \`X customize\`\n\n` +
                `• **TO SEE PROFILE**\n| \`X profile\`\n\n` +
                `• **DAILY REWARD**\n| \`X daily\`\n\n` +
                `• **GIVE LUX TO OTHERS**\n| \`X give <user> <amount>\`\n\n` +
                `• **INVENTORY COMMAND**\n| \`X inventory\`\n\n` +
                `• **TO CHECK LEVEL**\n| \`X lvl\`\n\n` +
                `• **TO CHECK DAILY QUEST**\n| \`X quest\`\n\n` +
                `• **TO REDEEM CODE**\n| \`X redeem <code_name>\`\n\n` +
                `• **USE ITEMS**\n| \`X use <item_number>\`\n\n` +
                `• **TO CHECK MANA POINT**\n| \`X manapoint\`\n\n` +
                `• **TO CHECK MANA CRYSTALS**\n| \`X manacrystals\`\n\n` +
                `• **TO EXCHANGE MANA POINT TO MANA CRYSTAL**\n| \`X exchange\``
              )
              .setColor('#3498DB')
              .setFooter({ text: 'POWERED BY INDI.HOST' });
            break;

          case 'main_menu':
            embed = mainEmbed;
            break;

          default:
            embed = mainEmbed;
        }

        await interaction.update({
          embeds: [embed],
          components: [actionRow]
        });
      });

      collector.on('end', () => {
        // Disable the dropdown after timeout
        selectMenu.setDisabled(true);
        helpMessage.edit({
          components: [new ActionRowBuilder().addComponents(selectMenu)]
        }).catch(console.error);
      });

    } catch (error) {
      console.error('Error in help command:', error);
      await message.reply('❌ An error occurred while loading the help menu.');
    }
  }
};
