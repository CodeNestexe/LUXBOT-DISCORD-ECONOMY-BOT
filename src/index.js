require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

const { AutoPoster } = require('topgg-autoposter');
const logger = require('./logger');
const { registerSlashCommands, createSlashInvocationContext } = require('./slashCommands');
const { syncCustomEmojis } = require('./emojiSync');

const { getDB, getUser, updateUser, addManaPoints, addManaCrystals, addXP, transferLux, getAllUsers, getCurrentTime, initializeUser, repairUser, repairUserInventory } = require('./database');
const { getCasinoInfo, createCasino, addMemberToCasino, removeMemberFromCasino, deleteCasino, promoteToCoOwner, getUserCasino, updateCasinoBankBalance, getCasinoBankBalance } = require('./casinoDatabase');
const { getMineGame, startMineGame, updateMineGame, endMineGame, deductLux, validateBet, adjustLuxWithManaZone } = require('./gamblingDatabase');
const { addCollectible, removeCollectible, getCollectibles } = require('./collectiblesDatabase');
const { calculateLevel, getLevelProgress, getRank } = require('./levelTimeDatabase');
const { getUserQuest, updateQuestProgress, completeQuest, getQuestReward, getNextResetTime, formatTimeRemaining } = require('./questDatabase');
const { getLotteries, setLotteries, initializeLottery } = require('./lotteryDatabase');
const { initializeStocks, updateStockPrices, getStockMarket, getUserPortfolio, buyStock, repairPortfolios } = require('./stocksDatabase');

const captchaSystem = require('./captchaSystem');
const tosHandler = require('./tos');
const banSystem = require('./commands/banSystem.js');
const itemsConfig = require('./utils/itemsConfig');
const userCache = require('./utils/userCache.js');

async function trackQuestProgress(userId, questType, amount = 1, extraData = null) {
  try {
    switch (questType) {
      case 'play_mine':
      case 'play_slots':
      case 'play_coinflip':
      case 'play_horserace':
      case 'use_fish':
        await updateQuestProgress(userId, questType, amount);
        break;
      case 'win_coinflip':
      case 'win_horserace':
        if (extraData && extraData.won) {
          await updateQuestProgress(userId, questType, amount);
        }
        break;
      case 'buy_stock':
        if (extraData && extraData.stockSymbol) {
          await updateQuestProgress(userId, questType, amount, extraData.stockSymbol);
        }
        break;
      case 'vote_lux':
        await updateQuestProgress(userId, questType, amount);
        break;
      case 'hold_stock':
        break;
      default:
        console.log('Unknown quest type: ' + questType);
    }
  } catch (error) {
    console.error('Error tracking quest progress for ' + questType + ':', error);
  }
}

async function checkQuestCompletion(userId, message) {
  try {
    const user = await getUser(userId);
    if (!user) {
      console.log('User ' + userId + ' not found - skipping quest completion check');
      return;
    }
    
    const quest = await getUserQuest(userId);
    if (quest && quest.completed && !quest.rewarded) {
      const rewardGiven = await completeQuest(userId);
      
      if (rewardGiven) {
        try {
          const embed = new EmbedBuilder()
            .setTitle('🎉 Quest Completed!')
           .setDescription('Quest completed! Check your rewards.')
            .setColor('#00FF00')
            .setTimestamp();
            
          await message.reply({ embeds: [embed] });
          console.log('✅ Quest completion message sent to server for user ' + userId);
        } catch (msgError) {
          console.log('Could not send quest completion message for user ' + userId + ':', msgError.message);
        }
      }
    }
  } catch (error) {
    console.error('Error checking quest completion for user ' + userId + ':', error);
  }
}

let statusIndex = 0;

