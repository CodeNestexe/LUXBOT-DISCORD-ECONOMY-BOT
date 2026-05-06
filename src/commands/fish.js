const { EmbedBuilder } = require('discord.js');
const itemsConfig = require('../utils/itemsConfig');

// Fishing GIF
const FISHING_GIF_URL = 'https://media1.giphy.com/media/wW37e2UfTrLfO84Yow/giphy.gif?cid=6c09b952lp0bb7198lvp8dloyo1pke6uqmih1wx9v7mljldv&ep=v1_internal_gif_by_id&rid=giphy.gif&ct=g';

// Cooldown tracking (in memory)
const fishCooldowns = new Map();

// Lake items by rarity
const LAKE_ITEMS = {
  common: ['C1', 'C2', 'C3', 'C4', 'C5'],
  uncommon: ['U1', 'U2', 'U3', 'U4', 'U5'],
  rare: ['R1', 'R2', 'R3', 'R4', 'R5'],
  epic: ['E1', 'E2', 'E3', 'E4', 'E5'],
  legendary: ['L1', 'L2', 'L3', 'L4', 'L5'],
  mythic: ['M1', 'M2', 'M3', 'M4', 'M5']
};

// Item emojis
const ITEM_EMOJIS = {
  'C1': '<:C1:1407418159878770718>',
  'C2': '<:C2:1407418494210936882>',
  'C3': '<:C3:1407543592129658890>',
  'C4': '<:C4:1407543889073668158>',
  'C5': '<:C5:1406502770017570866>',
  'U1': '<:U1:1407418626155348128>',
  'U2': '<:U2:1407421851671728290>',
  'U3': '<:U3:1407421741835485336>',
  'U4': '<:U4:1407543714716323962>',
  'U5': '<:U5:1407418578059132978>',
  'R1': '<:R1:1407418220310433873>',
  'R2': '<:R2:1407418351726366820>',
  'R3': '<:R3:1407421636009005086>',
  'R4': '<:R4:1407544027745751040>',
  'R5': '<:R5:1407544116861993012>',
  'E1': '<:E1:1407543672513232937>',
  'E2': '<:E2:1407543844488351744>',
  'E3': '<:E3:1407543936188285028>',
  'E4': '<:E4:1407544079230959707>',
  'E5': '<:E5:1407544155936133252>',
  'L1': '<:L1:1407759486067937331>',
  'L2': '<:L2:1407759684273832007>',
  'L3': '<:L3:1407759742046310562>',
  'L4': '<:L4:1407760512007143425>',
  'L5': '<:L5:1407760608077811834>',
  'M1': '<:M1:1407544298282549380>',
  'M2': '<:M2:1407544453874323546>',
  'M3': '<:M3:1407544506827538442>',
  'M4': '<:M4:1407544564792819793>',
  'M5': '<:M5:1407544618140045372>',
};

// Stone configurations
const STONE_CONFIGS = {
  "013": { name: "Basic Stone", multiplier: 2, fishChanceBonus: 2, rarityBonus: 4, duration: 25, itemDrops: null, maxStats: false },
  "014": { name: "Adept Stone", multiplier: 3, fishChanceBonus: 4, rarityBonus: 8, duration: 50, itemDrops: null, maxStats: false },
  "015": { 
    name: "Master Stone", multiplier: 4, fishChanceBonus: 6, rarityBonus: 12, duration: 75, maxStats: false,
    itemDrops: {
      tier1: { items: ["002", "008"], chance: 10 },
      tier3: { items: ["007", "014", "015", "016"], chance: 1 },
    }
  },
  "016": {
    name: "Elite Stone", multiplier: 5, fishChanceBonus: 8, rarityBonus: 15, duration: 100, maxStats: false,
    itemDrops: {
      tier1: { items: ["002", "008"], chance: 12 },
      tier2: { items: ["007"], chance: 8 },
      tier3: { items: ["013", "014", "015", "016"], chance: 3 },
    }
  },
  "017": {
    name: "Prime Stone", multiplier: 6, fishChanceBonus: 12, rarityBonus: 18, duration: 50, maxStats: true,
    itemDrops: {
      tier1: { items: ["002", "008"], chance: 20 },
      tier2: { items: ["007"], chance: 12 },
      tier3: { items: ["013", "014", "015", "016"], chance: 5 },
    }
  }
};

// Get active stone buff
function getActiveStone(fishingBuffs) {
  if (!fishingBuffs) return null;
  const activeStoneId = Object.keys(fishingBuffs).find(key => fishingBuffs[key].active);
  return activeStoneId ? { id: activeStoneId, ...STONE_CONFIGS[activeStoneId], ...fishingBuffs[activeStoneId] } : null;
}

