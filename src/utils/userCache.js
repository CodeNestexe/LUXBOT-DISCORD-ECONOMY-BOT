// 🚀 HIGH-PERFORMANCE USER CACHE SYSTEM
// File: /utils/userCache.js

class UserCache {
  constructor() {
    // Cache storage
    this.registeredUsers = new Set();      // Users who exist & are registered
    this.unregisteredUsers = new Set();    // Users who don't exist or aren't registered
    this.cacheTimestamps = new Map();      // When each user was cached
    
    // Cache configuration
    this.REGISTERED_TTL = 24 * 60 * 60 * 1000;    // 24 hours
    this.UNREGISTERED_TTL = 30 * 60 * 1000;       // 30 minutes
    this.CLEANUP_INTERVAL = 15 * 60 * 1000;       // 15 minutes
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      totalQueries: 0,
      get hitRate() { 
        return this.totalQueries > 0 ? (this.hits / this.totalQueries * 100).toFixed(1) + '%' : '0%';
      }
    };
    
    // Start automatic cleanup
    this.startCleanup();
    
    console.log('🚀 UserCache initialized successfully');
  }
  
  // 🔍 Main function: Check if user is cached
  checkUser(userId) {
    this.stats.totalQueries++;
    
    const now = Date.now();
    const cacheTime = this.cacheTimestamps.get(userId);
    
    // Check registered users cache
    if (this.registeredUsers.has(userId)) {
      if (cacheTime && (now - cacheTime) < this.REGISTERED_TTL) {
        this.stats.hits++;
        return 'REGISTERED'; // User is definitely registered
      } else {
        // Cache expired
        this.registeredUsers.delete(userId);
        this.cacheTimestamps.delete(userId);
      }
    }
    
    // Check unregistered users cache
    if (this.unregisteredUsers.has(userId)) {
      if (cacheTime && (now - cacheTime) < this.UNREGISTERED_TTL) {
        this.stats.hits++;
        return 'UNREGISTERED'; // User is definitely not registered
      } else {
        // Cache expired
        this.unregisteredUsers.delete(userId);
        this.cacheTimestamps.delete(userId);
      }
    }
    
    this.stats.misses++;
    return 'UNKNOWN'; // Need to check database
  }
  
  // 📝 Cache user as registered
  cacheRegistered(userId) {
    this.unregisteredUsers.delete(userId); // Remove from unregistered if exists
    this.registeredUsers.add(userId);
    this.cacheTimestamps.set(userId, Date.now());
    // Minimal logging - only for first 50 users, then every 100th
    if (this.registeredUsers.size <= 50 || this.registeredUsers.size % 100 === 0) {
      console.log(`✅ Cached user as REGISTERED (Total: ${this.registeredUsers.size})`);
    }
  }
  
  // 📝 Cache user as unregistered
  cacheUnregistered(userId) {
    this.registeredUsers.delete(userId); // Remove from registered if exists
    this.unregisteredUsers.add(userId);
    this.cacheTimestamps.set(userId, Date.now());
    // Minimal logging - only for first 100 users, then every 500th
    if (this.unregisteredUsers.size <= 100 || this.unregisteredUsers.size % 500 === 0) {
      console.log(`❌ Cached user as UNREGISTERED (Total: ${this.unregisteredUsers.size})`);
    }
  }
  
  // 🧹 Cleanup expired entries
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [userId, timestamp] of this.cacheTimestamps.entries()) {
      const isRegistered = this.registeredUsers.has(userId);
      const ttl = isRegistered ? this.REGISTERED_TTL : this.UNREGISTERED_TTL;
      
      if (now - timestamp > ttl) {
        this.registeredUsers.delete(userId);
        this.unregisteredUsers.delete(userId);
        this.cacheTimestamps.delete(userId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
    
    return cleanedCount;
  }
  
  // 🔄 Start automatic cleanup
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }
  
  // 📊 Get cache statistics
  getStats() {
    return {
      registeredCount: this.registeredUsers.size,
      unregisteredCount: this.unregisteredUsers.size,
      totalCached: this.registeredUsers.size + this.unregisteredUsers.size,
      hitRate: this.stats.hitRate,
      totalQueries: this.stats.totalQueries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      databaseSavings: this.stats.hits, // How many DB calls we avoided
      efficiency: this.stats.totalQueries > 0 ? ((this.stats.hits / this.stats.totalQueries) * 100).toFixed(1) + 'x faster' : '0x'
    };
  }
  
  // 🔄 Clear all cache (for testing)
  clear() {
    this.registeredUsers.clear();
    this.unregisteredUsers.clear();
    this.cacheTimestamps.clear();
    this.stats = { hits: 0, misses: 0, totalQueries: 0 };
    console.log('🗑️ Cache cleared completely');
  }
}

// Export singleton instance
module.exports = new UserCache();