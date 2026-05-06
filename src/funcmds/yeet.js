const { executeFunCommand } = require('./funBase.js');

const yeetData = {
  endpoint: 'https://api.waifu.pics/sfw/yeet',
  color: '#FF6347',
  selfMessages: [
    "Really {user}? Self-yeeting? That's like trying to throw yourself... where exactly? Physics doesn't work that way! 😂",
    "{user}, if you could yeet yourself, you'd just end up confused and dizzy! Find someone else to launch! 🤪",
    "Nice try {user}, but self-yeeting is scientifically impossible! You can't be both the yeeter and the yeetee! 🔬",
    "{user}, that's not yeeting, that's just you having an existential crisis! Go yeet someone who annoys you! 😅"
  ],
  embedTitles: [
    "YEET ATTACK! 💥 {user1} grabs {user2} and launches them with incredible force! They're still flying! 🛸",
    "{user1} channels their inner yeet lord and hurls {user2} into the void! Spectacular yeeting! 🌪️",
    "YEET COMBO! {user1} winds up and LAUNCHES {user2} with professional yeeting technique! 🎯",
    "Breaking physics! {user1} defies gravity by yeeting {user2} beyond all known limits! 🚀",
    "YEET! 🚀 {user1} launches {user2} into orbit! That's gotta be the yeet of the century! 💫",
    "OH MY GOD! {user1} just absolutely YEETED {user2} across the server! Someone call NASA! 🌌",
    "MAXIMUM YEET POWER! {user1} sends {user2} flying into the stratosphere! What a throw! 🌟",
    "LEGENDARY YEET! {user1} has achieved ultimate yeeting mastery by launching {user2}! Epic! ⚡"
  ]
};

module.exports = {
  name: 'yeet',
  description: 'Yeet someone into orbit with an epic anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'yeet', yeetData, db);
  }
};