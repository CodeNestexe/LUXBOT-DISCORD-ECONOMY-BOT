const { executeFunCommand } = require('./funBase.js');

const waveData = {
  endpoint: 'https://api.waifu.pics/sfw/wave',
  color: '#87CEEB',
  selfMessages: [
    "Hey {user}, are you waving to ghosts buddy? 👻 You can't wave at yourself - find a real person! 😂",
    "{user}, what's up with the self-waving? Got some invisible friends there? Wave at someone who can wave back! 👋😅",
    "Really {user}? Waving at yourself? Are you practicing for when you meet actual people? 🤭",
    "{user}, buddy, that's just you moving your hand around! Find someone real to wave at! 😄"
  ],
  embedTitles: [
    "👋 {user1} gives {user2} a cheerful wave! Hello there! So friendly and welcoming! 😊",
    "Hey hey! {user1} waves enthusiastically at {user2}! What a nice greeting! ✨",
    "{user1} sends a warm wave to {user2}! Such a lovely way to say hello! 💕",
    "Wave hello! 👋 {user1} greets {user2} with the classic friendly gesture! Sweet! 🤗",
    "Big wave energy! 🌊 {user1} gives {user2} the most enthusiastic wave ever! So much joy! 🎉",
    "{user1} waves at {user2} like they haven't seen them in years! That's some serious excitement! 😄",
    "Mega wave! {user1} practically jumps while waving at {user2}! Maximum friendliness achieved! 💫",
    "Wave power activated! {user1} sends {user2} the happiest greeting wave! Pure sunshine! ☀️"
  ]
};

module.exports = {
  name: 'wave',
  description: 'Wave at someone with a cheerful anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'wave', waveData, db);
  }
};