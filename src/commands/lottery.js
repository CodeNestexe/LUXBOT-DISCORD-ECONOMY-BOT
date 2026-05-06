const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'lottery',
  description: 'View and participate in lotteries',
  async execute(message, args, db) {
    try {
      // Initialize lottery system
      await db.initializeLottery();

      // Get current lottery data
      const lotteryData = await getLotteryData(db);
      
      // Create lottery menu embed
      const embed = await createLotteryEmbed(lotteryData);
      
      // Create buttons
      const buttons = createLotteryButtons(lotteryData);
      
      // Send lottery menu
      const reply = await message.reply({
        embeds: [embed],
        components: buttons
      });

      // Set up collector
      const collector = reply.createMessageComponentCollector({
        time: 300000 // 5 minutes
      });

      collector.on('collect', async interaction => {
        await handleLotteryInteraction(interaction, db, message);
      });

      collector.on('end', () => {
        reply.edit({ components: [] }).catch(console.error);
      });

    } catch (error) {
      console.error('Error in lottery command:', error);
      await message.reply('❌ An error occurred while loading the lottery menu.');
    }
  }
};

// Get current lottery data with checks
async function getLotteryData(db) {
  const dbInstance = await db.getDB();
  const lotteryCollection = dbInstance.collection('lotteries');
  
  let lotteryData = await lotteryCollection.findOne({ type: 'system' });
  
  // Initialize if no data exists
  if (!lotteryData) {
    await db.initializeLottery();
    lotteryData = await lotteryCollection.findOne({ type: 'system' });
  }
  
  // Convert database structure to expected structure
  if (!lotteryData.userBased) {
    lotteryData.userBased = [];
    
    // Map userBased1 and userBased2 to array
    if (lotteryData.userBased1) {
      lotteryData.userBased.push({
        id: lotteryData.userBased1.number || 2,
        participants: lotteryData.userBased1.users || [],
        maxUsers: 20,
        active: true,
        createdAt: lotteryData.userBased1.startTime || new Date()
      });
    }
    
    if (lotteryData.userBased2) {
      lotteryData.userBased.push({
        id: lotteryData.userBased2.number || 3,
        participants: lotteryData.userBased2.users || [],
        maxUsers: 20,
        active: true,
        createdAt: lotteryData.userBased2.startTime || new Date()
      });
    }
  }
  
  // Ensure timeBased structure is correct
  if (!lotteryData.timeBased.resetTime && lotteryData.timeBased.endTime) {
    lotteryData.timeBased.resetTime = lotteryData.timeBased.endTime;
  }
  
  if (!lotteryData.timeBased.participants) {
    lotteryData.timeBased.participants = [];
  }
  
  if (!lotteryData.timeBased.totalAmount) {
    lotteryData.timeBased.totalAmount = 0;
  }
  
  if (!lotteryData.timeBased.id) {
    lotteryData.timeBased.id = lotteryData.timeBased.number || 1;
  }
  
  if (!lotteryData.nextLotteryId) {
    lotteryData.nextLotteryId = 4;
  }
  
  const now = new Date();
  
  // Check time-based lottery reset (6:30 AM UTC)
  if (lotteryData.timeBased.resetTime && now >= new Date(lotteryData.timeBased.resetTime)) {
    await processTimeBasedLotteryEnd(db, lotteryData);
    lotteryData = await lotteryCollection.findOne({ type: 'system' });
  }

  // Check user-based lotteries for 42-hour timeout
  if (lotteryData.userBased && Array.isArray(lotteryData.userBased)) {
    for (let i = 0; i < lotteryData.userBased.length; i++) {
      const lottery = lotteryData.userBased[i];
      
      // Ensure participants array exists
      if (!Array.isArray(lottery.participants)) {
        lottery.participants = lottery.users || [];
      }
      
      const hoursPassed = (now - new Date(lottery.createdAt)) / (1000 * 60 * 60);
      
      if (hoursPassed >= 42 && lottery.participants.length < lottery.maxUsers) {
        await refundAndResetUserLottery(db, lottery, i);
        lotteryData = await lotteryCollection.findOne({ type: 'system' });
      } else if (lottery.participants.length >= lottery.maxUsers && !lottery.processed) {
        await processUserBasedLottery(db, lottery, i);
        lotteryData = await lotteryCollection.findOne({ type: 'system' });
      }
    }
  }
  
  return lotteryData;
}

