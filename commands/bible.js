const axios = require('axios');

async function bibleCommand(sock, chatId, message, args) {
    try {
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            await sock.sendMessage(chatId, {
                text: `*📖 Bible Commands*\n\n` +
                      `• \`.bible daily\` - Get daily verse\n` +
                      `• \`.bible random\` - Get random verse\n` +
                      `• \`.bible <book> <chapter>:<verse>\` - Get specific verse\n` +
                      `• \`.bible search <query>\` - Search verses\n` +
                      `• \`.bible books\` - List all books\n\n` +
                      `*Examples:*\n` +
                      `• .bible john 3:16\n` +
                      `• .bible genesis 1:1\n` +
                      `• .bible search love`,
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
                
            case 'search':
                const query = args.slice(1).join(' ');
                if (!query) {
                    await sock.sendMessage(chatId, { text: '❌ Please provide a search query!' });
                    return;
                }
                await searchVerse(sock, chatId, message, query);
                break;
                
            case 'books':
                await listBooks(sock, chatId, message);
                break;
                
            default:
                // Try to parse as book chapter:verse
                await getSpecificVerse(sock, chatId, message, args.join(' '));
        }
    } catch (error) {
        console.error('Error in bible command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch Bible verse!' });
    }
}

async function getDailyVerse(sock, chatId, message) {
    try {
        // Using Bible API (you can replace with your preferred API)
        const response = await axios.get('https://bible-api.com/?random=verse');
        const verse = response.data;
        
        const text = `*📖 Daily Bible Verse*\n\n` +
                    `"${verse.text}"\n\n` +
                    `📍 ${verse.reference}\n` +
                    `📚 ${verse.translation_name}`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting daily verse:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get daily verse!' });
    }
}

async function getRandomVerse(sock, chatId, message) {
    try {
        const response = await axios.get('https://bible-api.com/?random=verse');
        const verse = response.data;
        
        const text = `*📖 Random Bible Verse*\n\n` +
                    `"${verse.text}"\n\n` +
                    `📍 ${verse.reference}\n` +
                    `📚 ${verse.translation_name}`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting random verse:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get random verse!' });
    }
}

async function getSpecificVerse(sock, chatId, message, reference) {
    try {
        const response = await axios.get(`https://bible-api.com/${encodeURIComponent(reference)}`);
        const verse = response.data;
        
        if (verse.error) {
            await sock.sendMessage(chatId, { text: `❌ ${verse.error}` });
            return;
        }
        
        let text = `*📖 ${verse.reference}*\n\n`;
        
        if (Array.isArray(verse.verses)) {
            verse.verses.forEach((v, index) => {
                text += `${v.verse}. ${v.text}\n`;
            });
        } else {
            text += `"${verse.text}"`;
        }
        
        text += `\n\n📚 ${verse.translation_name}`;
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting specific verse:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get verse! Check your reference format.\nExample: .bible john 3:16' });
    }
}

async function searchVerse(sock, chatId, message, query) {
    try {
        const response = await axios.get(`https://bible-api.com/search?q=${encodeURIComponent(query)}`);
        const results = response.data;
        
        if (results.error || !results.verses || results.verses.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ No verses found for your search!' });
            return;
        }
        
        let text = `*🔍 Search Results for "${query}"*\n\n`;
        
        results.verses.slice(0, 5).forEach((verse, index) => {
            text += `${index + 1}. ${verse.reference}\n`;
            text += `"${verse.text.substring(0, 100)}${verse.text.length > 100 ? '...' : ''}"\n\n`;
        });
        
        if (results.verses.length > 5) {
            text += `...and ${results.verses.length - 5} more results.`;
        }
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error searching verses:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to search verses!' });
    }
}

async function listBooks(sock, chatId, message) {
    const books = [
        'Old Testament:',
        'Genesis, Exodus, Leviticus, Numbers, Deuteronomy',
        'Joshua, Judges, Ruth, 1 Samuel, 2 Samuel',
        '1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra',
        'Nehemiah, Esther, Job, Psalms, Proverbs',
        'Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations',
        'Ezekiel, Daniel, Hosea, Joel, Amos',
        'Obadiah, Jonah, Micah, Nahum, Habakkuk',
        'Zephaniah, Haggai, Zechariah, Malachi',
        '',
        'New Testament:',
        'Matthew, Mark, Luke, John, Acts',
        'Romans, 1 Corinthians, 2 Corinthians, Galatians',
        'Ephesians, Philippians, Colossians, 1 Thessalonians, 2 Thessalonians',
        '1 Timothy, 2 Timothy, Titus, Philemon, Hebrews',
        'James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John',
        'Jude, Revelation'
    ];
    
    const text = `*📚 Books of the Bible*\n\n${books.join('\n')}`;
    
    await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
}

module.exports = { bibleCommand };