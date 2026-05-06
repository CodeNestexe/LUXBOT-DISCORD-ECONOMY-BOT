module.exports = {
  name: 'sell',
  aliases: ['sacrifice'],
  description: 'Sell or sacrifice items for Lux or Mana Crystals.',
  async execute(message, args, db) {
    const userId = message.author.id;

    try {
      if (args.length < 1) return message.reply('Usage: X sell <item_name> | X sell all | X sacrifice <item_name> | X sacrifice all');

      let user = await db.getUser(userId); // Use db.getUser
      let collectibles = await db.getCollectibles(userId); // Use db.getCollectibles

      // Log initial state for debugging
      console.log(`[Sell] Initial user data for ${userId}:`, JSON.stringify(user));
      console.log(`[Sell] Initial collectibles for ${userId}:`, JSON.stringify(collectibles));

      // Define item values based on rarity (UPDATED PRICES)
      const itemValues = {
        common: { lux: 50, mana: 1 },
        uncommon: { lux: 200, mana: 2 },
        rare: { lux: 1000, mana: 5 },
        epic: { lux: 5000, mana: 20 },
        legendary: { lux: 25000, mana: 50 },
        mythic: { lux: 100000, mana: 200 },
        special: { lux: 500000, mana: 300 },
      };

      // Rarity emojis for display in "sell all" and "sacrifice all" (UPDATED WITH MYTHIC)
      const rarityEmojis = {
        common: '<:lux_common:1361981676389138495>',
        uncommon: '<:lux_uncommon:1361982968989618176>',
        rare: '<:lux_rare:1361983821561729167>',
        epic: '<:lux_epic:1361984909370986637>',
        legendary: '<:lux_legendary:1361985377996374026>',
        mythic: '<:mythic:1407963167652577320>',
        special: '<:special:1426233280956727507>',
      };

      // Lake item emojis mapping (UPDATED FOR NEW LAKE ITEMS)
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

      // Normalize item name (convert to title case for consistency)
      const normalizeItemName = (name) => {
        return name
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };

      // Ensure collectibles entries are not removed when quantity is 0
      const updatedCollectibles = { ...collectibles }; // Create a copy to ensure we don't lose entries

      // Determine the command name ("sell" or "sacrifice")
      const commandName = message.content.toLowerCase().includes('sacrifice') ? 'sacrifice' : 'sell';
      const isSacrifice = commandName === 'sacrifice';
      const currencyType = isSacrifice ? 'Mana Crystal' : 'Lux'; // UPDATED TO MANA CRYSTALS

      // Handle "sell all" or "sacrifice all"
      if (args[0].toLowerCase() === 'all') {
        if (Object.keys(updatedCollectibles).length === 0) {
          return message.reply('Your lake is empty. Nothing to sell or sacrifice!');
        }

        // Calculate total items by rarity and total currency earned (UPDATED WITH MYTHIC)
        const rarityCounts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0, special: 0 };
        let totalCurrency = 0;

        for (const [itemName, data] of Object.entries(updatedCollectibles)) {
          const rarity = data.rarity || 'common';
          const quantity = data.quantity || 0;
          const currencyPerItem = itemValues[rarity]?.[isSacrifice ? 'mana' : 'lux'] || 0;
          totalCurrency += quantity * currencyPerItem;
          rarityCounts[rarity] += quantity;

          // Update quantity to 0 in the collectibles object (but keep the entry)
          updatedCollectibles[itemName].quantity = 0;
        }

        // Log collectibles before saving
        console.log(`[Sell] Collectibles before saving (sell all):`, JSON.stringify(updatedCollectibles));

        // Update user data based on command type
        if (isSacrifice) {
          await db.addManaCrystals(userId, totalCurrency); // UPDATED TO ADD MANA CRYSTALS
          // Save the updated collectibles to the database
          await db.updateUser(userId, {
            collectibles: updatedCollectibles,
            profile: user.profile || {},
            items: user.items || {},
            pets: user.pets || {},
            balance: user.balance || 0, // Ensure balance is preserved
          });
        } else {
          await db.updateUser(userId, {
            balance: (user.balance || 0) + totalCurrency,
            profile: user.profile || {},
            items: user.items || {},
            pets: user.pets || {},
            collectibles: updatedCollectibles,
          });
        }

        // Refresh user data for logging
        user = await db.getUser(userId);
        console.log(`[Sell] User data after update (sell all):`, JSON.stringify(user));

        // Build the rarity summary (UPDATED WITH MYTHIC)
        const raritySummary = Object.entries(rarityCounts)
          .filter(([_, count]) => count > 0)
          .map(([rarity, count]) => `${rarityEmojis[rarity]}${toSuperscript(count)}`)
          .join(' ');

        if (!raritySummary) {
          return message.reply('You have no items to sell or sacrifice!');
        }

        // Send response
        const actionVerb = isSacrifice ? 'sacrificed' : 'sold';
        await message.reply(`You ${actionVerb} ${raritySummary} for ${totalCurrency.toLocaleString()} ${currencyType}${totalCurrency !== 1 ? 's' : ''}!`);
      } else {
        // Handle "sell <item_name>" or "sacrifice <item_name>"
        const itemNameInput = args.join(' ').toUpperCase(); // Convert to uppercase for lake items

        // Find the item in collectibles (case-insensitive)
        let itemName = Object.keys(updatedCollectibles).find(
          key => key.toUpperCase() === itemNameInput
        );

        // If not found, try to match against the emoji name (custom emojis)
        if (!itemName) {
          const emojiMatch = Object.entries(itemEmojis).find(([itemKey, emoji]) => {
            const emojiName = emoji.match(/<:([^:]+):/)?.[1] || null;
            return emojiName && emojiName.toLowerCase() === itemNameInput.toLowerCase();
          });
          if (emojiMatch) {
            itemName = emojiMatch[0];
          }
        }

        if (!itemName) {
          return message.reply(`Item "${itemNameInput}" not found in your lake!`);
        }

        const itemData = updatedCollectibles[itemName];
        if (itemData.quantity <= 0) {
          return message.reply(`You don't have any ${itemName} to ${commandName}!`);
        }

        // Calculate currency earned for 1 item
        const rarity = itemData.rarity || 'common';
        const currencyPerItem = itemValues[rarity]?.[isSacrifice ? 'mana' : 'lux'] || 0;

        // Update item quantity (decrease by 1, keep entry even if 0)
        const newQuantity = itemData.quantity - 1;
        updatedCollectibles[itemName].quantity = newQuantity;

        // Log collectibles before saving
        console.log(`[Sell] Collectibles before saving (sell item):`, JSON.stringify(updatedCollectibles));

        // Update user data based on command type
        if (isSacrifice) {
          await db.addManaCrystals(userId, currencyPerItem); // UPDATED TO ADD MANA CRYSTALS
          // Save the updated collectibles to the database
          await db.updateUser(userId, {
            collectibles: updatedCollectibles,
            profile: user.profile || {},
            items: user.items || {},
            pets: user.pets || {},
            balance: user.balance || 0, // Ensure balance is preserved
          });
        } else {
          await db.updateUser(userId, {
            balance: (user.balance || 0) + currencyPerItem,
            profile: user.profile || {},
            items: user.items || {},
            pets: user.pets || {},
            collectibles: updatedCollectibles,
          });
        }

        // Refresh user data for logging
        user = await db.getUser(userId);
        console.log(`[Sell] User data after update (sell item):`, JSON.stringify(user));

        // Send response
        const actionVerb = isSacrifice ? 'sacrificed' : 'sold';
        await message.reply(`You ${actionVerb} ${itemName} for ${currencyPerItem.toLocaleString()} ${currencyType}${currencyPerItem !== 1 ? 's' : ''}!`);
      }
    } catch (error) {
      console.error(`Error in ${message.content.toLowerCase().includes('sacrifice') ? 'sacrifice' : 'sell'} command: ${error.message}`);
      await message.reply(`Error executing ${message.content.toLowerCase().includes('sacrifice') ? 'sacrifice' : 'sell'} command. Try again later!`);
    }
  },
};
