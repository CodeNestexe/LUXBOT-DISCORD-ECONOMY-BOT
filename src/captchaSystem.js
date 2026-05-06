const { EmbedBuilder } = require('discord.js');
const { getDB } = require('./database');

// **UPDATED: Increased spam threshold from 5 to 20**
const SPAM_THRESHOLD = 20; // User must spam same command 20+ times
const PATTERN_THRESHOLD = 10; // For repetitive patterns
const RATE_LIMIT_THRESHOLD = 15; // For overall rate limiting (2 minutes)

// Generate simple math CAPTCHA
function generateCaptcha() {
  const operations = ['+', '-', '*'];
  const a = Math.floor(Math.random() * 50) + 1; // 1-50
  const b = Math.floor(Math.random() * 20) + 1; // 1-20
  const op = operations[Math.floor(Math.random() * operations.length)];
  
  let question, answer;
  switch(op) {
    case '+':
      question = `${a} + ${b}`;
      answer = a + b;
      break;
    case '-':
      question = `${a} - ${b}`;
      answer = a - b;
      break;
    case '*':
      question = `${a} × ${b}`;
      answer = a * b;
      break;
  }
  
  return { question, answer };
}

// **NEW: Check if user already has active CAPTCHA**
async function hasActiveCaptcha(userId) {
  const db = await getDB();
  const captchaCollection = db.collection('activeCaptchas');
  
  const captcha = await captchaCollection.findOne({ userId });
  if (!captcha) return false;
  
  // Check if CAPTCHA is still valid
  if (Date.now() > captcha.expiresAt) {
    // Expired CAPTCHA, remove it
    await captchaCollection.deleteOne({ userId });
    return false;
  }
  
  return true; // Active CAPTCHA exists
}

// **UPDATED: Detection patterns for abuse**
function detectAbusePattern(userId, commandHistory) {
  const now = Date.now();
  const twoMinutesAgo = now - (2 * 60 * 1000); // 2 minutes
  const recentCommands = commandHistory.filter(cmd => cmd.timestamp >= twoMinutesAgo);
  
  // **UPDATED: Pattern 1 - Same command spammed (20+ times in 2 minutes)**
  const commandCounts = {};
  recentCommands.forEach(cmd => {
    commandCounts[cmd.name] = (commandCounts[cmd.name] || 0) + 1;
  });
  
  for (const [cmd, count] of Object.entries(commandCounts)) {
    if (count >= SPAM_THRESHOLD) {
      console.log(`Spam detected: ${cmd} used ${count} times by ${userId}`);
      return true;
    }
  }
  
  // Pattern 2: Repetitive sequence (stock -> gamble -> stock)
  if (recentCommands.length >= 9) { // 3 sequences of 3 commands
    const cmdNames = recentCommands.slice(0, 9).map(c => c.name);
    let sequenceCount = 0;
    
    for (let i = 0; i < cmdNames.length - 2; i += 3) {
      if (i + 2 < cmdNames.length) {
        const sequence = [cmdNames[i], cmdNames[i + 1], cmdNames[i + 2]];
        if (sequence.includes('stock') && (sequence.includes('mine') || sequence.includes('coinflip') || sequence.includes('slots'))) {
          sequenceCount++;
        }
      }
    }
    
    if (sequenceCount >= 3) {
      console.log(`Pattern spam detected: repetitive sequences by ${userId}`);
      return true;
    }
  }
  
  // Pattern 3: Too many commands overall (15+ in 2 minutes)
  if (recentCommands.length >= RATE_LIMIT_THRESHOLD) {
    console.log(`Rate limit exceeded: ${recentCommands.length} commands by ${userId}`);
    return true;
  }
  
  return false;
}

