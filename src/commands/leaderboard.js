const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb'],
  async execute(message, args, db) {
    try {
      const type = args[0];
      
      if (type === 'lux') {
        await showLuxLeaderboard(message, db, 1);
      } else if (type === 'casino') {
        await showCasinoLeaderboard(message, db, 1);
      } else if (type === 'vote') {
        await showVoteLeaderboard(message, db, 1);
      } else {
        await showLeaderboardMenu(message, db);
      }
    } catch (error) {
      console.error('Error in leaderboard command:', error);
      await message.reply('❌ Error loading leaderboard.');
    }
  },
};

// **🔧 UPDATED: Show leaderboard selection menu with Vote option**
async function showLeaderboardMenu(message, db) {
  const embed = new EmbedBuilder()
    .setTitle('🌏 Select The Leaderboard You Want To See')
    .setColor('#00FFFF')
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('leaderboard_select')
    .setPlaceholder('Choose a leaderboard')
    .addOptions([
      {
        label: 'Lux Leaderboard',
        description: 'View top players by Lux balance',
        value: 'lux',
        emoji: '<:lux:1411637514569252894>'
      },
      {
        label: 'Casino Leaderboard',
        description: 'View top casinos by balance',
        value: 'casino',
        emoji: '🏢'
      },
      {
        label: 'Vote Leaderboard',
        description: 'View top voters on Top.gg',
        value: 'vote',
        emoji: '🗳️'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const reply = await message.reply({
    embeds: [embed],
    components: [row]
  });

  const collector = reply.createMessageComponentCollector({
  time: 300000
});

  collector.on('collect', async interaction => {
  // Only handle StringSelectMenu interactions
  if (!interaction.isStringSelectMenu()) {
    return;
  }

  if (interaction.user.id !== message.author.id) {
    return interaction.reply({
      content: 'Only the person who used the command can select options.',
      ephemeral: true
    });
  }

  if (interaction.values[0] === 'lux') {
      await interaction.deferUpdate();
      await showLuxLeaderboard(message, db, 1, reply);
    } else if (interaction.values[0] === 'casino') {
      await interaction.deferUpdate();
      await showCasinoLeaderboard(message, db, 1, reply);
    } else if (interaction.values[0] === 'vote') {
      await interaction.deferUpdate();
      await showVoteLeaderboard(message, db, 1, reply);
    }
  });

  collector.on('end', () => {
    reply.edit({ components: [] }).catch(console.error);
  });
}

// Show Lux Leaderboard
async function showLuxLeaderboard(message, db, page = 1, existingMessage = null) {
  try {
    const dbInstance = await db.getDB();
    const usersCollection = dbInstance.collection('users');
    
    const allUsers = await usersCollection
  .find({ 
    $and: [
      { userId: { $exists: true, $ne: null } },
      { registered: true },
      { balance: { $gt: 0, $exists: true, $ne: null } },
      { xp: { $exists: true, $ne: null } }
    ]
  })
      .sort({ balance: -1 })
      .limit(100)
      .toArray();

    if (allUsers.length === 0) {
      const errorMsg = '❌ No users found with Lux balance.';
      if (existingMessage) {
        return existingMessage.edit({ content: errorMsg, embeds: [], components: [] });
      }
      return message.reply(errorMsg);
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(allUsers.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const pageUsers = allUsers.slice(startIndex, startIndex + itemsPerPage);

    // Find user's rank
    const userRank = allUsers.findIndex(user => user.userId === message.author.id) + 1;

    // Build description with mentions
    let description = '';
    pageUsers.forEach((user, index) => {
      const rank = startIndex + index + 1;
      const rankEmoji = getRankEmoji(rank);
      const balance = (user.balance || 0).toLocaleString();
      
      description += `${rankEmoji} **${rank}.** <@${user.userId}>\n`;
      description += `<:lux:1411637514569252894> ${balance} LUX\n\n`;
    });

    const embed = new EmbedBuilder()
  .setTitle('🏆 Lux Leaderboard')
  .setDescription(description)
  .setColor('#FFD700')
  .addFields({
    name: '📊 Page Info',
    value: `Page ${page}/${totalPages} • Showing ${startIndex + 1}-${startIndex + pageUsers.length} of ${allUsers.length}`,
    inline: false
  })
  .setFooter({ 
    text: userRank > 0 ? `Your rank is #${userRank}` : 'You are not ranked yet' 
  })
  .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('lux_prev')
          .setEmoji('🔙')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('lux_next')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages)
      );

    let reply;
    if (existingMessage) {
      reply = await existingMessage.edit({
        embeds: [embed],
        components: [row]
      });
    } else {
      reply = await message.reply({
        embeds: [embed],
        components: [row]
      });
    }

    const collector = reply.createMessageComponentCollector({
      time: 300000
    });
// start from here
    collector.on('collect', async interaction => {
  if (interaction.user.id !== message.author.id) {
    return interaction.reply({
      content: 'Only the person who used the command can navigate.',
      ephemeral: true
    });
  }

  await interaction.deferUpdate();

  let newPage = page;
  if (interaction.customId === 'lux_prev' && page > 1) {
    newPage = page - 1;
  } else if (interaction.customId === 'lux_next' && page < totalPages) {
    newPage = page + 1;
  }

  if (newPage !== page) {
    // Recalculate for new page
    const newStartIndex = (newPage - 1) * itemsPerPage;
    const newPageUsers = allUsers.slice(newStartIndex, newStartIndex + itemsPerPage);

    // Rebuild description
    let newDescription = '';
    newPageUsers.forEach((user, index) => {
      const rank = newStartIndex + index + 1;
      const rankEmoji = getRankEmoji(rank);
      const balance = (user.balance || 0).toLocaleString();
      
      newDescription += `${rankEmoji} **${rank}.** <@${user.userId}>
`;
      newDescription += `<:lux:1411637514569252894> ${balance} LUX

`;
    });

    // Rebuild embed
    const newEmbed = new EmbedBuilder()
      .setTitle('🏆 Lux Leaderboard')
      .setDescription(newDescription)
      .setColor('#FFD700')
      .addFields({
        name: '📊 Page Info',
        value: `Page ${newPage}/${totalPages} • Showing ${newStartIndex + 1}-${newStartIndex + newPageUsers.length} of ${allUsers.length}`,
        inline: false
      })
      .setFooter({ 
        text: userRank > 0 ? `Your rank is #${userRank}` : 'You are not ranked yet' 
      })
      .setTimestamp();

    // Rebuild buttons
    const newRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('lux_prev')
          .setEmoji('🔙')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 1),
        new ButtonBuilder()
          .setCustomId('lux_next')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage >= totalPages)
      );

    // Update the message
    await reply.edit({
      embeds: [newEmbed],
      components: [newRow]
    });

    page = newPage;
  }
});
// stop right there
    collector.on('end', () => {
      reply.edit({ components: [] }).catch(console.error);
    });

  } catch (error) {
    console.error('Error in lux leaderboard:', error);
    const errorMsg = '❌ Error loading lux leaderboard.';
    if (existingMessage) {
      await existingMessage.edit({ content: errorMsg, embeds: [], components: [] });
    } else {
      await message.reply(errorMsg);
    }
  }
}

