const { executeFunCommand } = require('./funBase.js');

const hugData = {
  endpoint: 'https://api.waifu.pics/sfw/hug',
  color: '#FFA500',
  selfMessages: [
    "Aww {user}, you can't hug yourself! But here's a virtual hug from me instead! 🤗",
    "Nice try {user}, but self-hugging doesn't count! Find someone else to squeeze! 🫂",
    "Silly {user}! You can't wrap your arms around yourself like that! Go hug someone else! 😄",
    "{user}, that's just you holding yourself! Find a real person to hug! 🤭"
  ],
  embedTitles: [
    "🤗 {user1} wraps {user2} in a big, warm hug! So sweet! 💕",
    "Aww! {user1} gives {user2} the coziest hug ever! 🫂 Friendship goals! ✨",
    "{user1} pulls {user2} into a tight, comforting hug! 🤗 Pure wholesomeness! 💖",
    "💕 {user1} embraces {user2} with open arms! Such a beautiful moment! 🥰",
    "🫂 {user1} gently hugs {user2}! So much love in the air! 💝",
    "{user1} shares a soft, caring hug with {user2}! D'aww! 🥺💕",
    "Tender moment alert! {user1} gives {user2} the sweetest hug! 🤗💖",
    "{user1} wraps {user2} in a cloud of comfort! Such a gentle hug! ☁️💕"
  ]
};

module.exports = {
  name: 'hug',
  description: 'Hug someone with a wholesome anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'hug', hugData, db);
  }
};