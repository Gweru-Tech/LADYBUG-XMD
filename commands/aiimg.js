const { imagineCommand } = require('./imagine');

async function aiimgCommand(sock, message, chatId, senderId, text) {
    try {
        // Extract the prompt after .aiimg command
        const prompt = text.replace('.aiimg', '').trim();
        
        if (!prompt) {
            await sock.sendMessage(chatId, { 
                text: '❌ Please provide a prompt after .aiimg\nExample: .aiimg a beautiful sunset over mountains',
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        // Show typing indicator
        await sock.sendPresenceUpdate('composing', chatId);

        // Call the imagine command with the prompt
        await imagineCommand(sock, chatId, prompt, message);

    } catch (error) {
        console.error('Error in aiimg command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Sorry, I encountered an error generating your AI image.',
            ...channelInfo 
        }, { quoted: message });
    }
}

module.exports = aiimgCommand;