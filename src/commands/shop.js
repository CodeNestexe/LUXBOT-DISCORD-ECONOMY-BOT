const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'shop',
  aliases: [],
  async execute(message, args, db) {
    try {
      // Check if user exists and has proper structure
      const user = await db.getUser(message.author.id);
      if (!user) {
        return message.reply('❌ Please accept the Terms of Service first by using any LuxBot command!');
      }
      
      // Ensure user has proper inventory structure
      await ensureUserInventory(message.author.id, db);
      
      // Get current shop items from database
      const currentShopItems = await getCurrentShopItems(db);
      
      // Build embed description
      let description = 'Use your Lux and Mana Crystals to purchase items!\n- **`X buy {id}`** to buy items\n════════════════════════════════\n';
      
      currentShopItems.forEach(item => {
        const priceEmoji = item.priceType === 'lux' ? '<:lux:1411637514569252894>' : '<a:crystals:1379010491762081933>';
        const amountText = item.amount > 1 ? ` x${item.amount}` : '';
        
        // **🔧 FIXED: Backward compatibility for old shop data**
        const basePrice = item.basePrice || item.price || 0;
        const totalPrice = basePrice * (item.amount || 1);
        
        description += `\`${item.id}\` ${item.emoji} **${item.name}**${amountText} \`-------------------- ${totalPrice.toLocaleString()}\` ${priceEmoji}\n`;
      });
      
      // Calculate time left until next reset
      const timeLeft = getTimeLeftUntilReset();
      
      const embed = new EmbedBuilder()
        .setTitle('Lux Shop')
        .setDescription(description)
        .setColor('#FFD700')
        .setFooter({ text: `Shop will be reset in ${timeLeft}` })
        .setTimestamp();
        
      await message.channel.send({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in shop command:', error);
      await message.reply(`Error displaying shop: ${error.message}`);
    }
  },
};

// Ensure user has proper inventory structure
async function ensureUserInventory(userId, db) {
  try {
    const dbInstance = await db.getDB();
    const user = await dbInstance.collection('users').findOne({ userId });
    
    if (!user) {
      console.log(`User ${userId} not found for inventory check`);
      return;
    }
    
    let needsUpdate = false;
    const updates = {};
    
    // Fix inventory structure
    if (!Array.isArray(user.items) || user.items.length !== 50) {
      updates.items = Array(50).fill(null);
      needsUpdate = true;
    }
    
    // Ensure numeric fields are properly typed
    if (typeof user.balance !== 'number') {
      updates.balance = 0;
      needsUpdate = true;
    }
    
    if (typeof user.manaCrystals !== 'number') {
      updates.manaCrystals = 0;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await dbInstance.collection('users').updateOne(
        { userId },
        { $set: updates }
      );
      console.log(`Fixed inventory structure for user ${userId}`);
    }
    
  } catch (error) {
    console.error('Error ensuring user inventory:', error);
  }
}

// Get current shop items from database (or generate if new reset)
async function getCurrentShopItems(db) {
  const dbInstance = await db.getDB();
  const shopCollection = dbInstance.collection('currentShop');
  
  const currentResetPeriod = getCurrentResetPeriod();
  
  // Check if we have shop items for current reset period
  let shopData = await shopCollection.findOne({ resetPeriod: currentResetPeriod });
  
  if (!shopData) {
    // Generate new shop items for this reset period
    const newItems = generateShopItems();
    
    shopData = {
      resetPeriod: currentResetPeriod,
      items: newItems,
      generatedAt: new Date()
    };
    
    // Save to database
    await shopCollection.insertOne(shopData);
    
    // Clean up old shop data (optional)
    await shopCollection.deleteMany({ resetPeriod: { $ne: currentResetPeriod } });
  }
  
  return shopData.items;
}

// **🔧 FIXED: Shop generation with proper pricing per item**
function generateShopItems() {
  const itemConfig = [
    {
      id: '001',
      emoji: '<a:crystals:1379010491762081933>',
      name: 'Mana Crystals',
      weight: 100,
      priceType: 'lux',
      basePrice: 9999, // Price per crystal
      minAmount: 1,
      maxAmount: 3,
      isCurrency: true
    },
    {
      id: '010',
      emoji: '<a:lux_backgrounds:1377824626733744189>',
      name: 'Background 010',
      weight: 55,
      priceType: 'crystals',
      basePrice: 99, // Price per background
    },
    {
      id: '011',
      emoji: '<a:lux_backgrounds:1377824626733744189>',
      name: 'Background 011',
      weight: 54,
      priceType: 'crystals',
      basePrice: 99, // Price per background
    },
    {
      id: '008',
      emoji: '<a:mana_crate:1375388724950728764>',
      name: 'Mana Crate',
      weight: 50,
      priceType: 'lux',
      basePrice: 99999, // Price per crate
      minAmount: 1,
      maxAmount: 5,
    },
    {
      id: '007',
      emoji: '<a:magic_crate:1375391772699656203>',
      name: 'Magic Crate',
      weight: 40,
      priceType: 'crystals',
      basePrice: 99, // Price per crate
      minAmount: 1,
      maxAmount: 5,
    },
    {
      id: '013',
      emoji: '<:basic_stone:1410589277494186044>',
      name: 'Basic Stone',
      weight: 60,
      priceType: 'crystals',
      basePrice: 2, // Price per stone
    },
    {
      id: '014',
      emoji: '<:adept_stone:1410589320263368774>',
      name: 'Adept Stone',
      weight: 57,
      priceType: 'crystals',
      basePrice: 5, // Price per stone
    },
    {
      id: '015',
      emoji: '<:master_stone:1410589354660728922>',
      name: 'Master Stone',
      weight: 38,
      priceType: 'crystals',
      basePrice: 9, // Price per stone
    },
    {
      id: '012',
      emoji: '<a:mana_zone:1376890534806683758>',
      name: 'Mana Zone',
      weight: 1,
      priceType: 'crystals',
      basePrice: 249, // Price per mana zone
    }
  ];
  
  const selectedItems = [];
  
  // Always add Mana Crystals as purchasable currency
  const crystalItem = itemConfig.find(item => item.id === '001');
  const crystalAmount = getRandomInt(crystalItem.minAmount, crystalItem.maxAmount);
  
  selectedItems.push({
    id: crystalItem.id,
    emoji: crystalItem.emoji,
    name: crystalItem.name,
    amount: crystalAmount,
    basePrice: crystalItem.basePrice, // Store base price
    priceType: crystalItem.priceType,
    isCurrency: true
  });
  
  // Randomly select 4 more items (excluding Mana Crystals)
  const remainingItems = itemConfig.filter(item => item.id !== '001');
  const possibleItems = [];
  
  remainingItems.forEach(item => {
    if (Math.random() * 100 < item.weight) {
      possibleItems.push(item);
    }
  });
  
  const shuffled = possibleItems.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 4);
  
  selected.forEach(item => {
    const amount = item.minAmount ? getRandomInt(item.minAmount, item.maxAmount) : 1;
    
    selectedItems.push({
      id: item.id,
      emoji: item.emoji,
      name: item.name,
      amount: amount,
      basePrice: item.basePrice, // Store base price
      priceType: item.priceType,
    });
  });
  
  return selectedItems;
}

