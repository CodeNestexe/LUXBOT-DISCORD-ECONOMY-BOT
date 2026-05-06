const { AttachmentBuilder } = require('discord.js');
const generateProfileImage = require('../utils/generateProfileImage');

module.exports = {
  name: 'pf',
  aliases: ['profile'],
  async execute(message, args, db) {
    try {
      console.log('Executing profile command for:', message.author.id);

      // Fetch user data
      console.log('Fetching user data...');
      const user = await db.getUser(message.author.id);
      const casino = await db.getUserCasino(message.author.id);
      console.log('User data fetched:', user);
      console.log('Casino data fetched (full object):', casino);

      // Prepare user data for image generation
      let casinoName;
      if (typeof casino === 'string') {
        casinoName = casino; // Handle case where casino is a string (e.g., "AKATSUKI")
      } else {
        casinoName = casino?.casinoName || 'No Casino'; // Handle case where casino is an object
      }

      const userData = {
        username: message.author.displayName,
        casinoName: casinoName,
        normalLevel: user.level || 0,
        battleLevel: user.battleStats?.battleLevel || 0,
        wins: user.profile?.wins || 0,
        losses: user.profile?.losses || 0,
        avatarURL: message.author.displayAvatarURL({ format: 'png', size: 256, forceStatic: true }),
        battleRobot: '🤖 Default Robot',
        bio: user.profile?.bio || 'A LUX BOT USER',
        background: user.profile?.background || 'profile.jpg', // Pass the selected background
      };

      // Debug: Log the casinoName and background specifically
      console.log('Casino name passed to generateProfileImage:', userData.casinoName);
      console.log('Background passed to generateProfileImage:', userData.background);

      // Generate the profile image
      console.log('Calling generateProfileImage...');
      const buffer = await generateProfileImage(userData);
      console.log('Profile image generated successfully.');

      // Send the image to Discord
      const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });
      console.log('Sending image to Discord...');
      await message.channel.send({ files: [attachment] });
      console.log('Image sent successfully.');

    } catch (error) {
      console.error('Error in profile command:', error);
      await message.reply(`Error generating profile: ${error.message}`).catch(err => {
        console.error('Failed to send error reply to Discord:', err);
      });
    }
  },
};