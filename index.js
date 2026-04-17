const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

// --- إعدادات الإمبراطورية ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678; 
const CHANNEL_ID = '@wizzy_dv_sd';
const USERS_FILE = './users.json';

// --- إدارة قاعدة البيانات ---
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
function getUsers() { try { return JSON.parse(fs.readFileSync(USERS_FILE)); } catch(e) { return []; } }
function saveUser(id, name) {
    let users = getUsers();
    if (!users.find(u => u.id === id)) {
        users.push({ id, name });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    }
}

// سيرفر ويب للبقاء حياً
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Sovereign System is ONLINE!'));
app.listen(process.env.PORT || 3000);

// دالة تنظيف النصوص للروابط
function slug(t) { return encodeURIComponent(t.replace(/\s+/g, '+')); }

// فحص الاشتراك
async function checkSub(ctx, next) {
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(member.status)) return next();
        await ctx.replyWithMarkdown(`⚠️ **عذراً يا ملك، يجب الانضمام للقناة أولاً!**`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للقناة الآن 👑', `https://t.me/wizzy_dv_sd`)]])
        );
    } catch (e) { return next(); }
}

bot.start(checkSub, async (ctx) => {
    saveUser(ctx.from.id, ctx.from.first_name);
    try { await ctx.react('👑'); } catch (e) {} 
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية الأنمي والمانجا** 👑🏮\n\nأرسل اسم العمل بالإنجليزي (مثل: Naruto) وسأجلب لك الحلقات والفصول فوراً.`,
        Markup.inlineKeyboard([[Markup.button.callback('📰 أخبار الأنمي اليوم', 'get_news')]]))
});

// --- محرك البحث الشامل ---
bot.on('text', checkSub, async (ctx) => {
    const query = ctx.message.text;
    if (query.startsWith('/')) return;
    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🔍 جاري استخراج البيانات الملكية...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const anime = res.data.data[0];

        if (anime) {
            try { await ctx.react('🔥'); } catch (e) {}
            const isMovie = anime.type === 'Movie';
            const q = slug(anime.title);

            let buttons = [];
            if (isMovie) {
                buttons.push([Markup.button.url('🎬 مشاهدة الفيلم (WitAnime)', `https://witanime.pics/?s=${q}`)]);
            } else {
                buttons.push([Markup.button.callback('🎬 قائمة الحلقات المنظمة', `eps_${anime.mal_id}_1`)]);
            }
            
            // زر المانجا المطور: يفتح قائمة خيارات القراءة
            buttons.push([Markup.button.callback('📖 قراءة الفصول (المانجا)', `mng_opt_${anime.mal_id}`)]);

            await ctx.sendPhoto(anime.images.jpg.large_image_url, {
                caption: `🏯 *${anime.title}*\n\n⭐ *التقييم:* ${anime.score || '7.5'}\n🎞️ *الحلقات:* ${anime.episodes || 'مستمر'}\n📝 *القصة:* ${anime.synopsis?.substring(0, 300)}...`,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            });
        } else { ctx.reply('لم أجد نتائج! حاول كتابة الاسم بدقة.'); }
    } catch (e) { ctx.reply('خطأ في الاتصال، حاول مرة أخرى.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- قائمة الحلقات (بروابط WitAnime و AnimeLek) ---
bot.action(/eps_(\d+)_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    const page = ctx.match[2];
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}/episodes?page=${page}`);
        const episodes = res.data.data;
        if (!episodes || episodes.length === 0) return ctx.answerCbQuery('⚠️ لا توجد حلقات إضافية حالياً.', { show_alert: true });

        // جلب اسم الأنمي للبحث
        const animeInfo = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}`);
        const q = slug(animeInfo.data.data.title);

        let buttons = episodes.map(ep => [
            Markup.button.url(`حلقة ${ep.mal_id}: ${ep.title.substring(0,20)}..`, `https://witanime.pics/?s=${q}+حلقة+${ep.mal_id}`)
        ]);
        
        let nav = [];
        if (parseInt(page) > 1) nav.push(Markup.button.callback('⬅️ السابق', `eps_${animeId}_${parseInt(page)-1}`));
        if (res.data.pagination.has_next_page) nav.push(Markup.button.callback('➡️ التالي', `eps_${animeId}_${parseInt(page)+1}`));
        if (nav.length > 0) buttons.push(nav);

        await ctx.editMessageText(`🎞️ **قائمة الحلقات - صفحة ${page}:**\nاضغط على الحلقة للمشاهدة المباشرة:`, Markup.inlineKeyboard(buttons));
    } catch (e) { ctx.answerCbQuery('خطأ في جلب الحلقات.'); }
});

// --- خيارات المانجا (قراءة الفصول) ---
bot.action(/mng_opt_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        const animeRes = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}`);
        const title = animeRes.data.data.title;
        const q = slug(title);
        try { await ctx.react('📖'); } catch (e) {}

        ctx.replyWithMarkdown(`📖 **خزنة الفصول الملكية - ${title}**\n\nاختر الموقع المفضل لقراءة الفصول مباشرة:`,
            Markup.inlineKeyboard([
                [Markup.button.url('🚀 قراءة على Gmanga', `https://gmanga.me/mangas?search=${q}`)],
                [Markup.button.url('🔥 قراءة على MangaArab', `https://www.manga-ar.com/search?q=${q}`)],
                [Markup.button.callback('⬅️ العودة للبحث', 'start')]
            ])
        );
        await ctx.answerCbQuery();
    } catch (e) { ctx.answerCbQuery('خطأ في جلب المانجا.'); }
});

// --- الإذاعة التلقائية (الأخبار اليومية) ---
cron.schedule('0 9 * * *', async () => {
    try {
        const res = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
        const news = res.data.data.map(a => `🔥 *${a.title}*`).join('\n\n');
        const users = getUsers();
        users.forEach(u => bot.telegram.sendMessage(u.id, `🆕 **أخبار الصباح السيادية:**\n\nأهم أعمال الموسم اليوم:\n\n${news}`, { parse_mode: 'Markdown' }));
    } catch (e) {}
});

bot.telegram.deleteWebhook().then(() => {
    bot.launch();
    console.log("✅ القلعة متصلة وكل الأزرار مصلّحة!");
});
