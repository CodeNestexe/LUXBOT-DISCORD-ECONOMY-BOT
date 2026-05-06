const cooldowns = new Map(); // Store user cooldowns

class CooldownManager {
  constructor(defaultCooldown = 5000) { // 5 seconds
    this.defaultCooldown = defaultCooldown;
  }

  // Check if user can run command
  canUseCommand(userId, commandName) {
    const key = `${userId}-${commandName}`;
    const now = Date.now();
    
    if (!cooldowns.has(key)) {
      // First time using this command
      cooldowns.set(key, now);
      return { allowed: true };
    }

    const lastUsed = cooldowns.get(key);
    const timeLeft = (lastUsed + this.defaultCooldown) - now;

    if (timeLeft <= 0) {
      // Cooldown expired, allow command
      cooldowns.set(key, now);
      return { allowed: true };
    } else {
      // Still on cooldown
      return { 
        allowed: false, 
        timeLeft: Math.ceil(timeLeft / 1000) // Convert to seconds
      };
    }
  }

  // Clean up old cooldowns (optional optimization)
  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of cooldowns.entries()) {
      if (now - timestamp > this.defaultCooldown) {
        cooldowns.delete(key);
      }
    }
  }
}

// Create global cooldown manager instance
const cooldownManager = new CooldownManager(5000); // 5 seconds

// Helper function for easy integration
async function checkCommandCooldown(message, commandName) {
  const result = cooldownManager.canUseCommand(message.author.id, commandName);
  
  if (!result.allowed) {
    // Send cooldown message with auto-delete
    try {
      const cooldownMessage = await message.reply(`You can send next command after **${result.timeLeft}s**`);
      
      // Auto-delete after 3 seconds
      setTimeout(() => {
        cooldownMessage.delete().catch(() => {
          // Ignore delete errors
        });
      }, 3000);
    } catch (error) {
      console.error('Error sending cooldown message:', error);
    }
    
    return false; // Block command execution
  }
  
  return true; // Allow command execution
}

module.exports = { cooldownManager, checkCommandCooldown };
