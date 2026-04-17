const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');

// التوكن الخاص بك يا ملك
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');

// فتح منفذ ويب عشان Render ما يقفل البوت (للمجانية)
const app = express();
app.get('/', (req, res) => res.send('🔱 إمبراطورية ويزي للأنمي تعمل بنجاح!'));
app.listen(process.env.PORT || 3000);

// رسالة الترحيب /start
bot.start((ctx) => {
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية الأنمي والمانجا**! 👑🏯\n\nأرسل لي اسم أي عمل (بالإنجليزي) وسأبحث لك عنه في الأرشيف الملكي.\n\n*أمثلة:*\n- One Piece\n- Naruto\n- Solo Leveling`);
});

// معالجة البحث
bot.on('text', async (ctx) => {
    const query = ctx.message.text;
    
    try {
        // البحث في محرك Jikan العالمي (مجاني)
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${query}&limit=1`);
        
        if (response = res.data.data[0]) {
            const caption = `
🏮 *الاسم:* ${response.title}
⭐ *التقييم:* ${response.score || 'غير متوفر'}
🎭 *النوع:* ${response.type}
🎞️ *الحلقات:* ${response.episodes || 'غير معروف'}

📝 *القصة:*
${response.synopsis ? response.synopsis.substring(0, 400) + '...' : 'لا يوجد وصف متاح.'}

🔗 [فتح في MyAnimeList](${response.url})
            `;

            await ctx.sendPhoto(response.images.jpg.large_image_url, {
                caption: caption,
                parse_mode: 'Markdown'
            });
        } else {
            ctx.reply('عذراً يا ملك، لم أجد هذا العمل في الأرشيف. تأكد من الاسم بالإنجليزية.');
        }
    } catch (error) {
        ctx.reply('السيرفر مشغول حالياً، حاول مرة أخرى يا إمبراطور.');
    }
});

bot.launch();
console.log("✅ بوت تليجرام متصل الآن!");
