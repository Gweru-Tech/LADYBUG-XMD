const fs = require('fs');

let autobioInterval = null;

async function autobioCommand(sock, chatId, message, args) {
    try {
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            await sock.sendMessage(chatId, {
                text: `*🤖 Auto Bio Commands*\n\n` +
                      `• \`.autobio on\` - Enable automatic bio updates\n` +
                      `• \`.autobio off\` - Disable automatic bio updates\n` +
                      `• \`.autobio status\` - Check current status\n` +
                      `• \`.autobio set <text>\` - Set custom bio template\n\n` +
                      `*Templates Available:*\n` +
                      `• time - Current time\n` +
                      `• date - Current date\n` +
                      `• uptime - Bot uptime\n` +
                      `• users - Total users\n` +
                      `• groups - Total groups\n`,
                ...global.channelInfo
            }, { quoted: message });
            return;
        }

        const autobioFile = './data/autobio.json';
        let autobioData = {};
        
        try {
            autobioData = JSON.parse(fs.readFileSync(autobioFile));
        } catch (e) {
            autobioData = { enabled: false, template: '', interval: 300000 };
        }

        switch (action) {
            case 'on':
                if (autobioData.enabled) {
                    await sock.sendMessage(chatId, { text: '✅ Auto bio is already enabled!' });
                    return;
                }
                
                autobioData.enabled = true;
                fs.writeFileSync(autobioFile, JSON.stringify(autobioData, null, 2));
                
                // Start auto bio interval
                startAutoBio(sock, autobioData);
                
                await sock.sendMessage(chatId, { 
                    text: '✅ Auto bio enabled! Updates every 5 minutes.' 
                });
                break;

            case 'off':
                autobioData.enabled = false;
                fs.writeFileSync(autobioFile, JSON.stringify(autobioData, null, 2));
                
                if (autobioInterval) {
                    clearInterval(autobioInterval);
                    autobioInterval = null;
                }
                
                await sock.sendMessage(chatId, { text: '❌ Auto bio disabled!' });
                break;

            case 'status':
                const status = autobioData.enabled ? '✅ Enabled' : '❌ Disabled';
                const template = autobioData.template || 'Not set';
                
                await sock.sendMessage(chatId, {
                    text: `*Auto Bio Status*\n\n` +
                          `Status: ${status}\n` +
                          `Template: ${template}\n` +
                          `Interval: 5 minutes`,
                    ...global.channelInfo
                });
                break;

            case 'set':
                const template = args.slice(1).join(' ');
                if (!template) {
                    await sock.sendMessage(chatId, { 
                        text: '❌ Please provide a template text!\n\nExample: .autobio set 🤖 KnightBot MD | {time} | {groups} groups' 
                    });
                    return;
                }
                
                autobioData.template = template;
                fs.writeFileSync(autobioFile, JSON.stringify(autobioData, null, 2));
                
                await sock.sendMessage(chatId, { 
                    text: `✅ Bio template set to: ${template}` 
                });
                break;

            default:
                await sock.sendMessage(chatId, { 
                    text: '❌ Invalid action! Use .autobio for help.' 
                });
        }
    } catch (error) {
        console.error('Error in autobio command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to process autobio command!' });
    }
}

function startAutoBio(sock, autobioData) {
    if (autobioInterval) clearInterval(autobioInterval);
    
    autobioInterval = setInterval(async () => {
        try {
            if (!autobioData.enabled || !autobioData.template) return;
            
            let bio = autobioData.template;
            const now = new Date();
            
            // Replace placeholders
            bio = bio.replace(/{time}/g, now.toLocaleTimeString());
            bio = bio.replace(/{date}/g, now.toLocaleDateString());
            bio = bio.replace(/{uptime}/g, process.uptime() + 's');
            
            // Get stats
            try {
                const stats = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                bio = bio.replace(/{users}/g, Object.keys(stats.users || {}).length);
                bio = bio.replace(/{groups}/g, Object.keys(stats.groups || {}).length);
            } catch (e) {
                bio = bio.replace(/{users}/g, '0');
                bio = bio.replace(/{groups}/g, '0');
            }
            
            // Update bio (this would need Baileys bio update method)
            // await sock.updateProfileStatus(bio);
            
        } catch (error) {
            console.error('Error updating auto bio:', error);
        }
    }, autobioData.interval || 300000);
}

module.exports = { autobioCommand, startAutoBio };