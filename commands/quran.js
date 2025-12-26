const axios = require('axios');

async function quranCommand(sock, chatId, message, args) {
    try {
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            await sock.sendMessage(chatId, {
                text: `*📖 Quran Commands*\n\n` +
                      `• \`.quran daily\` - Get daily verse\n` +
                      `• \`.quran random\` - Get random verse\n` +
                      `• \`.quran <surah>:<ayah>\` - Get specific verse\n` +
                      `• \`.quran surah <number>\` - Get surah info\n` +
                      `• \`.quran search <query>\` - Search verses\n` +
                      `• \`.quran list\` - List all surahs\n\n` +
                      `*Examples:*\n` +
                      `• .quran 1:1\n` +
                      `• .quran surah 2\n` +
                      `• .quran search mercy`,
                ...global.channelInfo
            }, { quoted: message });
            return;
        }

        switch (action) {
            case 'daily':
                await getDailyVerse(sock, chatId, message);
                break;
                
            case 'random':
                await getRandomVerse(sock, chatId, message);
                break;
                
            case 'surah':
                const surahNum = args[1];
                if (!surahNum) {
                    await sock.sendMessage(chatId, { text: '❌ Please provide a surah number!' });
                    return;
                }
                await getSurahInfo(sock, chatId, message, surahNum);
                break;
                
            case 'search':
                const query = args.slice(1).join(' ');
                if (!query) {
                    await sock.sendMessage(chatId, { text: '❌ Please provide a search query!' });
                    return;
                }
                await searchVerse(sock, chatId, message, query);
                break;
                
            case 'list':
                await listSurahs(sock, chatId, message);
                break;
                
            default:
                // Try to parse as surah:ayah
                await getSpecificVerse(sock, chatId, message, args.join(' '));
        }
    } catch (error) {
        console.error('Error in quran command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch Quran verse!' });
    }
}

async function getDailyVerse(sock, chatId, message) {
    try {
        // Using a random verse for daily
        const surahNum = Math.floor(Math.random() * 114) + 1;
        const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surahNum}`);
        const surah = response.data.data;
        const randomAyah = Math.floor(Math.random() * surah.numberOfAyahs) + 1;
        
        const ayahResponse = await axios.get(`https://api.alquran.cloud/v1/surah/${surahNum}/${randomAyah}/editions/quran-uthmani,en.sahih`);
        const ayah = ayahResponse.data.data[0];
        
        const text = `*📖 Daily Quran Verse*\n\n` +
                    `🔸 *Arabic:*\n${ayah.text}\n\n` +
                    `🔸 *English:*\n${ayah.editions[1].text}\n\n` +
                    `📍 ${ayah.surah.name} - Ayah ${ayah.numberInSurah}\n` +
                    `📚 ${ayah.editions[1].englishName}`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting daily verse:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get daily verse!' });
    }
}

async function getRandomVerse(sock, chatId, message) {
    try {
        const surahNum = Math.floor(Math.random() * 114) + 1;
        const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surahNum}`);
        const surah = response.data.data;
        const randomAyah = Math.floor(Math.random() * surah.numberOfAyahs) + 1;
        
        const ayahResponse = await axios.get(`https://api.alquran.cloud/v1/surah/${surahNum}/${randomAyah}/editions/quran-uthmani,en.sahih`);
        const ayah = ayahResponse.data.data[0];
        
        const text = `*📖 Random Quran Verse*\n\n` +
                    `🔸 *Arabic:*\n${ayah.text}\n\n` +
                    `🔸 *English:*\n${ayah.editions[1].text}\n\n` +
                    `📍 ${ayah.surah.name} - Ayah ${ayah.numberInSurah}\n` +
                    `📚 ${ayah.editions[1].englishName}`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting random verse:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get random verse!' });
    }
}

async function getSpecificVerse(sock, chatId, message, reference) {
    try {
        const match = reference.match(/(\d+):(\d+)/);
        if (!match) {
            await sock.sendMessage(chatId, { text: '❌ Invalid format! Use: .quran surah:ayah (e.g., .quran 1:1)' });
            return;
        }
        
        const [_, surah, ayah] = match;
        const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surah}/${ayah}/editions/quran-uthmani,en.sahih`);
        const verse = response.data.data[0];
        
        const text = `*📖 ${verse.surah.name} - Ayah ${verse.numberInSurah}*\n\n` +
                    `🔸 *Arabic:*\n${verse.text}\n\n` +
                    `🔸 *English:*\n${verse.editions[1].text}\n\n` +
                    `📚 ${verse.editions[1].englishName}`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting specific verse:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get verse! Check your reference format.\nExample: .quran 1:1' });
    }
}

async function getSurahInfo(sock, chatId, message, surahNum) {
    try {
        const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surahNum}`);
        const surah = response.data.data;
        
        const text = `*📖 Surah ${surah.englishName}*\n\n` +
                    `🔸 *Arabic:* ${surah.name}\n` +
                    `🔸 *English:* ${surah.englishName}\n` +
                    `🔸 *Translation:* ${surah.englishNameTranslation}\n` +
                    `🔸 *Number:* ${surah.number}\n` +
                    `🔸 *Ayahs:* ${surah.numberOfAyahs}\n` +
                    `🔸 *Type:* ${surah.revelationType}\n` +
                    `📍 Page: ${surah.page}`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting surah info:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get surah information!' });
    }
}

async function searchVerse(sock, chatId, message, query) {
    try {
        const response = await axios.get(`http://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/en`);
        const results = response.data.data;
        
        if (!results || results.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ No verses found for your search!' });
            return;
        }
        
        let text = `*🔍 Search Results for "${query}"*\n\n`;
        
        results.slice(0, 5).forEach((result, index) => {
            text += `${index + 1}. ${result.surah.englishName} ${result.numberInSurah}\n`;
            text += `"${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}"\n\n`;
        });
        
        if (results.length > 5) {
            text += `...and ${results.length - 5} more results.`;
        }
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error searching verses:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to search verses!' });
    }
}

async function listSurahs(sock, chatId, message) {
    try {
        const response = await axios.get('https://api.alquran.cloud/v1/surah');
        const surahs = response.data.data;
        
        let text = `*📚 List of Surahs*\n\n`;
        
        surahs.forEach((surah, index) => {
            text += `${index + 1}. ${surah.number}. ${surah.englishName} (${surah.name}) - ${surah.numberOfAyahs} verses\n`;
        });
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error listing surahs:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get surah list!' });
    }
}

module.exports = { quranCommand };