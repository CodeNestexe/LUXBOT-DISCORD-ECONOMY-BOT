const { executeFunCommand } = require('./funBase.js');

const kissData = {
  endpoint: 'https://api.waifu.pics/sfw/kiss',
  color: '#FF69B4',
  selfMessages: [
    "Oh {user}, attempting the impossible I see. You can't kiss yourself, genius! 🤭"
  ],
  embedTitles: [
    "💋 {user1} gently kisses {user2}'s lips! How sweet! 💕",
    "Aww! 💖 {user1} gives {user2} a tender kiss on the lips! So romantic! 😍",
    "💏 {user1} leans in and kisses {user2}'s soft lips! Love is in the air! ✨",
    "{user1} plants a sweet kiss on {user2}'s lips! 💋 Adorable! 💓",
    "Ooh la la! 😏 {user1} just kissed {user2} on the lips! Someone's getting bold! 💋",
    "Well well! 😘 {user1} smooshed {user2} right on the lips! Spicy! 🌶️",
    "{user1} goes straight for {user2}'s lips! No hesitation there! 😂💋",
    "Boom! 💥 {user1} lands a kiss right on {user2}'s lips! Direct hit! 🎯"
  ]
};

module.exports = {
  name: 'kiss',
  description: 'Kiss someone with a cute anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'kiss', kissData, db);
  }
};