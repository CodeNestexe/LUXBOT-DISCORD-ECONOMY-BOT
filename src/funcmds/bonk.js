const { executeFunCommand } = require('./funBase.js');

const bonkData = {
  endpoint: 'https://api.waifu.pics/sfw/bonk',
  color: '#DDA0DD',
  selfMessages: [
    "Nice try {user}, but boinking yourself is against the laws of fun! Find someone else to playfully bonk! 💫",
    "{user}, self-boinking is just sad! Go find someone who deserves a good boink and can return the favor! 😊",
    "Aww {user}, trying to boink yourself? That's like trying to tickle yourself - impossible! Find a friend! 🤗",
    "{user}, save those boinks for people who can appreciate them! Stop wasting good boinks on yourself! ✨",
    "Really {user}? Self-boinking? That's just you bonking your own head! Are you okay up there? 😂",
    "{user}, if self-boinking was possible, we'd all be doing it! Sadly, physics says no! Find someone else to boink! 🤭",
    "ERROR 404: Logic not found! {user} attempted self-boink and broke reality! Please try again with another person! 🤖",
    "{user}, that's not boinking, that's just you being weird with yourself! Go boink someone who can boink back! 😄"
  ],
  embedTitles: [
    "Oop! {user1} just boink-bonked {user2}! Someone's getting the silly treatment today! 😅",
    "{user1} serves {user2} a fresh boink to the head! That's premium quality bonking right there! 🏆",
    "BONK ALERT! 🚨 {user1} has successfully boink-ified {user2}! Mission accomplished! ✅",
    "{user1} goes full cartoon mode and boinks {user2}! sound effects not included 🎭",
    "BOINK! 💥 {user1} gives {user2} a silly little bonk on the head! That's gotta be annoying! 😂",
    "{user1} boinks {user2} with maximum silliness! bonk bonk Someone's being playful today! 🤪",
    "Boink attack! {user1} delivers a gentle head-bonk to {user2}! Classic friendly violence! 😄",
    "BONK! {user1} boinks {user2} right on the noggin! That's what you get for existing! 💫"
  ]
};

module.exports = {
  name: 'bonk',
  description: 'Bonk someone playfully with an anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'bonk', bonkData, db);
  }
};