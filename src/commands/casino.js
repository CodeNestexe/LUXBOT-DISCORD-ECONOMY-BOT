const createCommand = require('./create');
const infoCommand = require('./info');
const addCommand = require('./add');
const leaveCommand = require('./leave');
const deleteCommand = require('./delete');
const joinCommand = require('./join');
const kickCommand = require('./kick');
const promoteCommand = require('./promote');
const demoteCommand = require('./demote');
const bankCommand = require('./bank');
const donateCommand = require('./donate');
const dropCommand = require('./drop');
const memberinfoCommand = require('./memberinfo'); // NEW: Add memberinfo import

module.exports = {
  name: 'casino',
  description: 'Casino management commands',
  async execute(message, args, db) {
    console.log(`Received casino command: ${message.content}, args: ${args}`);
    if (args.length === 0) {
      console.log('No subcommand provided, replying with usage');
      return message.reply('Please provide a subcommand!\n**Usage:** `X casino {create|info|add|leave|delete|join|kick|promote|demote|bank|donate|drop|memberinfo} [args]`\n\n**Available Commands:**\n• `create` - Create a new casino\n• `info` - View casino information\n• `add` - Add a member to your casino\n• `leave` - Leave your current casino\n• `delete` - Delete your casino (owner only)\n• `join` - Join a casino with invite code\n• `kick` - Kick a member (owner/admin only)\n• `promote` - Promote member to admin (owner only)\n• `demote` - Demote admin to member (owner only)\n• `bank` - View casino bank balance\n• `donate` - Donate LUX to casino bank\n• `drop` - Drop LUX from casino to members\n• `memberinfo` - View all members and their ranks (owner/admin only)');
    }

    const subcommand = args[0].toLowerCase();
    console.log(`Processing subcommand: ${subcommand}`);

    try {
      switch (subcommand) {
        case 'create':
          await createCommand.execute(message, args.slice(1), db);
          break;
          
        case 'info':
          await infoCommand.execute(message, args.slice(1), db);
          break;
          
        case 'add':
          await addCommand.execute(message, args.slice(1), db);
          break;
          
        case 'leave':
          await leaveCommand.execute(message, args.slice(1), db);
          break;
          
        case 'delete':
          await deleteCommand.execute(message, args.slice(1), db);
          break;
          
        case 'join':
          await joinCommand.execute(message, args.slice(1), db);
          break;
          
        case 'kick':
          await kickCommand.execute(message, args.slice(1), db);
          break;
          
        case 'promote':
          await promoteCommand.execute(message, args.slice(1), db);
          break;
          
        case 'demote':
          await demoteCommand.execute(message, args.slice(1), db);
          break;
          
        case 'bank':
          await bankCommand.execute(message, args.slice(1), db);
          break;
          
        case 'donate':
          await donateCommand.execute(message, args.slice(1), db);
          break;
          
        case 'drop':
          await dropCommand.execute(message, args.slice(1), db);
          break;
          
        case 'memberinfo': // NEW: Add memberinfo case
          await memberinfoCommand.execute(message, args.slice(1), db);
          break;
          
        default:
          console.log('Invalid subcommand, replying with usage');
          await message.reply('❌ **Invalid subcommand!**\n\n**Usage:** `X casino {create|info|add|leave|delete|join|kick|promote|demote|bank|donate|drop|memberinfo} [args]`\n\n**Available Commands:**\n• `create` - Create a new casino\n• `info` - View casino information\n• `add` - Add a member to your casino\n• `leave` - Leave your current casino\n• `delete` - Delete your casino (owner only)\n• `join` - Join a casino with invite code\n• `kick` - Kick a member (owner/admin only)\n• `promote` - Promote member to admin (owner only)\n• `demote` - Demote admin to member (owner only)\n• `bank` - View casino bank balance\n• `donate` - Donate LUX to casino bank\n• `drop` - Drop LUX from casino to members\n• `memberinfo` - View all members and their ranks (owner/admin only)');
          break;
      }
      console.log(`Command casino ${subcommand} executed successfully`);
    } catch (error) {
      console.error(`Error executing casino ${subcommand}: ${error.message}`);
      await message.reply(`❌ **Error executing command:** ${error.message}\n\nIf this error persists, please contact the bot administrators.`);
    }
  },
};
