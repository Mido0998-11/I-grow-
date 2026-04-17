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

// --- إدارة قاعدة البيانات المصغرة ---
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
function getUsers() { return JSON.parse(fs.readFileSync(USERS_FILE)); }
function saveUser(id, name) {
    let users = getUsers();
    if (!users.find(u => u.id === id)) {
        users.push({ id, name });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    }
}

// --- سيرفر الويب للبقاء حياً 24/7 ---
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Sovereign System is FULLY OPERATIONAL!'));
app.listen(process.env.PORT || 3000);

// --- فحص الاشتراك الإجباري ---
async function checkSub(ctx, next) {
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
        const allowed = ['member', 'administrator', 'creator'];
        if (allowed.includes(member.status)) return next();
        
        await ctx.replyWithMarkdown(`⚠️ **عذراً يا ملك، يجب الانضمام للقناة أولاً لاستخدام الترسانة!**`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للقناة الآن 👑', `https://t.me/${CHANNEL_ID.replace('@','')}`)]])
        );
    } catch (e) { return next(); }
}

// --- 🏠 أمر البداية (Start) ---
bot.start(checkSub, async (ctx) => {
    saveUser(ctx.from.id, ctx.from.first_name);
    try { await ctx.react('👑'); } catch (e) {} 

    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية الأنمي والمانجا الأسطورية** 👑🏮\n\nأنا **خادمك Wizzy**، أرسل اسم العمل (بالإنجليزي) وسأرتبه لك فوراً بنظام السينما المطور.`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📰 أحدث الأخبار اليومية', 'get_news')],
            [Markup.button.url('🔱 قناة السيادة', 'https://t.me/wizzy_dv_sd')]
        ])
    );
});

// --- 🔍 محرك البحث الشامل (Anime & Manga) ---
bot.on('text', checkSub, async (ctx) => {
    const query = ctx.message.text;
    if (query.startsWith('/')) return;

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🔍 جاري استخراج البيانات من الأرشيف الملكي...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const anime = res.data.data[0];

        if (anime) {
            try { await ctx.react('🔥'); } catch (e) {}
            const caption = `🏯 *${anime.title}*\n\n⭐ *التقييم:* ${anime.score || '7.5'}\n🎞️ *الحلقات:* ${anime.episodes || 'مستمر'}\n📝 *القصة:* ${anime.synopsis?.substring(0, 300) || 'لا يوجد وصف..'}...`;
            
            await ctx.sendPhoto(anime.images.jpg.large_image_url, {
                caption: caption,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🎬 قائمة الحلقات', `eps_${anime.mal_id}_1`)],
                    [Markup.button.callback('📖 معلومات المانجا', `manga_${anime.mal_id}`)]
                ])
            });
        } else {
            ctx.reply('لم أجد هذا العمل! تأكد من الاسم بالإنجليزي.');
        }
    } catch (e) { ctx.reply('السيرفر مشغول، حاول لاحقاً.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 🎞️ نظام الحلقات المنظم (Pagination) ---
bot.action(/eps_(\d+)_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    const page = parseInt(ctx.match[2]);
    
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}/episodes?page=${page}`);
        const episodes = res.data.data;
        
        if (!episodes || episodes.length === 0) {
            return ctx.answerCbQuery('عذراً، وصلت لنهاية الحلقات المتاحة حالياً.', { show_alert: true });
        }

        let buttons = episodes.map(ep => [
            Markup.button.callback(`حلقة ${ep.mal_id}: ${ep.title.substring(0,20)}..`, `watch_${animeId}_${ep.mal_id}`)
        ]);
        
        let nav = [];
        if (page > 1) nav.push(Markup.button.callback('⬅️ السابق', `eps_${animeId}_${page - 1}`));
        if (res.data.pagination.has_next_page) nav.push(Markup.button.callback('➡️ التالي', `eps_${animeId}_${page + 1}`));
        if (nav.length > 0) buttons.push(nav);

        await ctx.editMessageText(`🎞️ **قائمة الحلقات - صفحة ${page}:**`, Markup.inlineKeyboard(buttons));
        await ctx.answerCbQuery();
    } catch (e) { ctx.answerCbQuery('خطأ فني في جلب الحلقات.'); }
});