async function updateBotStatusAdvanced() {
  try {
    const serverCount = client.guilds.cache.size;
    const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    
    const dbInstance = await getDB();
    const [registeredUsers, luxStats, activeToday, totalCasinos] = await Promise.all([
  dbInstance.collection('users').countDocuments({ 
    $and: [
      { userId: { $exists: true, $ne: null } },
      { registered: true },
      { balance: { $exists: true, $ne: null } },
      { xp: { $exists: true, $ne: null } }
    ]
  }),
  dbInstance.collection('users').aggregate([
    {
      $match: {
        $and: [
          { userId: { $exists: true, $ne: null } },
          { registered: true },
          { balance: { $exists: true, $ne: null } },
          { xp: { $exists: true, $ne: null } }
        ]
      }
    },
    { $group: { _id: null, totalLux: { $sum: "$balance" }, totalCrystals: { $sum: "$manaCrystals" } } }
  ]).toArray(),
  dbInstance.collection('users').countDocuments({
    $and: [
      { userId: { $exists: true, $ne: null } },
      { registered: true },
      { balance: { $exists: true, $ne: null } },
      { xp: { $exists: true, $ne: null } },
      { lastDaily: { $gte: Date.now() - (24 * 60 * 60 * 1000) } }
    ]
  }),
  dbInstance.collection('casinos').countDocuments().catch(() => 0)
]);
    const totalLux = luxStats[0]?.totalLux || 0;
    const totalCrystals = luxStats[0]?.totalCrystals || 0;
    
    const statusRotation = [
      { type: ActivityType.Playing, text: 'with ' + registeredUsers.toLocaleString() + ' LUX players' },
      { type: ActivityType.Watching, text: serverCount.toLocaleString() + ' servers grow' },
      { type: ActivityType.Playing, text: 'Discord economy games' },
      { type: ActivityType.Watching, text: '$' + formatLargeNumber(totalLux) + ' LUX economy' },
      { type: ActivityType.Competing, text: 'in Discord communities' },
      { type: ActivityType.Listening, text: 'new players join daily' },
      { type: ActivityType.Playing, text: 'virtual casino empire' },
      { type: ActivityType.Watching, text: formatLargeNumber(totalCrystals) + ' Mana Crystals' },
      { type: ActivityType.Playing, text: 'the ultimate economy bot' },
      { type: ActivityType.Watching, text: 'Discord servers worldwide' },
      { type: ActivityType.Competing, text: 'for #1 economy bot' },
      { type: ActivityType.Listening, text: 'feedback from ' + registeredUsers + ' players' }
    ];
    
    const currentStatus = statusRotation[statusIndex];
    statusIndex = (statusIndex + 1) % statusRotation.length;
    
    await client.user.setActivity(currentStatus.text, { 
      type: currentStatus.type,
      status: 'online'
    });
    
    console.log('📊 Status [' + statusIndex + '/' + statusRotation.length + ']: ' + ActivityType[currentStatus.type] + ' ' + currentStatus.text);
    
  } catch (error) {
    console.error('❌ Error updating advanced bot status:', error);
    
    try {
      const serverCount = client.guilds.cache.size;
      await client.user.setActivity(serverCount.toLocaleString() + ' servers | Growing daily', { 
        type: ActivityType.Watching,
        status: 'online'
      });
    } catch (fallbackError) {
      console.error('❌ Fallback status also failed:', fallbackError);
    }
  }
}

function formatLargeNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

async function processVote(vote) {
  try {
    const dbInstance = await getDB();
    const user = await dbInstance.collection('users').findOne({ 
      $and: [
        { userId: vote.user },
        { userId: { $exists: true, $ne: null } },
        { registered: true },
        { balance: { $exists: true, $ne: null } },
        { xp: { $exists: true, $ne: null } }
      ]
    });
    
    if (!user) {
      console.log('Vote from unregistered/ghost user ' + vote.user + ' - ignoring');
      return;
    }

    const now = new Date();
    const lastVote = user.lastVote ? new Date(user.lastVote) : null;
    
    let currentStreak = user.voteStreak || 0;
    let streakReset = false;
    
    if (lastVote) {
      const hoursSinceLastVote = (now - lastVote) / (1000 * 60 * 60);
      
      if (hoursSinceLastVote >= 12 && hoursSinceLastVote <= 36) {
        currentStreak += 1;
      } else if (hoursSinceLastVote > 36) {
        currentStreak = 1;
        streakReset = true;
      } else {
        console.log('Vote too soon for user ' + vote.user);
        return;
      }
    } else {
      currentStreak = 1;
    }

    let voteCrateAdded = false;
    const voteCrateSlot = await addItemToInventory(user.userId, '001', dbInstance);
    
    if (voteCrateSlot !== -1) {
      voteCrateAdded = true;
      console.log('✅ Added Vote Crate to slot ' + voteCrateSlot + ' for user ' + vote.user);
    } else {
      console.log('⚠️ Inventory full for user ' + vote.user + ' - Vote Crate not added');
    }

    let streakReward = 0;
    if (currentStreak > 1) {
      streakReward = 7;
      await dbInstance.collection('users').updateOne(
        { userId: vote.user },
        { $inc: { manaCrystals: streakReward } }
      );
      console.log('✅ Added ' + streakReward + ' Mana Crystals for ' + currentStreak + '-day streak to user ' + vote.user);
    }

    await dbInstance.collection('users').updateOne(
      { userId: vote.user },
      { 
        $inc: { 
          totalVotes: 1
        },
        $set: { 
          lastVote: now,
          voteStreak: currentStreak,
          maxStreak: Math.max(user.maxStreak || 0, currentStreak)
        }
      }
    );

    await trackQuestProgress(vote.user, 'vote_lux', 1);
    await sendVoteRewardDM(vote.user, voteCrateAdded, streakReward, currentStreak, streakReset);
    
    console.log('✅ Vote processed for user ' + vote.user + ': Streak ' + currentStreak + ', Crate: ' + voteCrateAdded + ', Crystals: ' + streakReward);

  } catch (error) {
    console.error('❌ Error processing vote:', error);
  }
}

