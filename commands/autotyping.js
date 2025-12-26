/**
 * Knight Bot - A WhatsApp Bot
 * Autotyping Command - Shows fake typing status
 */

const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// 🐞 Ladybug-themed channel info
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363161513685998@newsletter', // Replace if you have a real one
            newsletterName: 'Ladybug MD',
            serverMessageId: -1
        }
    }
};

// Path to store autotyping config
const configPath = path.join(__dirname, '..', 'data', 'autotyping.json');

// Initialize config if missing
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// 🐞 Main command handler
async function autotypingCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '🔐 Only my *trusted guardian* (owner) can control my typing magic!',
                ...channelInfo
            });
            return;
        }

        // Extract arguments
        const args = (
            message.message?.conversation?.trim().split(' ').slice(1) ||
            message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) ||
            []
        );

        const config = initConfig();

        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (['on', 'enable'].includes(action)) {
                config.enabled = true;
            } else if (['off', 'disable'].includes(action)) {
                config.enabled = false;
            } else {
                await sock.sendMessage(chatId, {
                    text: '❓ Usage:\n*.autotyping on* → Enable typing indicators\n*.autotyping off* → Disable typing indicators',
                    ...channelInfo
                });
                return;
            }
        } else {
            // Toggle if no args
            config.enabled = !config.enabled;
        }

        // Save
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        const status = config.enabled ? '🟢 *enabled*' : '🔴 *disabled*';
        await sock.sendMessage(chatId, {
            text: `✨ *Ladybug Typing Magic* is now ${status}!\nI’ll flutter my keys when I’m thinking 💖`,
            ...channelInfo
        });

    } catch (error) {
        console.error('🐞 AutoTyping Command Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Oops! My typing spell glitched...\nTry again soon!',
            ...channelInfo
        });
    }
}

// Check if autotyping is on
function isAutotypingEnabled() {
    try {
        return initConfig().enabled;
    } catch (error) {
        console.error('🐞 Error loading autotyping config:', error);
        return false;
    }
}

// Handle typing for regular user messages
async function handleAutotypingForMessage(sock, chatId, userMessage) {
    if (!isAutotypingEnabled()) return false;

    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('available', chatId);
        await new Promise(r => setTimeout(r, 500));

        await sock.sendPresenceUpdate('composing', chatId);

        // Simulate thoughtful typing 🧠
        const typingDelay = Math.max(3000, Math.min(8000, userMessage.length * 150));
        await new Promise(r => setTimeout(r, typingDelay));

        // Final composing pulse for visibility
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 1500));

        await sock.sendPresenceUpdate('paused', chatId);
        return true;
    } catch (error) {
        console.error('🐞 Typing indicator failed:', error.message);
        return false;
    }
}

// [Optional] Legacy – kept for compatibility
async function handleAutotypingForCommand(sock, chatId) {
    if (!isAutotypingEnabled()) return false;

    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('available', chatId);
        await new Promise(r => setTimeout(r, 500));
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 3000));
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 1500));
        await sock.sendPresenceUpdate('paused', chatId);
        return true;
    } catch (error) {
        console.error('🐞 Command typing failed:', error.message);
        return false;
    }
}

// Show typing *after* command response (e.g., for AI replies)
async function showTypingAfterCommand(sock, chatId) {
    if (!isAutotypingEnabled()) return false;

    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 1000));
        await sock.sendPresenceUpdate('paused', chatId);
        return true;
    } catch (error) {
        console.error('🐞 Post-command typing failed:', error.message);
        return false;
    }
}

module.exports = {
    autotypingCommand,
    isAutotypingEnabled,
    handleAutotypingForMessage,
    handleAutotypingForCommand,
    showTypingAfterCommand
};