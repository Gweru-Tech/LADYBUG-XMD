const axios = require('axios');

async function currencyCommand(sock, chatId, message, args) {
    try {
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            await showCurrencyHelp(sock, chatId, message);
            return;
        }

        switch (action) {
            case 'convert':
            case 'cv':
                await convertCurrency(sock, chatId, message, args.slice(1));
                break;
                
            case 'rate':
                await getExchangeRate(sock, chatId, message, args.slice(1));
                break;
                
            case 'list':
                await listCurrencies(sock, chatId, message);
                break;
                
            case 'popular':
                await showPopularRates(sock, chatId, message);
                break;
                
            default:
                await showCurrencyHelp(sock, chatId, message);
        }
    } catch (error) {
        console.error('Error in currency command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to process currency command!' });
    }
}

async function showCurrencyHelp(sock, chatId, message) {
    const helpText = `*💱 Currency Commands*\n\n` +
                    `• \`.currency convert <amount> <from> <to>\` - Convert currency\n` +
                    `• \`.currency rate <from> <to>\` - Get exchange rate\n` +
                    `• \`.currency list\` - List all available currencies\n` +
                    `• \`.currency popular\` - Show popular exchange rates\n\n` +
                    `*Examples:*\n` +
                    `• .currency convert 100 USD EUR\n` +
                    `• .currency convert 50 BTC USD\n` +
                    `• .currency rate USD EUR\n\n` +
                    `*Popular Codes:*\n` +
                    `USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, BTC, ETH`;

    await sock.sendMessage(chatId, { text: helpText, ...global.channelInfo }, { quoted: message });
}

async function convertCurrency(sock, chatId, message, args) {
    if (args.length < 3) {
        await sock.sendMessage(chatId, { 
            text: '❌ Usage: .currency convert <amount> <from> <to>\nExample: .currency convert 100 USD EUR' 
        });
        return;
    }

    const amount = parseFloat(args[0]);
    const from = args[1].toUpperCase();
    const to = args[2].toUpperCase();

    if (isNaN(amount)) {
        await sock.sendMessage(chatId, { text: '❌ Invalid amount!' });
        return;
    }

    try {
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
        const rates = response.data.rates;
        
        if (!rates[to]) {
            await sock.sendMessage(chatId, { 
                text: `❌ Currency "${to}" not found! Use .currency list to see available currencies.` 
            });
            return;
        }

        const result = amount * rates[to];
        const rate = rates[to];
        
        const text = `*💱 Currency Conversion*\n\n` +
                    `${amount} ${from} = ${result.toFixed(2)} ${to}\n\n` +
                    `📊 Exchange Rate: 1 ${from} = ${rate} ${to}\n` +
                    `🕐 Last Updated: ${new Date(response.data.date).toLocaleString()}`;

        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error converting currency:', error);
        
        // Try alternative API
        try {
            const response = await axios.get(`https://open.er-api.com/v6/latest/${from}`);
            const rates = response.data.rates;
            
            if (!rates[to]) {
                await sock.sendMessage(chatId, { 
                    text: `❌ Currency "${to}" not found! Use .currency list to see available currencies.` 
                });
                return;
            }

            const result = amount * rates[to];
            const rate = rates[to];
            
            const text = `*💱 Currency Conversion*\n\n` +
                        `${amount} ${from} = ${result.toFixed(2)} ${to}\n\n` +
                        `📊 Exchange Rate: 1 ${from} = ${rate} ${to}\n` +
                        `🕐 Last Updated: ${new Date(response.data.last_update).toLocaleString()}`;

            await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
        } catch (altError) {
            await sock.sendMessage(chatId, { text: '❌ Failed to get exchange rates. Please try again later.' });
        }
    }
}

async function getExchangeRate(sock, chatId, message, args) {
    if (args.length < 2) {
        await sock.sendMessage(chatId, { 
            text: '❌ Usage: .currency rate <from> <to>\nExample: .currency rate USD EUR' 
        });
        return;
    }

    const from = args[0].toUpperCase();
    const to = args[1].toUpperCase();

    try {
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
        const rates = response.data.rates;
        
        if (!rates[to]) {
            await sock.sendMessage(chatId, { 
                text: `❌ Currency not found! Use .currency list to see available currencies.` 
            });
            return;
        }

        const rate = rates[to];
        
        const text = `*💱 Exchange Rate*\n\n` +
                    `1 ${from} = ${rate} ${to}\n` +
                    `1 ${to} = ${(1/rate).toFixed(6)} ${from}\n\n` +
                    `🕐 Last Updated: ${new Date(response.data.date).toLocaleString()}`;

        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting exchange rate:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get exchange rate. Please try again later.' });
    }
}

async function listCurrencies(sock, chatId, message) {
    const currencies = [
        '🇺🇸 USD - US Dollar',
        '🇪🇺 EUR - Euro',
        '🇬🇧 GBP - British Pound',
        '🇯🇵 JPY - Japanese Yen',
        '🇨🇦 CAD - Canadian Dollar',
        '🇦🇺 AUD - Australian Dollar',
        '🇨🇭 CHF - Swiss Franc',
        '🇨🇳 CNY - Chinese Yuan',
        '🇮🇳 INR - Indian Rupee',
        '🇧🇷 BRL - Brazilian Real',
        '🇷🇺 RUB - Russian Ruble',
        '🇰🇷 KRW - South Korean Won',
        '🇲🇽 MXN - Mexican Peso',
        '🇸🇬 SGD - Singapore Dollar',
        '🇭🇰 HKD - Hong Kong Dollar',
        '🇳🇴 NOK - Norwegian Krone',
        '🇸🇪 SEK - Swedish Krona',
        '🇩🇰 DKK - Danish Krone',
        '🇳🇿 NZD - New Zealand Dollar',
        '🇿🇦 ZAR - South African Rand',
        '🇹🇷 TRY - Turkish Lira',
        '🇸🇦 SAR - Saudi Riyal',
        '🇦🇪 AED - UAE Dirham',
        '🇹🇭 THB - Thai Baht',
        '🇮🇩 IDR - Indonesian Rupiah',
        '🇲🇾 MYR - Malaysian Ringgit',
        '🇵🇭 PHP - Philippine Peso',
        '🇻🇳 VND - Vietnamese Dong',
        '₿ BTC - Bitcoin',
        'Ξ ETH - Ethereum'
    ];

    let text = `*💱 Available Currencies*\n\n`;
    currencies.forEach(currency => {
        text += `${currency}\n`;
    });

    await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
}

async function showPopularRates(sock, chatId, message) {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        const rates = response.data.rates;
        
        const popularCurrencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BTC'];
        
        let text = `*💱 Popular Exchange Rates (USD Base)*\n\n`;
        text += `🕐 Updated: ${new Date(response.data.date).toLocaleString()}\n\n`;
        
        popularCurrencies.forEach(currency => {
            if (rates[currency]) {
                const rate = rates[currency];
                text += `📍 1 USD = ${rate} ${currency}\n`;
            }
        });

        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting popular rates:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get exchange rates. Please try again later.' });
    }
}

module.exports = { currencyCommand };