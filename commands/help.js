const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {

const menu = `
「 *LADYBUG MD* 」
✦ Smart • Fast • Stable

✦ ───『 *ɢᴇɴᴇʀᴀʟ* 』─── ⚝
◈ .menu
◈ .help
◈ .ping
◈ .alive
◈ .owner
◈ .runtime
◈ .uptime
◈ .tts
◈ .quote
◈ .fact
◈ .lyrics
╰──────────⳹

✦ ───『 *ᴀᴅᴍɪɴ* 』─── ⚝
◈ .ban @user
◈ .kick @user
◈ .promote @user
◈ .demote @user
◈ .mute <minutes>
◈ .unmute
◈ .warn @user
◈ .warnings @user
◈ .antilink <on/off>
◈ .antibadword <on/off>
◈ .tagall
◈ .hidetag <text>
◈ .welcome <on/off>
◈ .goodbye <on/off>
╰──────────⳹

✦ ───『 *ᴏᴡɴᴇʀ* 』─── ⚝
◈ .mode <public/private>
◈ .update
◈ .clearsession
◈ .cleartmp
◈ .settings
◈ .setpp
◈ .autoreact <on/off>
◈ .autoread <on/off>
◈ .autotyping <on/off>
◈ .anticall <on/off>
╰──────────⳹

✦ ───『 *ɪᴍᴀɢᴇ* 』─── ⚝
◈ .sticker
◈ .simage
◈ .blur
◈ .removebg
◈ .remini
◈ .meme
◈ .emojimix 😄+😂
◈ .take <packname>
╰──────────⳹

✦ ───『 *ɢᴀᴍᴇs* 』─── ⚝
◈ .tictactoe @user
◈ .hangman
◈ .trivia
◈ .truth
◈ .dare
╰──────────⳹

✦ ───『 *ᴀɪ* 』─── ⚝
◈ .gpt <question>
◈ .gemini <question>
◈ .imagine <prompt>
◈ .flux <prompt>
◈ .sora <prompt>
╰──────────⳹

✦ ───『 *ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 』─── ⚝
◈ .play <song>
◈ .song <song>
◈ .video <name>
◈ .ytmp4 <link>
◈ .instagram <link>
◈ .facebook <link>
◈ .tiktok <link>
╰──────────⳹

✦ ───『 *ғᴜɴ* 』─── ⚝
◈ .compliment @user
◈ .insult @user
◈ .ship @user
◈ .flirt
◈ .character @user
◈ .fancytext <text>
╰──────────⳹

✦ ───『 *ᴀɴɪᴍᴇ* 』─── ⚝
◈ .hug
◈ .pat
◈ .kiss
◈ .wink
◈ .cry
◈ .poke
╰──────────⳹

✦ ───『 *ʀᴇʟɪɢɪᴏɴ* 』─── ⚝
◈ .Bible [chapter:verse or chapter]
◈ .Quran [surah:verse or surah name]
◈ .reminder <time> | <message>
╰──────────⳹

✦ ───『 *ᴜᴛɪʟɪᴛɪᴇs* 』─── ⚝
◈ .notes
◈ .todo
◈ .weather2 <city>
◈ .currency <amount> <from> <to>
◈ .shorturl <url>
◈ .ocr (reply to image)
◈ .calculator <expression>
◈ .autobio <on/off>
◈ .git
◈ .repo
◈ .script
◈ .site
╰──────────⳹

✨ *Ladybug MD*
_Use prefix ( . ) to run commands_
`;

try {
    const imagePath = path.join(__dirname, '../assets/bot_image.jpg');

    if (fs.existsSync(imagePath)) {
        const img = fs.readFileSync(imagePath);
        await sock.sendMessage(chatId, {
            image: img,
            caption: menu
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, {
            text: menu
        }, { quoted: message });
    }
} catch (err) {
    console.error('Menu Error:', err);
    await sock.sendMessage(chatId, { text: menu });
}
}

module.exports = helpCommand;