async function getActiveUsers() {
  try {
    const dbInstance = await getDB();
    return await dbInstance.collection('users').find({
      $and: [
        { userId: { $exists: true, $ne: null } },
        { registered: true },
        { balance: { $exists: true, $ne: null } },
        { xp: { $exists: true, $ne: null } },
        { items: { $exists: true, $type: "array" } }
      ]
    }).toArray();
  } catch (error) {
    console.error('Error getting active users:', error);
    return [];
  }
}

async function addItemToInventory(userId, itemId, dbInstance) {
  const user = await dbInstance.collection('users').findOne({ userId });
  if (!user || !Array.isArray(user.items)) return -1;

  for (let i = 0; i < user.items.length; i++) {
    if (user.items[i] === null || user.items[i] === undefined) {
      const itemData = {
        id: itemId,
        name: itemsConfig.items[itemId].name,
        emoji: itemsConfig.items[itemId].emoji,
        amount: 1,
        obtainedAt: new Date(),
        type: 'crate'
      };

      await dbInstance.collection('users').updateOne(
        { userId },
        { $set: { ['items.' + i]: itemData } }
      );

      return i;
    }
  }
  
  return -1;
}

async function sendVoteRewardDM(userId, voteCrateAdded, streakReward, currentStreak, streakReset) {
  if (!client) return;

  try {
    const discordUser = await client.users.fetch(userId);
    
    let description = '**Thank you for your vote!** **Your reward is added to inventory** ';
    
    if (voteCrateAdded) {
      description += '🎁 **Vote Crate** ' + itemsConfig.items['001'].emoji + ' added to inventory! ';
    } else {
      description += '⚠️ **Vote Crate** reward pending - inventory full! ';
    }
    
    if (streakReward > 0) {
      description += '💎 **Streak Bonus:** +' + streakReward + ' Mana Crystals <a:crystals:1379010491762081933> ';
    }
    
    description += '🔥 **Vote Streak:** ' + currentStreak + ' day' + (currentStreak > 1 ? 's' : '') + ' ';
    
    if (streakReset) {
      description += '(Previous streak ended) ';
    }
    
    description += '🗳️ **Vote again in 12 hours for streak rewards!**';

    const embed = new EmbedBuilder()
      .setTitle('🎉 Vote Reward Received!')
      .setDescription(description)
      .setColor(currentStreak > 1 ? '#800080' : '#FFD700')
      .setFooter({ text: 'Vote daily to maintain your streak!' })
      .setTimestamp();

    await discordUser.send({ embeds: [embed] });
    console.log('✅ Sent reward DM to user ' + userId);
    
  } catch (dmError) {
    console.log('Could not send reward DM to user ' + userId + ':', dmError.message);
  }
}