function getCurrentResetPeriod() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const resetPeriod = Math.floor(utcHours / 6);
  return `${now.toISOString().split('T')[0]}_${resetPeriod}`;
}

function getTimeLeftUntilReset() {
  const now = new Date();
  
  // Calculate current 6-hour period (0, 6, 12, 18)
  const currentUtcHour = now.getUTCHours();
  const currentPeriod = Math.floor(currentUtcHour / 6);
  const nextPeriodStartHour = (currentPeriod + 1) * 6;
  
  // Create next reset time
  const nextReset = new Date(now);
  nextReset.setUTCMinutes(0, 0, 0); // Reset at exact hour
  
  if (nextPeriodStartHour >= 24) {
    // Next reset is tomorrow at 00:00 UTC
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    nextReset.setUTCHours(0);
  } else {
    // Next reset is today at nextPeriodStartHour
    nextReset.setUTCHours(nextPeriodStartHour);
  }
  
  // Calculate time difference
  const timeDiff = nextReset.getTime() - now.getTime();
  
  // Protection: If somehow we get negative time, show minimal time
  if (timeDiff <= 0) {
    return "0h 1m left";
  }
  
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  // Protection: Ensure we never show negative values
  const displayHours = Math.max(0, hours);
  const displayMinutes = Math.max(0, minutes);
  
  return `${displayHours}h ${displayMinutes}m left`;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
