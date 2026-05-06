const OPTION_TYPES = {
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
  CHANNEL: 7,
  ROLE: 8,
  MENTIONABLE: 9,
  NUMBER: 10,
};

const SPECIAL_OPTIONS = {
  prefix: [
    { type: OPTION_TYPES.STRING, name: 'newprefix', description: 'New server prefix', required: false },
  ],
  add: [
    { type: OPTION_TYPES.USER, name: 'user', description: 'User to invite', required: true },
  ],
  give: [
    { type: OPTION_TYPES.USER, name: 'user', description: 'User to receive Lux', required: true },
    { type: OPTION_TYPES.INTEGER, name: 'amount', description: 'Amount of Lux', required: true },
  ],
  setlux: [
    { type: OPTION_TYPES.INTEGER, name: 'amount', description: 'New Lux balance', required: true },
    { type: OPTION_TYPES.USER, name: 'user', description: 'Target user', required: true },
  ],
  adminaddlux: [
    { type: OPTION_TYPES.INTEGER, name: 'amount', description: 'Amount of Lux to add', required: true },
    { type: OPTION_TYPES.USER, name: 'user', description: 'Target user', required: true },
  ],
  kick: [
    { type: OPTION_TYPES.USER, name: 'user', description: 'User to kick', required: true },
  ],
  promote: [
    { type: OPTION_TYPES.USER, name: 'user', description: 'User to promote', required: true },
  ],
  demote: [
    { type: OPTION_TYPES.USER, name: 'user', description: 'User to demote', required: true },
  ],
  disable: [
    { type: OPTION_TYPES.CHANNEL, name: 'channel', description: 'Channel to disable', required: true },
  ],
  enable: [
    { type: OPTION_TYPES.CHANNEL, name: 'channel', description: 'Channel to enable', required: true },
  ],
  stocknotify: [
    { type: OPTION_TYPES.CHANNEL, name: 'channel', description: 'Channel for stock alerts', required: true },
  ],
  removenotifier: [
    { type: OPTION_TYPES.CHANNEL, name: 'channel', description: 'Channel to remove alerts from', required: true },
  ],
  ban: [
    { type: OPTION_TYPES.USER, name: 'user', description: 'User to ban', required: true },
    { type: OPTION_TYPES.STRING, name: 'duration', description: 'Ban duration like 10m, 2h, or 1d', required: false },
    { type: OPTION_TYPES.STRING, name: 'reason', description: 'Ban reason', required: false },
  ],
  unban: [
    { type: OPTION_TYPES.USER, name: 'user', description: 'User to unban', required: true },
    { type: OPTION_TYPES.STRING, name: 'reason', description: 'Unban reason', required: false },
  ],
};

function normalizeSlashName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function buildOptionsForCommand(commandName) {
  const specialOptions = SPECIAL_OPTIONS[commandName];
  if (specialOptions) {
    return specialOptions;
  }

  return [
    { type: OPTION_TYPES.STRING, name: 'args', description: 'Command arguments', required: false },
  ];
}

function buildSlashPayload(command, slashName, baseName) {
  const description = String(command.description || `Run ${slashName}`).slice(0, 100);
  const options = buildOptionsForCommand(baseName).map(option => ({
    type: option.type,
    name: option.name,
    description: String(option.description || option.name).slice(0, 100),
    required: Boolean(option.required),
  }));

  const payload = {
    name: slashName,
    description: description || `Run ${slashName}`,
  };

  if (options.length > 0) {
    payload.options = options;
  }

  return payload;
}

