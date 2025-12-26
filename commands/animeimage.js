const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = async (sock, chatId, message, args) => {
    try {
        const query = args.join(' ');
        
        if (!query) {
            await sock.sendMessage(chatId, {
                text: '*Usage: .animeimage <query>*\n\nExample: .animeimage naruto'
            }, { quoted: message });
            return;
        }

        const apiUrl = `https://api.waifu.pics/search/${query}`;
        
        await sock.sendMessage(chatId, {
            text: '🔍 Searching for anime image...'
        }, { quoted: message });

        const response = await axios.get(apiUrl);
        const imageUrl = response.data.url;

        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        const tempPath = path.join(process.cwd(), 'temp', `anime_${Date.now()}.jpg`);
        fs.writeFileSync(tempPath, imageBuffer);

        await sock.sendMessage(chatId, {
            image: { url: tempPath },
            caption: `🎌 Anime image for: ${query}`
        }, { quoted: message });

    } catch (error) {
        console.error('Anime image download error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to download anime image. Please try again.'
        }, { quoted: message });
    }
};