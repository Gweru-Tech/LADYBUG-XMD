const { handleTranslateCommand } = require('./translate');

async function aitranslateCommand(sock, message, chatId, senderId, text) {
    try {
        // Extract the text and target language after .aitranslate command
        const content = text.replace('.aitranslate', '').trim();
        
        if (!content) {
            await sock.sendMessage(chatId, { 
                text: '❌ Please provide text and target language after .aitranslate\nExample: .aitranslate Hello world to Spanish\nor: .aitranslate Hello world es',
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        // Show typing indicator
        await sock.sendPresenceUpdate('composing', chatId);

        // Parse the input to extract text and target language
        let textToTranslate, targetLang;
        
        // Check if format is "text to language" or "text language_code"
        const toMatch = content.match(/(.+?)\s+to\s+(.+)$/i);
        const codeMatch = content.match(/(.+?)\s+([a-z]{2})$/i);
        
        if (toMatch) {
            textToTranslate = toMatch[1].trim();
            targetLang = toMatch[2].trim();
        } else if (codeMatch) {
            textToTranslate = codeMatch[1].trim();
            targetLang = codeMatch[2].trim();
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Invalid format. Use: .aitranslate "text" to "language" or .aitranslate "text" "lang_code"',
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        // Create a mock message object for the translate command
        const mockMessage = {
            message: {
                extendedTextMessage: {
                    text: textToTranslate
                }
            }
        };

        // Call the translate command
        await handleTranslateCommand(sock, mockMessage, chatId, targetLang, message);

    } catch (error) {
        console.error('Error in aitranslate command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Sorry, I encountered an error during translation.',
            ...channelInfo 
        }, { quoted: message });
    }
}

module.exports = aitranslateCommand;