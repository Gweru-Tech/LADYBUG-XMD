const axios = require('axios');

async function weather2Command(sock, chatId, message, args) {
    try {
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            await showWeatherHelp(sock, chatId, message);
            return;
        }

        switch (action) {
            case 'current':
            case 'now':
                await getCurrentWeather(sock, chatId, message, args.slice(1).join(' '));
                break;
                
            case 'forecast':
            case 'fc':
                await getWeatherForecast(sock, chatId, message, args.slice(1).join(' '));
                break;
                
            case 'alerts':
                await getWeatherAlerts(sock, chatId, message, args.slice(1).join(' '));
                break;
                
            case 'air':
            case 'quality':
                await getAirQuality(sock, chatId, message, args.slice(1).join(' '));
                break;
                
            case 'radar':
                await getWeatherRadar(sock, chatId, message, args.slice(1).join(' '));
                break;
                
            default:
                // If no action provided, treat as current weather
                await getCurrentWeather(sock, chatId, message, args.join(' '));
        }
    } catch (error) {
        console.error('Error in weather2 command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get weather information!' });
    }
}

async function showWeatherHelp(sock, chatId, message) {
    const helpText = `*🌤️ Weather Commands*\n\n` +
                    `• \`.weather2 current <city>\` - Current weather\n` +
                    `• \`.weather2 forecast <city>\` - 5-day forecast\n` +
                    `• \`.weather2 alerts <city>\` - Weather alerts\n` +
                    `• \`.weather2 air <city>\` - Air quality\n` +
                    `• \`.weather2 radar <city>\` - Weather radar\n\n` +
                    `*Examples:*\n` +
                    `• .weather2 current London\n` +
                    `• .weather2 forecast New York\n` +
                    `• .weather2 air Tokyo\n\n` +
                    `*Note: This is an enhanced weather command with more features than .weather*`;

    await sock.sendMessage(chatId, { text: helpText, ...global.channelInfo }, { quoted: message });
}

async function getCurrentWeather(sock, chatId, message, city) {
    if (!city) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a city name!\nExample: .weather2 current London' 
        });
        return;
    }

    try {
        // Using OpenWeatherMap API (you'll need to add API key)
        const apiKey = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY';
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
        
        const weather = response.data;
        
        let text = `*🌤️ Current Weather in ${weather.name}*\n\n`;
        text += `🌡️ **Temperature:** ${weather.main.temp}°C (feels like ${weather.main.feels_like}°C)\n`;
        text += `☁️ **Weather:** ${weather.weather[0].main} - ${weather.weather[0].description}\n`;
        text += `💧 **Humidity:** ${weather.main.humidity}%\n`;
        text += `🌪️ **Wind:** ${weather.wind.speed} m/s, ${weather.wind.deg}°\n`;
        text += `📊 **Pressure:** ${weather.main.pressure} hPa\n`;
        text += `👁️ **Visibility:** ${weather.visibility / 1000} km\n`;
        text += `☁️ **Cloudiness:** ${weather.clouds.all}%\n\n`;
        
        // Sun times
        const sunrise = new Date(weather.sys.sunrise * 1000).toLocaleTimeString();
        const sunset = new Date(weather.sys.sunset * 1000).toLocaleTimeString();
        text += `🌅 **Sunrise:** ${sunrise}\n`;
        text += `🌇 **Sunset:** ${sunset}\n\n`;
        
        // Additional info
        if (weather.rain) {
            text += `🌧️ **Rain:** ${weather.rain['1h'] || weather.rain['3h'] || 0} mm\n`;
        }
        if (weather.snow) {
            text += `❄️ **Snow:** ${weather.snow['1h'] || weather.snow['3h'] || 0} mm\n`;
        }
        
        text += `📍 Coordinates: ${weather.coord.lat}, ${weather.coord.lon}\n`;
        text += `🕐 Updated: ${new Date().toLocaleString()}`;

        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting current weather:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get weather data! Check city name and try again.' });
    }
}

async function getWeatherForecast(sock, chatId, message, city) {
    if (!city) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a city name!\nExample: .weather2 forecast London' 
        });
        return;
    }

    try {
        const apiKey = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY';
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
        
        const forecast = response.data;
        
        let text = `*🌤️ 5-Day Weather Forecast for ${forecast.city.name}*\n\n`;
        
        // Group by day
        const dailyForecasts = {};
        forecast.list.forEach(item => {
            const date = new Date(item.dt * 1000).toLocaleDateString();
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = [];
            }
            dailyForecasts[date].push(item);
        });
        
        Object.entries(dailyForecasts).slice(0, 5).forEach(([date, dayData]) => {
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
            const temps = dayData.map(d => d.main.temp);
            const minTemp = Math.min(...temps);
            const maxTemp = Math.max(...temps);
            const mainWeather = dayData[0].weather[0].main;
            const description = dayData[0].weather[0].description;
            
            text += `📅 **${dayName} (${date})**\n`;
            text += `🌡️ ${minTemp.toFixed(1)}° - ${maxTemp.toFixed(1)}°C\n`;
            text += `☁️ ${mainWeather} - ${description}\n`;
            
            // Add 3-hour forecasts
            text += `📊 3-hour forecasts:\n`;
            dayData.slice(0, 3).forEach(item => {
                const time = new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                text += `   ${time}: ${item.main.temp.toFixed(1)}°C, ${item.weather[0].description}\n`;
            });
            text += '\n';
        });
        
        text += `🕐 Updated: ${new Date().toLocaleString()}`;

        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting weather forecast:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get weather forecast!' });
    }
}

