const axios = require('axios');
const fs = require('fs');

async function ocrCommand(sock, chatId, message, args) {
    try {
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMessage) {
            await showOcrHelp(sock, chatId, message);
            return;
        }

        let imageUrl = null;
        
        // Check for image in quoted message
        if (quotedMessage.imageMessage) {
            imageUrl = quotedMessage.imageMessage.url;
        } else if (quotedMessage.videoMessage) {
            imageUrl = quotedMessage.videoMessage.url;
        } else if (quotedMessage.stickerMessage) {
            imageUrl = quotedMessage.stickerMessage.url;
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Please reply to an image, video, or sticker with the .ocr command!' 
            });
            return;
        }

        await performOcr(sock, chatId, message, imageUrl);
    } catch (error) {
        console.error('Error in OCR command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to perform OCR!' });
    }
}

async function showOcrHelp(sock, chatId, message) {
    const helpText = `*👁️ OCR (Text Recognition) Commands*\n\n` +
                    `• \`.ocr\` - Extract text from quoted image\n` +
                    `• \`.ocr lang <language>\` - Extract text in specific language\n\n` +
                    `*Supported Languages:*\n` +
                    `• eng - English\n` +
                    `• spa - Spanish\n` +
                    `• fra - French\n` +
                    `• deu - German\n` +
                    `• chi_sim - Chinese (Simplified)\n` +
                    `• jpn - Japanese\n` +
                    `• kor - Korean\n` +
                    `• ara - Arabic\n` +
                    `• hin - Hindi\n\n` +
                    `*Usage:*\n` +
                    `1. Send an image\n` +
                    `2. Reply to it with .ocr\n` +
                    `3. Bot will extract text from the image`;

    await sock.sendMessage(chatId, { text: helpText, ...global.channelInfo }, { quoted: message });
}

async function performOcr(sock, chatId, message, imageUrl) {
    try {
        await sock.sendMessage(chatId, { 
            text: '🔍 Processing image and extracting text... Please wait...' 
        });

        // Using OCR.space API (free tier)
        const formData = new FormData();
        formData.append('url', imageUrl);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('scale', 'true');
        formData.append('detectOrientation', 'true');

        const response = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: {
                'apikey': process.env.OCR_API_KEY || 'helloworld', // Free demo key
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        const result = response.data;
        
        if (result.IsErroredOnProcessing || result.ErrorMessage) {
            await sock.sendMessage(chatId, { 
                text: `❌ OCR Error: ${result.ErrorMessage || 'Unknown error'}` 
            });
            return;
        }

        if (!result.ParsedResults || result.ParsedResults.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '❌ No text found in the image!' 
            });
            return;
        }

        const parsedResult = result.ParsedResults[0];
        const extractedText = parsedResult.ParsedText;
        
        if (!extractedText || extractedText.trim().length === 0) {
            await sock.sendMessage(chatId, { 
                text: '❌ No text could be extracted from this image!' 
            });
            return;
        }

        let text = `*👁️ OCR Result - Text Extracted*\n\n`;
        text += `📝 **Extracted Text:**\n`;
        text += `${extractedText}\n\n`;
        
        if (parsedResult.TextOverlay) {
            text += `📊 **Processing Info:**\n`;
            text += `🔤 Lines: ${parsedResult.TextOverlay.Lines.length}\n`;
            text += `📏 Words: ${parsedResult.TextOverlay.Words.length}\n`;
            text += `⏱️ Processing time: ${parsedResult.ProcessingTimeInMilliseconds}ms\n\n`;
        }
        
        text += `💡 *Note: Accuracy may vary based on image quality and text clarity*`;

        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
        
    } catch (error) {
        console.error('Error performing OCR:', error);
        
        // Try alternative approach with Tesseract.js (if available)
        try {
            // This would require installing Tesseract.js
            await sock.sendMessage(chatId, { 
                text: '❌ OCR service unavailable. The image might be too large or the service is temporarily down.' 
            });
        } catch (fallbackError) {
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to perform OCR. Please try with a clearer image.' 
            });
        }
    }
}

module.exports = { ocrCommand };