// Show Casino Leaderboard
async function showCasinoLeaderboard(message, db, page = 1, existingMessage = null) {
  try {
    const dbInstance = await db.getDB();
    const casinosCollection = dbInstance.collection('casinos');
    
    const allCasinos = await casinosCollection.find({}).toArray();
    
    if (allCasinos.length === 0) {
      const errorMsg = '❌ No casinos found.';
      if (existingMessage) {
        return existingMessage.edit({ content: errorMsg, embeds: [], components: [] });
      }
      return message.reply(errorMsg);
    }

    // Sort by casino bankBalance
    const sortedCasinos = allCasinos
      .sort((a, b) => (b.bankBalance || 0) - (a.bankBalance || 0))
      .slice(0, 100);

    // Find user's casino rank
    let userCasinoRank = 0;
    try {
      // Check if user owns a casino
      const userOwnedCasino = sortedCasinos.find(casino => casino.ownerId === message.author.id);
      if (userOwnedCasino) {
        userCasinoRank = sortedCasinos.findIndex(casino => casino.name === userOwnedCasino.name) + 1;
      } else {
        // Check if user is member of a casino
        const userCasinoName = await db.getUserCasino(message.author.id);
        if (userCasinoName) {
          const casinoName = typeof userCasinoName === 'object' ? userCasinoName.name : userCasinoName;
          userCasinoRank = sortedCasinos.findIndex(casino => casino.name === casinoName) + 1;
        }
      }
    } catch (error) {
      console.error('Error getting user casino rank:', error);
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(sortedCasinos.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const pageCasinos = sortedCasinos.slice(startIndex, startIndex + itemsPerPage);

    // Build description with casino name, members, and balance
    let description = '';
    pageCasinos.forEach((casino, index) => {
      const rank = startIndex + index + 1;
      const rankEmoji = getRankEmoji(rank);
      const memberCount = casino.members ? casino.members.length : 0;
      const casinoBalance = (casino.bankBalance || 0).toLocaleString();
      
      description += `${rankEmoji} **${rank}.** ${casino.name}\n`;
      description += `👥 ${memberCount} members\n`;
      description += `<:lux:1411637514569252894> ${casinoBalance} LUX\n\n`;
    });

    const embed = new EmbedBuilder()
  .setTitle('🏢 Casino Leaderboard')
  .setDescription(description)
  .setColor('#FFD700')
  .addFields({
    name: '📊 Page Info',
    value: `Page ${page}/${totalPages} • Showing ${startIndex + 1}-${startIndex + pageCasinos.length} of ${sortedCasinos.length}`,
    inline: false
  })
  .setFooter({ 
    text: userCasinoRank > 0 ? 
      `Your casino rank is #${userCasinoRank}` : 
      'You are not in a casino yet'
  })
  .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('casino_prev')
          .setEmoji('🔙')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('casino_next')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages)
      );

    let reply;
    if (existingMessage) {
      reply = await existingMessage.edit({
        embeds: [embed],
        components: [row]
      });
    } else {
      reply = await message.reply({
        embeds: [embed],
        components: [row]
      });
    }

    const collector = reply.createMessageComponentCollector({
      time: 300000
    });
 // start from here
    collector.on('collect', async interaction => {
  if (interaction.user.id !== message.author.id) {
    return interaction.reply({
      content: 'Only the person who used the command can navigate.',
      ephemeral: true
    });
  }

  await interaction.deferUpdate();

  let newPage = page;
  if (interaction.customId === 'casino_prev' && page > 1) {
    newPage = page - 1;
  } else if (interaction.customId === 'casino_next' && page < totalPages) {
    newPage = page + 1;
  }

  if (newPage !== page) {
    // Recalculate for new page
    const newStartIndex = (newPage - 1) * itemsPerPage;
    const newPageCasinos = sortedCasinos.slice(newStartIndex, newStartIndex + itemsPerPage);

    // Rebuild description
    let newDescription = '';
    newPageCasinos.forEach((casino, index) => {
      const rank = newStartIndex + index + 1;
      const rankEmoji = getRankEmoji(rank);
      const memberCount = casino.members ? casino.members.length : 0;
      const casinoBalance = (casino.bankBalance || 0).toLocaleString();
      
      newDescription += `${rankEmoji} **${rank}.** ${casino.name}
`;
      newDescription += `👥 ${memberCount} members
`;
      newDescription += `<:lux:1411637514569252894> ${casinoBalance} LUX

`;
    });

    // Rebuild embed
    const newEmbed = new EmbedBuilder()
      .setTitle('🏢 Casino Leaderboard')
      .setDescription(newDescription)
      .setColor('#FFD700')
      .addFields({
        name: '📊 Page Info',
        value: `Page ${newPage}/${totalPages} • Showing ${newStartIndex + 1}-${newStartIndex + newPageCasinos.length} of ${sortedCasinos.length}`,
        inline: false
      })
      .setFooter({ 
        text: userCasinoRank > 0 ? 
          `Your casino rank is #${userCasinoRank}` : 
          'You are not in a casino yet'
      })
      .setTimestamp();

    // Rebuild buttons
    const newRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('casino_prev')
          .setEmoji('🔙')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 1),
        new ButtonBuilder()
          .setCustomId('casino_next')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage >= totalPages)
      );

    // Update the message
    await reply.edit({
      embeds: [newEmbed],
      components: [newRow]
    });

    page = newPage;
  }
});
// end here
    collector.on('end', () => {
      reply.edit({ components: [] }).catch(console.error);
    });

  } catch (error) {
    console.error('Error in casino leaderboard:', error);
    const errorMsg = '❌ Error loading casino leaderboard.';
    if (existingMessage) {
      await existingMessage.edit({ content: errorMsg, embeds: [], components: [] });
    } else {
      await message.reply(errorMsg);
    }
  }
}

