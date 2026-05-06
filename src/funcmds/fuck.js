const { executeFunCommand } = require('./funBase.js');

const fuckData = {
  endpoint: 'https://api.waifu.pics/sfw/kiss', // Using kiss GIFs as SFW alternative
  color: '#FF1493',
  selfMessages: [
    "Really {user}? Self-sussy activities? That's just you being awkward alone! Get a partner in crime! 😅",
    "{user}, if self-sussy was a sport, you'd still lose because it makes no sense! Find a real person! 🏆",
    "Nice try {user}, but solo sussy behavior is just you being weird by yourself! That's not how it works! 🙃",
    "{user}, attempting self-sussy stuff is like trying to play hide and seek alone - pointless! 😄",
    "Wait {user}, how can you even do sussy things with yourself? Is that physically possible? That's just... confusing! 😂",
    "{user}, buddy, doing sussy stuff with yourself sounds impossible and weird! Physics doesn't work that way! 🤪",
    "Hold up {user}! How does one even do sussy things solo? That's like trying to surprise yourself! 🤨",
    "{user}, that's mathematically impossible! You can't be sussy with yourself - find someone else to be weird with! 🔢"
  ],
  embedTitles: [
    "😏 {user1} does lewd things to {user2}... What are you doing?! 🔥",
    "Ooh la la! 😈 {user1} gets freaky with {user2}! Someone's being naughty! 💕",
    "{user1} f*cks {user2}! Well well, that escalated quickly! 🌶️",
    "Spicy! 🔥 {user1} does naughty things to {user2}! Keep it PG-13! 😂",
    "Holy moly! 😳 {user1} just f*cked {user2}! Things are getting heated! 💥",
    "{user1} gets down and dirty with {user2}! Bow chicka wow wow! 🎵",
    "Oh my! 😱 {user1} f*cks {user2} senseless! Someone call the LUX police! 🚔",
    "Yikes! {user1} ravages {user2}! That's some serious bedroom energy! 😈"
  ]
};

module.exports = {
  name: 'fuck',
  description: 'Do lewd things to someone (SFW and playful only)!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'fuck', fuckData, db);
  }
};