// Get catch chances based on range level and stone buffs
function getCatchChances(rangeLevel, stoneBonus = 0) {
  const baseChances = {
    0: { common: 70, uncommon: 40, rare: 1 },
    1: { common: 60, uncommon: 50, rare: 50, epic: 1 },
    2: { common: 40, uncommon: 45, rare: 55, epic: 43, legendary: 5 },
    3: { common: 30, uncommon: 40, rare: 55, epic: 50, legendary: 7, mythic: 3 },
    4: { common: 30, uncommon: 40, rare: 55, epic: 50, legendary: 12, mythic: 9 },
    5: { common: 30, uncommon: 40, rare: 55, epic: 50, legendary: 23, mythic: 12 }
  };
  
  const chances = { ...baseChances[rangeLevel] } || baseChances[0];
  
  // Apply stone rarity bonus to rare+ fish
  if (stoneBonus > 0) {
    ['rare', 'epic', 'legendary', 'mythic'].forEach(rarity => {
      if (chances[rarity]) {
        chances[rarity] += stoneBonus;
      }
    });
  }
  
  return chances;
}

// Get effective stats (considering stone maxStats buff)
function getEffectiveStats(fishingStats, activeStone) {
  if (activeStone && activeStone.maxStats) {
    return {
      range: { level: 5, progress: 0 },
      efficiency: { level: 5, progress: 0 },
      strength: { level: 5, progress: 0 }
    };
  }
  return fishingStats;
}

// Get reel duration based on efficiency level
function getReelDuration(efficiencyLevel) {
  const durations = [8000, 7000, 6000, 5000, 4000, 3000];
  return durations[efficiencyLevel] || 8000;
}

// Get rope snap chance reduction based on efficiency level
function getRopeSnapReduction(efficiencyLevel) {
  const reductions = [0, 0.25, 0.30, 0.30, 0.35, 0.40];
  return reductions[efficiencyLevel] || 0;
}

// Get strength bonus based on strength level
function getStrengthBonus(strengthLevel) {
  const bonuses = [0.5, 3, 7, 17, 22, 28];
  return bonuses[strengthLevel] || 0.5;
}

// Format time remaining
function formatTimeRemaining(ms) {
  if (ms < 1000) return `${Math.ceil(ms / 100) / 10}s`;
  return `${Math.ceil(ms / 1000)}s`;
}

// **NEW: Helper function to add items to inventory using 50-slot system**
async function addItemToInventory(userId, itemId, quantity, db) {
  try {
    const dbInstance = await db.getDB();
    const usersCollection = dbInstance.collection('users');
    
    const user = await usersCollection.findOne({ userId });
    if (!user || !user.items) return false;

    // Find first empty slot
    let emptySlot = -1;
    for (let slot = 0; slot < user.items.length; slot++) {
      if (user.items[slot] === null || user.items[slot] === undefined) {
        emptySlot = slot;
        break;
      }
    }
    
    if (emptySlot === -1) {
      console.log(`No empty inventory slots for user ${userId}`);
      return false;
    }
    
    const itemConfig = itemsConfig.items[itemId];
    if (!itemConfig) {
      console.log(`Unknown item ID: ${itemId}`);
      return false;
    }
    
    const itemData = {
      id: itemId,
      name: itemConfig.name,
      emoji: itemConfig.emoji,
      amount: quantity,
      addedAt: new Date(),
      source: 'fishing_stone'
    };
    
    await usersCollection.updateOne(
      { userId },
      { $set: { [`items.${emptySlot}`]: itemData } }
    );
    
    return true;
    
  } catch (error) {
    console.error('Error adding item to inventory:', error);
    return false;
  }
}

// **FIXED: Handle item drops from stones using new inventory system**
async function handleItemDrops(userId, activeStone, db) {
  if (!activeStone || !activeStone.itemDrops) return [];
  
  const droppedItems = [];
  
  for (const [tierName, tier] of Object.entries(activeStone.itemDrops)) {
    if (Math.random() * 100 < tier.chance) {
      const randomItem = tier.items[Math.floor(Math.random() * tier.items.length)];
      
      // **FIXED: Use new inventory system instead of old db.addItem**
      const success = await addItemToInventory(userId, randomItem, 1, db);
      
      if (success) {
        droppedItems.push({
          id: randomItem,
          name: itemsConfig.items[randomItem].name,
          emoji: itemsConfig.items[randomItem].emoji
        });
      } else {
        console.log(`Failed to add stone drop ${randomItem} to inventory for user ${userId} - inventory might be full`);
      }
    }
  }
  
  return droppedItems;
}