// Create lottery embed with exact format
async function createLotteryEmbed(lotteryData) {
  const timeLeft = getTimeLeft(lotteryData.timeBased.resetTime);
  const totalAmount = (lotteryData.timeBased.totalAmount || 0).toLocaleString();
  
  let description = `**LOTTERY #${lotteryData.timeBased.id}**\n` +
    '```\n' +
    'USERS              TIME LEFT\n' +
    'unlimited          ' + timeLeft + '\n' +
    'PRICE              TOTAL AMT\n' +
    '20,000             ' + totalAmount + ' Lux\n' +
    '```\n\n';

  // Safe access to userBased array
  if (lotteryData.userBased && Array.isArray(lotteryData.userBased)) {
    lotteryData.userBased.forEach(lottery => {
      const participants = lottery.participants || lottery.users || [];
      const userCount = `${participants.length}/20`;
      const prizePool = (participants.length * 20000).toLocaleString();
      
      description += `**LOTTERY #${lottery.id}**\n` +
        '```\n' +
        'USERS    AMOUNT    PRIZE\n' +
        `${userCount}     20,000    ${prizePool} Lux\n` +
        '```\n\n';
    });
  }

  return new EmbedBuilder()
    .setColor('#00FFFF')
    .setTitle('🎰 LOTTERY MENU 🎰')
    .setDescription(description)
    .setFooter({ text: 'Time-based lottery resets daily at 6:30 AM UTC' })
    .setTimestamp();
}

// Create lottery buttons
function createLotteryButtons(lotteryData) {
  const rows = [];
  
  // Time-based lottery button
  const timeBasedRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`lottery_time_${lotteryData.timeBased.id}`)
        .setLabel('ENTER')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫')
    );
  rows.push(timeBasedRow);

  // Safe access to userBased array
  if (lotteryData.userBased && Array.isArray(lotteryData.userBased)) {
    lotteryData.userBased.forEach(lottery => {
      const participants = lottery.participants || lottery.users || [];
      const userBasedRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`lottery_user_${lottery.id}`)
            .setLabel('ENTER')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎫')
            .setDisabled(participants.length >= lottery.maxUsers)
        );
      rows.push(userBasedRow);
    });
  }

  return rows;
}

// Handle lottery interactions
async function handleLotteryInteraction(interaction, db, message) {
  const userId = interaction.user.id;
  const customId = interaction.customId;
  
  if (customId.startsWith('lottery_time_')) {
    await handleTimeBasedEntry(interaction, db, userId);
  } else if (customId.startsWith('lottery_user_')) {
    const lotteryId = parseInt(customId.split('_')[2]);
    await handleUserBasedEntry(interaction, db, userId, lotteryId);
  }
  
  // Update the embed after interaction
  const updatedLotteryData = await getLotteryData(db);
  const newEmbed = await createLotteryEmbed(updatedLotteryData);
  const newButtons = createLotteryButtons(updatedLotteryData);
  
  await interaction.message.edit({
    embeds: [newEmbed],
    components: newButtons
  });
}

