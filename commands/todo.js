const fs = require('fs');

async function todoCommand(sock, chatId, message, args) {
    try {
        const action = args[0]?.toLowerCase();
        const senderId = message.key.participant || message.key.remoteJid;
        
        if (!action) {
            await showTodoHelp(sock, chatId, message);
            return;
        }

        switch (action) {
            case 'add':
            case 'new':
                await addTodo(sock, chatId, message, args.slice(1), senderId);
                break;
                
            case 'list':
            case 'show':
                await listTodos(sock, chatId, message, senderId);
                break;
                
            case 'done':
            case 'complete':
                await completeTodo(sock, chatId, message, args[1], senderId);
                break;
                
            case 'del':
            case 'delete':
            case 'remove':
                await deleteTodo(sock, chatId, message, args[1], senderId);
                break;
                
            case 'clear':
                await clearTodos(sock, chatId, message, senderId);
                break;
                
            case 'stats':
                await showTodoStats(sock, chatId, message, senderId);
                break;
                
            default:
                await showTodoHelp(sock, chatId, message);
        }
    } catch (error) {
        console.error('Error in todo command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to process todo command!' });
    }
}

async function showTodoHelp(sock, chatId, message) {
    const helpText = `*📝 Todo Commands*\n\n` +
                    `• \`.todo add <task>\` - Add new task\n` +
                    `• \`.todo list\` - Show all tasks\n` +
                    `• \`.todo done <id>\` - Mark task as complete\n` +
                    `• \`.todo del <id>\` - Delete task\n` +
                    `• \`.todo clear\` - Clear all tasks\n` +
                    `• \`.todo stats\` - Show statistics\n\n` +
                    `*Examples:*\n` +
                    `• .todo add Buy groceries\n` +
                    `• .todo add Call mom at 5pm\n` +
                    `• .todo done 1\n` +
                    `• .todo del 2`;

    await sock.sendMessage(chatId, { text: helpText, ...global.channelInfo }, { quoted: message });
}

function getTodosFile() {
    return './data/todos.json';
}

function getUserTodos(senderId) {
    const todoFile = getTodosFile();
    let todos = {};
    
    try {
        todos = JSON.parse(fs.readFileSync(todoFile));
    } catch (e) {
        todos = {};
    }
    
    if (!todos[senderId]) {
        todos[senderId] = [];
    }
    
    return todos[senderId];
}

function saveUserTodos(senderId, todos) {
    const todoFile = getTodosFile();
    let allTodos = {};
    
    try {
        allTodos = JSON.parse(fs.readFileSync(todoFile));
    } catch (e) {
        allTodos = {};
    }
    
    allTodos[senderId] = todos;
    fs.writeFileSync(todoFile, JSON.stringify(allTodos, null, 2));
}

async function addTodo(sock, chatId, message, args, senderId) {
    const taskText = args.join(' ');
    
    if (!taskText) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a task description!\nExample: .todo add Buy groceries' 
        });
        return;
    }

    const todos = getUserTodos(senderId);
    
    const newTodo = {
        id: Date.now().toString(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
    };
    
    todos.push(newTodo);
    saveUserTodos(senderId, todos);
    
    await sock.sendMessage(chatId, { 
        text: `✅ Task added!\n\n📝 ${taskText}\n🆔 ID: ${newTodo.id}` 
    });
}

async function listTodos(sock, chatId, message, senderId) {
    const todos = getUserTodos(senderId);
    
    if (todos.length === 0) {
        await sock.sendMessage(chatId, { text: '📝 No tasks yet! Add one with .todo add <task>' });
        return;
    }

    const incompleteTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);
    
    let text = `*📝 Your Todo List*\n\n`;
    
    if (incompleteTodos.length > 0) {
        text += `*🔄 Pending Tasks (${incompleteTodos.length})*\n\n`;
        incompleteTodos.forEach((todo, index) => {
            const createdDate = new Date(todo.createdAt).toLocaleDateString();
            text += `${index + 1}. ${todo.text}\n`;
            text += `   🆔 ID: ${todo.id}\n`;
            text += `   📅 Created: ${createdDate}\n\n`;
        });
    }
    
    if (completedTodos.length > 0) {
        text += `*✅ Completed Tasks (${completedTodos.length})*\n\n`;
        completedTodos.forEach((todo, index) => {
            const completedDate = new Date(todo.completedAt).toLocaleDateString();
            text += `~${index + 1}. ${todo.text}~\n`;
            text += `   🆔 ID: ${todo.id}\n`;
            text += `   ✅ Completed: ${completedDate}\n\n`;
        });
    }
    
    text += `💡 Use .todo done <id> to complete or .todo del <id> to delete`;
    
    await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
}

