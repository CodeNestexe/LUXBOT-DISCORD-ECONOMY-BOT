const { executeFunCommand } = require('./funBase.js');

const patData = {
  endpoint: 'https://api.waifu.pics/sfw/pat',
  color: '#98FB98',
  selfMessages: [
    "Nice try {user}, but that's just you touching your own head! Get real pats from someone else! 😂",
    "{user} attempted self-patting and looked ridiculous! Find a proper pat-giver! 🤭",
    "Oh {user}, trying to pat yourself? That's like trying to surprise yourself - impossible! 😄",
    "Really {user}? Self-patting is against the pat laws! Find another victim for your affection! 🙃"
  ],
  embedTitles: [
    "Pat pat pat! {user1} gives {user2} rapid-fire head pats! 🏃‍♂️",
    "{user1} delivers premium quality head pats to {user2}! Five stars! ⭐",
    "Head pat combo! {user1} treats {user2} to maximum pat power! 💥🤗",
    "{user1} surprise-pats {user2}! Sneak attack of affection! 😄✨",
    "🥰 {user1} gently pats {user2}'s head! So sweet and comforting! ✨",
    "Aww! {user1} gives {user2} the softest head pats ever! Pure wholesomeness! 💕",
    "{user1} lovingly pats {user2} with such care! D'aww! 🤗",
    "💖 {user1} offers {user2} gentle, reassuring head pats! So precious! 😌"
  ]
};

module.exports = {
  name: 'pat',
  description: 'Pat someone with a gentle anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'pat', patData, db);
  }
};