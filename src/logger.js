// Beautiful logging utility for LUXBOT

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

const logger = {
  // ASCII Art
  printBanner() {
    console.log(`
${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║              🎰 CODE NEST - LUXBOT ECONOMY ENGINE 🎰           ║
║                                                                ║
║                   Discord Economy Bot v1.0                    ║
║                   Ready to dominate servers                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}
    `);
  },

  // Success logs
  success(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
  },

  // Error logs
  error(message) {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
  },

  // Warning logs
  warn(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  },

  // Info logs
  info(message) {
    console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
  },

  // Loading logs
  loading(message) {
    console.log(`${colors.cyan}⏳ ${message}${colors.reset}`);
  },

  // Status update logs
  status(number, total, message) {
    console.log(`${colors.magenta}📊 Status [${number}/${total}]: ${message}${colors.reset}`);
  },

  // Database logs
  database(message) {
    console.log(`${colors.bright}🗄️  ${message}${colors.reset}`);
  },

  // Command loaded
  commandReady(name) {
    console.log(`${colors.green}  ✓${colors.reset} ${name}`);
  },

  // System ready
  systemReady(name) {
    console.log(`${colors.green}${colors.bright}🚀 ${name}${colors.reset}`);
  },

  // Section header
  section(title) {
    console.log(`\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  },

  // Stock update
  stock(symbol, action) {
    console.log(`${colors.cyan}  📈 ${symbol} - ${action}${colors.reset}`);
  },

  // Divider
  divider() {
    console.log(`${colors.dim}─────────────────────────────────────${colors.reset}`);
  }
};

module.exports = logger;