module.exports = {
  name: 'fish',
  description: 'Go fishing to catch lake collectibles (costs 100 Lux). 10 second cooldown.',
  async execute(message, args, db) {
    const userId = message.author.id;
    const username = message.author.username;

    try {
      // **FIXED: Ensure user has proper inventory structure before proceeding**
      let user = await db.getUser(userId);
      if (!user) {
        return message.reply('❌ Please accept the Terms of Service first!');
      }

      // **FIXED: Repair inventory structure if corrupted**
      if (!Array.isArray(user.items) || user.items.length !== 50) {
        await db.repairUserInventory(userId);
        user = await db.getUser(userId); // Refresh user data
      }

      // **FIXED: Validate numeric fields**
      if (typeof user.balance !== 'number') {
        await db.updateUser(userId, { balance: 0 });
        user.balance = 0;
      }

      // Check cooldown (10 seconds)
      const now = Date.now();
      const cooldownAmount = 10 * 1000;
      
      if (fishCooldowns.has(userId)) {
        const lastUsed = fishCooldowns.get(userId);
        const timeLeft = (lastUsed + cooldownAmount) - now;
        
        if (timeLeft > 0) {
          const timeRemaining = formatTimeRemaining(timeLeft);
          return message.reply(`🎣 You need to wait **${timeRemaining}** before fishing again!`);
        }
      }

      // Set cooldown
      fishCooldowns.set(userId, now);
      setTimeout(() => fishCooldowns.delete(userId), cooldownAmount);

      // Check Lux balance
      if (user.balance < 100) {
        return message.reply('You need at least 100 Lux to fish!');
      }

      // Initialize fishing stats if they don't exist
      if (!user.fishingStats) {
        await db.updateUser(userId, {
          fishingStats: {
            range: { level: 0, progress: 0 },
            efficiency: { level: 0, progress: 0 },
            strength: { level: 0, progress: 0 }
          }
        });
        user.fishingStats = {
          range: { level: 0, progress: 0 },
          efficiency: { level: 0, progress: 0 },
          strength: { level: 0, progress: 0 }
        };
      }

      // Get active stone buff
      const activeStone = getActiveStone(user.fishingBuffs);
      const effectiveStats = getEffectiveStats(user.fishingStats, activeStone);

      // Deduct Lux
      const newBalance = user.balance - 100;
      await db.updateUser(userId, { balance: newBalance });

      // Update quest progress
      await db.updateQuestProgress(userId, 'use_fish');

      // Phase 1: Initial fishing animation
      const fishingEmbed = new EmbedBuilder()
        .setTitle('🎣 Fishing...')
        .setDescription(
          `🫧🫧🫧🫧🫧${activeStone ? `\n✨ **${activeStone.name}** is active! (${activeStone.remaining} uses left)` : ''}`
        )
        .setImage(FISHING_GIF_URL)
        .setColor('#32CD32')
        .setFooter({ text: `Fishing by ${username}` });

      const msg = await message.channel.send({ embeds: [fishingEmbed] });

      // Wait 2 seconds for initial animation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Phase 2: Check if fish is detected (with stone bonus)
      const baseFishDetectionChance = 70;
      const stoneFishBonus = activeStone ? activeStone.fishChanceBonus : 0;
      const finalFishDetectionChance = baseFishDetectionChance + stoneFishBonus;
      const fishDetected = Math.random() * 100 < finalFishDetectionChance;

      if (!fishDetected) {
        const noFishEmbed = new EmbedBuilder()
          .setTitle('🎣 No Fish Found')
          .setDescription('No fish in this area... Try again!')
          .setColor('#FF6B6B')
          .setFooter({ text: `Fished by ${username}` });

        await msg.edit({ embeds: [noFishEmbed] });
        return;
      }

      // Continue with reeling process...
      const reelDuration = getReelDuration(effectiveStats.efficiency.level);
      const reelSteps = Math.ceil(reelDuration / 1000);
      
      const catchChances = getCatchChances(effectiveStats.range.level, activeStone ? activeStone.rarityBonus : 0);
      const totalWeight = Object.values(catchChances).reduce((sum, chance) => sum + chance, 0);
      
      // Determine multiple fish catches based on stone multiplier
      const fishMultiplier = activeStone ? activeStone.multiplier : 1;
      const caughtFish = [];
      
      for (let i = 0; i < fishMultiplier; i++) {
        const roll = Math.random() * totalWeight;
        let cumulativeWeight = 0;
        
        for (const [rarity, weight] of Object.entries(catchChances)) {
          cumulativeWeight += weight;
          if (roll <= cumulativeWeight) {
            const caughtItem = LAKE_ITEMS[rarity][Math.floor(Math.random() * LAKE_ITEMS[rarity].length)];
            caughtFish.push({ item: caughtItem, rarity, emoji: ITEM_EMOJIS[caughtItem] });
            break;
          }
        }
      }

      // Reeling animation
      for (let step = 0; step < reelSteps; step++) {
        const progress = (step + 1) / reelSteps;
        const filledBars = Math.floor(progress * 16);
        const emptyBars = 16 - filledBars;
        const progressBar = '■'.repeat(filledBars) + '□'.repeat(emptyBars);

        const reelingEmbed = new EmbedBuilder()
          .setTitle('🎣 Reeling in the fish...')
          .setDescription(`\`[${progressBar}]\`\nDon't let it get away!`)
          .setColor('#FFD93D')
          .setFooter({ text: `Reeling by ${username}` });

        await msg.edit({ embeds: [reelingEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Calculate escape chances for all fish
      const baseEscapeChance = 15;
      const ropeSnapReduction = getRopeSnapReduction(effectiveStats.efficiency.level);
      const strengthBonus = getStrengthBonus(effectiveStats.strength.level);
      
      const escapedFish = caughtFish.filter(fish => {
        const difficultyMap = { common: 1, uncommon: 1.2, rare: 1.5, epic: 2, legendary: 2.5, mythic: 3 };
        const difficultyMultiplier = difficultyMap[fish.rarity];
        let escapeChance = (baseEscapeChance * difficultyMultiplier) - ropeSnapReduction - strengthBonus;
        escapeChance = Math.max(5, Math.min(95, escapeChance));
        return Math.random() * 100 < escapeChance;
      });

      const successfulCatches = caughtFish.filter(fish => !escapedFish.includes(fish));

      if (successfulCatches.length === 0) {
        const escapeEmbed = new EmbedBuilder()
          .setTitle('🎣 All Fish Escaped!')
          .setDescription('All the fish got away! Better luck next time!')
          .setColor('#FF4444')
          .setFooter({ text: `Fished by ${username}` });

        await msg.edit({ embeds: [escapeEmbed] });
        return;
      }

      // Add all caught fish to collectibles
      let totalManaReward = 0;
      const manaRewards = { common: 5, uncommon: 10, rare: 20, epic: 35, legendary: 50, mythic: 75 };
      
      for (const fish of successfulCatches) {
        await db.addCollectible(userId, fish.item, fish.rarity);
        totalManaReward += manaRewards[fish.rarity] || 5;
      }

      await db.addManaPoints(userId, totalManaReward);

      // **FIXED: Handle item drops from stones using new inventory system**
      const droppedItems = await handleItemDrops(userId, activeStone, db);

      // Update stone usage counter
      if (activeStone) {
        const newFishingBuffs = { ...user.fishingBuffs };
        newFishingBuffs[activeStone.id].remaining -= 1;
        
        if (newFishingBuffs[activeStone.id].remaining <= 0) {
          newFishingBuffs[activeStone.id].active = false;
        }
        
        await db.updateUser(userId, { fishingBuffs: newFishingBuffs });
      }

      // Create success embed
      const fishList = successfulCatches.map(fish => `${fish.emoji} **${fish.item}** (${fish.rarity})`).join('\n');
      const itemDropsList = droppedItems.length > 0 ? 
        droppedItems.map(item => `${item.emoji} **${item.name}**`).join('\n') : '';

      const successEmbed = new EmbedBuilder()
        .setTitle(`🎉 Caught ${successfulCatches.length} Fish!`)
        .setDescription(
          `${fishList}\n\n` +
          `**Rewards:**\n` +
          `🔮 +${totalManaReward} Mana Points\n` +
          `💎 Balance: ${newBalance.toLocaleString()} LUX\n` +
          (itemDropsList ? `\n**Bonus Items:**\n${itemDropsList}\n` : '') +
          (activeStone && activeStone.remaining - 1 <= 0 ? `\n⚠️ **${activeStone.name}** has expired!` : '') +
          `\n\nCheck your lake with \`X lake\`!`
        )
        .setColor('#00FF7F')
        .setFooter({ text: `Caught by ${username}` });

      await msg.edit({ embeds: [successEmbed] });

      console.log(`User ${userId} caught ${successfulCatches.length} fish with ${activeStone ? activeStone.name : 'no stone'}`);

    } catch (error) {
      console.error(`Error in fish command: ${error.message}`);
      await message.reply('❌ Error while fishing. Try again later!');
    }
  },
};
