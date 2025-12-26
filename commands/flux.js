const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function fluxCommand(sock, chatId, message, args) {
    try {
        // Check if prompt is provided
        if (!args || args.length === 0) {
            await sock.sendMessage(chatId, {
                text: "✨ *Ladybug MD - Flux AI Generator*\n\nPlease provide a description!\n\nExample: *.flux cute anime girl with cat ears*"
            }, { quoted: message });
            return;
        }

        const prompt = args.join(" ");
        const processingMsg = await sock.sendMessage(chatId, {
            text: `🎨 *Creating your masterpiece...*\n\n"${prompt}"\n\nPlease wait 10-20 seconds...`
        }, { quoted: message });

        // Call Flux AI API
        const response = await axios.get(
            `https://api-toxxic.zone.id/api/ai/flux-v2?text=${encodeURIComponent(prompt)}`
        );

        if (!response.data || !response.data.result) {
            throw new Error("Invalid API response");
        }

        const imageUrl = response.data.result;

        // Download image
        const imageResponse = await axios({
            url: imageUrl,
            method: "GET",
            responseType: "stream"
        });

        const imagePath = path.join(__dirname, "../temp", `flux_${Date.now()}.png`);
        const writer = fs.createWriteStream(imagePath);
        imageResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        // Send image
        await sock.sendMessage(chatId, {
            image: { url: imagePath },
            caption: `✨ *Flux AI Art Generator*\n\nPrompt: "${prompt}"\n\nGenerated with love by Ladybug MD! 💖`,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                mentionedJid: [message.key.remoteJid]
            }
        }, { quoted: message });

        // Clean up temp file
        fs.unlinkSync(imagePath);

        // Delete processing message
        await sock.sendMessage(chatId, { delete: processingMsg.key });

    } catch (error) {
        console.error("Flux AI Error:", error.message);
        
        // Delete processing message if exists
        if (typeof processingMsg !== 'undefined') {
            await sock.sendMessage(chatId, { delete: processingMsg.key });
        }

        await sock.sendMessage(chatId, {
            text: "⚠️ *Flux AI Error*\n\nFailed to generate image. Possible reasons:\n• Invalid prompt\n• API server down\n• Rate limit exceeded\n\nPlease try again later!"
        }, { quoted: message });
    }
}

module.exports = fluxCommand;