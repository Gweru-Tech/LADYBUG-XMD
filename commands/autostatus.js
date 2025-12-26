const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// ✨ Updated branding for Ladybug MD
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '12036316151368', // Update if you have a real one
            newsletterName: 'Ladybug MD',
            serverMessageId: -1
        }
    }
};

// Path to store auto status configuration
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Initialize config file if it doesn't exist
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
        enabled: false, 
        reactOn: false 
    }, null, 2));
}

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '🔐 This command is for my *trusted guardian* only!\n(Owner access required)',
                ...channelInfo
            });
            return;
        }

        // Read current config
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // Show current status if no args
        if (!args || args.length === 0) {
            const status = config.enabled ? '🟢 *Enabled*' : '🔴 *Disabled*';
            const reactStatus = config.reactOn ? '🟢 *Enabled*' : '🔴 *Disabled*';
            
            await sock.sendMessage(chatId, { 
                text: `🐞 *Ladybug Auto Status Settings*\n\n` +
                      `👁️ *Auto View Status:* ${status}\n` +
                      `💫 *Auto React to Status:* ${reactStatus}\n\n` +
                      `*Commands:*\n` +
                      `• *.autostatus on* → View all statuses\n` +
                      `• *.autostatus off* → Stop viewing\n` +
                      `• *.autostatus react on* → React with 🐞\n` +
                      `• *.autostatus react off* → Disable reactions`,
                ...channelInfo
            });
            return;
        }

        const command = args[0].toLowerCase();

        if (command === 'on') {
            config.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, { 
                text: '✅ *Auto Status View* is now **active**!\nI’ll quietly watch over every status like a true Ladybug guardian 💖',
                ...channelInfo
            });

        } else if (command === 'off') {
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, { 
                text: '❌ *Auto Status View* is now **disabled**.\nI’ll rest my eyes for now… 🌸',
                ...channelInfo
            });

        } else if (command === 'react') {
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: '❓ Please specify: *.autostatus react on* or *off*',
                    ...channelInfo
                });
                return;
            }

            const reactCmd = args[1].toLowerCase();
            if (reactCmd === 'on') {
                config.reactOn = true;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(chatId, { 
                    text: '💚 *Status Reactions* enabled!\nI’ll leave a little 🐞 on every status I see!',
                    ...channelInfo
                });
            } else if (reactCmd === 'off') {
                config.reactOn = false;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(chatId, { 
                    text: '💔 *Status Reactions* disabled.\nNo more little bugs on your statuses… for now.',
                    ...channelInfo
                });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '⚠️ Use: *.autostatus react on* or *off*',
                    ...channelInfo
                });
            }

        } else {
            await sock.sendMessage(chatId, { 
                text: '❓ Invalid command!\nUse *.autostatus* to see options.',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('🐞 Auto Status Command Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Oops! Something went wrong with the Ladybug magic...\n' + (error.message || ''),
            ...channelInfo
        });
    }
}

// Utility: Check if auto status is enabled
function isAutoStatusEnabled() {
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8')).enabled;
    } catch {
        return false;
    }
}

// Utility: Check if status reactions are enabled
function isStatusReactionEnabled() {
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8')).reactOn;
    } catch {
        return false;
    }
}

// React to a status update with 🐞
async function reactToStatus(sock, statusKey) {
    if (!isStatusReactionEnabled()) return;

    try {
        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: '🐞' // 👈 Ladybug-themed reaction!
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );
    } catch (error) {
        console.error('🐞 Failed to react to status:', error.message);
    }
}

// Handle incoming status updates
async function handleStatusUpdate(sock, update) {
    if (!isAutoStatusEnabled()) return;

    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // gentle delay

        let statusKey = null;

        // Handle messages.upsert style
        if (update.messages && update.messages.length > 0) {
            const msg = update.messages[0];
            if (msg.key?.remoteJid === 'status@broadcast') {
                statusKey = msg.key;
            }
        }
        // Handle direct status object
        else if (update.key?.remoteJid === 'status@broadcast') {
            statusKey = update.key;
        }
        // Handle via reaction
        else if (update.reaction?.key?.remoteJid === 'status@broadcast') {
            statusKey = update.reaction.key;
        }

        if (statusKey) {
            try {
                await sock.readMessages([statusKey]);
                await reactToStatus(sock, statusKey);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⏳ Rate-limited! Waiting 2s...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([statusKey]);
                    await reactToStatus(sock, statusKey);
                } else {
                    throw err;
                }
            }
        }
    } catch (error) {
        console.error('🐞 Auto Status Handler Error:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate,
    isAutoStatusEnabled,
    isStatusReactionEnabled
};