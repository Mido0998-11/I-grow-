const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const express = require('express');

const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const CHANNEL_ID = '@wizzy_dv_sd';
const USERS_FILE = './users.json';

// --- إدارة البيانات ---
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
function getUsers() { try { return JSON.parse(fs.readFileSync(USERS_FILE)); } catch(e) { return []; } }
function saveUser(id, name) {
    let users = getUsers();
    if (!users.find(u => u.id === id)) {
        users.push({ id, name });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    }
}

// سيرفر ويب
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy System is Running!'));
app.listen(process.env.PORT || 3000);

// فحص الاشتراك
async function checkSub(ctx, next) {
    if (ctx.from.id === ADMIN_ID) return next();
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(member.status)) return next();
        await ctx.replyWithMarkdown(`⚠️ **عذراً يا ملك، يجب الانضمام للقناة أولاً!**`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للقناة الآن 👑', `https://t.me/wizzy_dv_sd`)]])
        );
    } catch (e) { return next(); }
}

// --- 🏠 البداية (استخدام الأزرار الثابتة) ---
bot.start(checkSub, async (ctx) => {
    saveUser(ctx.from.id, ctx.from.first_name);
    try { await ctx.react('👑'); } catch (e) {}
    
    // أزرار القائمة الثابتة (Reply Keyboard)
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية الأنمي** 👑🏮\n\nاستخدم الأزرار بالأسفل للتنقل، أو أرسل اسم الأنمي مباشرة للبحث.`,
        Markup.keyboard([
            ['🔍 بحث عن أنمي', '📰 أخبار الأنمي'],
            ['🛠️ لوحة التحكم', '🔱 قناة السيادة']
        ]).resize().persistent() // تجعل القائمة تظهر دائماً وبحجم مناسب
    );
});

// --- معالجة الضغط على الأزرار الثابتة ---
bot.hears('🔍 بحث عن أنمي', (ctx) => ctx.reply('أرسل لي اسم الأنمي بالإنجليزي الآن يا ملك.. 🔍'));
bot.hears('📰 أخبار الأنمي', async (ctx) => {
    const res = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
    const news = res.data.data.map(a => `🔥 *${a.title}*`).join('\n\n');
    ctx.replyWithMarkdown(`📰 **أخبار الموسم المتصدرة:**\n\n${news}`);
});
bot.hears('🔱 قناة السيادة', (ctx) => ctx.reply('تفضل رابط القناة يا إمبراطور: https://t.me/wizzy_dv_sd'));
bot.hears('🛠️ لوحة التحكم', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('هذه المنطقة للسيادة فقط! ❌');
    const users = getUsers();
    ctx.replyWithMarkdown(`📊 **إحصائيات الإمبراطورية:**\n\n👥 عدد الرعايا: \`${users.length}\`\n📡 الحالة: \`مستقر\``);
});

// --- البحث (عند إرسال نص) ---
bot.on('text', checkSub, async (ctx) => {
    const query = ctx.message.text;
    if (['🔍 بحث عن أنمي', '📰 أخبار الأنمي', '🛠️ لوحة التحكم', '🔱 قناة السيادة'].includes(query)) return;

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🔍 جاري استخراج البيانات...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const anime = res.data.data[0];

        if (anime) {
            try { await ctx.react('🔥'); } catch (e) {}
            // نستخدم الأزرار الطائرة (Inline) فقط للبيانات المتغيرة كالحلقات والمانجا
            const buttons = [
                [Markup.button.callback('🎬 قائمة الحلقات', `e_${anime.mal_id}_1`)],
                [Markup.button.callback('📖 معلومات المانجا', `m_${anime.mal_id}`)],
                [Markup.button.url('🚀 مشاهدة سريعة', `https://witanime.pics/?s=${encodeURIComponent(anime.title)}`)]
            ];

            await ctx.sendPhoto(anime.images.jpg.large_image_url, {
                caption: `🏯 *${anime.title}*\n\n⭐ *التقييم:* ${anime.score || '7.5'}\n📝 *القصة:* ${anime.synopsis?.substring(0, 300)}...`,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            });
        } else { ctx.reply('لم أجد نتائج! حاول كتابة الاسم بدقة.'); }
    } catch (e) { ctx.reply('السيرفر مشغول، حاول لاحقاً.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- معالجة الحلقات (Inline) ---
bot.action(/e_(\d+)_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const [_, id, page] = ctx.match;
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${id}/episodes?page=${page}`);
        const eps = res.data.data;
        if (!eps || eps.length === 0) return ctx.reply('⚠️ لا توجد حلقات متاحة حالياً.');

        let buttons = eps.map(ep => [Markup.button.url(`حلقة ${ep.mal_id}: ${ep.title.substring(0,20)}`, `https://witanime.pics/` )]);
        let nav = [];
        if (parseInt(page) > 1) nav.push(Markup.button.callback('⬅️', `e_${id}_${parseInt(page)-1}`));
        if (res.data.pagination.has_next_page) nav.push(Markup.button.callback('➡️', `e_${id}_${parseInt(page)+1}`));
        if (nav.length > 0) buttons.push(nav);

        await ctx.editMessageText(`🎞️ **قائمة الحلقات - ص ${page}:**`, Markup.inlineKeyboard(buttons));
    } catch (e) { ctx.reply('فشل جلب الحلقات.'); }
});

// --- معالجة المانجا (Inline) ---
bot.action(/m_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    try {
        const anime = await axios.get(`https://api.jikan.moe/v4/anime/${id}`);
        const res = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(anime.data.data.title)}&limit=1`);
        const manga = res.data.data[0];

        if (manga) {
            ctx.replyWithPhoto(manga.images.jpg.large_image_url, {
                caption: `📖 **مانجا: ${manga.title}**\n\n⭐ التقييم: ${manga.score}\n📚 الفصول: ${manga.chapters || 'مستمرة'}\n\n📝 الوصف: ${manga.synopsis?.substring(0, 200)}...`,
                ...Markup.inlineKeyboard([[Markup.button.url('🚀 قراءة الفصول', `https://gmanga.me/mangas?search=${encodeURIComponent(manga.title)}`)]])
            });
        }
    } catch (e) { ctx.reply('خطأ في المانجا.'); }
});

bot.telegram.deleteWebhook().then(() => {
    bot.launch();
    console.log("✅ القلعة متصلة بنظام الأزرار المزدوج!");
});
