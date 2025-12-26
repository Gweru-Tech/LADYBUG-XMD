const fs = require('fs');

async function notesCommand(sock, chatId, message, args) {
    try {
        const action = args[0]?.toLowerCase();
        const senderId = message.key.participant || message.key.remoteJid;
        
        if (!action) {
            await showNotesHelp(sock, chatId, message);
            return;
        }

        switch (action) {
            case 'add':
            case 'new':
            case 'create':
                await addNote(sock, chatId, message, args.slice(1), senderId);
                break;
                
            case 'list':
            case 'show':
                await listNotes(sock, chatId, message, senderId);
                break;
                
            case 'get':
            case 'view':
            case 'read':
                await getNote(sock, chatId, message, args[1], senderId);
                break;
                
            case 'del':
            case 'delete':
            case 'remove':
                await deleteNote(sock, chatId, message, args[1], senderId);
                break;
                
            case 'clear':
                await clearNotes(sock, chatId, message, senderId);
                break;
                
            case 'search':
                await searchNotes(sock, chatId, message, args.slice(1).join(' '), senderId);
                break;
                
            case 'stats':
                await showNotesStats(sock, chatId, message, senderId);
                break;
                
            default:
                await showNotesHelp(sock, chatId, message);
        }
    } catch (error) {
        console.error('Error in notes command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to process notes command!' });
    }
}

async function showNotesHelp(sock, chatId, message) {
    const helpText = `*📝 Notes Commands*\n\n` +
                    `• \`.notes add <title> <content>\` - Add new note\n` +
                    `• \`.notes list\` - List all notes\n` +
                    `• \`.notes get <id/title>\` - Read specific note\n` +
                    `• \`.notes del <id/title>\` - Delete note\n` +
                    `• \`.notes search <query>\` - Search notes\n` +
                    `• \`.notes clear\` - Clear all notes\n` +
                    `• \`.notes stats\` - Show statistics\n\n` +
                    `*Examples:*\n` +
                    `• .notes add shopping "Buy milk, eggs, bread"\n` +
                    `• .notes add ideas "App features to implement"\n` +
                    `• .notes get shopping\n` +
                    `• .notes search important`;

    await sock.sendMessage(chatId, { text: helpText, ...global.channelInfo }, { quoted: message });
}

function getNotesFile() {
    return './data/notes.json';
}

function getUserNotes(senderId) {
    const notesFile = getNotesFile();
    let notes = {};
    
    try {
        notes = JSON.parse(fs.readFileSync(notesFile));
    } catch (e) {
        notes = {};
    }
    
    if (!notes[senderId]) {
        notes[senderId] = [];
    }
    
    return notes[senderId];
}

function saveUserNotes(senderId, notes) {
    const notesFile = getNotesFile();
    let allNotes = {};
    
    try {
        allNotes = JSON.parse(fs.readFileSync(notesFile));
    } catch (e) {
        allNotes = {};
    }
    
    allNotes[senderId] = notes;
    fs.writeFileSync(notesFile, JSON.stringify(allNotes, null, 2));
}

async function addNote(sock, chatId, message, args, senderId) {
    if (args.length < 2) {
        await sock.sendMessage(chatId, { 
            text: '❌ Usage: .notes add <title> <content>\nExample: .notes add shopping "Buy milk, eggs, bread"' 
        });
        return;
    }

    const title = args[0];
    const content = args.slice(1).join(' ');
    
    const notes = getUserNotes(senderId);
    
    const newNote = {
        id: Date.now().toString(),
        title: title,
        content: content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    notes.push(newNote);
    saveUserNotes(senderId, notes);
    
    await sock.sendMessage(chatId, { 
        text: `✅ Note added!\n\n📝 Title: ${title}\n📄 Content: ${content}\n🆔 ID: ${newNote.id}` 
    });
}

async function listNotes(sock, chatId, message, senderId) {
    const notes = getUserNotes(senderId);
    
    if (notes.length === 0) {
        await sock.sendMessage(chatId, { text: '📝 No notes yet! Add one with .notes add <title> <content>' });
        return;
    }
    
    let text = `*📝 Your Notes*\n\n`;
    
    notes.forEach((note, index) => {
        const createdDate = new Date(note.createdAt).toLocaleDateString();
        const contentPreview = note.content.length > 50 ? 
            note.content.substring(0, 50) + '...' : note.content;
        
        text += `${index + 1}. 📌 ${note.title}\n`;
        text += `   📄 ${contentPreview}\n`;
        text += `   🆔 ID: ${note.id}\n`;
        text += `   📅 Created: ${createdDate}\n\n`;
    });
    
    text += `💡 Use .notes get <id/title> to read full note`;
    
    await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
}

async function getNote(sock, chatId, message, identifier, senderId) {
    if (!identifier) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a note ID or title! Use .notes list to see all notes.' 
        });
        return;
    }

    const notes = getUserNotes(senderId);
    
    // Try to find by ID first
    let note = notes.find(n => n.id === identifier);
    
    // If not found, try to find by title
    if (!note) {
        note = notes.find(n => n.title.toLowerCase() === identifier.toLowerCase());
    }
    
    if (!note) {
        await sock.sendMessage(chatId, { text: '❌ Note not found!' });
        return;
    }
    
    const createdDate = new Date(note.createdAt).toLocaleString();
    const updatedDate = new Date(note.updatedAt).toLocaleString();
    
    const text = `*📝 ${note.title}*\n\n` +
                `📄 Content:\n${note.content}\n\n` +
                `🆔 ID: ${note.id}\n` +
                `📅 Created: ${createdDate}\n` +
                `🔄 Updated: ${updatedDate}`;
    
    await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
}

