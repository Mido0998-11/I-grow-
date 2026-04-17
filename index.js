const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');
const express = require('express');

const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 123456789; // 👈 حط الآيدي بتاعك هنا عشان تقدر تعمل إذاعة

// --- 🗄️ قاعدة البيانات (لحفظ اليوزرات) ---
// ملاحظة: يفضل تستخدم MongoDB Atlas مجاني وتحط الرابط هنا
mongoose.connect('mongodb+srv://user:pass@cluster.mongodb.net/wizzyBot'); 
const User = mongoose.model('User', { telegramId: Number, name: String });

// --- 🌐 سيرفر ويب (عشان ريندر يفضل صاحي) ---
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Sovereign Bot is Live!'));
app.listen(process.env.PORT || 3000);

// --- 🏠 أمر البداية ---
bot.start(async (ctx) => {
    await User.findOneAndUpdate({ telegramId: ctx.from.id }, { name: ctx.from.first_name }, { upsert: true });
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية الأنمي الأسطورية** 👑🏮\n\nأنا بوت Wizzy المطور. أرسل اسم أنمي أو مانجا للبحث.`, 
    Markup.inlineKeyboard([
        [Markup.button.url('قناة المطور', 'https://t.me/wizzy_123_bot')],
        [Markup.button.callback('أحدث أخبار الأنمي 📰', 'get_news')]
    ]));
});

// --- 🔍 البحث عن الأنمي بأزرار احترافية ---
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return; // تجاهل الأوامر
    const query = ctx.message.text;
    const load = await ctx.reply('جاري استخراج البيانات من الأرشيف... ⏳');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${query}&limit=1`);
        const anime = res.data.data[0];

        if (anime) {
            const caption = `🏮 *${anime.title}*\n\n⭐ *التقييم:* ${anime.score}\n🎞️ *الحلقات:* ${anime.episodes}\n📝 *القصة:* ${anime.synopsis?.substring(0, 300)}...`;
            
            await ctx.sendPhoto(anime.images.jpg.large_image_url, {
                caption: caption,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url('🎬 مشاهدة الحلقات', `https://ww3.animeslayer.net/s/${query.replace(/\s+/g, '%20')}`)],
                    [Markup.button.url('📖 قراءة المانجا', `https://gmanga.me/mangas?search=${query}`)],
                    [Markup.button.callback('معلومات إضافية ℹ️', `info_${anime.mal_id}`)]
                ])
            });
        } else {
            ctx.reply('لم أجد هذا العمل يا ملك! 😅');
        }
    } catch (e) { ctx.reply('خطأ في الاتصال بالسيرفر.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 📣 نظام الإذاعة (للأدمن فقط) ---
bot.command('broadcast', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('هذا الأمر للسيادة فقط! 👑');
    const msg = ctx.message.text.replace('/broadcast ', '');
    const users = await User.find();
    let count = 0;
    users.forEach(user => {
        bot.telegram.sendMessage(user.telegramId, `📢 **رسالة من الإمبراطور ويزي:**\n\n${msg}`, { parse_mode: 'Markdown' });
        count++;
    });
    ctx.reply(`تم إرسال الإذاعة لـ ${count} مستخدم.`);
});

// --- 📰 أخبار الأنمي اليومية (تلقائي) ---
cron.schedule('0 9 * * *', async () => { // ترسل الساعة 9 صباحاً كل يوم
    try {
        const res = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
        const news = res.data.data.map(a => `🔹 ${a.title}`).join('\n');
        const users = await User.find();
        users.forEach(user => {
            bot.telegram.sendMessage(user.telegramId, `🆕 **أخبار الأنمي الصباحية:**\n\nأشهر الأنميات حالياً:\n${news}`, { parse_mode: 'Markdown' });
        });
    } catch (e) { console.log('خطأ في جلب الأخبار'); }
});

bot.launch();
console.log("✅ البوت الأسطوري متصل!");