async function resolveMentionCollections(rawArgs, client, guild) {
  const userIds = [...new Set([...String(rawArgs || '').matchAll(/<@!?(\d+)>/g)].map(match => match[1]))];
  const channelIds = [...new Set([...String(rawArgs || '').matchAll(/<#(\d+)>/g)].map(match => match[1]))];

  const users = [];
  for (const userId of userIds) {
    const cachedUser = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
    if (cachedUser) users.push(cachedUser);
  }

  const channels = [];
  if (guild) {
    for (const channelId of channelIds) {
      const cachedChannel = guild.channels.cache.get(channelId);
      if (cachedChannel) channels.push(cachedChannel);
    }
  }

  const members = [];
  if (guild) {
    for (const user of users) {
      const cachedMember = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
      if (cachedMember) members.push(cachedMember);
    }
  }

  return {
    users: {
      size: users.length,
      first: () => users[0] || null,
      values: () => users.values(),
    },
    channels: {
      size: channels.length,
      first: () => channels[0] || null,
      values: () => channels.values(),
    },
    members: {
      size: members.length,
      first: () => members[0] || null,
      values: () => members.values(),
    },
  };
}

function optionToRawValue(interaction, optionName, optionType) {
  if (optionType === OPTION_TYPES.USER) {
    const user = interaction.options.getUser(optionName);
    return user ? `<@${user.id}>` : '';
  }

  if (optionType === OPTION_TYPES.CHANNEL) {
    const channel = interaction.options.getChannel(optionName);
    return channel ? `<#${channel.id}>` : '';
  }

  if (optionType === OPTION_TYPES.INTEGER) {
    const value = interaction.options.getInteger(optionName);
    return value === null || value === undefined ? '' : String(value);
  }

  if (optionType === OPTION_TYPES.NUMBER) {
    const value = interaction.options.getNumber(optionName);
    return value === null || value === undefined ? '' : String(value);
  }

  const value = interaction.options.getString(optionName);
  return value ? String(value).trim() : '';
}

function buildRawArgs(interaction, slashName) {
  const options = buildOptionsForCommand(slashName);

  if (slashName === 'prefix') {
    return optionToRawValue(interaction, 'newprefix', OPTION_TYPES.STRING);
  }

  if (slashName === 'add') {
    return optionToRawValue(interaction, 'user', OPTION_TYPES.USER);
  }

  if (slashName === 'give') {
    const user = optionToRawValue(interaction, 'user', OPTION_TYPES.USER);
    const amount = optionToRawValue(interaction, 'amount', OPTION_TYPES.INTEGER);
    return `${user} ${amount}`.trim();
  }

  if (slashName === 'setlux') {
    const amount = optionToRawValue(interaction, 'amount', OPTION_TYPES.INTEGER);
    const user = optionToRawValue(interaction, 'user', OPTION_TYPES.USER);
    return `${amount} ${user}`.trim();
  }

  if (slashName === 'adminaddlux') {
    const amount = optionToRawValue(interaction, 'amount', OPTION_TYPES.INTEGER);
    const user = optionToRawValue(interaction, 'user', OPTION_TYPES.USER);
    return `addlux ${amount} ${user}`.trim();
  }

  if (slashName === 'kick' || slashName === 'promote' || slashName === 'demote') {
    return optionToRawValue(interaction, 'user', OPTION_TYPES.USER);
  }

  if (slashName === 'disable' || slashName === 'enable' || slashName === 'stocknotify' || slashName === 'removenotifier') {
    return optionToRawValue(interaction, 'channel', OPTION_TYPES.CHANNEL);
  }

  if (slashName === 'ban') {
    const user = optionToRawValue(interaction, 'user', OPTION_TYPES.USER);
    const duration = optionToRawValue(interaction, 'duration', OPTION_TYPES.STRING);
    const reason = optionToRawValue(interaction, 'reason', OPTION_TYPES.STRING);
    return [user, duration, reason].filter(Boolean).join(' ');
  }

  if (slashName === 'unban') {
    const user = optionToRawValue(interaction, 'user', OPTION_TYPES.USER);
    const reason = optionToRawValue(interaction, 'reason', OPTION_TYPES.STRING);
    return [user, reason].filter(Boolean).join(' ');
  }

  const genericArgs = optionToRawValue(interaction, 'args', OPTION_TYPES.STRING);
  return genericArgs;
}

function buildPermissionFacade(rawPermissions) {
  const permissionBits = BigInt(rawPermissions || 0);
  const stringPermissionMap = {
    Administrator: 1n << 3n,
    ManageChannels: 1n << 4n,
    ManageGuild: 1n << 5n,
    ViewChannel: 1n << 10n,
    SendMessages: 1n << 11n,
  };

  return {
    has: (permission) => {
      let requiredBits = 0n;

      if (typeof permission === 'bigint') {
        requiredBits = permission;
      } else if (typeof permission === 'number') {
        requiredBits = BigInt(permission);
      } else if (typeof permission === 'string') {
        requiredBits = stringPermissionMap[permission] || 0n;
      } else if (permission && typeof permission.bitfield !== 'undefined') {
        requiredBits = BigInt(permission.bitfield);
      } else if (Array.isArray(permission)) {
        return permission.every(p => buildPermissionFacade(rawPermissions).has(p));
      }

      if (requiredBits === 0n) {
        return false;
      }

      return (permissionBits & requiredBits) === requiredBits;
    },
  };
}

function createSlashMessage(interaction, rawArgs, member) {
  let replyCount = 0;

  return {
    author: interaction.user,
    member,
    guild: interaction.guild,
    channel: interaction.channel,
    client: interaction.client,
    content: `${interaction.commandName}${rawArgs ? ` ${rawArgs}` : ''}`.trim(),
    mentions: null,
    reply: async payload => {
      replyCount += 1;
      if (replyCount === 1) {
        return interaction.editReply(payload);
      }
      return interaction.followUp(payload);
    },
    delete: async () => interaction.deleteReply().catch(() => {}),
  };
}

async function registerSlashCommands(client) {
  const registry = new Map();
  const payloads = [];
  const seenBaseNames = new Set();

  for (const [commandKey, command] of client.commands.entries()) {
    if (!command || typeof command.execute !== 'function') {
      continue;
    }

    const slashName = normalizeSlashName(command.name || commandKey);
    if (!slashName || registry.has(slashName)) {
      continue;
    }

    if (seenBaseNames.has(slashName)) {
      continue;
    }

    seenBaseNames.add(slashName);

    const payload = buildSlashPayload(command, slashName, slashName);
    registry.set(slashName, {
      command,
      commandKey,
      baseName: slashName,
      payload,
    });
    payloads.push(payload);
  }

  client.slashCommands = registry;
  return payloads;
}

async function createSlashInvocationContext(interaction) {
  const entry = interaction.client.slashCommands?.get(interaction.commandName);
  if (!entry) {
    return null;
  }

  const rawArgs = buildRawArgs(interaction, entry.baseName);
  let member = interaction.member;
  if (interaction.guild && (!member || typeof member.permissions?.has !== 'function')) {
    const fetchedMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (fetchedMember) {
      member = fetchedMember;
    }
  }

  if (member && typeof member.permissions?.has !== 'function') {
    const rawPermissions = member.permissions;
    member = {
      ...member,
      permissions: buildPermissionFacade(rawPermissions),
    };
  }

  const slashMessage = createSlashMessage(interaction, rawArgs, member);
  slashMessage.mentions = await resolveMentionCollections(rawArgs, interaction.client, interaction.guild);

  let replied = false;
  await interaction.deferReply({ ephemeral: false });

  const originalReply = slashMessage.reply;
  slashMessage.reply = async payload => {
    replied = true;
    return originalReply(payload);
  };

  return {
    entry,
    message: slashMessage,
    args: rawArgs ? rawArgs.trim().split(/ +/).filter(Boolean) : [],
    hasReplied: () => replied,
    cleanup: async () => {
      if (!replied) {
        await interaction.deleteReply().catch(() => {});
      }
    },
  };
}

module.exports = {
  registerSlashCommands,
  createSlashInvocationContext,
  normalizeSlashName,
};
