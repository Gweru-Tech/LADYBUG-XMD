const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const query = text?.split(' ').slice(1).join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: '🐞 Please provide a song name!\n\nExample: *.play Never Gonna Give You Up*'
            }, { quoted: message });
        }

        // Show "searching" reaction
        await sock.sendMessage(chatId, {
            react: { text: '🔍', key: message.key }
        });

        // Search YouTube
        const { videos } = await yts(query);
        if (!videos || videos.length === 0) {
            await sock.sendMessage(chatId, {
                text: '❌ No results found for your search.'
            }, { quoted: message });
            await sock.sendMessage(chatId, {
                react: { text: '❌', key: message.key }
            });
            return;
        }

        const video = videos[0];
        const { url, title, duration, thumbnail } = video;

        // Show "downloading" reaction
        await sock.sendMessage(chatId, {
            react: { text: '📥', key: message.key }
        });

        // Fixed: removed extra spaces in URL
        const apiUrl = `https://apis-keith.vercel.app/download/dlmp3?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });

        const data = response.data;
        if (!data?.status || !data?.result?.downloadUrl) {
            throw new Error('Invalid API response');
        }

        const audioUrl = data.result.downloadUrl;

        // Send audio with rich metadata
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `WithDuration: ${duration} • Ladybug MD`,
                    thumbnailUrl: thumbnail,
                    sourceUrl: url,
                    mediaType: 2,
                    showAdAttribution: false,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        // Success reaction
        await sock.sendMessage(chatId, {
            react: { text: '🎶', key: message.key }
        });

    } catch (error) {
        console.error('🐞 Play command error:', error.message || error);

        // Error reaction
        await sock.sendMessage(chatId, {
            react: { text: '⚠️', key: message.key }
        });

        await sock.sendMessage(chatId, {
            text: '❌ Sorry! I couldn’t download that song.\n• Try a different title\n• Or check if the song is age-restricted'
        }, { quoted: message });
    }
}

module.exports = playCommand;