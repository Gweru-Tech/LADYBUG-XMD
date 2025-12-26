const { aiCommand } = require('./ai');

async function aichatCommand(sock, message, chatId, senderId, text) {
    try {
        // Extract the query after .aichat command
        const query = text.replace('.aichat', '').trim();
        
        if (!query) {
            await sock.sendMessage(chatId, { 
                text: '❌ Please provide a query after .aichat\nExample: .aichat What is artificial intelligence?',
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        // Show typing indicator
        await sock.sendPresenceUpdate('composing', chatId);

        // Call the AI command with the query
        await aiCommand(sock, chatId, query, message);

    } catch (error) {
        console.error('Error in aichat command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Sorry, I encountered an error processing your AI chat request.',
            ...channelInfo 
        }, { quoted: message });
    }
}

module.exports = aichatCommand;