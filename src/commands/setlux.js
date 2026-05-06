const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'setlux',
  aliases: ['setbalance', 'setbal'],
  async execute(message, args, db) {
    try {
      // ============================================
      // ADMIN CHECK (using .env)
      // ============================================
      const botOwnerId = process.env.BOT_OWNER_ID;
      const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
      const authorId = message.author.id;
      
      if (authorId !== botOwnerId && !adminIds.includes(authorId)) {
        return message.reply({
          content: '❌ This command is admin-only.',
        });
      }

      // ============================================
      // INPUT VALIDATION
      // ============================================
      if (!args[0] || !args[1]) {
        return message.reply({
          content: '❌ Usage: `X setlux {amount} @user` or `X setlux {amount} {userId}`\n' +
                   'Example: `X setlux 22000000 @user`\n' +
                   'Example: `X setlux 1000000 123456789`',
        });
      }

      // Parse amount (first argument)
      const newBalance = parseInt(args[0]);
      
      // Validate amount
      if (isNaN(newBalance)) {
        return message.reply({
          content: '❌ Invalid amount. Must be a number.\n' +
                   'Example: `X setlux 22000000 @user`',
        });
      }

      if (newBalance < 0) {
        return message.reply({
          content: '❌ Amount cannot be negative.\n' +
                   'Use a positive number.',
        });
      }

      // Safety limit: 1 trillion LUX max
      const MAX_BALANCE = 1000000000000; // 1 trillion
      if (newBalance > MAX_BALANCE) {
        return message.reply({
          content: '❌ Amount exceeds maximum limit!\n' +
                   'Maximum: ' + MAX_BALANCE.toLocaleString() + ' LUX\n' +
                   'Requested: ' + newBalance.toLocaleString() + ' LUX',
        });
      }

      // Get target user
      let targetUserId;
      let targetUser;
      
      if (args[1]) {
        // Check if mention
        const mentionedUser = message.mentions.users.first();
        if (mentionedUser) {
          targetUserId = mentionedUser.id;
          targetUser = mentionedUser;
        } else {
          targetUserId = args[1];
          // Try to fetch user
          try {
            targetUser = await message.client.users.fetch(targetUserId);
          } catch (error) {
            // User not found, continue anyway
          }
        }
      } else {
        return message.reply({
          content: '❌ Please specify a user.\n' +
                   'Example: `X setlux 22000000 @user`',
        });
      }

      // ============================================
      // VERIFY USER EXISTS IN DATABASE
      // ============================================
      const user = await db.getUser(targetUserId);
      
      if (!user) {
        return message.reply({
          content: '❌ User not found in database.\n' +
                   'User ID: `' + targetUserId + '`\n' +
                   'They may need to register first with `X tos accept`',
        });
      }

      // Store old balance for logging
      const oldBalance = user.balance || 0;

      // ============================================
      // ATOMIC BALANCE UPDATE (100% SAFE)
      // ============================================
      await db.updateUser(targetUserId, { balance: newBalance });

      // ============================================
      // VERIFY UPDATE SUCCEEDED
      // ============================================
      const updatedUser = await db.getUser(targetUserId);
      const actualNewBalance = updatedUser.balance;

      // Check if update was successful
      if (actualNewBalance !== newBalance) {
        console.error('⚠️ Balance update verification failed!');
        console.error('   Expected: ' + newBalance);
        console.error('   Actual: ' + actualNewBalance);
        
        return message.reply({
          content: '⚠️ Balance update may have failed!\n' +
                   'Expected: ' + newBalance.toLocaleString() + ' LUX\n' +
                   'Actual: ' + actualNewBalance.toLocaleString() + ' LUX\n' +
                   'Please check the database.',
        });
      }

      // Calculate difference
      const difference = newBalance - oldBalance;
      const differenceText = difference >= 0 
        ? '+' + difference.toLocaleString() + ' LUX' 
        : difference.toLocaleString() + ' LUX';

      // ============================================
      // SUCCESS EMBED (FIXED - NO NESTED TEMPLATE LITERALS!)
      // ============================================
      
      // STEP 1: Create user display string first
      const userDisplay = targetUser ? '<@' + targetUserId + '>' : '`' + targetUserId + '`';
      
      // STEP 2: Use simple string concatenation (NO template literals in description!)
      const embed = new EmbedBuilder()
        .setTitle('💰 Balance Updated Successfully')
        .setDescription(
          '**User:** ' + userDisplay + '\n' +
          '**Old Balance:** ' + oldBalance.toLocaleString() + ' <:lux:1411637514569252894>\n' +
          '**New Balance:** ' + newBalance.toLocaleString() + ' <:lux:1411637514569252894>\n' +
          '**Difference:** ' + differenceText
        )
        .setColor('#FFD700')
        .setFooter({ text: 'Admin: ' + message.author.tag + ' | Action logged' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // ============================================
      // CONSOLE LOGGING (AUDIT TRAIL)
      // ============================================
      console.log('💰 ADMIN BALANCE UPDATE');
      console.log('   Admin: ' + message.author.tag + ' (' + message.author.id + ')');
      console.log('   Target: ' + (targetUser ? targetUser.tag : targetUserId) + ' (' + targetUserId + ')');
      console.log('   Old Balance: ' + oldBalance.toLocaleString() + ' LUX');
      console.log('   New Balance: ' + newBalance.toLocaleString() + ' LUX');
      console.log('   Difference: ' + differenceText);
      console.log('   Timestamp: ' + new Date().toISOString());

    } catch (error) {
      console.error('❌ Error in setlux command:', error);
      console.error('Stack trace:', error.stack);
      
      await message.reply({
        content: '❌ Error updating balance: ' + error.message,
      }).catch(() => {});
    }
  },
};