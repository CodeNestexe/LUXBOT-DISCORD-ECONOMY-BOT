const { EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
  name: 'voucher',
  aliases: [],
  async execute(message, args, db) {
    try {
      // Check if the user is an admin or bot owner
      const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
      const ownerId = process.env.BOT_OWNER_ID ? process.env.BOT_OWNER_ID.toString().trim() : '';
      const userId = message.author.id.toString().trim();

      if (!adminIds.includes(userId) && userId !== ownerId) {
        return await message.reply('🚫 This command is only for admins and the bot owner.');
      }

      if (args.length < 3) {
        const helpEmbed = new EmbedBuilder()
          .setTitle('🎫 Voucher Creation Commands')
          .setDescription('Create different types of vouchers for users to redeem:')
          .addFields(
            { name: '💰 LUX Voucher', value: '`X voucher lux {code} {amount} {user_limit}`\nExample: `X voucher lux PAYDAY 50000 100`', inline: false },
            { name: '💎 Mana Crystals', value: '`X voucher mc {code} {amount} {user_limit}`\nExample: `X voucher mc CRYSTAL 25 50`', inline: false },
            { name: '🚀 2x Level XP Boost', value: '`X voucher 2x {code} {duration} {user_limit}`\nExample: `X voucher 2x BOOST 30m 10`', inline: false }
          )
          .setColor('#FF6B35')
          .setFooter({ text: 'Duration format: 30m, 1h, 2d, etc.' })
          .setTimestamp();

        return await message.reply({ embeds: [helpEmbed] });
      }

      const type = args[0].toLowerCase();
      const dbInstance = await db.getDB();
      const vouchersCollection = dbInstance.collection('vouchers');
      let voucher = {};

      if (type === 'lux') {
        // X voucher lux {code} {amount} {user_limit}
        if (args.length !== 4) {
          return await message.reply('❌ Usage: `X voucher lux {code} {amount} {user_limit}`\nExample: `X voucher lux PAYDAY 50000 100`');
        }

        const code = args[1].toUpperCase();
        const amount = parseInt(args[2], 10);
        const limit = parseInt(args[3], 10);

        // Validate inputs
        if (!code || !/^[A-Z0-9]+$/.test(code)) {
          return await message.reply('❌ Code must be alphanumeric and uppercase (e.g., PAYDAY).');
        }
        if (isNaN(amount) || amount <= 0) {
          return await message.reply('❌ LUX amount must be a positive number.');
        }
        if (isNaN(limit) || limit <= 0) {
          return await message.reply('❌ User limit must be a positive number.');
        }

        // Check if active voucher with same code exists
        const existingVoucher = await vouchersCollection.findOne({ code, type: 'lux', isActive: true });
        if (existingVoucher) {
          return await message.reply(`❌ An active LUX voucher with code \`${code}\` already exists.`);
        }

        voucher = {
          code,
          type: 'lux',
          value: amount,
          limit,
          redeemedCount: 0,
          redeemedUsers: [],
          createdAt: new Date(),
          expiresAt: null,
          isActive: true,
        };

      } else if (type === 'mc') {
        // X voucher mc {code} {amount} {user_limit}
        if (args.length !== 4) {
          return await message.reply('❌ Usage: `X voucher mc {code} {amount} {user_limit}`\nExample: `X voucher mc CRYSTAL 25 50`');
        }

        const code = args[1].toUpperCase();
        const amount = parseInt(args[2], 10);
        const limit = parseInt(args[3], 10);

        // Validate inputs
        if (!code || !/^[A-Z0-9]+$/.test(code)) {
          return await message.reply('❌ Code must be alphanumeric and uppercase (e.g., CRYSTAL).');
        }
        if (isNaN(amount) || amount <= 0) {
          return await message.reply('❌ Mana Crystals amount must be a positive number.');
        }
        if (isNaN(limit) || limit <= 0) {
          return await message.reply('❌ User limit must be a positive number.');
        }

        // Check if active voucher with same code exists
        const existingVoucher = await vouchersCollection.findOne({ code, type: 'mc', isActive: true });
        if (existingVoucher) {
          return await message.reply(`❌ An active Mana Crystals voucher with code \`${code}\` already exists.`);
        }

        voucher = {
          code,
          type: 'mc',
          value: amount,
          limit,
          redeemedCount: 0,
          redeemedUsers: [],
          createdAt: new Date(),
          expiresAt: null,
          isActive: true,
        };

      } else if (type === '2x') {
        // X voucher 2x {code} {duration} {user_limit}
        if (args.length !== 4) {
          return await message.reply('❌ Usage: `X voucher 2x {code} {duration} {user_limit}`\nExample: `X voucher 2x BOOST 30m 10`');
        }

        const code = args[1].toUpperCase();
        const duration = args[2];
        const limit = parseInt(args[3], 10);

        // Validate inputs
        if (!code || !/^[A-Z0-9]+$/.test(code)) {
          return await message.reply('❌ Code must be alphanumeric and uppercase (e.g., BOOST).');
        }
        const durationMs = ms(duration);
        if (!durationMs || durationMs <= 0) {
          return await message.reply('❌ Duration must be valid (e.g., 30m, 1h, 2d).');
        }
        if (isNaN(limit) || limit <= 0) {
          return await message.reply('❌ User limit must be a positive number.');
        }

        // Check if active voucher with same code exists
        const existingVoucher = await vouchersCollection.findOne({ code, type: '2x', isActive: true });
        if (existingVoucher) {
          return await message.reply(`❌ An active 2x XP voucher with code \`${code}\` already exists.`);
        }

        voucher = {
          code,
          type: '2x',
          value: duration,
          limit,
          redeemedCount: 0,
          redeemedUsers: [],
          createdAt: new Date(),
          expiresAt: null,
          isActive: true,
        };

      } else {
        return await message.reply('❌ Invalid voucher type! Use `lux`, `mc`, or `2x`.');
      }

      // Save the voucher to the database
      await vouchersCollection.insertOne(voucher);

      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('🎫 Voucher Created Successfully!')
        .setDescription(`Your voucher has been created and is ready for redemption!`)
        .addFields(
          { name: '🏷️ Code', value: `\`${voucher.code}\``, inline: true },
          { name: '📦 Type', value: voucher.type === 'lux' ? '💰 LUX Coins' : voucher.type === 'mc' ? '💎 Mana Crystals' : '🚀 2x Level XP Boost', inline: true },
          { name: '🎁 Value', value: voucher.type === 'lux' ? `${voucher.value.toLocaleString()} <:lux:1411637514569252894>` : voucher.type === 'mc' ? `${voucher.value} <a:crystals:1379010491762081933>` : voucher.value, inline: true },
          { name: '👥 User Limit', value: `${voucher.limit} users`, inline: true },
          { name: '📅 Created', value: new Date().toLocaleDateString(), inline: true },
          { name: '⏰ Expires', value: voucher.expiresAt ? voucher.expiresAt.toLocaleString() : 'Never', inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: 'Users can redeem with: X redeem <code>' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Log the action
      console.log(`[VOUCHER CREATED] ${message.author.tag} created ${voucher.type} voucher: ${voucher.code} (Value: ${voucher.value}, Limit: ${voucher.limit})`);

    } catch (error) {
      console.error('Error in voucher command:', error);
      await message.reply(`❌ **Error:** ${error.message}`);
    }
  },
};