// Handle time-based lottery entry
async function handleTimeBasedEntry(interaction, db, userId) {
  try {
    const user = await db.getUser(userId);
    
    if (!user || user.balance < 20000) {
      return interaction.reply({
        content: '❌ You need at least 20,000 LUX to enter this lottery!',
        ephemeral: true
      });
    }

    const dbInstance = await db.getDB();
    const lotteryCollection = dbInstance.collection('lotteries');
    const lotteryData = await lotteryCollection.findOne({ type: 'system' });
    
    // Check user tickets (max 10)
    const participants = lotteryData.timeBased.participants || [];
    const userTickets = participants.filter(p => p.userId === userId).length;
    
    if (userTickets >= 10) {
      return interaction.reply({
        content: '❌ You can only buy maximum 10 tickets per lottery!',
        ephemeral: true
      });
    }

    // Deduct LUX and add participant
    await db.updateUser(userId, { balance: user.balance - 20000 });
    
    await lotteryCollection.updateOne(
      { type: 'system' },
      { 
        $push: { 'timeBased.participants': { userId, ticketNumber: userTickets + 1 } },
        $inc: { 'timeBased.totalAmount': 20000 }
      }
    );

    // Send DM
    try {
      await interaction.user.send(`🎫 You entered lottery #${lotteryData.timeBased.id || lotteryData.timeBased.number}! Good luck! 🍀`);
    } catch (error) {
      console.log('Could not send DM to user:', userId);
    }

    await interaction.reply({
      content: `✅ Successfully entered lottery #${lotteryData.timeBased.id || lotteryData.timeBased.number}! You now have ${userTickets + 1} ticket(s).`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error in time-based lottery entry:', error);
    await interaction.reply({
      content: '❌ An error occurred while entering the lottery.',
      ephemeral: true
    });
  }
}

// Handle user-based lottery entry
async function handleUserBasedEntry(interaction, db, userId, lotteryId) {
  try {
    const user = await db.getUser(userId);
    
    if (!user || user.balance < 20000) {
      return interaction.reply({
        content: '❌ You need at least 20,000 LUX to enter this lottery!',
        ephemeral: true
      });
    }

    const dbInstance = await db.getDB();
    const lotteryCollection = dbInstance.collection('lotteries');
    const lotteryData = await lotteryCollection.findOne({ type: 'system' });
    
    // Handle both userBased array and userBased1/userBased2 structure
    let lottery = null;
    let lotteryKey = null;
    
    if (lotteryData.userBased && Array.isArray(lotteryData.userBased)) {
      const lotteryIndex = lotteryData.userBased.findIndex(l => l.id === lotteryId);
      lottery = lotteryData.userBased[lotteryIndex];
      lotteryKey = `userBased.${lotteryIndex}`;
    } else {
      // Fallback to direct userBased1/userBased2 access
      if (lotteryData.userBased1 && (lotteryData.userBased1.number === lotteryId || lotteryData.userBased1.id === lotteryId)) {
        lottery = lotteryData.userBased1;
        lotteryKey = 'userBased1';
      } else if (lotteryData.userBased2 && (lotteryData.userBased2.number === lotteryId || lotteryData.userBased2.id === lotteryId)) {
        lottery = lotteryData.userBased2;
        lotteryKey = 'userBased2';
      }
    }
    
    if (!lottery) {
      return interaction.reply({
        content: '❌ Lottery not found!',
        ephemeral: true
      });
    }

    // Use correct participants array
    const participants = lottery.participants || lottery.users || [];
    
    // Check if user already participated (1 ticket max)
    if (participants.some(p => (p.userId || p) === userId)) {
      return interaction.reply({
        content: '❌ You can only buy one ticket per user-based lottery!',
        ephemeral: true
      });
    }

    if (participants.length >= 20) {
      return interaction.reply({
        content: '❌ This lottery is full!',
        ephemeral: true
      });
    }

    // Deduct LUX and add participant
    await db.updateUser(userId, { balance: user.balance - 20000 });
    
    // Update correct field in database
    const updateField = lottery.users !== undefined ? `${lotteryKey}.users` : `${lotteryKey}.participants`;
    
    await lotteryCollection.updateOne(
      { type: 'system' },
      { 
        $push: { [updateField]: { userId } },
        $inc: { [`${lotteryKey}.totalAmount` || `${lotteryKey}.totalAmount`]: 20000 }
      }
    );

    // Send DM
    try {
      await interaction.user.send(`🎫 You entered lottery #${lotteryId}! Good luck! 🍀`);
    } catch (error) {
      console.log('Could not send DM to user:', userId);
    }

    const newParticipantCount = participants.length + 1;

    await interaction.reply({
      content: `✅ Successfully entered lottery #${lotteryId}! (${newParticipantCount}/20 spots filled)`,
      ephemeral: true
    });

    // Process lottery if full
    if (newParticipantCount >= lottery.maxUsers) {
      await processUserBasedLottery(db, { ...lottery, participants: [...participants, { userId }] }, lotteryData.userBased.findIndex(l => l.id === lotteryId));
    }

  } catch (error) {
    console.error('Error in user-based lottery entry:', error);
    await interaction.reply({
      content: '❌ An error occurred while entering the lottery.',
      ephemeral: true
    });
  }
}

// Process time-based lottery end
async function processTimeBasedLotteryEnd(db, lotteryData) {
  const dbInstance = await db.getDB();
  const lotteryCollection = dbInstance.collection('lotteries');
  
  const participants = lotteryData.timeBased.participants || [];
  
  if (participants.length > 0) {
    // Calculate winner with luck bonus (0.5% per additional ticket)
    const weightedParticipants = [];
    
    // Group participants by user and calculate luck bonus
    const userTickets = {};
    participants.forEach(p => {
      userTickets[p.userId] = (userTickets[p.userId] || 0) + 1;
    });
    
    Object.entries(userTickets).forEach(([userId, ticketCount]) => {
      const luckBonus = (ticketCount - 1) * 0.5; // 0.5% per additional ticket
      const baseWeight = 100 / participants.length; // Base chance
      const totalWeight = baseWeight + luckBonus;
      
      for (let i = 0; i < Math.round(totalWeight * 100); i++) { // Scale to avoid float issues
        weightedParticipants.push(userId);
      }
    });
    
    const winner = weightedParticipants[Math.floor(Math.random() * weightedParticipants.length)];
    const prizeAmount = lotteryData.timeBased.totalAmount || 0;
    
    // Award prize
    if (prizeAmount > 0) {
      const winnerUser = await db.getUser(winner);
      await db.updateUser(winner, { balance: winnerUser.balance + prizeAmount });
    }
    
    // Send DMs
    await sendLotteryResultDMs(db, winner, participants, lotteryData.timeBased.id || lotteryData.timeBased.number, prizeAmount, 'time');
  }
  
  // Reset time-based lottery
  const nextReset = new Date(lotteryData.timeBased.resetTime || lotteryData.timeBased.endTime);
  nextReset.setDate(nextReset.getDate() + 1);
  
  await lotteryCollection.updateOne(
    { type: 'system' },
    {
      $set: {
        'timeBased.participants': [],
        'timeBased.totalAmount': 0,
        'timeBased.resetTime': nextReset,
        'timeBased.endTime': nextReset
      },
      $inc: {
        'timeBased.id': 1,
        'timeBased.number': 1,
        nextLotteryId: 1
      }
    }
  );
}

// Process user-based lottery
async function processUserBasedLottery(db, lottery, lotteryIndex) {
  const dbInstance = await db.getDB();
  const lotteryCollection = dbInstance.collection('lotteries');
  
  const participants = lottery.participants || lottery.users || [];
  
  if (participants.length === 0) return;
  
  // Select random winner
  const winner = participants[Math.floor(Math.random() * participants.length)];
  const prizeAmount = participants.length * 20000;
  
  // Award prize
  const winnerId = winner.userId || winner;
  const winnerUser = await db.getUser(winnerId);
  await db.updateUser(winnerId, { balance: winnerUser.balance + prizeAmount });
  
  // Send DMs
  await sendLotteryResultDMs(db, winnerId, participants, lottery.id || lottery.number, prizeAmount, 'user');
  
  // Create new lottery
  const newLottery = {
    id: lottery.id || lottery.number,
    users: [],
    totalAmount: 0,
    startTime: new Date(),
    endTime: null
  };
  
  // Update the specific userBased field
  const updateKey = lotteryIndex === 0 ? 'userBased[0]' : 'userBased[1]';
  
  await lotteryCollection.updateOne(
    { type: 'system' },
    { $set: { [updateKey]: newLottery } }
  );
}

// Refund and reset user lottery after 42 hours
async function refundAndResetUserLottery(db, lottery, lotteryIndex) {
  const dbInstance = await db.getDB();
  const lotteryCollection = dbInstance.collection('lotteries');
  
  const participants = lottery.participants || lottery.users || [];
  
  // Refund all participants
  for (const participant of participants) {
    const participantId = participant.userId || participant;
    const user = await db.getUser(participantId);
    await db.updateUser(participantId, { balance: user.balance + 20000 });
    
    // Log refund instead of sending DM to avoid circular require
    console.log(`🔄 Refunded 20,000 LUX to user ${participantId} for lottery #${lottery.id || lottery.number}`);
  }
  
  // Create new lottery
  const newLottery = {
    id: lottery.id || lottery.number,
    users: [],
    totalAmount: 0,
    startTime: new Date(),
    endTime: null
  };
  
  // Update the specific userBased field
  const updateKey = lotteryIndex === 0 ? 'userBased[0]' : 'userBased[1]';
  
  await lotteryCollection.updateOne(
    { type: 'system' },
    { $set: { [updateKey]: newLottery } }
  );
}

// Send lottery result DMs
async function sendLotteryResultDMs(db, winnerId, participants, lotteryId, prizeAmount, type) {
  try {
    // Log results instead of sending DMs to avoid circular require
    console.log(`🎉 Lottery #${lotteryId} Results:`);
    console.log(`Winner: ${winnerId}, Prize: ${prizeAmount.toLocaleString()} LUX`);
    console.log(`Participants: ${participants.length}`);
    
    // Note: To enable DM functionality, pass client reference from command or use interaction.client
    
  } catch (error) {
    console.error('Error in lottery results:', error);
  }
}

// Get time left for time-based lottery
function getTimeLeft(resetTime) {
  if (!resetTime) return '0h 0m';
  
  const now = new Date();
  const timeLeft = new Date(resetTime) - now;
  
  if (timeLeft <= 0) return '0h 0m';
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}