async function sendStockNotifications(client, event) {
  if (!event) return;

  try {
    const dbInstance = await getDB();
    const notificationsCollection = dbInstance.collection('stockNotifications');
    
    const notifications = await notificationsCollection.find({}).toArray();
    
    if (notifications.length === 0) {
      console.log('📊 Stock event occurred but no notification channels configured');
      return;
    }

    const eventColors = {
      bullRun: '#00FF00',
      dump: '#FF0000',
      earnings: '#FFFF00',
      partnership: '#00FFFF',
      recession: '#800080',
      rally: '#FFA500'
    };

    const eventEmojis = {
      bullRun: '🚀',
      dump: '📉', 
      earnings: '📊',
      partnership: '🤝',
      recession: '🌊',
      rally: '📈'
    };

    const embed = new EmbedBuilder()
      .setTitle((eventEmojis[event.type] || '📢') + ' Stock Market Event')
      .setDescription(event.message)
      .setColor(eventColors[event.type] || '#00FFFF')
      .addFields([
        { name: 'Event Type', value: event.type.toUpperCase(), inline: true },
        { name: 'Target', value: event.target === 'all' ? 'All Stocks' : event.target, inline: true },
        { name: 'Impact', value: 'Check X stocks for updated prices!', inline: false }
      ])
      .setFooter({ text: 'Use X stocknotify #channel to get these alerts' })
      .setTimestamp();

    console.log('📢 Broadcasting stock event to ' + notifications.length + ' channels: ' + event.message);

    for (const notification of notifications) {
      try {
        const guild = client.guilds.cache.get(notification.guildId);
        if (!guild) {
          console.log('Guild ' + notification.guildId + ' not found, skipping notification');
          continue;
        }

        const channel = guild.channels.cache.get(notification.channelId);
        if (!channel) {
          console.log('Channel ' + notification.channelId + ' not found in guild ' + guild.name + ', skipping');
          continue;
        }

        if (!channel.isTextBased()) {
          console.log('Channel ' + channel.name + ' is not text-based, skipping');
          continue;
        }

        const permissions = channel.permissionsFor(guild.members.me);
        if (!permissions.has('SendMessages')) {
          console.log('No permission to send messages in ' + channel.name + ', skipping');
          continue;
        }

        await channel.send({ embeds: [embed] });
        console.log('✅ Stock event sent to ' + guild.name + ' > #' + channel.name);

      } catch (error) {
        console.error('❌ Failed to send stock event to ' + notification.guildId + '/' + notification.channelId + ':', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error in sendStockNotifications:', error);
  }
}

const cooldowns = new Map();
const COOLDOWN_TIME = 5000;

async function checkCommandCooldown(message, commandName) {
  const userId = message.author.id;
  const key = userId + '-' + commandName;
  const now = Date.now();
  
  if (!cooldowns.has(key)) {
    cooldowns.set(key, now);
    return true;
  }

  const lastUsed = cooldowns.get(key);
  const timeLeft = (lastUsed + COOLDOWN_TIME) - now;

  if (timeLeft <= 0) {
    cooldowns.set(key, now);
    return true;
  } else {
    try {
      const seconds = Math.ceil(timeLeft / 1000);
      const cooldownMessage = await message.reply('You can send next command after **' + seconds + 's**');
      
      setTimeout(() => {
        cooldownMessage.delete().catch(() => {});
      }, 3000);
    } catch (error) {
      console.error('Error sending cooldown message:', error);
    }
    
    return false;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const envPrefix = process.env.PREFIX || 'X';
client.prefix = envPrefix;
client.prefixes = [envPrefix, envPrefix.toLowerCase()];
client.commands = new Collection();
client.guildPrefixes = new Map();

const app = express();
app.use(express.json());

app.post('/topgg-webhook', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (auth !== process.env.TOPGG_WEBHOOK_PASSWORD) {
      return res.status(401).send('Unauthorized');
    }

    const vote = req.body;
    console.log('📊 Top.gg Vote Received:', vote);

    if (vote.type === 'test') {
      console.log('🧪 Test vote received');
      return res.status(200).send('Test vote acknowledged');
    }

    await processVote(vote);
    res.status(200).send('Vote processed successfully');

  } catch (error) {
    console.error('❌ Error processing Top.gg vote:', error);
    res.status(500).send('Internal server error');
  }
});

(async () => {
  try {
    const dbInstance = await getDB();
    
    await dbInstance.collection('casinos').updateMany(
      { coOwners: { $exists: false } },
      { $set: { coOwners: [] } }
    );
    await dbInstance.collection('casinos').updateMany(
      { bankBalance: { $exists: false } },
      { $set: { bankBalance: 0 } }
    );
    console.log('✅ Initialized casino collections');
    
    await initializeLottery();
    console.log('✅ Initialized lottery system');
    
    await initializeStocks();
    console.log('✅ Initialized stock system');
    
    await repairPortfolios();
    console.log('✅ Portfolio repair completed');

    console.log('🔧 Checking user data integrity...');
    const users = await getActiveUsers();
    let repairedCount = 0;

    for (const user of users) {
      if (!Array.isArray(user.items) || user.items.length !== 50) {
        await repairUserInventory(user.userId);
        repairedCount++;
      }
    }
    
    if (repairedCount > 0) {
      console.log('🔧 Repaired ' + repairedCount + ' user inventories');
    } else {
      console.log('✅ All user inventories are healthy');
    }
    
  } catch (error) {
    console.error('❌ Error initializing systems:', error.message);
  }
})();

const commandsDir = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsDir)) {
  logger.error('Commands directory not found!');
  process.exit(1);
}

logger.section('Loading Commands');
const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
let commandCount = 0;
for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsDir, file));
    if (!command || !command.name) {
      continue;
    }
    logger.commandReady(command.name);
    client.commands.set(command.name.toLowerCase(), command);
    if (command.aliases && Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        client.commands.set(alias.toLowerCase(), command);
      }
    }
    commandCount++;
  } catch (error) {
    logger.error(`Failed to load ${file}`);
  }
}
logger.success(`${commandCount} commands loaded`);

