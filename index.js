/**
 * Ladybug MD - A Magical WhatsApp Bot
 * Copyright (c) 2025 Your Name
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 * 
 * Credits:
 * - Baileys Library by @adiwajshing
 * - Inspired by open-source MD bots
 */

require('./settings');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const axios = require('axios');
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const { imageToWebp, videoToWebp, writeExifImg, writeExexVid } = require('./lib/exif');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    proto
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const pino = require("pino");
const readline = require("readline");

// Store
const store = require('./lib/lightweight_store');
store.readFromFile();
const settings = require('./settings');
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

// Memory management
setInterval(() => {
    if (global.gc) {
        global.gc();
        console.log('🧹 Garbage collection completed');
    }
}, 60_000);

// Auto-restart on high RAM
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024;
    if (used > 400) {
        console.log('⚠️ RAM usage too high (>400MB), restarting...');
        process.exit(1);
    }
}, 30_000);

// Bot identity
global.botname = "Ladybug MD";
global.themeemoji = "🐞";

const pairingCode = !!process.argv.find(arg => arg === "--pairing-code");
const useMobile = process.argv.includes("--mobile");
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

const question = (text) => {
    if (rl) return new Promise(resolve => rl.question(text, resolve));
    return Promise.resolve(settings.ownerNumber || "911234567890");
};

async function startLadybugBot() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState('./session');
        const msgRetryCounterCache = new NodeCache();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                const jid = jidNormalizedUser(key.remoteJid);
                const msg = await store.loadMessage(jid, key.id);
                return msg?.message || "";
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60_000,
            connectTimeoutMs: 60_000,
            keepAliveIntervalMs: 10_000
        });

        sock.ev.on('creds.update', saveCreds);
        store.bind(sock.ev);

        // Message handler
        sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') 
                    ? mek.message.ephemeralMessage.message 
                    : mek.message;

                if (mek.key?.remoteJid === 'status@broadcast') {
                    return await handleStatus(sock, chatUpdate);
                }

                if (!sock.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key.remoteJid?.endsWith('@g.us');
                    if (!isGroup) return;
                }

                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;

                if (sock.msgRetryCounterCache) {
                    sock.msgRetryCounterCache.clear();
                }

                await handleMessages(sock, chatUpdate, true);
            } catch (err) {
                console.error("🐞 Message handler error:", err.message);
                if (mek?.key?.remoteJid) {
                    await sock.sendMessage(mek.key.remoteJid, {
                        text: '❌ An error occurred while processing your message.',
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363161513685998@newsletter',
                                newsletterName: 'Ladybug MD',
                                serverMessageId: -1
                            }
                        }
                    }).catch(() => {});
                }
            }
        });

        // Utilities
        sock.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                const decode = require("@whiskeysockets/baileys").jidDecode(jid) || {};
                return decode.user && decode.server ? decode.user + '@' + decode.server : jid;
            }
            return jid;
        };

        sock.public = true;
        sock.serializeM = (m) => require('./lib/myfunc').smsg(sock, m, store);

        // Pairing code
        if (pairingCode && !sock.authState.creds.registered) {
            if (useMobile) throw new Error('Pairing code not supported with mobile API');

            let phoneNumber = global.phoneNumber || await question(
                chalk.bgBlack(chalk.greenBright(`Enter your WhatsApp number (e.g., 254712345678): `))
            );
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

            const pn = require('awesome-phonenumber');
            if (!pn('+' + phoneNumber).isValid()) {
                console.log(chalk.red('Invalid phone number!'));
                process.exit(1);
            }

            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(chalk.black(chalk.bgGreen(`Pairing Code:`)), chalk.black(chalk.white(code)));
                    console.log(chalk.yellow(`\nScan this in WhatsApp:\nSettings > Linked Devices > Link a Device`));
                } catch (e) {
                    console.error('Failed to get pairing code:', e.message);
                }
            }, 3000);
        }

        // Connection events
        sock.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s;

            if (qr) console.log(chalk.yellow('📱 Scan QR to connect'));
            if (connection === 'connecting') console.log(chalk.yellow('🔄 Connecting...'));
            
            if (connection === 'open') {
                console.log(chalk.magenta(`\n✅ ${global.botname} is online!`));
                
                try {
                    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    await sock.sendMessage(botJid, {
                        text: `🐞 *Ladybug MD Connected!*\n\n⏰ ${new Date().toLocaleString()}\n✨ Status: Online & Magical!\n\nJoin our updates channel!`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363161513685998@newsletter',
                                newsletterName: 'Ladybug MD',
                                serverMessageId: -1
                            }
                        }
                    });
                } catch (e) {
                    console.error('Failed to send startup message:', e.message);
                }

                console.log(chalk.cyan(`\n< ================================================== >`));
                console.log(chalk.magenta(`\n${global.themeemoji} Bot: ${global.botname}`));
                console.log(chalk.magenta(`${global.themeemoji} Version: ${settings.version}`));
                console.log(chalk.magenta(`${global.themeemoji} Owner: ${settings.owner || 'Not set'}`));
                console.log(chalk.green(`\n✨ Bot is ready to protect your chats!`));
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(chalk.red(`Connection closed. Reconnecting: ${shouldReconnect}`));
                
                if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                    require('fs').rmSync('./session', { recursive: true, force: true });
                    console.log(chalk.yellow('Session deleted. Re-authentication required.'));
                }

                if (shouldReconnect) {
                    console.log(chalk.yellow('Reconnecting in 5s...'));
                    setTimeout(() => startLadybugBot(), 5000);
                }
            }
        });

        // Anticall
        const antiCallNotified = new Set();
        sock.ev.on('call', async (calls) => {
            try {
                const anticall = require('./commands/anticall');
                const state = anticall.readState?.() || { enabled: false };
                if (!state.enabled) return;

                for (const call of calls) {
                    const caller = call.from || call.peerJid;
                    if (!caller) continue;

                    if (!antiCallNotified.has(caller)) {
                        antiCallNotified.add(caller);
                        setTimeout(() => antiCallNotified.delete(caller), 60000);
                        await sock.sendMessage(caller, { text: '📵 Calls are disabled. You will be blocked.' });
                    }

                    setTimeout(() => {
                        sock.updateBlockStatus(caller, 'block').catch(() => {});
                    }, 800);
                }
            } catch (e) {
                // Silent fail
            }
        });

        // Group & status handlers
        sock.ev.on('group-participants.update', (update) => handleGroupParticipantUpdate(sock, update));
        sock.ev.on('status.update', (status) => handleStatus(sock, status));
        sock.ev.on('messages.reaction', (status) => handleStatus(sock, status));

        return sock;
    } catch (error) {
        console.error('🐞 Startup error:', error.message);
        setTimeout(startLadybugBot, 5000);
    }
}

// Start bot
startLadybugBot().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

// Error handlers
process.on('uncaughtException', (err) => console.error('Uncaught:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled:', err));

// Auto-reload on file change
const file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`🔁 Reloading ${__filename}`));
    delete require.cache[file];
    require(file);
});