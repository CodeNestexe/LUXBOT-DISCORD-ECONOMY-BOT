const { EmbedBuilder } = require('discord.js');
const https = require('https');
// Function to get GIF from API
async function getAnimeGif(endpoint) {
  return new Promise((resolve, reject) => {
    https.get(endpoint, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.url);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}
// Function to send auto-delete message
async function sendAutoDeleteMessage(message, content, delay = 5000) {
  try {
    const sentMessage = await message.reply(content);
    setTimeout(() => {
      sentMessage.delete().catch(() => {});
    }, delay);
  } catch (error) {
    console.error('Error sending auto-delete message:', error);
  }
}
// Function to get random message from array
function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}
// Function to check bot permissions
function checkBotPermissions(message) {
  if (!message.guild) return { hasPermission: true }; // DMs always work
  
  const botMember = message.guild.members.me;
  const channel = message.channel;
  
  // Required permissions for fun commands
  const requiredPermissions = [
    'ViewChannel',
    'SendMessages', 
    'EmbedLinks',
    'AttachFiles',
    'UseExternalEmojis'
  ];
  
  const missingPerms = [];
  
  for (const perm of requiredPermissions) {
    if (!botMember.permissionsIn(channel).has(perm)) {
      // Convert permission names to readable format
      const readablePerms = {
        'ViewChannel': 'View Channel',
        'SendMessages': 'Send Messages',
        'EmbedLinks': 'Embed Links', 
        'AttachFiles': 'Attach Files',
        'UseExternalEmojis': 'Use External Emojis'
      };
      missingPerms.push(readablePerms[perm] || perm);
    }
  }
  
  if (missingPerms.length > 0) {
    return {
      hasPermission: false,
      missingPermissions: missingPerms
    };
  }
  
  return { hasPermission: true };
}
// LUX Bot responses (when users try to interact with bot)
const luxBotResponses = [
  "Hey {user}, don't even think about it! LUX Bot doesn't do that kind of stuff - go annoy a human instead! 🙄",
  "Nah {user}, LUX Bot is too cool for that! Find someone else to mess with - I've got better things to do! 😎",
  "Sorry {user}, but LUX Bot doesn't have time for your nonsense! Go bother the humans instead! ⏰",
  "Error 403: Access Denied! {user}, LUX Bot is not available for your weird requests! Try the humans! 🚨",
  "Beep boop! {user}, LUX Bot.exe has stopped responding to your nonsense! Find another target! 🤖",
  "{user}, LUX Bot's anti-annoyance shields are up! Your attempts are futile! Pick someone else! 🛡️",
  "System alert! {user} attempted unauthorized interaction with LUX Bot! Permission denied! Go away! ⚠️",
  "LUX Bot here - {user}, I'm a professional bot with dignity! Keep your hands off and find someone desperate enough! 💼",
  "{user}, LUX Bot doesn't do physical interactions - that's what the humans are for! Go find one! 🎯"
];
// Main execution function
async function executeFunCommand(message, action, actionData, db) {
  try {
    // 🛡️ CHECK BOT PERMISSIONS FIRST
    const permissionCheck = checkBotPermissions(message);
    if (!permissionCheck.hasPermission) {
      const missingPermsText = permissionCheck.missingPermissions.join(', ');
      const permissionMessage = `❌ Please check bot permissions! Bot doesn't have: **${missingPermsText}**`;
      
      // Try to send the permission error message
      try {
        await message.reply(permissionMessage);
      } catch (replyError) {
        console.error(`Cannot send permission error message in ${message.guild?.name || 'DM'} - ${message.channel.name}:`, replyError.message);
      }
      return;
    }
    
    const targetUser = message.mentions.users.first();
    
    // No mention - send auto-delete error
    if (!targetUser) {
      await sendAutoDeleteMessage(message, 'Wrong interaction, mention a user');
      return;
    }
    
    // 🎯 GET PROPER NAMES (displayName OR username)
    const userName = message.author.displayName || message.author.username;
    const targetName = targetUser.displayName || targetUser.username;
    
    // Self-targeting
    if (targetUser.id === message.author.id) {
      const selfMessage = getRandomMessage(actionData.selfMessages)
        .replace(/{user}/g, userName); // 🚀 Replace ALL {user} with actual name
      await message.reply(selfMessage);
      return;
    }
    
    // Bot targeting (LUX Bot)
    if (targetUser.id === message.client.user.id) {
      const botMessage = getRandomMessage(luxBotResponses)
        .replace(/{user}/g, userName); // 🚀 Replace ALL {user} with actual name
      await message.reply(botMessage);
      return;
    }
    
    // Normal interaction - get random title and GIF
    const randomTitle = getRandomMessage(actionData.embedTitles)
      .replace(/{user1}/g, userName)    // 🚀 Replace ALL {user1} with command executor name
      .replace(/{user2}/g, targetName); // 🚀 Replace ALL {user2} with mentioned user name
    
    const gifUrl = await getAnimeGif(actionData.endpoint);
    
    // 🎯 CREATE EMBED WITH DESCRIPTION INSTEAD OF TITLE (smaller, non-bold text)
    const embed = new EmbedBuilder()
      .setDescription(randomTitle) // 🚀 USING DESCRIPTION FOR SMALLER TEXT
      .setImage(gifUrl)
      .setColor(actionData.color)
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error(`Error in ${action} command:`, error);
    
    // Smart error handling based on error type
    if (error.code === 50013) {
      // Missing permissions error
      try {
        await message.reply('❌ Please check bot permissions! Bot doesn\'t have: **Send Messages, Embed Links**');
      } catch (permError) {
        console.error('Cannot send error message - bot completely lacks permissions in this channel');
      }
    } else if (error.code === 50001) {
      // Missing access error
      try {
        await message.reply('❌ Please check bot permissions! Bot doesn\'t have: **View Channel**');
      } catch (accessError) {
        console.error('Cannot access channel at all');
      }
    } else {
      // Other errors (API, network, etc.)
      try {
        await message.reply('❌ Failed to get anime GIF! Please try again later.');
      } catch (generalError) {
        console.error('Failed to send any error message:', generalError.message);
      }
    }
  }
}
module.exports = { executeFunCommand };