// Load fun commands
const funCommandsDir = path.join(__dirname, 'funcmds');
if (fs.existsSync(funCommandsDir)) {
  logger.section('Loading Fun Commands');
  const funCommandFiles = fs.readdirSync(funCommandsDir).filter(file => file.endsWith('.js') && file !== 'funBase.js');
  let funCount = 0;
  for (const file of funCommandFiles) {
    try {
      const command = require(path.join(funCommandsDir, file));
      if (command && command.name) {
        logger.commandReady(command.name);
        client.commands.set(command.name.toLowerCase(), command);
        if (command.aliases && Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            client.commands.set(alias.toLowerCase(), command);
          }
        }
        funCount++;
      }
    } catch (error) {
      // silently skip failed fun commands
    }
  }
  logger.success(`${funCount} fun commands loaded`);
}

// Load events
const eventsDir = path.join(__dirname, 'events');
if (fs.existsSync(eventsDir)) {
  const eventFiles = fs.readdirSync(eventsDir).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsDir, file));
      client.on(event.name, (...args) => event.execute(...args, client.db));
    } catch (error) {
      // silently skip failed events
    }
  }
}

client.db = {
  getDB,
  getUser,
  updateUser,
  addManaPoints,
  addManaCrystals,
  addXP,
  transferLux,
  getAllUsers,
  getCurrentTime,
  initializeUser,
  repairUser,
  repairUserInventory,
  getCasinoInfo,
  createCasino,
  addMemberToCasino,
  removeMemberFromCasino,
  deleteCasino,
  promoteToCoOwner,
  getUserCasino,
  updateCasinoBankBalance,
  getCasinoBankBalance,
  getMineGame,
  startMineGame,
  updateMineGame,
  endMineGame,
  deductLux,
  validateBet,
  adjustLuxWithManaZone,
  addCollectible,
  removeCollectible,
  getCollectibles,
  calculateLevel,
  getLevelProgress,
  getRank,
  getUserQuest,
  updateQuestProgress,
  completeQuest,
  getQuestReward,
  getNextResetTime,
  formatTimeRemaining,
  getLotteries,
  setLotteries,
  initializeLottery,
  initializeStocks,
  updateStockPrices,
  getStockMarket,
  getUserPortfolio,
  buyStock,
  repairPortfolios,
  getActiveUsers,
};

setInterval(async () => {
  try {
    await captchaSystem.cleanup();
    console.log('CAPTCHA system cleanup completed');
  } catch (error) {
    console.error('Error in CAPTCHA cleanup job:', error);
  }
}, 60 * 60 * 1000);

setInterval(() => {
  try {
    const now = Date.now();
    for (const [key, timestamp] of cooldowns.entries()) {
      if (now - timestamp > COOLDOWN_TIME) {
        cooldowns.delete(key);
      }
    }
    console.log('Cooldown cleanup completed');
  } catch (error) {
    console.error('Error in cooldown cleanup job:', error);
  }
}, 10 * 60 * 1000);

setInterval(async () => {
  try {
    const now = Date.now();
    const users = await getActiveUsers();
    
    for (const user of users) {
      try {
        if (!user.userId || !user.registered) continue;
        
        if (user.buffs?.manaZone?.active) {
          const buffStartTime = new Date(user.buffs.manaZone.startTime).getTime();
          const buffDuration = user.buffs.manaZone.duration;
          
          if (now >= buffStartTime + buffDuration) {
            await client.db.updateUser(user.userId, {
              'buffs.manaZone.active': false,
            });

            try {
              const discordUser = await client.users.fetch(user.userId);
              
              const embed = new EmbedBuilder()
                .setTitle('Mana Zone Expired')
                .setDescription('Your Mana Zone buff has expired. Purchase again to enable it.')
                .setColor('#FF0000')
                .setTimestamp();
                
              await discordUser.send({ embeds: [embed] });
              console.log('✅ Sent Mana Zone expiration message to user ' + user.userId);
              
            } catch (fetchError) {
              console.log('Could not send Mana Zone expiration to user ' + user.userId + ':', fetchError.message);
            }
          }
        }
      } catch (userError) {
        console.error('Error processing Mana Zone for user ' + user.userId + ':', userError.message);
        continue;
      }
    }
  } catch (error) {
    console.error('Error in Mana Zone expiration job:', error);
  }
}, 60 * 1000);

setInterval(updateBotStatusAdvanced, 90 * 1000);

