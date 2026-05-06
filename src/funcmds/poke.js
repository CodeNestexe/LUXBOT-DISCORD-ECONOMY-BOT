const { executeFunCommand } = require('./funBase.js');

const pokeData = {
  endpoint: 'https://api.waifu.pics/sfw/poke',
  color: '#87CEEB',
  selfMessages: [
    "Oh {user}, feeling that bored? You can't poke yourself - find a real target! 😅",
    "{user} attempted self-poking and looked ridiculous! Go poke someone else! 🤪",
    "Hold up {user}! Self-poking is against the poke laws! Find another victim! 😂",
    "{user} tried to break the poke matrix by poking themselves! Error 404! 🤖",
    "Hey {user}, you can't poke yourself! That's just... touching yourself awkwardly! 😂",
    "Nice try {user}, but self-poking doesn't count! Find someone else to annoy with pokes! 🤭",
    "{user}, poking yourself is like trying to surprise yourself - it just doesn't work! 😄",
    "Really {user}? Self-poking? That's just you being weird with your own finger! 🙃"
  ],
  embedTitles: [
    "Yikes! 😬 {user1} gives {user2} a pointy poke! Hope that finger wasn't too sharp! 👆",
    "{user1} surprise-pokes {user2}! Ow ow ow! That's what you get for not paying attention! 😄",
    "Poke of justice delivered! {user1} gets {user2} right where it counts! A little payback perhaps? 🎯",
    "{user1} unleashes a tactical poke on {user2}! Critical hit for minor annoyance damage! ⚡",
    "Ouch! 👆 {user1} pokes {user2} right in the ribs! That's gotta sting a little! 😅",
    "Poke attack! {user1} jabs {user2} with their finger! Ow, that looked sharp! 😂",
    "{user1} delivers a sneaky poke to {user2}! That definitely caught them off guard! 👆💥",
    "Oops! {user1} pokes {user2} a bit too hard! Someone's feeling mischievous today! 😈"
  ]
};

module.exports = {
  name: 'poke',
  description: 'Poke someone with a playful anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'poke', pokeData, db);
  }
};