const { executeFunCommand } = require('./funBase.js');

const blushData = {
  endpoint: 'https://api.waifu.pics/sfw/blush',
  color: '#FFB6C1',
  selfMessages: [
    "Really {user}? Blushing from your own face? Ain't you a shy one! 😂 Find someone else to get flustered over!",
    "{user}, are you seriously blushing at yourself? That's some next-level self-love right there! 🤭",
    "Hold up {user}! You can't blush at your own reflection - that's just narcissism with extra steps! 😅",
    "{user}, buddy, blushing at yourself is like being embarrassed by your own shadow! Get real! 🙄"
  ],
  embedTitles: [
    "Aww! 🥰 {user1} goes all shy and blushes at {user2}! Someone's got it bad! The romance begins! 💘",
    "{user1} is blushing like crazy at {user2}! My my, we got ourselves a proper love story unfolding! 📚💕",
    "RED ALERT! 🚨 {user1} is blushing intensely at {user2}! The love triangle has officially started! 💖",
    "Caught red-faced! {user1} can't hide their blush around {user2}! This is better than a soap opera! 📺"
  ]
};

module.exports = {
  name: 'blush',
  description: 'Blush at someone with a cute anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'blush', blushData, db);
  }
};