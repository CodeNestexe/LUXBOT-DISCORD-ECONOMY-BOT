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

  const sourceGuildId = process.env.EMOJI_SOURCE_GUILD_ID || process.env.GUILD_ID;
  if (!sourceGuildId) {
    if (logger) {
      logger.warn('SYNC_EMOJI is enabled but EMOJI_SOURCE_GUILD_ID is not set.');
    }
    return { skipped: true, reason: 'missing-source' };
  }

  const sourceGuild = await client.guilds.fetch(sourceGuildId).catch(() => null);
  if (!sourceGuild) {
    throw new Error(`Emoji source guild not found: ${sourceGuildId}`);
  }

  const usedNames = collectUsedCustomEmojiNames(path.join(__dirname));
  const sourceEmojis = await sourceGuild.emojis.fetch();
  const emojisToSync = sourceEmojis.filter(emoji => usedNames.has(emoji.name));

  if (logger) {
    logger.loading(`Syncing ${emojisToSync.size} custom emojis from ${sourceGuild.name}...`);
  }

  let syncedCount = 0;
  let skippedCount = 0;

  for (const guild of client.guilds.cache.values()) {
    if (guild.id === sourceGuild.id) {
      continue;
    }

    try {
      await guild.emojis.fetch();
      for (const emoji of emojisToSync.values()) {
        try {
          const result = await syncEmojiToGuild(emoji, guild, logger);
          if (result.synced) {
            syncedCount += 1;
          } else {
            skippedCount += 1;
          }
        } catch (emojiError) {
          skippedCount += 1;
          if (logger) {
            logger.warn(`Could not sync ${emoji.name} to ${guild.name}: ${emojiError.message}`);
          }
        }
      }
    } catch (guildError) {
      if (logger) {
        logger.warn(`Skipping emoji sync for ${guild.name}: ${guildError.message}`);
      }
    }
  }

  if (logger) {
    logger.success(`Emoji sync completed: ${syncedCount} synced, ${skippedCount} skipped`);
  }

  return { syncedCount, skippedCount };
}

module.exports = {
  syncCustomEmojis,
};