async function completeTodo(sock, chatId, message, todoId, senderId) {
    if (!todoId) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a task ID! Use .todo list to see IDs.' 
        });
        return;
    }

    const todos = getUserTodos(senderId);
    const todoIndex = todos.findIndex(t => t.id === todoId);
    
    if (todoIndex === -1) {
        await sock.sendMessage(chatId, { text: '❌ Task not found!' });
        return;
    }
    
    if (todos[todoIndex].completed) {
        await sock.sendMessage(chatId, { text: '✅ This task is already completed!' });
        return;
    }
    
    todos[todoIndex].completed = true;
    todos[todoIndex].completedAt = new Date().toISOString();
    
    saveUserTodos(senderId, todos);
    
    await sock.sendMessage(chatId, { 
        text: `✅ Task completed!\n\n📝 ${todos[todoIndex].text}\n🎉 Great job! 🎉` 
    });
}

async function deleteTodo(sock, chatId, message, todoId, senderId) {
    if (!todoId) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a task ID! Use .todo list to see IDs.' 
        });
        return;
    }

    const todos = getUserTodos(senderId);
    const originalLength = todos.length;
    
    const filteredTodos = todos.filter(t => t.id !== todoId);
    
    if (filteredTodos.length === originalLength) {
        await sock.sendMessage(chatId, { text: '❌ Task not found!' });
        return;
    }
    
    const deletedTodo = todos.find(t => t.id === todoId);
    saveUserTodos(senderId, filteredTodos);
    
    await sock.sendMessage(chatId, { 
        text: `🗑️ Task deleted!\n\n📝 ${deletedTodo.text}` 
    });
}

async function clearTodos(sock, chatId, message, senderId) {
    const todos = getUserTodos(senderId);
    
    if (todos.length === 0) {
        await sock.sendMessage(chatId, { text: '📝 No tasks to clear!' });
        return;
    }
    
    const count = todos.length;
    saveUserTodos(senderId, []);
    
    await sock.sendMessage(chatId, { text: `🗑️ Cleared ${count} tasks!` });
}

async function showTodoStats(sock, chatId, message, senderId) {
    const todos = getUserTodos(senderId);
    
    if (todos.length === 0) {
        await sock.sendMessage(chatId, { text: '📊 No tasks yet! Start adding some with .todo add <task>' });
        return;
    }
    
    const totalTasks = todos.length;
    const completedTasks = todos.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = Math.round((completedTasks / totalTasks) * 100);
    
    // Find most productive day
    const completionByDay = {};
    todos.filter(t => t.completed).forEach(todo => {
        const day = new Date(todo.completedAt).toLocaleDateString();
        completionByDay[day] = (completionByDay[day] || 0) + 1;
    });
    
    const mostProductiveDay = Object.keys(completionByDay).reduce((a, b) => 
        completionByDay[a] > completionByDay[b] ? a : b, 'N/A'
    );
    
    let text = `*📊 Your Todo Statistics*\n\n`;
    text += `📈 Total Tasks: ${totalTasks}\n`;
    text += `✅ Completed: ${completedTasks}\n`;
    text += `🔄 Pending: ${pendingTasks}\n`;
    text += `📊 Completion Rate: ${completionRate}%\n\n`;
    
    if (mostProductiveDay !== 'N/A') {
        text += `🏆 Most Productive Day: ${mostProductiveDay} (${completionByDay[mostProductiveDay]} tasks)\n\n`;
    }
    
    // Motivational message
    if (completionRate >= 80) {
        text += `🌟 Amazing! You're a productivity champion!`;
    } else if (completionRate >= 60) {
        text += `💪 Great job! Keep up the momentum!`;
    } else if (completionRate >= 40) {
        text += `👍 Good progress! You can do better!`;
    } else {
        text += `🚀 Time to get things done! You've got this!`;
    }

    await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
}

module.exports = { todoCommand };