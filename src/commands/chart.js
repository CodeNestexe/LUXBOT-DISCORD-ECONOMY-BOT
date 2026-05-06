const { EmbedBuilder } = require('discord.js');
const QuickChart = require('quickchart-js');

module.exports = {
  name: 'chart',
  aliases: ['graph'],
  async execute(message, args, db) {
    try {
      if (!args[0]) {
        return message.reply('❌ Usage: `X chart {stock_symbol}`\nExample: `X chart LOF`');
      }

      const symbol = args[0].toUpperCase();

      // Stock names dictionary
      const STOCK_NAMES = {
        LOF: 'Land Of Fire',
        JD: 'Jan\'s Dungeon',
        INDI: 'indi.host',
        TKI: 'Tasknode.io',
        LUX: 'LUX Inc'
      };

      if (!STOCK_NAMES[symbol]) {
        const validSymbols = Object.keys(STOCK_NAMES).join(', ');
        return message.reply(`❌ Invalid stock symbol. Available: ${validSymbols}`);
      }

      // Get stock data with price history
      const dbInstance = await db.getDB();
      const stocksCollection = dbInstance.collection('stocks');
      const marketData = await stocksCollection.findOne({ type: 'market' });
      
      if (!marketData) {
        return message.reply('❌ Stock market is currently unavailable.');
      }

      const stock = marketData.stocks.find(s => s.symbol === symbol);
      if (!stock) {
        return message.reply(`❌ Stock data not found for ${symbol}.`);
      }

      // Get or generate price history (last 30 data points)
      let priceHistory = stock.priceHistory || [];
      
      // If no history exists, create sample data based on current price
      if (priceHistory.length === 0) {
        priceHistory = generateSamplePriceHistory(stock.price);
        // Optionally save this to database
      }

      // Use last 20 points for chart
      const chartData = priceHistory.slice(-20);
      const timeLabels = chartData.map((_, index) => `${index + 1}`);

      // Determine chart color based on trend
      const firstPrice = chartData[0];
      const lastPrice = chartData[chartData.length - 1];
      const isUptrend = lastPrice > firstPrice;
      
      const chartColor = isUptrend ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
      const fillColor = isUptrend ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

      // Create chart configuration
      const chartConfig = {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [{
            label: `${symbol} Price`,
            data: chartData,
            borderColor: chartColor,
            backgroundColor: fillColor,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 6,
            pointBackgroundColor: chartColor,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Time Period',
                color: '#6b7280',
                font: {
                  size: 12,
                  weight: 'bold'
                }
              },
              grid: {
                display: false
              },
              ticks: {
                color: '#9ca3af'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Price (LUX)',
                color: '#6b7280',
                font: {
                  size: 12,
                  weight: 'bold'
                }
              },
              grid: {
                color: 'rgba(156, 163, 175, 0.2)',
                drawBorder: false
              },
              ticks: {
                color: '#9ca3af',
                callback: function(value) {
                  return value.toLocaleString() + ' LUX';
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: `${symbol} - ${STOCK_NAMES[symbol]} Price Chart`,
              color: '#1f2937',
              font: {
                size: 16,
                weight: 'bold'
              },
              padding: {
                bottom: 20
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      };

      // Generate chart using QuickChart
      const chart = new QuickChart();
      chart.setConfig(chartConfig);
      chart.setWidth(800);
      chart.setHeight(500);
      chart.setBackgroundColor('white');

      const chartUrl = chart.getUrl();

      // Calculate price change info
      const priceChange = lastPrice - firstPrice;
      const changePercent = ((priceChange / firstPrice) * 100);
      const trendEmoji = isUptrend ? '📈' : '📉';
      const changeSign = priceChange >= 0 ? '+' : '';

      // Create embed with chart
      const embed = new EmbedBuilder()
        .setTitle(`${trendEmoji} ${symbol} - ${STOCK_NAMES[symbol]}`)
        .setDescription(
          `**Current Price:** ${stock.price.toLocaleString()} <:lux:1411637514569252894>\n` +
          `**Price Change:** ${changeSign}${priceChange.toLocaleString()} <:lux:1411637514569252894> (${changeSign}${changePercent.toFixed(1)}%)\n` +
          `**Chart Period:** Last 20 updates`
        )
        .setImage(chartUrl)
        .setColor(isUptrend ? '#22C55E' : '#EF4444')
        .setFooter({ text: 'Chart updates every 5 minutes with new price data' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating stock chart:', error);
      await message.reply('❌ Error generating stock chart. Please try again later.');
    }
  },
};

// Generate sample price history based on current price
function generateSamplePriceHistory(currentPrice, points = 30) {
  const history = [];
  let price = currentPrice;
  
  // Work backwards to create realistic price movement
  for (let i = points - 1; i >= 0; i--) {
    // Random price change between -5% to +5%
    const changePercent = (Math.random() - 0.5) * 0.1;
    price = Math.round(price * (1 + changePercent));
    
    // Ensure price doesn't go too low
    if (price < currentPrice * 0.5) {
      price = Math.round(currentPrice * (0.5 + Math.random() * 0.3));
    }
    
    history.unshift(price);
  }
  
  // Make sure the last price is the current price
  history[history.length - 1] = currentPrice;
  
  return history;
}
