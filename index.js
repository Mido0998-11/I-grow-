const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const USERS_FILE = './users.json';

// --- 🛠️ نظام حفظ المستخدمين (بدون قاعدة بيانات معقدة) ---
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));

function saveUser(id, name) {
    let users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (!users.find(u => u.id === id)) {
        users.push({ id, name });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    }
}

// --- 🌐 سيرفر ويب (عشان ريندر يفضل صاحي) ---
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Sovereign Bot is Live!'));
app.listen(process.env.PORT || 3000);

// --- 🏠 أمر البداية ---
bot.start((ctx) => {
    saveUser(ctx.from.id, ctx.from.first_name);
    console.log(`👤 مستخدم جديد انضم: ${ctx.from.id}`);
    
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية الأنمي الأسطورية** 👑🏮\n\nأنا بوت Wizzy المطور. أرسل اسم أنمي أو مانجا للبحث.`, 
    Markup.inlineKeyboard([
        [Markup.button.url('قناة المطور 👑', 'https://t.me/wizzy_123_bot')],
        [Markup.button.callback('أحدث أخبار الأنمي 📰', 'get_news')]
    ]));
});

// --- 🔍 البحث عن الأنمي بأزرار احترافية ---
bot.on('text', async (ctx) => {
    const query = ctx.message.text;
    if (query.startsWith('/')) return;
    
    const load = await ctx.reply('جاري استخراج البيانات من الأرشيف... ⏳');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${query}&limit=1`);
        const anime = res.data.data[0];

        if (anime) {
            const caption = `🏮 *${anime.title}*\n\n⭐ *التقييم:* ${anime.score || 'غير متوفر'}\n🎞️ *الحلقات:* ${anime.episodes || 'مستمر'}\n📝 *القصة:* ${anime.synopsis?.substring(0, 300)}...`;
            
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
            ctx.reply('لم أجد هذا العمل في الأرشيف الإمبراطوري! 😅');
        }
    } catch (e) { 
        ctx.reply('السيرفر مشغول، حاول لاحقاً.');
    } finally { 
        ctx.deleteMessage(load.message_id).catch(() => {}); 
    }
});

// --- 📣 نظام الإذاعة (لك أنت فقط يا ملك) ---
bot.command('broadcast', async (ctx) => {
    // ⚠️ ملاحظة: استبدل الرقم ده بالـ ID بتاعك اللي حتشوفه في الـ Logs لما تضغط Start
    const MY_ID = 1048856268; // حط الـ ID بتاعك هنا
    
    if (ctx.from.id !== MY_ID) return ctx.reply('هذا الأمر للسيادة فقط! 👑');
    
    const msg = ctx.message.text.replace('/broadcast ', '');
    if (!msg || msg === '/broadcast') return ctx.reply('أدخل نص الرسالة بعد الأمر.');

    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    let success = 0;

    users.forEach(user => {
        bot.telegram.sendMessage(user.id, `📢 **رسالة من الإمبراطور ويزي:**\n\n${msg}`, { parse_mode: 'Markdown' })
            .then(() => success++)
            .catch(() => {});
    });
    
    ctx.reply(`تم إرسال الإذاعة لـ ${users.length} مستخدم بنجاح!`);
});

// --- 📰 أخبار الأنمي اليومية (تلقائي) ---
cron.schedule('0 9 * * *', async () => {
    try {
        const res = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
        const news = res.data.data.map(a => `🔹 ${a.title}`).join('\n');
        const users = JSON.parse(fs.readFileSync(USERS_FILE));
        
        users.forEach(user => {
            bot.telegram.sendMessage(user.id, `🆕 **أخبار الأنمي الصباحية:**\n\nأشهر الأنميات حالياً:\n${news}`, { parse_mode: 'Markdown' });
        });
    } catch (e) { console.log('خطأ في جلب الأخبار'); }
});

bot.launch();
console.log("✅ البوت الأسطوري متصل الآن وشغال 24 ساعة!");