module.exports = {
  // **UPDATED: Track command usage with duplicate CAPTCHA prevention**
  trackCommand: async (userId, commandName) => {
    // **FIX 1: Don't trigger new CAPTCHA if user already has active one**
    if (await hasActiveCaptcha(userId)) {
      console.log(`User ${userId} already has active CAPTCHA, skipping spam detection`);
      return true; // Block command, tell user to solve existing CAPTCHA
    }

    const db = await getDB();
    const commandHistoryCollection = db.collection('commandHistory');
    
    // Clean old history (keep 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    await commandHistoryCollection.deleteMany({ 
      userId, 
      timestamp: { $lt: oneHourAgo } 
    });
    
    // Add new command
    await commandHistoryCollection.insertOne({
      userId,
      name: commandName,
      timestamp: Date.now()
    });
    
    // Get recent history for abuse detection
    const history = await commandHistoryCollection
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(30) // Increased limit to catch patterns better
      .toArray();
    
    return detectAbusePattern(userId, history);
  },

  // **NEW: Helper function to check for active CAPTCHA**
  hasActiveCaptcha,

  // Send CAPTCHA to user (unchanged)
  sendCaptcha: async (user, phase = 1) => {
    const { question, answer } = generateCaptcha();
    const timeouts = { 1: 30, 2: 20, 3: 30 }; // minutes
    const timeout = timeouts[phase] * 60 * 1000; // convert to ms
    
    const db = await getDB();
    const captchaCollection = db.collection('activeCaptchas');
    
    // Store CAPTCHA data
    await captchaCollection.updateOne(
      { userId: user.id },
      {
        $set: {
          userId: user.id,
          answer,
          phase,
          createdAt: Date.now(),
          expiresAt: Date.now() + timeout
        }
      },
      { upsert: true }
    );
    
    const embed = new EmbedBuilder()
      .setTitle('🚨 CAPTCHA Verification Required')
      .setDescription(
        `**Suspicious activity detected!**\n\n` +
        `Please solve this math problem to continue:\n` +
        `**${question} = ?**\n\n` +
        `**Phase ${phase} Warning**\n` +
        `Time limit: **${timeouts[phase]} minutes**\n\n` +
        `Type your answer in this DM to continue.`
      )
      .setColor('#FF6B35')
      .addFields(
        { name: '⚠️ Warning Levels', value: 
          `Phase 1: 30min to solve → 1 hour ban\n` +
          `Phase 2: 20min to solve → 12 hour ban\n` +
          `Phase 3: 30min to solve → 30 day ban`, inline: false }
      )
      .setFooter({ text: 'Your activity is being monitored for spam prevention' })
      .setTimestamp();

    try {
      await user.send({ embeds: [embed] });
      console.log(`CAPTCHA sent to ${user.tag} (Phase ${phase})`);
      return true;
    } catch (error) {
      console.error('Could not send CAPTCHA DM:', error);
      return false;
    }
  },

  // Check CAPTCHA answer (unchanged)
  checkAnswer: async (userId, answer) => {
    const db = await getDB();
    const captchaCollection = db.collection('activeCaptchas');
    const captchaWarningsCollection = db.collection('captchaWarnings');
    
    const captcha = await captchaCollection.findOne({ userId });
    if (!captcha) return { success: false, message: 'No active CAPTCHA found.' };
    
    const now = Date.now();
    if (now > captcha.expiresAt) {
      // CAPTCHA expired - apply ban
      await this.applyCaptchaBan(userId, captcha.phase);
      await captchaCollection.deleteOne({ userId });
      return { success: false, message: 'CAPTCHA expired. You have been temporarily banned.' };
    }
    
    if (parseInt(answer) === captcha.answer) {
      // Correct answer
      await captchaCollection.deleteOne({ userId });
      console.log(`User ${userId} solved CAPTCHA successfully`);
      return { success: true, message: 'CAPTCHA solved! You can continue using LuxBot.' };
    } else {
      return { success: false, message: 'Incorrect answer. Please try again.' };
    }
  },

  // Apply temporary ban based on phase (unchanged)
  applyCaptchaBan: async (userId, phase) => {
    const db = await getDB();
    const tempBansCollection = db.collection('tempBans');
    const captchaWarningsCollection = db.collection('captchaWarnings');
    
    const banDurations = {
      1: 60 * 60 * 1000, // 1 hour
      2: 12 * 60 * 60 * 1000, // 12 hours
      3: 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    
    const banUntil = Date.now() + banDurations[phase];
    
    await tempBansCollection.updateOne(
      { userId },
      {
        $set: {
          userId,
          bannedUntil: banUntil,
          reason: `CAPTCHA Phase ${phase} failure`,
          bannedAt: Date.now()
        }
      },
      { upsert: true }
    );
    
    // Update warning count
    await captchaWarningsCollection.updateOne(
      { userId },
      {
        $inc: { failureCount: 1 },
        $set: { lastFailure: Date.now() }
      },
      { upsert: true }
    );
    
    console.log(`User ${userId} banned for ${banDurations[phase] / 1000} seconds (Phase ${phase})`);
  },

  // Check if user is banned (unchanged)
  isUserBanned: async (userId) => {
    const db = await getDB();
    const tempBansCollection = db.collection('tempBans');
    
    const ban = await tempBansCollection.findOne({ userId });
    if (!ban) return { banned: false };
    
    if (Date.now() < ban.bannedUntil) {
      const timeLeft = ban.bannedUntil - Date.now();
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      return {
        banned: true,
        timeLeft: `${hours}h ${minutes}m`,
        reason: ban.reason
      };
    } else {
      // Ban expired
      await tempBansCollection.deleteOne({ userId });
      return { banned: false };
    }
  },

  // Get user's current warning phase (unchanged)
  getUserPhase: async (userId) => {
    const db = await getDB();
    const captchaWarningsCollection = db.collection('captchaWarnings');
    
    const warning = await captchaWarningsCollection.findOne({ userId });
    if (!warning) return 1;
    
    // Check if 30 days have passed since last failure (reset warnings)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (warning.lastFailure < thirtyDaysAgo) {
      await captchaWarningsCollection.deleteOne({ userId });
      return 1;
    }
    
    return Math.min(warning.failureCount + 1, 3);
  },

  // Cleanup expired data (unchanged)
  cleanup: async () => {
    const db = await getDB();
    const now = Date.now();
    
    // Clean expired CAPTCHAs
    await db.collection('activeCaptchas').deleteMany({ expiresAt: { $lt: now } });
    
    // Clean expired bans
    await db.collection('tempBans').deleteMany({ bannedUntil: { $lt: now } });
    
    // Clean old command history (24 hours)
    const dayAgo = now - (24 * 60 * 60 * 1000);
    await db.collection('commandHistory').deleteMany({ timestamp: { $lt: dayAgo } });
    
    // Clean old warnings (30 days)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    await db.collection('captchaWarnings').deleteMany({ lastFailure: { $lt: thirtyDaysAgo } });
    
    console.log('CAPTCHA system cleanup completed');
  }
};