// **🔧 NEW: Show Vote Leaderboard - FIXED button configuration**
async function showVoteLeaderboard(message, db, page = 1, existingMessage = null) {
  try {
    const dbInstance = await db.getDB();
    const usersCollection = dbInstance.collection('users');
    
    const allVoters = await usersCollection
  .find({ 
    $and: [
      { userId: { $exists: true, $ne: null } },
      { registered: true },
      { totalVotes: { $gt: 0 } },
      { balance: { $exists: true, $ne: null } },
      { xp: { $exists: true, $ne: null } }
    ]
  })
      .sort({ totalVotes: -1 })
      .limit(100)
      .toArray();

    if (allVoters.length === 0) {
      const errorMsg = '❌ No voters found yet. Be the first to vote!';
      if (existingMessage) {
        return existingMessage.edit({ content: errorMsg, embeds: [], components: [] });
      }
      return message.reply(errorMsg);
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(allVoters.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const pageVoters = allVoters.slice(startIndex, startIndex + itemsPerPage);

    // Find user's vote rank
    const userVoteRank = allVoters.findIndex(user => user.userId === message.author.id) + 1;

    // Build description with mentions and vote counts
    let description = '';
    pageVoters.forEach((user, index) => {
      const rank = startIndex + index + 1;
      const rankEmoji = getRankEmoji(rank);
      const totalVotes = user.totalVotes || 0;
      const currentStreak = user.voteStreak || 0;
      const maxStreak = user.maxStreak || 0;
      
      description += `${rankEmoji} **${rank}.** <@${user.userId}>\n`;
      description += `🗳️ **${totalVotes} votes** • 🔥 **${currentStreak}** streak (best: **${maxStreak}**)\n\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🗳️ Vote Leaderboard')
      .setDescription(description)
      .setColor('#800080')
      .addFields(
  {
    name: '🎁 Vote Rewards',
    value: '• <a:vote_crate:1375388998721077359> **Vote Crate** (every vote)\n• 💎 **7 Mana Crystals** (streak bonus)',
    inline: false
  },
  {
    name: '📊 Page Info',
    value: `Page ${page}/${totalPages} • Showing ${startIndex + 1}-${startIndex + pageVoters.length} of ${allVoters.length}`,
    inline: false
  }
)
      .setFooter({ 
        text: userVoteRank > 0 ? 
          `Your vote rank is #${userVoteRank} • Use X vote to support LuxBot!` : 
          'You haven\'t voted yet • Use X vote to get started!'
      })
      .setTimestamp();

    // **🔧 FIXED: Separate navigation and vote buttons**
    const navigationRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('vote_prev')
          .setEmoji('🔙')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('vote_next')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages)
      );

    // **🔧 FIXED: Separate URL button (Link Button)**
    const voteRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Vote Now on Top.gg')
          .setEmoji('🗳️')
          .setStyle(ButtonStyle.Link)
          .setURL('https://top.gg/bot/1414566436763996290/vote')
      );

    let reply;
    if (existingMessage) {
      reply = await existingMessage.edit({
        embeds: [embed],
        components: [navigationRow, voteRow]
      });
    } else {
      reply = await message.reply({
        embeds: [embed],
        components: [navigationRow, voteRow]
      });
    }

    const collector = reply.createMessageComponentCollector({
      time: 300000
    });
 // star from here
    collector.on('collect', async interaction => {
  if (interaction.user.id !== message.author.id) {
    return interaction.reply({
      content: 'Only the person who used the command can navigate.',
      ephemeral: true
    });
  }
  await interaction.deferUpdate();
  let newPage = page;
  if (interaction.customId === 'vote_prev' && page > 1) {
    newPage = page - 1;
  } else if (interaction.customId === 'vote_next' && page < totalPages) {
    newPage = page + 1;
  }
  if (newPage !== page) {
    const newStartIndex = (newPage - 1) * itemsPerPage;
    const newPageVoters = allVoters.slice(newStartIndex, newStartIndex + itemsPerPage);
    let newDescription = '';
    newPageVoters.forEach((user, index) => {
      const rank = newStartIndex + index + 1;
      const rankEmoji = getRankEmoji(rank);
      const totalVotes = user.totalVotes || 0;
      const currentStreak = user.voteStreak || 0;
      const maxStreak = user.maxStreak || 0;
      
      newDescription += `${rankEmoji} **${rank}.** <@${user.userId}>\n`;
      newDescription += `🗳️ **${totalVotes} votes** • 🔥 **${currentStreak}** streak (best: **${maxStreak}**)\n\n`;
    });
    const newEmbed = new EmbedBuilder()
      .setTitle('🗳️ Vote Leaderboard')
      .setDescription(newDescription)
      .setColor('#800080')
      .addFields(
        {
          name: '🎁 Vote Rewards',
          value: '• <a:vote_crate:1375388998721077359> **Vote Crate** (every vote)\n• 💎 **7 Mana Crystals** (streak bonus)',
          inline: false
        },
        {
          name: '📊 Page Info',
          value: `Page ${newPage}/${totalPages} • Showing ${newStartIndex + 1}-${newStartIndex + newPageVoters.length} of ${allVoters.length}`,
          inline: false
        }
      )
      .setFooter({ 
        text: userVoteRank > 0 ? `Your vote rank is #${userVoteRank} • Use X vote to support LuxBot!` : 'You haven\'t voted yet • Use X vote to get started!'
      })
      .setTimestamp();
    const navigationRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('vote_prev')
          .setEmoji('🔙')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 1),
        new ButtonBuilder()
          .setCustomId('vote_next')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage >= totalPages)
      );
    await reply.edit({
      embeds: [newEmbed],
      components: [navigationRow, voteRow]
    });
    page = newPage;
  }
});
 // end here
    collector.on('end', () => {
      // **🔧 FIXED: Keep vote button active, only disable navigation**
      const disabledNavigationRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('vote_prev_disabled')
            .setEmoji('🔙')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('vote_next_disabled')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

      reply.edit({ components: [disabledNavigationRow, voteRow] }).catch(console.error);
    });

  } catch (error) {
    console.error('Error in vote leaderboard:', error);
    const errorMsg = '❌ Error loading vote leaderboard.';
    if (existingMessage) {
      await existingMessage.edit({ content: errorMsg, embeds: [], components: [] });
    } else {
      await message.reply(errorMsg);
    }
  }
}

function getRankEmoji(rank) {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    case 4: 
    case 5: return '🏅';
    default: return '📊';
  }
}
