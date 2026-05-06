const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { generateMineImage } = require('../utils/generateMineImage');
const gamblingDatabase = require('../gamblingDatabase');

module.exports = {
  name: 'mine',
  description: 'Play the Mine gambling game with a 3x3 grid (3 bombs, 6 safe picks). Use X mine endall to clear active games.',
  async execute(message, args, db) {
    const { getDB, getMineGame, startMineGame, updateMineGame, endMineGame, validateBet, getUser, updateUser, addManaPoints } = db;
    const userId = message.author.id;

    // Handle endall command
    if (args[0] && args[0].toLowerCase() === 'endall') {
      try {
        const dbInstance = await getDB();
        const result = await dbInstance.collection('mineGames').updateMany(
          { userId: userId, active: true },
          { $set: { active: false } }
        );
        await dbInstance.collection('mineGames').deleteMany({ userId: userId, active: false });
        await message.reply(`✅ Cleared ${result.modifiedCount} active Mine games.`);
      } catch (error) {
        console.error('Error clearing Mine games:', error);
        await message.reply('❌ Error clearing your Mine games.');
      }
      return;
    }

    // Validate bet amount
    if (!args[0] || isNaN(args[0]) || parseInt(args[0]) <= 0) {
      return message.reply('❌ Please provide a valid bet amount! Usage: `X mine <amount>` or `X mine endall`');
    }
    const bet = parseInt(args[0]);

    try {
      // Check for existing active game
      const existingGame = await getMineGame(userId);
      if (existingGame && existingGame.active) {
        return message.reply('❌ You already have an active Mine game! Finish it first or use `X mine endall`.');
      }

      // Validate user and bet
      await validateBet(userId, bet);
      await gamblingDatabase.deductBalance(userId, bet, true);

      // Award Mana Points for playing
      await addManaPoints(userId, 10);

      // Start new game
      let gameState = await startMineGame(userId, bet, 3);

      // Generate initial image
      const imageAttachment = await generateMineImage(
        gameState.grid,
        gameState.revealed,
        bet,
        gameState.multiplier,
        0
      );

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('💣 Mine Game 💣')
        .setDescription('Click a button (1-9) to reveal a tile. Avoid the 3 bombs!')
        .setColor('#FF4500')
        .setImage('attachment://mine-grid.png')
        .setFooter({ text: `Playing as ${message.author.username}` });

      // Create buttons
      const buttons = [];
      for (let i = 1; i <= 9; i++) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`mine_${i}_${userId}`)
            .setLabel(`${i}`)
            .setStyle(ButtonStyle.Secondary)
        );
      }
      const cashOutButton = new ButtonBuilder()
        .setCustomId(`cashout_${userId}`)
        .setLabel('💰 Cash Out')
        .setStyle(ButtonStyle.Success);

      // Arrange in rows
      const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 3));
      const row2 = new ActionRowBuilder().addComponents(buttons.slice(3, 6));
      const row3 = new ActionRowBuilder().addComponents(buttons.slice(6, 9));
      const row4 = new ActionRowBuilder().addComponents(cashOutButton);

      // Send game message
      const gameMessage = await message.channel.send({
        embeds: [embed],
        files: [imageAttachment],
        components: [row1, row2, row3, row4],
      });

      // Set up collector
      const filter = (interaction) => interaction.user.id === userId;
      const collector = gameMessage.createMessageComponentCollector({
        filter,
        time: 300000, // 5 minutes
      });

      // Multiplier table
      const multipliers = { 1: 1.5, 2: 2.2, 3: 3.5, 4: 6.0, 5: 12.0, 6: 30.0 };

      collector.on('collect', async (interaction) => {
        // IMMEDIATELY defer to prevent timeout
        await interaction.deferUpdate();

        try {
          // Get current game state
          const currentGame = await getMineGame(userId);
          if (!currentGame || !currentGame.active) {
            return await interaction.followUp({ 
              content: '❌ This game has already ended.',
              ephemeral: true
            });
          }

          if (interaction.customId.startsWith('mine_')) {
            // Handle tile click
            const tileNumber = parseInt(interaction.customId.split('_')[1]);
            const tileIndex = tileNumber - 1;

            if (currentGame.revealed[tileIndex]) {
              return await interaction.followUp({ 
                content: '❌ This tile is already revealed.',
                ephemeral: true
              });
            }

            // Reveal tile
            currentGame.revealed[tileIndex] = true;

            if (currentGame.grid[tileIndex] === 'bomb') {
              // Hit bomb - game over
              currentGame.active = false;
              await endMineGame(userId);

              const loseImage = await generateMineImage(
                currentGame.grid,
                currentGame.revealed,
                bet,
                currentGame.multiplier,
                0
              );

              const loseEmbed = new EmbedBuilder()
                .setTitle('💥 BOOM! 💥')
                .setDescription(`You hit a bomb and lost ${bet.toLocaleString()} <:lux:1411637514569252894>!\nBetter luck next time!`)
                .setColor('#FF0000')
                .setImage('attachment://mine-grid.png')
                .setFooter({ text: `Game over for ${message.author.username}` });

              await gameMessage.edit({
                embeds: [loseEmbed],
                files: [loseImage],
                components: []
              });

            } else {
              // Safe tile
              currentGame.safePicks += 1;
              currentGame.multiplier = multipliers[currentGame.safePicks] || 1.0;

              await updateMineGame(userId, {
                revealed: currentGame.revealed,
                safePicks: currentGame.safePicks,
                multiplier: currentGame.multiplier,
              });

              if (currentGame.safePicks === 6) {
                // Won the game - all safe tiles revealed
                currentGame.active = false;
                const finalWinnings = Math.floor(bet * currentGame.multiplier);
                
                // Apply Mana Zone bonus if active
                const adjustedWinnings = await gamblingDatabase.adjustBalanceWithManaZone(userId, finalWinnings, true);
                
                // Update user balance
                const user = await getUser(userId);
                await updateUser(userId, { balance: user.balance + adjustedWinnings });
                
                await endMineGame(userId);

                const winImage = await generateMineImage(
                  currentGame.grid,
                  currentGame.revealed,
                  bet,
                  currentGame.multiplier,
                  adjustedWinnings
                );

                const winEmbed = new EmbedBuilder()
                  .setTitle('🎉 VICTORY! 🎉')
                  .setDescription(
                    `You cleared the minefield!\n` +
                    `**Multiplier:** ${currentGame.multiplier}x\n` +
                    `**Winnings:** ${adjustedWinnings.toLocaleString()} <:lux:1411637514569252894>\n` +
                    `**New Balance:** ${(user.balance + adjustedWinnings).toLocaleString()} <:lux:1411637514569252894>`
                  )
                  .setColor('#00FF00')
                  .setImage('attachment://mine-grid.png')
                  .setFooter({ text: `Congratulations ${message.author.username}!` });

                await gameMessage.edit({
                  embeds: [winEmbed],
                  files: [winImage],
                  components: []
                });

              } else {
                // Continue playing
                const currentWinnings = Math.floor(bet * currentGame.multiplier);
                const continueImage = await generateMineImage(
                  currentGame.grid,
                  currentGame.revealed,
                  bet,
                  currentGame.multiplier,
                  currentWinnings
                );

                const continueEmbed = new EmbedBuilder()
                  .setTitle('💣 Mine Game 💣')
                  .setDescription(
                    `✅ Safe! Keep going or cash out.\n` +
                    `**Safe Picks:** ${currentGame.safePicks}/6\n` +
                    `**Multiplier:** ${currentGame.multiplier}x\n` +
                    `**Current Winnings:** ${currentWinnings.toLocaleString()} <:lux:1411637514569252894>`
                  )
                  .setColor('#FF4500')
                  .setImage('attachment://mine-grid.png')
                  .setFooter({ text: `Playing as ${message.author.username}` });

                await gameMessage.edit({
                  embeds: [continueEmbed],
                  files: [continueImage],
                  components: [row1, row2, row3, row4]
                });
              }
            }

          } else if (interaction.customId === `cashout_${userId}`) {
            // Handle cash out
            currentGame.active = false;
            const winnings = Math.floor(bet * currentGame.multiplier);
            
            // Apply Mana Zone bonus if active
            const adjustedWinnings = await gamblingDatabase.adjustBalanceWithManaZone(userId, winnings, true);
            
            // Update user balance
            const user = await getUser(userId);
            await updateUser(userId, { balance: user.balance + adjustedWinnings });
            
            await endMineGame(userId);

            const cashoutImage = await generateMineImage(
              currentGame.grid,
              currentGame.revealed,
              bet,
              currentGame.multiplier,
              adjustedWinnings
            );

            const cashoutEmbed = new EmbedBuilder()
              .setTitle('💰 Cashed Out! 💰')
              .setDescription(
                `You cashed out safely!\n` +
                `**Multiplier:** ${currentGame.multiplier}x\n` +
                `**Winnings:** ${adjustedWinnings.toLocaleString()} <:lux:1411637514569252894>\n` +
                `**New Balance:** ${(user.balance + adjustedWinnings).toLocaleString()} <:lux:1411637514569252894>`
              )
              .setColor('#00FF00')
              .setImage('attachment://mine-grid.png')
              .setFooter({ text: `Well played ${message.author.username}!` });

            await gameMessage.edit({
              embeds: [cashoutEmbed],
              files: [cashoutImage],
              components: []
            });
          }

        } catch (error) {
          console.error('Error handling mine interaction:', error);
          await interaction.followUp({
            content: '❌ An error occurred while processing your action. Please try starting a new game.',
            ephemeral: true
          });
        }
      });

      collector.on('end', async () => {
        try {
          // Disable all buttons when collector ends
          const disabledRows = [row1, row2, row3, row4].map(row => {
            const newRow = new ActionRowBuilder();
            row.components.forEach(component => {
              newRow.addComponents(ButtonBuilder.from(component).setDisabled(true));
            });
            return newRow;
          });

          await gameMessage.edit({ components: disabledRows });
        } catch (error) {
          console.error('Error disabling buttons:', error);
        }
      });

    } catch (error) {
      console.error('Error in mine command:', error);
      await message.reply(`❌ Error starting Mine game: ${error.message}`);
    }
  },
};
