const os = require('os');
const fs = require('fs');
const path = require('path');
const settings = require('../settings.js');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= 24 * 60 * 60;
    const hours = Math.floor(seconds / (60 * 60));
    seconds %= 60 * 60;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;
    return time.trim();
}

function getMemoryUsage() {
    const used = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
    const total = Math.round(os.totalmem() / 1024 / 1024);
    return `${used}MB / ${total}MB`;
}

// Count active command files (plugins)
function getPluginCount() {
    try {
        const commandDir = path.join(__dirname, '..', 'commands');
        if (fs.existsSync(commandDir)) {
            const files = fs.readdirSync(commandDir);
            return files.filter(file => file.endsWith('.js')).length;
        }
    } catch (e) {
        console.warn('🐞 Could not count plugins:', e.message);
    }
    return '?';
}

// Count groups (assumes you store group metadata in data/groups.json)
function getGroupCount() {
    try {
        const groupPath = path.join(__dirname, '..', 'data', 'groups.json');
        if (fs.existsSync(groupPath)) {
            const groups = JSON.parse(fs.readFileSync(groupPath, 'utf8'));
            return Array.isArray(groups) ? groups.length : Object.keys(groups).length;
        }
    } catch (e) {
        console.warn('🐞 Could not count groups:', e.message);
    }
    return '?';
}

// Count total chats (optional: you can track in a chats.json or use store if available)
function getChatCount() {
    try {
        const chatPath = path.join(__dirname, '..', 'data', 'chats.json');
        if (fs.existsSync(chatPath)) {
            const chats = JSON.parse(fs.readFileSync(chatPath, 'utf8'));
            return Array.isArray(chats) ? chats.length : Object.keys(chats).length;
        }
    } catch (e) {
        // If no chat tracking, return unknown
    }
    return '?';
}

async function pingCommand(sock, chatId, message) {
    try {
        const startTime = Date.now();
        const sentMsg = await sock.sendMessage(chatId, { text: '🏓 Pong!' }, { quoted: message });
        const ping = Date.now() - startTime;

        // System & Bot Info
        const uptime = formatTime(process.uptime());
        const platform = os.platform().replace('win32', 'Windows').replace('darwin', 'macOS').replace('linux', 'Linux');
        const arch = os.arch();
        const cpuCores = os.cpus().length;
        const memory = getMemoryUsage();
        const nodeVersion = process.version;
        const plugins = getPluginCount();
        const groups = getGroupCount();
        const chats = getChatCount();

        // Format owner mention (if available)
        const ownerJid = settings.owner?.startsWith('254') 
            ? settings.owner + '@s.whatsapp.net' 
            : settings.owner?.includes('@') 
                ? settings.owner 
                : settings.owner + '@s.whatsapp.net';

        const botInfo = `*🐞 Ladybug MD — System Status*\n\n` +
            `🟢 *Ping:* ${ping} ms\n` +
            `⏱️ *Uptime:* ${uptime}\n` +
            `🔖 *Version:* v${settings.version || '3.0.0'}\n\n` +

            `👤 *Owner:* ${settings.owner ? `@${settings.owner.split('@')[0]}` : 'Not set'}\n` +
            `📊 *Active:* ${chats} chats • ${groups} groups\n` +
            `🧩 *Plugins:* ${plugins} commands loaded\n\n` +

            `💻 *Host Info*\n` +
            `• Platform: ${platform} (${arch})\n` +
            `• CPU: ${cpuCores} cores\n` +
            `• Memory: ${memory}\n` +
            `• Node.js: ${nodeVersion}`;

        await sock.sendMessage(chatId, {
            text: botInfo,
            mentions: settings.owner ? [ownerJid] : []
        }, { quoted: sentMsg });

    } catch (error) {
        console.error('🐞 Ping command error:', error.message);
        await sock.sendMessage(chatId, {
            text: '❌ My radar got tangled in spiderwebs...\nTry again soon! 💖'
        }, { quoted: message });
    }
}

module.exports = pingCommand;