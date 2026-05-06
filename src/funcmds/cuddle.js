const { executeFunCommand } = require('./funBase.js');

const cuddleData = {
  endpoint: 'https://api.waifu.pics/sfw/cuddle',
  color: '#FFB6C1',
  selfMessages: [
    "Nice try {user}, but that's just you hugging a pillow! Get a real cuddle buddy! 😂",
    "Oh {user}, feeling extra cuddly today? Too bad you can't cuddle yourself! 🤭",
    "{user} attempted self-cuddling and physics said 'NOPE!' Find someone else! 😄",
    "Really {user}? Trying to be your own cuddle buddy? That's... creative but impossible! 🙃"
  ],
  embedTitles: [
    "🥰 {user1} snuggles up close to {user2} for the perfect cuddle! So cozy! ☁️",
    "Aww! {user1} wraps {user2} in the softest, warmest cuddle ever! 🤗💕",
    "{user1} pulls {user2} into a gentle, comforting cuddle! Pure bliss! ✨",
    "💖 {user1} and {user2} are having the coziest cuddle session! D'aww! 🫂",
    "🌙 {user1} settles into a peaceful cuddle with {user2}! So serene! ✨",
    "{user1} shares a cloud-soft cuddle with {user2}! Pure tranquility! ☁️💕",
    "Tender moment: {user1} gives {user2} the gentlest, most caring cuddle! 🕊️💖",
    "{user1} wraps {user2} in a blanket of comfort and love! So soothing! 🤗💝"
  ]
};

module.exports = {
  name: 'cuddle',
  description: 'Cuddle with someone using a cozy anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'cuddle', cuddleData, db);
  }
};