async function getWeatherAlerts(sock, chatId, message, city) {
    if (!city) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a city name!\nExample: .weather2 alerts London' 
        });
        return;
    }

    try {
        // First get coordinates for the city
        const apiKey = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY';
        const geoResponse = await axios.get(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`);
        
        if (geoResponse.data.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ City not found!' });
            return;
        }
        
        const { lat, lon } = geoResponse.data[0];
        
        // Get alerts (one call API)
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&exclude=minutely,hourly,daily`);
        
        const alerts = response.data.alerts;
        
        if (!alerts || alerts.length === 0) {
            await sock.sendMessage(chatId, { text: `✅ No weather alerts for ${city}` });
            return;
        }
        
        let text = `*🚨 Weather Alerts for ${city}*\n\n`;
        
        alerts.forEach((alert, index) => {
            text += `${index + 1}. **${alert.event}**\n`;
            text += `📝 ${alert.description}\n`;
            text += `🕐 Start: ${new Date(alert.start * 1000).toLocaleString()}\n`;
            text += `🕐 End: ${new Date(alert.end * 1000).toLocaleString()}\n`;
            
            if (alert.sender_name) {
                text += `📢 Source: ${alert.sender_name}\n`;
            }
            text += '\n';
        });
        
        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting weather alerts:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get weather alerts!' });
    }
}

async function getAirQuality(sock, chatId, message, city) {
    if (!city) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a city name!\nExample: .weather2 air London' 
        });
        return;
    }

    try {
        const apiKey = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY';
        const geoResponse = await axios.get(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`);
        
        if (geoResponse.data.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ City not found!' });
            return;
        }
        
        const { lat, lon } = geoResponse.data[0];
        
        // Get air pollution data
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        
        const airQuality = response.data;
        const current = airQuality.list[0];
        const aqi = current.main.aqi;
        
        const aqiLevels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
        const aqiColors = ['🟢', '🟡', '🟠', '🔴', '🟣'];
        const aqiDescriptions = [
            'Air quality is satisfactory, and air pollution poses little or no risk.',
            'Air quality is acceptable. However, there may be a risk for some people who are unusually sensitive to air pollution.',
            'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
            'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
            'Health alert: The risk of health effects is increased for everyone.'
        ];
        
        let text = `*🌬️ Air Quality for ${city}*\n\n`;
        text += `${aqiColors[aqi - 1]} **AQI Level ${aqi}: ${aqiLevels[aqi - 1]}**\n\n`;
        text += `📝 ${aqiDescriptions[aqi - 1]}\n\n`;
        
        text += `📊 **Pollutants:**\n`;
        text += `🟫 CO: ${current.components.co} μg/m³\n`;
        text += `🟤 NO: ${current.components.no} μg/m³\n`;
        text += `🟠 NO₂: ${current.components.no2} μg/m³\n`;
        text += `🟡 O₃: ${current.components.o3} μg/m³\n`;
        text += `🔵 SO₂: ${current.components.so2} μg/m³\n`;
        text += `🟣 PM2.5: ${current.components.pm2_5} μg/m³\n`;
        text += `🟤 PM10: ${current.components.pm10} μg/m³\n`;
        text += `🟢 NH₃: ${current.components.nh3} μg/m³\n\n`;
        
        text += `🕐 Updated: ${new Date().toLocaleString()}`;

        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting air quality:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get air quality data!' });
    }
}

async function getWeatherRadar(sock, chatId, message, city) {
    if (!city) {
        await sock.sendMessage(chatId, { 
            text: '❌ Please provide a city name!\nExample: .weather2 radar London' 
        });
        return;
    }

    try {
        // Get city coordinates
        const apiKey = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY';
        const geoResponse = await axios.get(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`);
        
        if (geoResponse.data.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ City not found!' });
            return;
        }
        
        const { lat, lon, name } = geoResponse.data[0];
        
        // Generate radar map URL (using RainViewer or similar)
        const radarUrl = `https://tile.openweathermap.org/map/precipitation_new/6/${Math.floor((lat + 180) / 10)}/${Math.floor((lon + 180) / 10)}.png?appid=${apiKey}`;
        
        let text = `*📡 Weather Radar for ${name}*\n\n`;
        text += `📍 Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}\n\n`;
        text += `🌧️ **Precipitation Radar**\n`;
        text += `🔗 Live radar: [View Radar Map](https://www.rainviewer.com/?lat=${lat}&lon=${lon}&z=8)\n\n`;
        text += `🌊 **Marine Conditions**\n`;
        
        // Get marine data if near coast
        try {
            const marineResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
            const marine = marineResponse.data;
            
            if (marine.main) {
                text += `🌡️ Sea Temperature: ${marine.main.sea_level || 'N/A'}°C\n`;
            }
            if (marine.wind) {
                text += `🌪️ Wind Speed: ${marine.wind.speed} m/s\n`;
                text += `🧭 Wind Direction: ${marine.wind.deg}°\n`;
            }
        } catch (e) {
            // Marine data not available
        }
        
        text += `\n🕐 Updated: ${new Date().toLocaleString()}\n`;
        text += `💡 Note: For live animated radar, click the link above`;

        await sock.sendMessage(chatId, { text, ...global.channelInfo }, { quoted: message });
    } catch (error) {
        console.error('Error getting weather radar:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get weather radar data!' });
    }
}

module.exports = { weather2Command };