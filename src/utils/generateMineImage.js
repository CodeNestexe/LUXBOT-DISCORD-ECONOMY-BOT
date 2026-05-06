const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');

// Register the custom font
registerFont(path.join(__dirname, '../assets/fonts/NotoColorEmoji.ttf'), { family: 'Noto Sans Emoji' });

// Preload images at startup
let backgroundImage, bombImage, starImage;

(async () => {
  try {
    backgroundImage = await loadImage(path.join(__dirname, '../assets/Images/minebackground2.jpg'));
    console.log('Background image preloaded successfully');
  } catch (error) {
    console.error('Failed to preload background image:', error.message);
    backgroundImage = null;
  }

  try {
    bombImage = await loadImage(path.join(__dirname, '../assets/Images/bomb.png'));
    starImage = await loadImage(path.join(__dirname, '../assets/Images/star.png'));
    console.log('Bomb and star images preloaded successfully');
  } catch (error) {
    console.error('Failed to preload bomb and star images:', error.message);
    bombImage = null;
    starImage = null;
  }
})();

async function generateMineImage(grid, revealed, bet, multiplier, winnings) {
  const startTime = Date.now();

  const width = 600;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw the background
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#2f1b3d';
    ctx.fillRect(0, 0, width, height);
  }

  // Grid settings
  const gridSize = 3;
  const tileSize = 100;
  const gridOffsetX = (width - gridSize * tileSize) / 2;
  const gridOffsetY = 50;

  // Set context properties once for tiles
  ctx.font = '50px "Noto Sans Emoji"';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw the grid
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const tileIndex = row * gridSize + col;
      const x = gridOffsetX + col * tileSize;
      const y = gridOffsetY + row * tileSize;

      // Draw tile background
      ctx.fillStyle = revealed[tileIndex] ? '#1a1a1a' : '#4a4a4a';
      ctx.fillRect(x, y, tileSize - 5, tileSize - 5);

      // Draw tile content
      if (revealed[tileIndex]) {
        if (bombImage && starImage) {
          const image = grid[tileIndex] === 'bomb' ? bombImage : starImage;
          ctx.drawImage(image, x + (tileSize - 50) / 2, y + (tileSize - 50) / 2, 50, 50);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillText(grid[tileIndex] === 'bomb' ? '💣' : '⭐', x + tileSize / 2, y + tileSize / 2);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillText('⬜', x + tileSize / 2, y + tileSize / 2);
      }
    }
  }

  // Draw game info
  ctx.font = '20px "Noto Sans Emoji"';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`Bet: ${bet} Lux | Multiplier: ${multiplier}x | Winnings: ${winnings} Lux`, width / 2, height - 30);

  // Convert to attachment
  const buffer = canvas.toBuffer('image/png');
  const attachment = new AttachmentBuilder(buffer, { name: 'mine-grid.png' });

  console.log(`generateMineImage took ${Date.now() - startTime}ms`);
  return attachment;
}

module.exports = { generateMineImage };