// --- 📖 نظام المانجا الداخلية (فصول ومعلومات) ---
bot.action(/manga_(\d+)/, async (ctx) => {
    const mangaId = ctx.match[1];
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/manga/${mangaId}`);
        const manga = res.data.data;
        try { await ctx.react('📖'); } catch (e) {}

        const info = `📖 **مانجا: ${manga.title}**\n\n⭐ *التقييم:* ${manga.score || '7.0'}\n📚 *الفصول:* ${manga.chapters || 'مستمرة'}\n🧐 *الحالة:* ${manga.status}\n\n📝 *الوصف:* ${manga.synopsis?.substring(0, 300)}...`;
        
        await ctx.replyWithPhoto(manga.images.jpg.large_image_url, {
            caption: info,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('🚀 قراءة جميع الفصول', `https://gmanga.me/mangas?search=${encodeURIComponent(manga.title)}`) ],
                [Markup.button.callback('⬅️ العودة للبحث', 'start')]
            ])
        });
        await ctx.answerCbQuery();
    } catch (e) { ctx.answerCbQuery('خطأ في جلب بيانات المانجا.'); }
});

// --- 🎬 تفاعل المشاهدة والتنقل (Next/Prev) ---
bot.action(/watch_(\d+)_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    const epNum = parseInt(ctx.match[2]);
    if (epNum < 1) return ctx.answerCbQuery('لا توجد حلقات سابقة!');

    const msg = `🎬 **أنت تشاهد الآن: الحلقة ${epNum}**\n\nاختر السيرفر أو تنقل بين الحلقات المجاورة:`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('🚀 سيرفر مشاهدة HD سريع', `https://www.google.com/search?q=watch+anime+episode+${epNum}`)],
        [
            Markup.button.callback('⏮️ الحلقة السابقة', `watch_${animeId}_${epNum - 1}`),
            Markup.button.callback('الحلقة التالية ⏭️', `watch_${animeId}_${epNum + 1}`)
        ],
        [Markup.button.callback('⬅️ العودة للقائمة', `eps_${animeId}_1`)]
    ]);

    try {
        await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...keyboard });
    } catch (e) {
        await ctx.replyWithMarkdown(msg, keyboard);
    }
    await ctx.answerCbQuery(`الحلقة رقم ${epNum}`);
});

// --- 📣 نظام الإذاعة التلقائية (أخبار يومية 9 صباحاً) ---
cron.schedule('0 9 * * *', async () => {
    try {
        const res = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
        const news = res.data.data.map(a => `🔥 *${a.title}* (⭐ ${a.score || '7.0'})`).join('\n\n');
        const users = getUsers();
        users.forEach(u => {
            bot.telegram.sendMessage(u.id, `🆕 **أخبار الأنمي الصباحية من الإمبراطور ويزي:**\n\nأهم أعمال الموسم المتصدرة اليوم:\n\n${news}`, { parse_mode: 'Markdown' });
        });
    } catch (e) { console.log('Cron Error'); }
});

// --- الإذاعة اليدوية للإمبراطور ---
bot.command('broadcast', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const msg = ctx.message.text.replace('/broadcast ', '');
    const users = getUsers();
    users.forEach(u => bot.telegram.sendMessage(u.id, `📢 **رسالة ملكية عاجلة:**\n\n${msg}`, { parse_mode: 'Markdown' }).catch(()=>null));
    ctx.reply(`✅ تم إرسال الإذاعة لـ ${users.length} مستخدم.`);
});

// --- زر الأخبار اليدوي ---
bot.action('get_news', async (ctx) => {
    try { await ctx.react('📰'); } catch (e) {}
    try {
        const res = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
        const news = res.data.data.map(a => `🔥 *${a.title}*`).join('\n');
        ctx.replyWithMarkdown(`📰 **أحدث الأنميات المتصدرة حالياً:**\n\n${news}`);
        await ctx.answerCbQuery();
    } catch (e) { ctx.answerCbQuery('فشل جلب الأخبار.'); }
});

// --- 🚀 حل مشكلة Conflict 409 والتشغيل ---
bot.telegram.deleteWebhook().then(() => {
    bot.launch();
    console.log("✅ القلعة متصلة الآن.. جميع النسخ القديمة طُردت بنجاح!");
});

// التوقف الآمن
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
