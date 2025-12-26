async function calculatorCommand(sock, chatId, message, args) {
    try {
        const expression = args.join(' ');
        
        if (!expression) {
            await showCalculatorHelp(sock, chatId, message);
            return;
        }

        const result = evaluateExpression(expression);
        
        if (result.error) {
            await sock.sendMessage(chatId, { text: `❌ ${result.error}` });
            return;
        }

        let text = `*🧮 Calculator Result*\n\n`;
        text += `📝 **Expression:** \`${expression}\`\n`;
        text += `📊 **Result:** \`${result.value}\`\n\n`;
        
        // Show step-by-step for complex expressions
        if (result.steps && result.steps.length > 1) {
            text += `📋 **Steps:**\n`;
            result.steps.forEach((step, index) => {
                text += `${index + 1}. ${step}\n`;
            });
        }
        
        text += `💡 *Tip: Use .calc help for more operators and functions*`;

        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error in calculator command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to calculate expression!' });
    }
}

async function showCalculatorHelp(sock, chatId, message) {
    const helpText = `*🧮 Calculator Commands*\n\n` +
                    `• \`.calc <expression>\` - Calculate mathematical expression\n\n` +
                    `*Basic Operations:*\n` +
                    `• + Addition\n` +
                    `• - Subtraction\n` +
                    `• * Multiplication\n` +
                    `• / Division\n` +
                    `• % Modulo\n` +
                    `• ^ Power\n\n` +
                    `*Advanced Functions:*\n` +
                    `• sqrt(x) - Square root\n` +
                    `• sin(x), cos(x), tan(x) - Trigonometric\n` +
                    `• log(x) - Natural logarithm\n` +
                    `• log10(x) - Base 10 logarithm\n` +
                    `• abs(x) - Absolute value\n` +
                    `• round(x) - Round to nearest integer\n` +
                    `• floor(x) - Round down\n` +
                    `• ceil(x) - Round up\n\n` +
                    `*Constants:*\n` +
                    `• pi - π (3.14159...)\n` +
                    `• e - Euler's number (2.71828...)\n\n` +
                    `*Examples:*\n` +
                    `• .calc 2 + 3 * 4\n` +
                    `• .calc sqrt(16)\n` +
                    `• .calc sin(pi/2)\n` +
                    `• .calc 2^10\n` +
                    `• .calc (5 + 3) * (10 - 2)`;

    await sock.sendMessage(chatId, { text: helpText, ...global.channelInfo }, { quoted: message });
}

function evaluateExpression(expression) {
    try {
        // Clean and preprocess the expression
        let expr = expression.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/pi/g, Math.PI)
            .replace(/e/g, Math.E)
            .replace(/\^/g, '**')
            .replace(/sqrt/g, 'Math.sqrt')
            .replace(/sin/g, 'Math.sin')
            .replace(/cos/g, 'Math.cos')
            .replace(/tan/g, 'Math.tan')
            .replace(/log10/g, 'Math.log10')
            .replace(/log/g, 'Math.log')
            .replace(/abs/g, 'Math.abs')
            .replace(/round/g, 'Math.round')
            .replace(/floor/g, 'Math.floor')
            .replace(/ceil/g, 'Math.ceil');

        // Check for valid characters only
        if (!/^[0-9+\-*/().\s*math.sqrtmath.sinmath.cosmath.tanmath.log10math.logmath.absmath.roundmath.floormath.ceilpi_e]+$/.test(expr)) {
            return { error: 'Invalid characters in expression!' };
        }

        // Safety check - prevent code injection
        if (expr.includes('eval') || expr.includes('function') || expr.includes('=>') || expr.includes('{') || expr.includes('}')) {
            return { error: 'Unsafe expression detected!' };
        }

        // Evaluate the expression
        const result = Function('"use strict"; return (' + expr + ')')();
        
        // Check if result is valid number
        if (isNaN(result) || !isFinite(result)) {
            return { error: 'Invalid calculation result!' };
        }

        // Format the result
        let formattedResult;
        if (Number.isInteger(result)) {
            formattedResult = result.toString();
        } else if (Math.abs(result) < 0.0001 || Math.abs(result) > 1000000) {
            formattedResult = result.toExponential(6);
        } else {
            formattedResult = Math.round(result * 1000000) / 1000000;
        }

        return { 
            value: formattedResult,
            steps: generateSteps(expression, result)
        };

    } catch (error) {
        console.error('Calculation error:', error);
        return { error: 'Invalid mathematical expression!' };
    }
}

function generateSteps(originalExpression, result) {
    const steps = [];
    const expr = originalExpression.toLowerCase();
    
    // Simple step generation for basic operations
    if (expr.includes('+') || expr.includes('-') || expr.includes('*') || expr.includes('/')) {
        steps.push(`Original: ${originalExpression}`);
        steps.push(`Apply order of operations (PEMDAS)`);
        steps.push(`Calculate: ${result}`);
    } else if (expr.includes('sqrt') || expr.includes('sin') || expr.includes('cos') || expr.includes('tan')) {
        steps.push(`Original: ${originalExpression}`);
        steps.push(`Apply mathematical function`);
        steps.push(`Result: ${result}`);
    } else {
        steps.push(`Expression: ${originalExpression}`);
        steps.push(`Result: ${result}`);
    }
    
    return steps;
}

module.exports = { calculatorCommand };