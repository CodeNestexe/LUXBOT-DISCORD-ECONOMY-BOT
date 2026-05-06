module.exports = {
  name: 'lake',
  description: 'View your lake collectibles gallery.',
  async execute(message, args, db) {
    const userId = message.author.id;
    const username = message.author.username;

    // Check for admin subcommand
    if (args.length >= 2 && args[0].toLowerCase() === 'addall') {
      // Check if user is bot owner or admin
      const BOT_OWNER_ID = process.env.BOT_OWNER_ID;
      const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
      
      const isAuthorized = message.author.id === BOT_OWNER_ID || ADMIN_IDS.includes(message.author.id);
      
      if (!isAuthorized) {
        return message.reply('❌ You do not have permission to use this admin command.');
      }

      const userMention = message.mentions.users.first();
      if (!userMention) {
        return message.reply('Usage: `X lake addall @user`');
      }

      const targetUserId = userMention.id;
      const lakeItems = [
        { name: 'C1', rarity: 'common' }, { name: 'C2', rarity: 'common' }, { name: 'C3', rarity: 'common' }, { name: 'C4', rarity: 'common' }, { name: 'C5', rarity: 'common' },
        { name: 'U1', rarity: 'uncommon' }, { name: 'U2', rarity: 'uncommon' }, { name: 'U3', rarity: 'uncommon' }, { name: 'U4', rarity: 'uncommon' }, { name: 'U5', rarity: 'uncommon' },
        { name: 'R1', rarity: 'rare' }, { name: 'R2', rarity: 'rare' }, { name: 'R3', rarity: 'rare' }, { name: 'R4', rarity: 'rare' }, { name: 'R5', rarity: 'rare' },
        { name: 'E1', rarity: 'epic' }, { name: 'E2', rarity: 'epic' }, { name: 'E3', rarity: 'epic' }, { name: 'E4', rarity: 'epic' }, { name: 'E5', rarity: 'epic' },
        { name: 'L1', rarity: 'legendary' }, { name: 'L2', rarity: 'legendary' }, { name: 'L3', rarity: 'legendary' }, { name: 'L4', rarity: 'legendary' }, { name: 'L5', rarity: 'legendary' },
        { name: 'M1', rarity: 'mythic' }, { name: 'M2', rarity: 'mythic' }, { name: 'M3', rarity: 'mythic' }, { name: 'M4', rarity: 'mythic' }, { name: 'M5', rarity: 'mythic' },
        { name: '2025_diwali', rarity: 'special' },
      ];

      try {
        for (const item of lakeItems) {
          await db.addCollectible(targetUserId, item.name, item.rarity);
        }
        await message.reply(`✅ Successfully added all ${lakeItems.length} lake items to ${userMention.username}'s inventory!`);
      } catch (error) {
        console.error('Error adding lake items:', error);
        await message.reply('❌ Failed to add lake items. Please try again.');
      }
      return;
    }

    try {
      const user = await db.getUser(userId);
      const collectibles = await db.getCollectibles(userId);

      // Rarity emojis
      const rarityEmojis = {
        common: '<:lux_common:1361981676389138495>',
        uncommon: '<:lux_uncommon:1361982968989618176>',
        rare: '<:lux_rare:1361983821561729167>',
        epic: '<:lux_epic:1361984909370986637>',
        legendary: '<:lux_legendary:1361985377996374026>',
        mythic: '<:mythic:1407963167652577320>',
        special: '<:special:1426233280956727507>',
      };

      // Item emojis
      const itemEmojis = {
        // Common
        'C1': '<:C1:1407418159878770718>',
        'C2': '<:C2:1407418494210936882>',
        'C3': '<:C3:1407543592129658890>',
        'C4': '<:C4:1407543889073668158>',
        'C5': '<:C5:1406502770017570866>',
        // Uncommon
        'U1': '<:U1:1407418626155348128>',
        'U2': '<:U2:1407421851671728290>',
        'U3': '<:U3:1407421741835485336>',
        'U4': '<:U4:1407543714716323962>',
        'U5': '<:U5:1407418578059132978>',
        // Rare
        'R1': '<:R1:1407418220310433873>',
        'R2': '<:R2:1407418351726366820>',
        'R3': '<:R3:1407421636009005086>',
        'R4': '<:R4:1407544027745751040>',
        'R5': '<:R5:1407544116861993012>',
        // Epic
        'E1': '<:E1:1407543672513232937>',
        'E2': '<:E2:1407543844488351744>',
        'E3': '<:E3:1407543936188285028>',
        'E4': '<:E4:1407544079230959707>',
        'E5': '<:E5:1407544155936133252>',
        // Legendary
        'L1': '<:L1:1407759486067937331>',
        'L2': '<:L2:1407759684273832007>',
        'L3': '<:L3:1407759742046310562>',
        'L4': '<:L4:1407760512007143425>',
        'L5': '<:L5:1407760608077811834>',
        // Mythic
        'M1': '<:M1:1407544298282549380>',
        'M2': '<:M2:1407544453874323546>',
        'M3': '<:M3:1407544506827538442>',
        'M4': '<:M4:1407544564792819793>',
        'M5': '<:M5:1407544618140045372>',
         // Special
        '2025_diwali': '<a:2025_diwali:1426174768373174302>',
      };

      // Define ONLY the valid lake items
      const validLakeItems = new Set([
        'C1', 'C2', 'C3', 'C4', 'C5',
        'U1', 'U2', 'U3', 'U4', 'U5',
        'R1', 'R2', 'R3', 'R4', 'R5',
        'E1', 'E2', 'E3', 'E4', 'E5',
        'L1', 'L2', 'L3', 'L4', 'L5',
        'M1', 'M2', 'M3', 'M4', 'M5', '2025_diwali'
      ]);

      // Unicode superscript characters
      const superscriptMap = {
        '0': '⁰',
        '1': '¹',
        '2': '²',
        '3': '³',
        '4': '⁴',
        '5': '⁵',
        '6': '⁶',
        '7': '⁷',
        '8': '⁸',
        '9': '⁹',
      };

      // Function to convert a number to superscript
      const toSuperscript = (num) => {
        return num.toString().split('').map(digit => superscriptMap[digit] || digit).join('');
      };

      // Group collectibles by rarity - ONLY include items that exist in collectibles (even with 0 quantity)
      const groupedByRarity = {
        common: [],
        uncommon: [],
        rare: [],
        epic: [],
        legendary: [],
        mythic: [],
        special: [],
      };

      // Filter: only items that have been caught before (exist in database) AND are valid lake items
      const caughtItems = Object.entries(collectibles).filter(([itemName, data]) => 
        validLakeItems.has(itemName) // Only valid lake items that have been caught before
      );

      caughtItems.forEach(([itemName, data]) => {
        const rarity = data.rarity || 'common';
        if (groupedByRarity[rarity]) {
          groupedByRarity[rarity].push({ itemName, data });
        }
      });

      // Check if user has any caught lake items
      const hasAnyCaughtItems = caughtItems.length > 0;

      // Build the lake description
      let description = `🪭🪸 **${username}'s Lake** 🪭🪸\n\n`;
      
      if (!hasAnyCaughtItems) {
        description += 'Your Lake Is Empty';
      } else {
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'special'];

        for (const rarity of rarityOrder) {
          const items = groupedByRarity[rarity];
          if (items.length > 0) {
            const rarityEmoji = rarityEmojis[rarity];
            
            // Sort items by name for consistent order
            items.sort((a, b) => a.itemName.localeCompare(b.itemName));
            
            const itemsText = items.map(({ itemName, data }) => {
              const itemEmoji = itemEmojis[itemName];
              const superscriptQuantity = toSuperscript(data.quantity);
              
              if (itemEmoji) {
                return `${itemEmoji}${superscriptQuantity}`;
              } else {
                // Fallback if emoji is missing
                console.warn(`Missing emoji for item: ${itemName}`);
                return `**${itemName}**${superscriptQuantity}`;
              }
            }).join(' ');
            
            if (itemsText.trim()) {
              description += `${rarityEmoji}  ${itemsText}\n`;
            }
          }
        }
      }

      // Send as plain text
      await message.channel.send(description);
    } catch (error) {
      console.error(`Error in lake command: ${error.message}`);
      await message.reply('Error opening your lake. Try again later!');
    }
  },
};
