const { executeFunCommand } = require('./funBase.js');

const handholdData = {
  endpoint: 'https://api.waifu.pics/sfw/handhold',
  color: '#FFC0CB',
  selfMessages: [
    "Aww {user}, holding your own hand is cute but kinda sad! You deserve someone real to hold hands with! 🥺",
    "{user}, if you're holding hands with a ghost girlfriend, introduce us! If not, find someone with a pulse! 👻💕",
    "Hey {user}, self hand-holding doesn't count as romance! Go find someone whose hand you can actually hold! 😊",
    "{user}, that's either the sweetest self-comfort or the loneliest thing ever! Find a real hand to hold! 💖",
    "{user}, are you holding your own hands or do you have some ghost girlfriend there? 👻 Either way, that's pretty sad! 😂",
    "Wait {user}, holding your own hand? Do you have an invisible partner or are you just that lonely? Find a real person! 🤭",
    "{user}, buddy, self hand-holding is either really sweet self-love or you're dating a ghost! Which is it? 😅",
    "Really {user}? Holding your own hand? Are you practicing for when you meet actual people? That's... dedication! 🙄"
  ],
  embedTitles: [
    "🥰 {user1} and {user2} hold hands! Here we witness two souls becoming one beautiful entity! So touching! 💝",
    "Hand in hand! {user1} and {user2} create the most precious connection! Two becoming one forever! 😭💕",
    "{user1} grasps {user2}'s hand with such tenderness! Two hearts beating as one! Ultimate romance! 💓",
    "Perfect unity! {user1} and {user2}'s hands meet and two souls merge into eternal oneness! Breathtaking! ✨",
    "💕 {user1} gently holds {user2}'s hand! And here we have two souls becoming one! Pure magic! ✨",
    "Aww! {user1} and {user2} intertwine their fingers! Two hearts, one connection! So beautiful! 💖",
    "{user1} takes {user2}'s hand in theirs! Two souls finding each other in perfect harmony! Destiny! 🌟",
    "Beautiful moment! {user1} holds {user2}'s hand and two spirits unite as one! Love transcends! 💫"
  ]
};

module.exports = {
  name: 'handhold',
  description: 'Hold hands with someone in a romantic anime GIF!',
  async execute(message, args, db) {
    await executeFunCommand(message, 'handhold', handholdData, db);
  }
};