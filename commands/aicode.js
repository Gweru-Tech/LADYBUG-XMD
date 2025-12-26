const { aiCommand } = require('./ai');

async function aicodeCommand(sock, message, chatId, senderId, text) {
    try {
        // Extract the coding request after .aicode command
        const codingRequest = text.replace('.aicode', '').trim();
        
        if (!codingRequest) {
            await sock.sendMessage(chatId, { 
                text: '❌ Please describe your coding task after .aicode\nExample: .aicode Write a Python function to check if a number is prime',
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        // Show typing indicator
        await sock.sendPresenceUpdate('composing', chatId);

        // Prepend coding context to the request
        const enhancedPrompt = `As an expert programmer, please help with this coding task: ${codingRequest}. Provide clear, well-commented code with explanations.`;
        
        // Call the AI command with the enhanced prompt
        await aiCommand(sock, chatId, enhancedPrompt, message);

    } catch (error) {
        console.error('Error in aicode command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Sorry, I encountered an error while processing your coding request.',
            ...channelInfo 
        }, { quoted: message });
    }
}

module.exports = aicodeCommand;