async function deleteNote(sock, chatId, message, identifier, senderId) {
    if (!identifier) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a note ID or title! Use .notes list to see all notes.' 
        });
        return;
    }

    const notes = getUserNotes(senderId);
    const originalLength = notes.length;
    
    // Filter out the note to delete (by ID or title)
    const filteredNotes = notes.filter(n => 
        n.id !== identifier && n.title.toLowerCase() !== identifier.toLowerCase()
    );
    
    if (filteredNotes.length === originalLength) {
        await sock.sendMessage(chatId, { text: '❌ Note not found!' });
        return;
    }
    
    const deletedNote = notes.find(n => 
        n.id === identifier || n.title.toLowerCase() === identifier.toLowerCase()
    );
    
    saveUserNotes(senderId, filteredNotes);
    
    await sock.sendMessage(chatId, { 
        text: `🗑️ Note deleted!\n\n📝 Title: ${deletedNote.title}` 
    });
}

async function clearNotes(sock, chatId, message, senderId) {
    const notes = getUserNotes(senderId);
    
    if (notes.length === 0) {
        await sock.sendMessage(chatId, { text: '📝 No notes to clear!' });
        return;
    }
    
    const count = notes.length;
    saveUserNotes(senderId, []);
    
    await sock.sendMessage(chatId, { text: `🗑️ Cleared ${count} notes!` });
}

async function searchNotes(sock, chatId, message, query, senderId) {
    if (!query) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a search query!\nExample: .notes search important' 
        });
        return;
    }

    const notes = getUserNotes(senderId);
    
    const searchQuery = query.toLowerCase();
    const matchedNotes = notes.filter(note => 
        note.title.toLowerCase().includes(searchQuery) || 
        note.content.toLowerCase().includes(searchQuery)
    );
    
    if (matchedNotes.length === 0) {
        await sock.sendMessage(chatId, { 
            text: `🔍 No notes found for "${query}"` 
        });
        return;
    }
    
    let text = `*🔍 Search Results for "${query}"*\n\n`;
    
    matchedNotes.forEach((note, index) => {
        const createdDate = new Date(note.createdAt).toLocaleDateString();
        const contentPreview = note.content.length > 50 ? 
            note.content.substring(0, 50) + '...' : note.content;
        
        text += `${index + 1}. 📌 ${note.title}\n`;
        text += `   📄 ${contentPreview}\n`;
        text += `   🆔 ID: ${note.id}\n`;
        text += `   📅 Created: ${createdDate}\n\n`;
    });
    
    await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
}

async function showNotesStats(sock, chatId, message, senderId) {
    const notes = getUserNotes(senderId);
    
    if (notes.length === 0) {
        await sock.sendMessage(chatId, { text: '📊 No notes yet! Start taking notes with .notes add <title> <content>' });
        return;
    }
    
    const totalNotes = notes.length;
    
    // Calculate total characters and words
    const totalChars = notes.reduce((sum, note) => sum + note.content.length, 0);
    const totalWords = notes.reduce((sum, note) => sum + note.content.split(/\s+/).length, 0);
    
    // Find longest note
    const longestNote = notes.reduce((a, b) => a.content.length > b.content.length ? a : b);
    const shortestNote = notes.reduce((a, b) => a.content.length < b.content.length ? a : b);
    
    // Most recent note
    const mostRecent = notes.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
    
    let text = `*📊 Your Notes Statistics*\n\n`;
    text += `📈 Total Notes: ${totalNotes}\n`;
    text += `📝 Total Characters: ${totalChars.toLocaleString()}\n`;
    text += `📄 Total Words: ${totalWords.toLocaleString()}\n`;
    text += `📏 Average Length: ${Math.round(totalChars / totalNotes)} chars\n\n`;
    
    text += `📌 Longest Note: "${longestNote.title}" (${longestNote.content.length} chars)\n`;
    text += `📌 Shortest Note: "${shortestNote.title}" (${shortestNote.content.length} chars)\n`;
    text += `🕐 Most Recent: "${mostRecent.title}" (${new Date(mostRecent.createdAt).toLocaleDateString()})\n\n`;
    
    if (totalNotes >= 50) {
        text += `🏆 You're a note-taking master!`;
    } else if (totalNotes >= 20) {
        text += `🌟 Great collection of notes!`;
    } else if (totalNotes >= 10) {
        text += `💪 Nice start! Keep organizing!`;
    } else {
        text += `📝 Building your knowledge base!`;
    }

    await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
}

module.exports = { notesCommand };