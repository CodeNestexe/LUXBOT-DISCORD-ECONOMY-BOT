const { executeFunCommand } = require('./funBase.js');

const slapData = {
  endpoint: 'https://api.waifu.pics/sfw/slap',
  color: '#FF4500',
  selfMessages: [
    "Hey {user}, instead of hurting yourself, why not slap someone who can slap back? Way more fun! 💕",
    "{user}, self-slapping is just sad! Find a friend to have a proper slap fight with! 😊",
    "Come on {user}, you're worth more than self-inflicted pain! Go slap someone else playfully! ✨",
    "{user}, buddy, save those slaps for people who annoy you! Don't waste them on yourself! 🤗",
    "Nope nope {user}! Self-slapping is banned by the laws of common sense! That would sting like crazy! 😂",
    "{user}, buddy, slapping yourself is like paying to punch yourself! Find a better target! 🤪",
    "Really {user}? Self-violence? That's just masochism with extra steps! Pick someone else to slap! 😅",
    "{user}, what's the logic here? 'Let me hurt myself for fun!' - Yeah, that's a no from me! 🙄"
  ],
  embedTitles: [
    "Bam! 👋 {user1} gives {user2} a reality check via slap! Wake up call delivered! 😄",
    "{user1} goes full soap opera and slaps {user2}! The betrayal! The drama! 📺",
    "Slap registered! {user1} tagged {user2} with a classic face-smack! Old school! 🏷️",
    "{user1} serves {user2} a knuckle sandwich... wait no, that's a slap! Close enough! 🥪👋",
    "Ooooh! 😲 {user1} just slapped {user2}! What did they do to deserve that? 👋😂",
    "SLAP FIGHT! {user1} starts the violence with a good smack to {user2}! Round one! 🥊",
    "{user1} channels their inner drama queen and slaps {user2}! So theatrical! 🎬",
    "Yikes! {user1} delivers justice via slap to {user2}! Swift and painful! ⚖️👋"
  ]
};

module.exports = {
  name: 'slap',
  description: 'Slap someone with a dramatic anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'slap', slapData, db);
  }
};