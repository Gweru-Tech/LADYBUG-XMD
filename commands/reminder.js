const fs = require('fs');

async function reminderCommand(sock, chatId, message, args) {
    try {
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            await showReminderHelp(sock, chatId, message);
            return;
        }

        switch (action) {
            case 'add':
            case 'set':
                await addReminder(sock, chatId, message, args.slice(1));
                break;
                
            case 'list':
                await listReminders(sock, chatId, message);
                break;
                
            case 'del':
            case 'delete':
            case 'remove':
                await deleteReminder(sock, chatId, message, args[1]);
                break;
                
            case 'clear':
                await clearReminders(sock, chatId, message);
                break;
                
            default:
                await showReminderHelp(sock, chatId, message);
        }
    } catch (error) {
        console.error('Error in reminder command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to process reminder command!' });
    }
}

async function showReminderHelp(sock, chatId, message) {
    const helpText = `*⏰ Reminder Commands*\n\n` +
                    `• \`.reminder add <time> <message>\` - Add reminder\n` +
                    `• \`.reminder list\` - List all reminders\n` +
                    `• \`.reminder del <id>\` - Delete specific reminder\n` +
                    `• \`.reminder clear\` - Clear all reminders\n\n` +
                    `*Time Formats:*\n` +
                    `• 30s - 30 seconds\n` +
                    `• 5m - 5 minutes\n` +
                    `• 2h - 2 hours\n` +
                    `• 1d - 1 day\n` +
                    `• 1w - 1 week\n\n` +
                    `*Examples:*\n` +
                    `• .reminder add 30m Take medicine\n` +
                    `• .reminder add 1h Meeting with boss\n` +
                    `• .reminder add 1d Call mom`;

    await sock.sendMessage(chatId, { text: helpText, ...global.channelInfo }, { quoted: message });
}

async function addReminder(sock, chatId, message, args) {
    if (args.length < 2) {
        await sock.sendMessage(chatId, { 
            text: '❌ Usage: .reminder add <time> <message>\nExample: .reminder add 30m Take medicine' 
        });
        return;
    }

    const timeStr = args[0];
    const reminderText = args.slice(1).join(' ');
    
    const milliseconds = parseTime(timeStr);
    if (milliseconds === null) {
        await sock.sendMessage(chatId, { 
            text: '❌ Invalid time format! Use: 30s, 5m, 2h, 1d, 1w' 
        });
        return;
    }

    const reminderFile = './data/reminders.json';
    let reminders = {};
    
    try {
        reminders = JSON.parse(fs.readFileSync(reminderFile));
    } catch (e) {
        reminders = {};
    }

    if (!reminders[chatId]) reminders[chatId] = [];
    
    const reminder = {
        id: Date.now().toString(),
        text: reminderText,
        time: Date.now() + milliseconds,
        createdAt: Date.now(),
        chatId: chatId
    };

    reminders[chatId].push(reminder);
    fs.writeFileSync(reminderFile, JSON.stringify(reminders, null, 2));

    // Schedule the reminder
    setTimeout(async () => {
        try {
            await sock.sendMessage(chatId, {
                text: `*⏰ Reminder!*\n\n📝 ${reminderText}\n\n_Set ${timeStr} ago_`,
                ...global.channelInfo
            });
            
            // Remove reminder from file
            const currentReminders = JSON.parse(fs.readFileSync(reminderFile));
            if (currentReminders[chatId]) {
                currentReminders[chatId] = currentReminders[chatId].filter(r => r.id !== reminder.id);
                fs.writeFileSync(reminderFile, JSON.stringify(currentReminders, null, 2));
            }
        } catch (error) {
            console.error('Error sending reminder:', error);
        }
    }, milliseconds);

    const scheduledTime = new Date(reminder.time).toLocaleString();
    await sock.sendMessage(chatId, { 
        text: `✅ Reminder set!\n\n📝 ${reminderText}\n⏰ ${scheduledTime}\n🔔 In ${timeStr}` 
    });
}

async function listReminders(sock, chatId, message) {
    const reminderFile = './data/reminders.json';
    let reminders = {};
    
    try {
        reminders = JSON.parse(fs.readFileSync(reminderFile));
    } catch (e) {
        reminders = {};
    }

    const chatReminders = reminders[chatId] || [];
    
    if (chatReminders.length === 0) {
        await sock.sendMessage(chatId, { text: '📭 No reminders set!' });
        return;
    }

    let text = `*⏰ Your Reminders*\n\n`;
    
    chatReminders.forEach((reminder, index) => {
        const timeLeft = Math.max(0, reminder.time - Date.now());
        const timeLeftStr = formatDuration(timeLeft);
        const scheduledTime = new Date(reminder.time).toLocaleString();
        
        text += `${index + 1}. ID: ${reminder.id}\n`;
        text += `📝 ${reminder.text}\n`;
        text += `⏰ ${scheduledTime}\n`;
        text += `🔔 In ${timeLeftStr}\n\n`;
    });

    await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
}

async function deleteReminder(sock, chatId, message, reminderId) {
    if (!reminderId) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a reminder ID! Use .reminder list to see IDs.' 
        });
        return;
    }

    const reminderFile = './data/reminders.json';
    let reminders = {};
    
    try {
        reminders = JSON.parse(fs.readFileSync(reminderFile));
    } catch (e) {
        reminders = {};
    }

    if (!reminders[chatId]) {
        await sock.sendMessage(chatId, { text: '📭 No reminders found!' });
        return;
    }

    const originalLength = reminders[chatId].length;
    reminders[chatId] = reminders[chatId].filter(r => r.id !== reminderId);
    
    if (reminders[chatId].length === originalLength) {
        await sock.sendMessage(chatId, { text: '❌ Reminder not found!' });
        return;
    }

    fs.writeFileSync(reminderFile, JSON.stringify(reminders, null, 2));
    await sock.sendMessage(chatId, { text: '✅ Reminder deleted successfully!' });
}

async function clearReminders(sock, chatId, message) {
    const reminderFile = './data/reminders.json';
    let reminders = {};
    
    try {
        reminders = JSON.parse(fs.readFileSync(reminderFile));
    } catch (e) {
        reminders = {};
    }

    if (!reminders[chatId] || reminders[chatId].length === 0) {
        await sock.sendMessage(chatId, { text: '📭 No reminders to clear!' });
        return;
    }

    const count = reminders[chatId].length;
    reminders[chatId] = [];
    fs.writeFileSync(reminderFile, JSON.stringify(reminders, null, 2));
    
    await sock.sendMessage(chatId, { text: `✅ Cleared ${count} reminders!` });
}

function parseTime(timeStr) {
    const match = timeStr.match(/^(\d+)([smhdw])$/);
    if (!match) return null;
    
    const [_, amount, unit] = match;
    const num = parseInt(amount);
    
    switch (unit) {
        case 's': return num * 1000;
        case 'm': return num * 60 * 1000;
        case 'h': return num * 60 * 60 * 1000;
        case 'd': return num * 24 * 60 * 60 * 1000;
        case 'w': return num * 7 * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = { reminderCommand };