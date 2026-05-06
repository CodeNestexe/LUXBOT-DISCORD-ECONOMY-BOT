const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Import node-fetch (compatible with both v2 and v3)
let fetch;
try {
  fetch = require('node-fetch').default || require('node-fetch');
} catch (error) {
  console.error('Failed to import node-fetch:', error.message);
  throw new Error('node-fetch is not installed or incompatible. Please run: npm install node-fetch@2');
}

// Register custom fonts (Montserrat) with error handling
const boldFontPath = path.join(__dirname, '../assets/fonts/Montserrat-Bold.ttf');
const regularFontPath = path.join(__dirname, '../assets/fonts/Montserrat-Regular.ttf');

// Debug: Log the resolved font paths
console.log('Bold font path (generateProfileImage):', boldFontPath);
console.log('Regular font path (generateProfileImage):', regularFontPath);

// Check if font files exist
if (!fs.existsSync(boldFontPath) || !fs.existsSync(regularFontPath)) {
  throw new Error(`Font files not found at ${boldFontPath} or ${regularFontPath}. Please ensure the fonts are in /home/container/src/assets/fonts/.`);
}

registerFont(boldFontPath, { family: 'Montserrat', weight: 'bold' });
registerFont(regularFontPath, { family: 'Montserrat', weight: 'regular' });

