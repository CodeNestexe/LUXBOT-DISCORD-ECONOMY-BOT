const { executeFunCommand } = require('./funBase.js');

const danceData = {
  endpoint: 'https://api.waifu.pics/sfw/dance',
  color: '#9370DB',
  selfMessages: [
    "Aww {user}, dancing all by yourself? 🥺 That's both adorable and a little sad! Find someone to join your dance party! 💃",
    "Oh no {user}! Solo dancing can be fun, but it's better with friends! Someone come dance with them! 😢💕",
    "{user} is having their own little dance party! 💃 Sweet moves, but wouldn't it be more fun with a partner? ✨",
    "Look at {user} dancing alone! 🕺 So brave and confident, but hey - someone should join in! 😊"
  ],
  embedTitles: [
    "Aww! {user1} and {user2} dancing together is the sweetest thing ever! Friendship goals! 💕🌟",
    "💖 {user1} and {user2} creating beautiful dance memories together! So heartwarming! 😊",
    "{user1} and {user2} prove that dancing is better with friends! Pure joy in motion! 🤗💫",
    "The perfect dance duo! {user1} and {user2} spreading happiness with every step! ✨💃🕺",
    "🎉 {user1} and {user2} are tearing up the dance floor together! What amazing moves! 💃🕺",
    "Dance party activated! {user1} and {user2} are absolutely killing it out there! 🔥✨",
    "Look at those two! {user1} and {user2} dancing in perfect harmony! Pure magic! ⭐💫",
    "🕺💃 {user1} and {user2} just turned this place into a dance studio! Incredible energy! 🎵"
  ]
};

module.exports = {
  name: 'dance',
  description: 'Dance with someone using a fun anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'dance', danceData, db);
  }
};