const settings = require("../settings");
const fs = require("fs");
const path = require("path");

async function aliveCommand(sock, chatId, message) {
    try {
        // ✨ Refreshed alive message for v5 by X-Coder
        const caption = `🌸 *Hello, My Dear!* 🌸\n\n` +
                       `I'm *Ladybug MD* — your friendly guardian bot, always watching over your chats with love and care! 💖\n\n` +
                       `🟢 *Status:* Online & Fluttering\n` +
                       `📦 *Version:* v5 (by X-Coder)\n` +
                       `🌍 *Mode:* Public\n\n` +
                       `🔮 *What can I do?*\n` +
                       `• Protect groups from links & spam\n` +
                       `• Chat with AI using *.ladybug* or *.gpt*\n` +
                       `• Fun games, utilities & more!\n` +
                       `• Keep your space safe & joyful 🌟\n\n` +
                       `✨ Type *.menu* to see all my powers!\n` +
                       `🦹‍♀️ *Miraculous luck is with you!*`;

        const imagePath = path.join(__dirname, "../assets/ladybug.jpg");
        const audioPath = path.join(__dirname, "../assets/ladybug-notify.mp3");

        // Send image with beautiful caption
        if (fs.existsSync(imagePath)) {
            await sock.sendMessage(chatId, {
                image: { url: imagePath },
                caption: caption,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '1203638@newsletter',
                        newsletterName: 'Ladybug MD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        } else {
            // Fallback to text if image is missing
            await sock.sendMessage(chatId, { text: caption }, { quoted: message });
        }

        // Optional: Send a cute audio chime
        if (fs.existsSync(audioPath)) {
            await sock.sendMessage(chatId, {
                audio: { url: audioPath },
                mimetype: "audio/mp3",
                ptt: false
            });
        }

    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { 
            text: '🐞 *Ladybug MD is alive!* My magic is working~ 💫' 
        }, { quoted: message });
    }
}

module.exports = aliveCommand;