setInterval(async () => {
  try {
    console.log('🔄 Updating stock prices...');
    
    const result = await updateStockPrices();
    
    if (result && result.success) {
      console.log('✅ Stock prices updated successfully');
      
      if (result.event) {
        console.log('📈 Market Event Generated: ' + result.event.message);
        await sendStockNotifications(client, result.event);
      }
    } else {
      console.log('❌ Stock price update failed');
    }
    
    await repairPortfolios();
    console.log('✅ Portfolios repaired');
    
  } catch (error) {
    console.error('❌ Error updating stock prices:', error);
  }
}, 2 * 60 * 1000);

client.once('ready', async () => {
  logger.printBanner();
  logger.systemReady(`Bot Logged in as ${client.user.tag}`);

  try {
    logger.loading('Registering slash commands...');
    const slashPayloads = await registerSlashCommands(client);
    const targetGuildId = process.env.SLASH_GUILD_ID || process.env.GUILD_ID;
    const syncAllGuildSlash = String(process.env.SYNC_GUILD_SLASH || 'false').toLowerCase() === 'true';

    if (targetGuildId) {
      const targetGuild = await client.guilds.fetch(targetGuildId).catch(() => null);
      if (targetGuild) {
        await targetGuild.commands.set(slashPayloads);
        logger.success(`Registered ${slashPayloads.length} slash commands in guild ${targetGuild.name}`);
      } else {
        await client.application.commands.set(slashPayloads);
        logger.success(`Registered ${slashPayloads.length} global slash commands`);
        logger.warn('SLASH_GUILD_ID/GUILD_ID not found in bot guilds. Global commands can take time to appear.');
      }
    } else {
      await client.application.commands.set(slashPayloads);
      logger.success(`Registered ${slashPayloads.length} global slash commands`);
      logger.warn('Global slash command updates may take up to 1 hour to propagate in Discord.');
    }

    // Optional fast propagation mode: also register per-guild for all currently connected guilds.
    if (syncAllGuildSlash) {
      let syncedGuilds = 0;
      for (const guild of client.guilds.cache.values()) {
        try {
          await guild.commands.set(slashPayloads);
          syncedGuilds++;
        } catch (guildSyncError) {
          console.error('❌ Failed slash sync for guild ' + guild.id + ':', guildSyncError.message);
        }
      }
      logger.success(`Slash commands synced to ${syncedGuilds} guild(s)`);
    }
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error.message);
  }

  try {
    await syncCustomEmojis(client, logger);
  } catch (error) {
    console.error('❌ Failed to sync custom emojis:', error.message);
  }
  
  if (process.env.TOPGG_TOKEN) {
    try {
      logger.loading('Top.gg Auto Stats Setup...');
      
      const topggPoster = AutoPoster(process.env.TOPGG_TOKEN, client);
      
      topggPoster.on('posted', (stats) => {
        logger.success(`Top.gg: ${stats.serverCount.toLocaleString()} servers`);
        if (stats.shardCount) {
          logger.info(`Shards: ${stats.shardCount}`);
        }
      });
      
      topggPoster.on('error', (error) => {
        console.error('❌ Error posting stats to Top.gg:', error.message);
      });
      
      console.log('✅ Top.gg Auto Stats Posting initialized successfully!');
      
    } catch (error) {
      console.error('❌ Failed to initialize Top.gg Auto Stats:', error.message);
    }
  } else {
    console.log('⚠️ TOPGG_TOKEN not found - Auto Stats Posting disabled');
  }
  
  if (process.env.TOPGG_WEBHOOK_PASSWORD) {
    const PORT = process.env.TOPGG_WEBHOOK_PORT || 3001;
    app.listen(PORT, () => {
      console.log('🚀 Top.gg webhook server running on port ' + PORT);
    });
  } else {
    logger.warn('TOPGG_WEBHOOK_PASSWORD not set - Webhook disabled');
  }
  
  logger.loading('Advanced Bot Status System...');
  await updateBotStatusAdvanced();
  
  setTimeout(() => {
    const stats = userCache.getStats();
    logger.success('Cache system ready');
  }, 5000);
  
  setInterval(() => {
    const stats = userCache.getStats();
    if (stats.totalQueries > 100) {
      console.log(`📊 Cache Performance: ${stats.totalCached} cached users, ${stats.hitRate} hit rate, ${stats.databaseSavings} DB calls saved`);
    }
  }, 2 * 60 * 60 * 1000);
  
  setTimeout(async () => {
    try {
      logger.loading('Updating initial stock prices...');
      
      const result = await updateStockPrices();
      
      if (result && result.success) {
        logger.success('Stock prices initialized');
        if (result.event) {
          logger.info(`Market Event: ${result.event.message}`);
          await sendStockNotifications(client, result.event);
        }
      } else {
        logger.error('Stock update failed');
      }
      
    } catch (error) {
      console.error('❌ Error in initial stock update:', error);
    }
  }, 10000);
  
});

