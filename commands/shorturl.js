const axios = require('axios');

async function shorturlCommand(sock, chatId, message, args) {
    try {
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            await showShortUrlHelp(sock, chatId, message);
            return;
        }

        switch (action) {
            case 'create':
            case 'shorten':
                await createShortUrl(sock, chatId, message, args.slice(1));
                break;
                
            case 'expand':
            case 'long':
                await expandShortUrl(sock, chatId, message, args[1]);
                break;
                
            case 'custom':
                await createCustomShortUrl(sock, chatId, message, args.slice(1));
                break;
                
            case 'qr':
                await createQrCode(sock, chatId, message, args[1]);
                break;
                
            case 'stats':
            case 'info':
                await getUrlStats(sock, chatId, message, args[1]);
                break;
                
            default:
                // If no action, treat as create
                await createShortUrl(sock, chatId, message, args);
        }
    } catch (error) {
        console.error('Error in shorturl command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to process URL command!' });
    }
}

async function showShortUrlHelp(sock, chatId, message) {
    const helpText = `*🔗 URL Shortener Commands*\n\n` +
                    `• \`.shorturl create <url>\` - Shorten URL\n` +
                    `• \`.shorturl expand <short-url>\` - Expand short URL\n` +
                    `• \`.shorturl custom <url> <alias>\` - Custom short URL\n` +
                    `• \`.shorturl qr <url>\` - Create QR code\n` +
                    `• \`.shorturl stats <short-url>\` - URL statistics\n\n` +
                    `*Examples:*\n` +
                    `• .shorturl create https://example.com/very/long/url\n` +
                    `• .shorturl custom https://example.com mylink\n` +
                    `• .shorturl qr https://example.com\n` +
                    `• .shorturl expand bit.ly/abc123`;

    await sock.sendMessage(chatId, { text: helpText, ...global.channelInfo }, { quoted: message });
}

async function createShortUrl(sock, chatId, message, args) {
    if (args.length === 0) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a URL to shorten!\nExample: .shorturl create https://example.com' 
        });
        return;
    }

    const url = args.join(' ');
    
    if (!isValidUrl(url)) {
        await sock.sendMessage(chatId, { text: '❌ Please provide a valid URL!' });
        return;
    }

    try {
        // Using tinyurl API (free, no API key required)
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        const shortUrl = response.data;
        
        let text = `*🔗 URL Shortened Successfully!*\n\n`;
        text += `🔗 **Original URL:** ${url}\n`;
        text += `✂️ **Short URL:** ${shortUrl}\n\n`;
        text += `💡 Share the short URL easily with anyone!`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error creating short URL:', error);
        
        // Try alternative service
        try {
            const response = await axios.post('https://cleanuri.com/api/v1/shorten', {
                url: url
            });
            
            const shortUrl = response.data.result_url;
            
            let text = `*🔗 URL Shortened Successfully!*\n\n`;
            text += `🔗 **Original URL:** ${url}\n`;
            text += `✂️ **Short URL:** ${shortUrl}\n\n`;
            text += `💡 Share the short URL easily with anyone!`;
            
            await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
        } catch (altError) {
            await sock.sendMessage(chatId, { text: '❌ Failed to shorten URL! Please try again.' });
        }
    }
}

async function expandShortUrl(sock, chatId, message, shortUrl) {
    if (!shortUrl) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a short URL to expand!\nExample: .shorturl expand bit.ly/abc123' 
        });
        return;
    }

    try {
        // Using expandurl API
        const response = await axios.get(`https://expandurl.com/api/v1/?url=${encodeURIComponent(shortUrl)}`);
        const expandedUrl = response.data.expanded_url;
        
        if (!expandedUrl || expandedUrl === shortUrl) {
            await sock.sendMessage(chatId, { text: '❌ Could not expand this URL or it\'s already the full URL!' });
            return;
        }
        
        let text = `*🔗 URL Expanded Successfully!*\n\n`;
        text += `✂️ **Short URL:** ${shortUrl}\n`;
        text += `🔗 **Expanded URL:** ${expandedUrl}\n\n`;
        text += `💡 Always be careful when clicking shortened URLs from unknown sources!`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error expanding URL:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to expand URL! Please check the URL and try again.' });
    }
}

async function createCustomShortUrl(sock, chatId, message, args) {
    if (args.length < 2) {
        await sock.sendMessage(chatId, { 
            text: '❌ Usage: .shorturl custom <url> <alias>\nExample: .shorturl custom https://example.com mylink' 
        });
        return;
    }

    const url = args.slice(0, -1).join(' ');
    const alias = args[args.length - 1];
    
    if (!isValidUrl(url)) {
        await sock.sendMessage(chatId, { text: '❌ Please provide a valid URL!' });
        return;
    }

    try {
        // Using cutt.ly API (free, requires API key for custom URLs)
        // For demo purposes, we'll simulate a custom URL
        const customUrl = `https://cutt.ly/${alias}`;
        
        let text = `*🔗 Custom URL Created!*\n\n`;
        text += `🔗 **Original URL:** ${url}\n`;
        text += `✂️ **Custom URL:** ${customUrl}\n`;
        text += `🏷️ **Alias:** ${alias}\n\n`;
        text += `💡 Note: This is a demo. For production, configure a URL shortening service with API keys.`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error creating custom URL:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to create custom URL! Alias might be taken.' });
    }
}

async function createQrCode(sock, chatId, message, url) {
    if (!url) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a URL to create QR code!\nExample: .shorturl qr https://example.com' 
        });
        return;
    }

    if (!isValidUrl(url)) {
        await sock.sendMessage(chatId, { text: '❌ Please provide a valid URL!' });
        return;
    }

    try {
        // Using QR code API
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
        
        // Download and send as image
        const response = await axios.get(qrCodeUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        
        await sock.sendMessage(chatId, {
            image: buffer,
            caption: `*📱 QR Code Generated!*\n\n🔗 **URL:** ${url}\n\n💡 Scan this QR code with your phone camera to open the URL!`,
            ...global.channelInfo
        }, { quoted: message });
    } catch (error) {
        console.error('Error creating QR code:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to generate QR code!' });
    }
}

async function getUrlStats(sock, chatId, message, shortUrl) {
    if (!shortUrl) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a short URL!\nExample: .shorturl stats bit.ly/abc123' 
        });
        return;
    }

    try {
        // Simulate URL statistics (in production, use actual API)
        let text = `*📊 URL Statistics*\n\n`;
        text += `✂️ **Short URL:** ${shortUrl}\n`;
        text += `📈 **Total Clicks:** ${Math.floor(Math.random() * 1000)}\n`;
        text += `📅 **Created:** ${new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n`;
        text += `🌍 **Top Countries:**\n`;
        text += `   1. 🇺🇸 United States (${Math.floor(Math.random() * 100)} clicks)\n`;
        text += `   2. 🇬🇧 United Kingdom (${Math.floor(Math.random() * 50)} clicks)\n`;
        text += `   3. 🇨🇦 Canada (${Math.floor(Math.random() * 30)} clicks)\n\n`;
        text += `💡 Note: This is demo data. For real stats, configure analytics API.`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting URL stats:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get URL statistics!' });
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        // Try adding http:// if missing
        try {
            new URL('https://' + string);
            return true;
        } catch (_) {
            return false;
        }
    }
}

module.exports = { shorturlCommand };