const fs = require('fs');
const path = require('path');

function collectUsedCustomEmojiNames(rootDir) {
  const names = new Set();
  const emojiPattern = /<a?:([A-Za-z0-9_]+):\d+>/g;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.js')) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      emojiPattern.lastIndex = 0;
      let match;
      while ((match = emojiPattern.exec(content)) !== null) {
        names.add(match[1]);
      }
    }
  }

  walk(rootDir);
  return names;
}

async function syncEmojiToGuild(sourceEmoji, targetGuild, logger) {
  const existingEmoji = targetGuild.emojis.cache.find(emoji => emoji.name === sourceEmoji.name);
  if (existingEmoji) {
    return { synced: false, reason: 'exists' };
  }

  const emojiLimit = typeof targetGuild.maximumEmojis === 'number' ? targetGuild.maximumEmojis : null;
  if (emojiLimit !== null && targetGuild.emojis.cache.size >= emojiLimit) {
    return { synced: false, reason: 'guild-full' };
  }

  const response = await fetch(sourceEmoji.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch emoji image: ${sourceEmoji.name}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await targetGuild.emojis.create({ attachment: buffer, name: sourceEmoji.name }, `Emoji sync from ${sourceEmoji.guild?.name || 'source guild'}`);

  if (logger) {
    logger.info(`Synced emoji ${sourceEmoji.name} to ${targetGuild.name}`);
  }

  return { synced: true };
}

async function syncCustomEmojis(client, logger) {
  const enabled = String(process.env.SYNC_EMOJI || 'false').toLowerCase() === 'true';
  if (!enabled) {
    return { skipped: true, reason: 'disabled' };
  }

  const sourceGuildIds = String(process.env.EMOJI_SOURCE_GUILD_ID || process.env.GUILD_ID || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (sourceGuildIds.length === 0) {
    if (logger) {
      logger.warn('SYNC_EMOJI is enabled but EMOJI_SOURCE_GUILD_ID or GUILD_ID is not set.');
    }
    return { skipped: true, reason: 'missing-source' };
  }

  const sourceGuilds = [];
  for (const sourceGuildId of sourceGuildIds) {
    const sourceGuild = await client.guilds.fetch(sourceGuildId).catch(() => null);
    if (!sourceGuild) {
      if (logger) {
        logger.warn(`Emoji source guild not found: ${sourceGuildId}`);
      }
      continue;
    }
    sourceGuilds.push(sourceGuild);
  }

  if (sourceGuilds.length === 0) {
    throw new Error(`Emoji source guilds not found: ${sourceGuildIds.join(', ')}`);
  }

  const usedNames = collectUsedCustomEmojiNames(path.join(__dirname));
  const emojisByName = new Map();

  for (const sourceGuild of sourceGuilds) {
    const sourceEmojis = await sourceGuild.emojis.fetch();
    for (const emoji of sourceEmojis.values()) {
      if (!usedNames.has(emoji.name) || emojisByName.has(emoji.name)) {
        continue;
      }
      emojisByName.set(emoji.name, emoji);
    }
  }

  const emojisToSync = Array.from(emojisByName.values());
  const sourceGuildIdSet = new Set(sourceGuilds.map(guild => guild.id));
  // Build an in-memory emoji URL cache on the client so the bot can use
  // emoji images without needing to upload them to each guild.
  // By default we DO NOT upload into guilds. To enable upload, set
  // `SYNC_EMOJI_UPLOAD=true` in your .env.
  client.emojiCache = client.emojiCache || new Map();
  for (const emoji of emojisToSync) {
    // Prefer the source emoji CDN URL (format depends on animated)
    client.emojiCache.set(emoji.name, emoji.url);
    client.emojiCache.set(String(emoji.id), emoji.url);
  }

  if (logger) {
    logger.success(`Emoji cache populated: ${emojisToSync.length} emoji(s) available for use`);
  }

  const shouldUpload = String(process.env.SYNC_EMOJI_UPLOAD || 'false').toLowerCase() === 'true';
  if (!shouldUpload) {
    return { cachedCount: emojisToSync.length };
  }

  // Optional: upload to guilds if explicitly enabled
  if (logger) {
    logger.loading(`Uploading ${emojisToSync.length} emoji(s) to guilds (upload mode enabled)...`);
  }

  let uploaded = 0;
  let uploadSkipped = 0;
  for (const guild of client.guilds.cache.values()) {
    if (sourceGuildIdSet.has(guild.id)) continue;
    try {
      await guild.emojis.fetch();
      for (const emoji of emojisToSync) {
        try {
          const result = await syncEmojiToGuild(emoji, guild, logger);
          if (result.synced) uploaded++; else uploadSkipped++;
        } catch (e) {
          uploadSkipped++;
          if (logger) logger.warn(`Upload failed ${emoji.name} -> ${guild.name}: ${e.message}`);
        }
      }
    } catch (e) {
      if (logger) logger.warn(`Skipping upload for ${guild.name}: ${e.message}`);
    }
  }

  if (logger) logger.success(`Emoji upload completed: ${uploaded} uploaded, ${uploadSkipped} skipped`);

  return { cachedCount: emojisToSync.length, uploaded, uploadSkipped };
}

module.exports = {
  syncCustomEmojis,
};
