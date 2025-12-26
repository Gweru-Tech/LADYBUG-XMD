module.exports = async (sock, chatId, message) => {
    try {
        const donationMessage = `
💰 *DONATION TO KEEP SERVICES FREE*

Thank you for your support! Your donations help keep this bot free for everyone.

📱 **Payment Details:**
━━━━━━━━━━━━━━━━━━
• Platform: EcoCash
• Name: Ntandoyenkosi Chisaya
• Number: 263786831091
━━━━━━━━━━━━━━━━━━

🙏 Every donation counts and is greatly appreciated!

✅ After making your donation, please send proof to the bot owner to get:
• Premium features
• VIP status
• Priority support

❤️ Thank you for keeping our services free!
        `.trim();

        await sock.sendMessage(chatId, {
            text: donationMessage
        }, { quoted: message });
    } catch (error) {
        console.error('Donation command error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error showing donation information.'
        }, { quoted: message });
    }
};