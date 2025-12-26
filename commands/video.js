const axios = require('axios');
const yts = require('yt-search');

// ✅ Fixed: Removed trailing spaces
const izumi = {
    baseURL: "https://izumiiiiiiii.dpdns.org"
};

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

async function getIzumiVideoByUrl(youtubeUrl) {
    const apiUrl = `${izumi.baseURL}/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}&format=720`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download) {
        return res.data.result; // { download, title, thumbnail, ... }
    }
    throw new Error('Izumi API: No video download URL');
}

async function getOkatsuVideoByUrl(youtubeUrl) {
    // ✅ Fixed: removed extra spaces in URL
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.mp4) {
        return { download: res.data.result.mp4, title: res.data.result.title };
    }
    throw new Error('Okatsu API: No MP4 found');
}

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const query = text?.split(' ').slice(1).join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: '🐞 Please provide a video name or YouTube link!\n\nExample: *.video Never Gonna Give You Up*'
            }, { quoted: message });
        }

        // Show searching reaction
        await sock.sendMessage(chatId, {
            react: { text: '🔍', key: message.key }
        });

        let videoUrl, videoTitle, videoThumbnail;

        // Check if it's a URL
        if (query.startsWith('http://') || query.startsWith('https://')) {
            videoUrl = query;
        } else {
            // Search YouTube
            const { videos } = await yts(query);
            if (!videos?.length) {
                await sock.sendMessage(chatId, {
                    text: '❌ No videos found for your search.'
                }, { quoted: message });
                await sock.sendMessage(chatId, {
                    react: { text: '❌', key: message.key }
                });
                return;
            }
            const first = videos[0];
            videoUrl = first.url;
            videoTitle = first.title;
            videoThumbnail = first.thumbnail;
        }

        // Validate YouTube URL (support shorts, embed, etc.)
        const ytRegex = /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/;
        const match = videoUrl.match(ytRegex);
        if (!match) {
            await sock.sendMessage(chatId, {
                text: '⚠️ Invalid YouTube link!'
            }, { quoted: message });
            await sock.sendMessage(chatId, {
                react: { text: '⚠️', key: message.key }
            });
            return;
        }
        const ytId = match[1];

        // Show downloading reaction
        await sock.sendMessage(chatId, {
            react: { text: '📥', key: message.key }
        });

        // Send thumbnail preview
        const thumbUrl = videoThumbnail || `https://i.ytimg.com/vi/${ytId}/sddefault.jpg`;
        const captionTitle = videoTitle || query;

        try {
            await sock.sendMessage(chatId, {
                image: { url: thumbUrl },
                caption: `*${captionTitle}*\n\n📥 Downloading in HD...`
            }, { quoted: message });
        } catch (e) {
            console.warn('🐞 Thumbnail preview failed:', e.message);
        }

        // Fetch video: Izumi (primary) → Okatsu (fallback)
        let videoData;
        try {
            videoData = await getIzumiVideoByUrl(videoUrl);
        } catch (e1) {
            console.warn('🐞 Izumi failed, trying Okatsu...');
            videoData = await getOkatsuVideoByUrl(videoUrl);
        }

        // Send final video
        await sock.sendMessage(chatId, {
            video: { url: videoData.download },
            mimetype: 'video/mp4',
            fileName: `${(videoData.title || captionTitle).substring(0, 50)}.mp4`,
            caption: `*${videoData.title || captionTitle}*\n\n> _Downloaded with 💖 by Ladybug MD_`
        }, { quoted: message });

        // Success reaction
        await sock.sendMessage(chatId, {
            react: { text: '🎥', key: message.key }
        });

    } catch (error) {
        console.error('🐞 Video command error:', error.message || error);

        await sock.sendMessage(chatId, {
            react: { text: '⚠️', key: message.key }
        });

        await sock.sendMessage(chatId, {
            text: '❌ Download failed!\n• Try a different video\n• Avoid age-restricted content\n• Or the servers might be busy'
        }, { quoted: message });
    }
}

module.exports = videoCommand;