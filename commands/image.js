const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = async (sock, chatId, message, args) => {
    try {
        const query = args.join(' ');
        
        if (!query) {
            await sock.sendMessage(chatId, {
                text: '*Usage: .image <query>*\n\nExample: .image cat'
            }, { quoted: message });
            return;
        }

        const apiUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&client_id=YOUR_UNSPLASH_KEY`;
        
        await sock.sendMessage(chatId, {
            text: '🔍 Searching for image...'
        }, { quoted: message });

        const response = await axios.get(apiUrl);
        const imageUrl = response.data.urls.regular;

        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        const tempPath = path.join(process.cwd(), 'temp', `image_${Date.now()}.jpg`);
        fs.writeFileSync(tempPath, imageBuffer);

        await sock.sendMessage(chatId, {
            image: { url: tempPath },
            caption: `🖼️ Image for: ${query}`
        }, { quoted: message });

    } catch (error) {
        console.error('Image download error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to download image. Please try again.'
        }, { quoted: message });
    }
};