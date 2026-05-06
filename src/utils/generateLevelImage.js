const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder } = require('discord.js');

// Register the Anime Ace font (regular and bold)
registerFont('/home/container/src/assets/fonts/AnimeAce-Regular.ttf', { family: 'Anime Ace', weight: 'regular' });
registerFont('/home/container/src/assets/fonts/AnimeAce-Bold.ttf', { family: 'Anime Ace', weight: 'bold' });

async function generateLevelImage(displayName, level, rank, xpCurrent, xpTotal, avatarURL) {
  const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');

  // Create a gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#4B0082');
  gradient.addColorStop(1, '#FF4500');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Load and draw the Lux background (semi-transparent)
  try {
    const background = await loadImage('/home/container/src/assets/Images/lux-background.jpg');
    ctx.globalAlpha = 0.5;
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
  } catch (error) {
    console.error(`Failed to load background image: ${error.message}`);
    throw new Error(`Failed to load background image: ${error.message}`);
  }

  // Add a semi-transparent black overlay with spacing
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 20, canvas.width, canvas.height - 40);

  // Modify the avatarURL to request PNG format instead of WebP
  let modifiedAvatarURL = avatarURL;
  try {
    // Split the URL at the query parameter
    const [baseURL, query] = avatarURL.split('?');
    if (baseURL.endsWith('.webp')) {
      modifiedAvatarURL = baseURL.replace('.webp', '.png') + (query ? `?${query}` : '');
    }
    console.log(`Modified avatar URL to PNG: ${modifiedAvatarURL}`);
  } catch (error) {
    console.error(`Failed to modify avatar URL: ${error.message}`);
    modifiedAvatarURL = avatarURL; // Fallback to original URL
  }

  // Load and draw the user's avatar as a square using loadImage
  try {
    if (!modifiedAvatarURL || typeof modifiedAvatarURL !== 'string') {
      throw new Error(`Invalid avatarURL: ${modifiedAvatarURL}`);
    }
    console.log(`Attempting to load avatar from URL: ${modifiedAvatarURL}`);

    // Use loadImage to fetch and load the avatar directly
    const avatar = await loadImage(modifiedAvatarURL);
    ctx.drawImage(avatar, 15, 18, 150, 150); // Draw as a square at position (15, 18)
    console.log('Successfully loaded and drew user avatar');
  } catch (error) {
    console.error(`Failed to load user avatar for ${displayName} (${modifiedAvatarURL}): ${error.message}`);
    // Draw a placeholder square to indicate the missing avatar
    ctx.fillStyle = '#808080'; // Gray placeholder
    ctx.fillRect(15, 18, 150, 150);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px "Anime Ace"';
    ctx.fillText('Avatar Failed', 50, 93);
  }

  // Add user's display name (larger and centered with avatar)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px "Anime Ace"';
  ctx.fillText((displayName || '').toUpperCase(), 170, 95);

  // Add level (larger)
  ctx.font = 'bold 36px "Anime Ace"';
  ctx.fillText(`LVL ${level}`, 170, 155);

  // Add progress bar (extended to near the end, white border)
  const xpPercentage = (xpTotal > 0) ? Math.min((xpCurrent / xpTotal) * 100, 100) : 0; // Cap at 100%
  if (isNaN(xpPercentage)) xpPercentage = 0;
  const barWidth = 510; // Extended to x=680 (700 - 20px margin)
  const barHeight = 10; // Same as OwO Bot
  const barStartX = 170;
  const barStartY = 190; // Kept at y=190
  ctx.strokeStyle = '#FFFFFF'; // White border to match OwO Bot
  ctx.lineWidth = 3; // Same thickness
  ctx.strokeRect(barStartX, barStartY, barWidth, barHeight); // Outer border
  ctx.fillStyle = '#FFFFFF';
  // Inner filling, slightly smaller to create a gap
  ctx.fillRect(barStartX + 2, barStartY + 1, ((barWidth - 4) * xpPercentage) / 100, barHeight - 2);

  // Debug log for bar boundaries and percentage
  console.log(`Progress bar: start=${barStartX}, width=${barWidth}, end=${barStartX + barWidth}`);
  console.log(`XP Percentage: ${xpPercentage}%`);

  // Add rank and XP above the bar (smaller font, adjusted coordinates)
  ctx.font = '12px "Anime Ace"'; // Reduced to 12px
  const rankText = `RANK: #${rank}`;
  const xpText = `XP: ${xpCurrent}/${xpTotal}`;
  
  // Measure text widths to ensure they fit within the canvas
  const rankTextWidth = ctx.measureText(rankText).width;
  const xpTextWidth = ctx.measureText(xpText).width;
  console.log(`Rank text width: ${rankTextWidth}px, XP text width: ${xpTextWidth}px`);

  // Position the rank text (moved to the left to prevent overlap)
  const rankX = 400; // Adjusted to 400 to move left
  console.log(`Drawing RANK text: "${rankText}" at x=${rankX}, y=165`);
  ctx.fillText(rankText, rankX, 165);

  // Position the XP text with a larger gap, ensuring it fits within the canvas
  const gap = 20; // Gap between RANK and XP
  let xpX = rankX + rankTextWidth + gap;
  const canvasRightEdge = 680; // Leave a 20px margin from the right edge
  if (xpX + xpTextWidth > canvasRightEdge) {
    xpX = canvasRightEdge - xpTextWidth; // Adjust to fit within the canvas
  }
  console.log(`Drawing XP text: "${xpText}" at x=${xpX}, y=165`);
  ctx.fillText(xpText, xpX, 165);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'level-card.png' });
}

module.exports = { generateLevelImage };