// start here
client.on('messageCreate', async message => {
  if (!message.guild && !message.author.bot) {
    const answer = message.content.trim();
    // 🔧 FIXED: Proper regex for positive AND negative numbers
        if (/^-?\d+$/.test(answer)) {
      const result = await captchaSystem.checkAnswer(message.author.id, answer);
      
      // 🎉 Enhanced success message for unbanning
      let description = result.message || ''; // Default to empty string if result.message is undefined
if (result.success) {
  description += '\n\n🎉 **You are now unbanned and can use all LuxBot commands again!**';
}
      
      const embed = new EmbedBuilder()
        .setTitle(result.success ? '✅ CAPTCHA Success - Unbanned!' : '❌ CAPTCHA Failed')
        .setDescription(description)
        .setColor(result.success ? '#00FF00' : '#FF0000')
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      return;
    }
  }
});
// end here

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // determine prefix for this guild (server-specific overrides)
  let usedPrefix = client.prefix;
  if (message.guild) {
    let guildPrefix = client.guildPrefixes.get(message.guild.id);
    if (!guildPrefix) {
      try {
        const db = require('./database');
        guildPrefix = await db.getGuildPrefix(message.guild.id);
        if (guildPrefix) client.guildPrefixes.set(message.guild.id, guildPrefix);
      } catch (e) {
        // ignore DB errors and fall back to global prefix
      }
    }
    if (guildPrefix) usedPrefix = guildPrefix;
  }

  const prefixesToCheck = [usedPrefix, usedPrefix.toLowerCase()];
  if (!prefixesToCheck.some(p => message.content.startsWith(p))) return;

  // slice by actual used prefix length
  const matched = prefixesToCheck.find(p => message.content.startsWith(p));
  const args = message.content.slice(matched.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    if (banSystem.isBanned(message.author.id)) {
      return;
    }

    const canProceed = await checkCommandCooldown(message, commandName);
    if (!canProceed) return;

//  start here      
        // 🎯 SIMPLE GHOST DETECTION - Check if user exists/registered first
    const user = await getUser(message.author.id);

    if (!user || !user.registered) {
      // 👻 User is ghost - show TOS and exit
      console.log('👻 Ghost user detected: ' + message.author.id + ' - showing TOS');
      
      const tosAccepted = await tosHandler.checkAcceptance(message, client.db);
      if (!tosAccepted) {
        // TOS was shown, user needs to accept - exit gracefully
        console.log('📋 TOS shown to ghost user: ' + message.author.id);
        return;
      }
      
      // If we get here, TOS was accepted and user should be registered now
      console.log('✅ TOS accepted by ghost user: ' + message.author.id + ' - user should be registered');
    }
        // 🚫 Check if user is banned (user already retrieved above)
    if (user && user.banned) {
      return message.reply('You are banned from LUX. Reason: ' + user.banReason + ' You think this is a mistake? Make a ticket on the official LUX server.');
    }

    const banStatus = await captchaSystem.isUserBanned(message.author.id);
    if (banStatus.banned) {
      const embed = new EmbedBuilder()
        .setTitle('🚫 Temporarily Banned')
        .setDescription('You are temporarily banned from using LuxBot. Reason: ' + banStatus.reason + ' Time remaining: ' + banStatus.timeLeft)
        .setColor('#FF0000')
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (message.guild) {
      try {
        const dbInstance = await getDB();
        const disabledChannelsCollection = dbInstance.collection('disabledChannels');
        
        const isChannelDisabled = await disabledChannelsCollection.findOne({ 
          channelId: message.channel.id, 
          guildId: message.guild.id 
        });
        
        if (isChannelDisabled && commandName !== 'enable' && commandName !== 'disable') {
          try {
            const notification = await message.channel.send(message.author + ' | Lux is disabled in this channel.');
            setTimeout(() => {
              notification.delete().catch(() => {});
            }, 3000);
            return;
          } catch (error) {
            return message.reply('🚫 Lux is disabled in this channel.');
          }
        }
      } catch (error) {
        console.error('Error checking disabled channels:', error);
      }
    }

    const suspiciousActivity = await captchaSystem.trackCommand(message.author.id, commandName);
    if (suspiciousActivity) {
      const phase = await captchaSystem.getUserPhase(message.author.id);
      const sent = await captchaSystem.sendCaptcha(message.author, phase);
      
      if (sent) {
        const embed = new EmbedBuilder()
          .setTitle('🚨 CAPTCHA Required')
          .setDescription('Suspicious activity detected! A CAPTCHA has been sent to your DMs.')
          .setColor('#FF6B35')
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      } else {
        return message.reply('❌ Could not send CAPTCHA to your DMs. Please enable DMs from server members and try again.');
      }
    }

    const gamblingCommands = ['slots', 'bet', 'double', 'coinflip', 'd', 'hr', 's', 'spin'];
    if (gamblingCommands.includes(commandName)) {
      await addManaPoints(message.author.id, 10);
    }

    const questCommandMap = {
      'mine': 'play_mine',
      'spin': 'play_slots', 
      's': 'play_slots',
      'slots': 'play_slots',
      'coinflip': 'play_coinflip',
      'cf': 'play_coinflip',
      'horserace': 'play_horserace',
      'hr': 'play_horserace',
      'fish': 'use_fish'
    };
    
    if (questCommandMap[commandName]) {
      await trackQuestProgress(message.author.id, questCommandMap[commandName], 1);
    }

    console.log(`🎯 [${commandName}] ${message.author.username}#${message.author.discriminator}`);
    const commandResult = await command.execute(message, args, client.db);
    console.log(`✅ [${commandName}] Completed`);
    
    if (commandResult && typeof commandResult === 'object') {
      if ((commandName === 'coinflip' || commandName === 'cf') && commandResult.won) {
        await trackQuestProgress(message.author.id, 'win_coinflip', 1, { won: true });
      }
      if ((commandName === 'horserace' || commandName === 'hr') && commandResult.won) {
        await trackQuestProgress(message.author.id, 'win_horserace', 1, { won: true });
      }
    }
    
    await checkQuestCompletion(message.author.id, message);

  } catch (error) {
    console.error('❌ Error executing ' + commandName + ' for user ' + message.author.id + ':', error);
    await message.reply('❌ Error executing ' + commandName + ': ' + error.message);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    const tosHandled = await tosHandler.handleAcceptance(interaction, client.db);
    if (tosHandled) return;
  } catch (error) {
    console.error('Error handling interaction:', error);
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  let slashContext = null;
  try {
    slashContext = await createSlashInvocationContext(interaction);
  } catch (contextError) {
    console.error('❌ Failed to build slash context for /' + interaction.commandName + ':', contextError);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Slash command initialization failed. Please try again.', ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (!slashContext) {
    return;
  }

  try {
    if (banSystem.isBanned(interaction.user.id)) {
      return;
    }

    const commandName = slashContext.entry.commandKey;
    const canProceed = await checkCommandCooldown(slashContext.message, commandName);
    if (!canProceed) {
      return;
    }

    const user = await getUser(interaction.user.id);

    if (!user || !user.registered) {
      const tosAccepted = await tosHandler.checkAcceptance(slashContext.message, client.db);
      if (!tosAccepted) {
        return;
      }
    }

    if (user && user.banned) {
      return slashContext.message.reply('You are banned from LUX. Reason: ' + user.banReason + ' You think this is a mistake? Make a ticket on the official LUX server.');
    }

    const banStatus = await captchaSystem.isUserBanned(interaction.user.id);
    if (banStatus.banned) {
      return slashContext.message.reply({
        embeds: [new EmbedBuilder()
          .setTitle('🚫 Temporarily Banned')
          .setDescription('You are temporarily banned from using LuxBot. Reason: ' + banStatus.reason + ' Time remaining: ' + banStatus.timeLeft)
          .setColor('#FF0000')
          .setTimestamp()],
      });
    }

    console.log(`🎯 [/${interaction.commandName}] ${interaction.user.username}`);
    const command = client.commands.get(interaction.commandName) || client.commands.get(slashContext.entry.command.name.toLowerCase());
    if (!command) {
      return;
    }

    const commandResult = await command.execute(slashContext.message, slashContext.args, client.db);
    console.log(`✅ [/${interaction.commandName}] Completed`);

    if (commandResult && typeof commandResult === 'object') {
      if ((interaction.commandName === 'coinflip' || interaction.commandName === 'cf') && commandResult.won) {
        await trackQuestProgress(interaction.user.id, 'win_coinflip', 1, { won: true });
      }
      if ((interaction.commandName === 'horserace' || interaction.commandName === 'hr') && commandResult.won) {
        await trackQuestProgress(interaction.user.id, 'win_horserace', 1, { won: true });
      }
    }

    await checkQuestCompletion(interaction.user.id, slashContext.message);
  } catch (error) {
    console.error('❌ Error executing /' + interaction.commandName + ' for user ' + interaction.user.id + ':', error);
    await slashContext.message.reply('❌ Error executing ' + interaction.commandName + ': ' + error.message).catch(() => {});
  } finally {
    await slashContext.cleanup();
  }
});

module.exports = { client };
client.login(process.env.TOKEN);