async function generateProfileImage(userData) {
  try {
    console.log('Generating profile image with data:', userData);

    // Destructure user data (removed battleLevel and battleRobot)
    const {
      username,
      casinoName,
      normalLevel,
      wins,
      losses,
      avatarURL,
      bio = 'A LUX BOT USER',
      background = 'profile.jpg', // Default to profile.jpg if not provided
    } = userData;

    // Create canvas
    console.log('Creating canvas...');
    const canvasWidth = 1600;
    const canvasHeight = 1210;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Load and draw custom background
    const backgroundPath = path.join(__dirname, '../assets/Images', background);
    console.log('Background path:', backgroundPath);
    if (!fs.existsSync(backgroundPath)) {
      throw new Error(`Background image not found at ${backgroundPath}. Please ensure the file exists.`);
    }

    // Load background image with a timeout
    console.log('Loading background image...');
    const loadImagePromise = loadImage(backgroundPath);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('loadImage timed out after 10 seconds')), 10000);
    });
    const backgroundImage = await Promise.race([loadImagePromise, timeoutPromise]);
    console.log('Background image loaded successfully:', !!backgroundImage);

    // Draw background with 75% opacity
    console.log('Drawing background image with 75% opacity...');
    ctx.globalAlpha = 0.75;
    ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
    ctx.globalAlpha = 1.0;

    // Draw black transparent rectangle with rounded corners (upper section)
    console.log('Drawing black transparent rectangle (upper section)...');
    const rectX = 6;
    const rectY = 6;
    const rectWidth = canvasWidth - 12;
    const rectHeight = 466;
    const cornerRadius = 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(rectX + cornerRadius, rectY);
    ctx.lineTo(rectX + rectWidth - cornerRadius, rectY);
    ctx.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + cornerRadius, cornerRadius);
    ctx.lineTo(rectX + rectWidth, rectY + rectHeight - cornerRadius);
    ctx.arcTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - cornerRadius, rectY + rectHeight, cornerRadius);
    ctx.lineTo(rectX + cornerRadius, rectY + rectHeight);
    ctx.arcTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - cornerRadius, cornerRadius);
    ctx.lineTo(rectX, rectY + cornerRadius);
    ctx.arcTo(rectX, rectY, rectX + cornerRadius, rectY, cornerRadius);
    ctx.closePath();
    ctx.fill();

    // Load and draw user avatar (inside rectangle, left side)
    console.log('Fetching avatar image...');
    const avatarSize = 400;
    const avatarX = rectX + 20;
    const avatarY = rectY + 20;
    const avatarResponse = await fetch(avatarURL);
    console.log('Avatar fetch response status:', avatarResponse.status);
    if (!avatarResponse.ok) {
      throw new Error(`Failed to fetch avatar image: ${avatarResponse.statusText}`);
    }

    // Convert the avatar image to PNG using sharp
    console.log('Converting avatar image to PNG...');
    const avatarBuffer = await avatarResponse.arrayBuffer();
    const avatarPngBuffer = await sharp(Buffer.from(avatarBuffer)).png().toBuffer();
    console.log('Avatar image converted to PNG.');

    // Load the converted PNG buffer into canvas
    const avatarImage = await loadImage(avatarPngBuffer);
    console.log('Avatar image loaded.');

    // Draw avatar with a white border
    console.log('Drawing avatar image (square) with border...');
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(avatarX - 2, avatarY - 2, avatarSize + 4, avatarSize + 4);
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);

    // Draw name (inside rectangle, right side)
    console.log('Drawing name...');
    ctx.font = 'bold 120px Montserrat';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    const nameX = avatarX + avatarSize + 20;
    const nameY = rectY + 150;
    ctx.fillText(username, nameX, nameY);

    // Draw casino name (below name, inside rectangle, smaller font and increased gap)
    console.log('Drawing casino name...');
    ctx.font = 'regular 30px Montserrat';
    ctx.fillStyle = '#A1A1AA';
    const casinoNameY = nameY + 150;
    ctx.fillText(` ${casinoName}`, nameX, casinoNameY);

    // Draw first lower rectangle (left side) with stats
    console.log('Drawing first lower rectangle (left side)...');
    const lowerRect1X = 27;
    const lowerRect1Y = 482;
    const lowerRect1Width = 612;
    const lowerRect1Height = 388;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(lowerRect1X + cornerRadius, lowerRect1Y);
    ctx.lineTo(lowerRect1X + lowerRect1Width - cornerRadius, lowerRect1Y);
    ctx.arcTo(lowerRect1X + lowerRect1Width, lowerRect1Y, lowerRect1X + lowerRect1Width, lowerRect1Y + cornerRadius, cornerRadius);
    ctx.lineTo(lowerRect1X + lowerRect1Width, lowerRect1Y + lowerRect1Height - cornerRadius);
    ctx.arcTo(lowerRect1X + lowerRect1Width, lowerRect1Y + lowerRect1Height, lowerRect1X + lowerRect1Width - cornerRadius, lowerRect1Y + lowerRect1Height, cornerRadius);
    ctx.lineTo(lowerRect1X + cornerRadius, lowerRect1Y + lowerRect1Height);
    ctx.arcTo(lowerRect1X, lowerRect1Y + lowerRect1Height, lowerRect1X, lowerRect1Y + lowerRect1Height - cornerRadius, cornerRadius);
    ctx.lineTo(lowerRect1X, lowerRect1Y + cornerRadius);
    ctx.arcTo(lowerRect1X, lowerRect1Y, lowerRect1X + cornerRadius, lowerRect1Y, cornerRadius);
    ctx.closePath();
    ctx.fill();

    // Draw stats inside the first lower rectangle (12px padding)
    const statsX = lowerRect1X + 12;
    let statsY = lowerRect1Y + 116; // Adjusted for better vertical centering

    // Level (removed battle level)
    console.log('Drawing level...');
    ctx.font = 'bold 45px Montserrat';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${normalLevel}`, statsX, statsY);

    // Wins
    statsY += 60;
    console.log('Drawing wins...');
    ctx.fillText(`Wins: ${wins || 0}`, statsX, statsY);

    // Losses
    statsY += 60;
    console.log('Drawing losses...');
    ctx.fillText(`Losses: ${losses || 0}`, statsX, statsY);

    // Total Games
    statsY += 60;
    console.log('Drawing total games...');
    const totalGames = (wins || 0) + (losses || 0);
    ctx.fillText(`Total Games: ${totalGames}`, statsX, statsY);

    // Draw second lower rectangle (right side) with "LUX Enthusiast"
    console.log('Drawing second lower rectangle (right side)...');
    const lowerRect2X = 936;
    const lowerRect2Y = 482;
    const lowerRect2Width = 612;
    const lowerRect2Height = 388;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(lowerRect2X + cornerRadius, lowerRect2Y);
    ctx.lineTo(lowerRect2X + lowerRect2Width - cornerRadius, lowerRect2Y);
    ctx.arcTo(lowerRect2X + lowerRect2Width, lowerRect2Y, lowerRect2X + lowerRect2Width, lowerRect2Y + cornerRadius, cornerRadius);
    ctx.lineTo(lowerRect2X + lowerRect2Width, lowerRect2Y + lowerRect2Height - cornerRadius);
    ctx.arcTo(lowerRect2X + lowerRect2Width, lowerRect2Y + lowerRect2Height, lowerRect2X + lowerRect2Width - cornerRadius, lowerRect2Y + lowerRect2Height, cornerRadius);
    ctx.lineTo(lowerRect2X + cornerRadius, lowerRect2Y + lowerRect2Height);
    ctx.arcTo(lowerRect2X, lowerRect2Y + lowerRect2Height, lowerRect2X, lowerRect2Y + lowerRect2Height - cornerRadius, cornerRadius);
    ctx.lineTo(lowerRect2X, lowerRect2Y + cornerRadius);
    ctx.arcTo(lowerRect2X, lowerRect2Y, lowerRect2X + cornerRadius, lowerRect2Y, cornerRadius);
    ctx.closePath();
    ctx.fill();

    // Draw "LUX Enthusiast" inside the second lower rectangle (centered)
    console.log('Drawing LUX Enthusiast...');
    ctx.font = 'bold 40px Montserrat';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    const luxTextX = lowerRect2X + lowerRect2Width / 2;
    const luxTextY = lowerRect2Y + lowerRect2Height / 2;
    ctx.fillText('LUX Enthusiast', luxTextX, luxTextY);

    // Draw bottom "About Me" rectangle
    console.log('Drawing About Me rectangle...');
    const aboutRectX = 52;
    const aboutRectY = 902;
    const aboutRectWidth = 1507;
    const aboutRectHeight = 284;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(aboutRectX + cornerRadius, aboutRectY);
    ctx.lineTo(aboutRectX + aboutRectWidth - cornerRadius, aboutRectY);
    ctx.arcTo(aboutRectX + aboutRectWidth, aboutRectY, aboutRectX + aboutRectWidth, aboutRectY + cornerRadius, cornerRadius);
    ctx.lineTo(aboutRectX + aboutRectWidth, aboutRectY + aboutRectHeight - cornerRadius);
    ctx.arcTo(aboutRectX + aboutRectWidth, aboutRectY + aboutRectHeight, aboutRectX + aboutRectWidth - cornerRadius, aboutRectY + aboutRectHeight, cornerRadius);
    ctx.lineTo(aboutRectX + cornerRadius, aboutRectY + aboutRectHeight);
    ctx.arcTo(aboutRectX, aboutRectY + aboutRectHeight, aboutRectX, aboutRectY + aboutRectHeight - cornerRadius, cornerRadius);
    ctx.lineTo(aboutRectX, aboutRectY + cornerRadius);
    ctx.arcTo(aboutRectX, aboutRectY, aboutRectX + cornerRadius, aboutRectY, cornerRadius);
    ctx.closePath();
    ctx.fill();

    // Draw "ABOUT ME" text
    console.log('Drawing ABOUT ME text...');
    ctx.font = 'bold 30px Montserrat';
    ctx.fillStyle = '#A1A1AA';
    ctx.textAlign = 'left';
    const aboutTextX = aboutRectX + 12;
    const aboutTextY = aboutRectY + 12 + 18;
    ctx.fillText('ABOUT ME', aboutTextX, aboutTextY);

    // Draw bio text
    console.log('Drawing bio text...');
    ctx.font = 'regular 40px Montserrat';
    ctx.fillStyle = '#FFFFFF';
    const bioTextY = aboutTextY + 46;
    ctx.fillText(bio, aboutTextX, bioTextY);

    // Convert canvas to buffer
    console.log('Converting canvas to buffer...');
    const buffer = canvas.toBuffer('image/png');
    console.log('Buffer created, size:', buffer.length, 'bytes');

    return buffer;

  } catch (error) {
    console.error('Error in generateProfileImage:', error);
    throw error;
  }
}

module.exports = generateProfileImage;
