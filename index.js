const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

// --- إعدادات السيادة ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678; 
const CHANNEL_ID = '@wizzy_dv_sd';
const USERS_FILE = './users.json';

// --- إدارة قاعدة البيانات المصغرة ---
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
function getUsers() { try { return JSON.parse(fs.readFileSync(USERS_FILE)); } catch(e) { return []; } }
function saveUser(id, name) {
    let users = getUsers();
    if (!users.find(u => u.id === id)) {
        users.push({ id, name });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    }
}

// --- سيرفر ويب للبقاء حياً ---
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Sovereign System is ONLINE!'));
app.listen(process.env.PORT || 3000);

// --- فحص الاشتراك الإجباري ---
async function checkSub(ctx, next) {
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(member.status)) return next();
        
        await ctx.replyWithMarkdown(`⚠️ **يا ملك، يجب الانضمام للقناة أولاً لاستخدام الترسانة!**`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للقناة الآن 👑', `https://t.me/${CHANNEL_ID.replace('@','')}`)]])
        );
    } catch (e) { return next(); }
}

// --- أمر البداية ---
bot.start(checkSub, async (ctx) => {
    saveUser(ctx.from.id, ctx.from.first_name);
    try { await ctx.react('👑'); } catch (e) {} 
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية الأنمي والمانجا** 👑🏮\n\nأنا **خادمك Wizzy**، أرسل اسم العمل بالإنجليزي (مثل: Naruto) وسأجلب لك كل ميزاته.`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📰 أخبار الأنمي اليومية', 'get_news')],
            [Markup.button.url('🔱 قناة السيادة', 'https://t.me/wizzy_dv_sd')]
        ])
    );
});

// --- محرك البحث الذكي (أنمي + مانجا) ---
bot.on('text', checkSub, async (ctx) => {
    const query = ctx.message.text;
    if (query.startsWith('/')) return;

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🔍 جاري استخراج البيانات من الأرشيف الملكي...');

    try {
        // البحث عن الأنمي
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const anime = res.data.data[0];

        if (anime) {
            try { await ctx.react('🔥'); } catch (e) {}
            const isMovie = anime.type === 'Movie';
            
            // ترتيب الأزرار بذكاء
            let buttons = [];
            if (isMovie) {
                buttons.push([Markup.button.url('🎬 مشاهدة الفيلم الآن', `https://www.google.com/search?q=watch+${encodeURIComponent(anime.title)}`)]);
            } else {
                buttons.push([Markup.button.callback('🎬 قائمة الحلقات المنظمة', `eps_${anime.mal_id}_1`)]);
            }
            
            // زر المانجا المصلح (يبحث بالاسم الكامل لضمان الدقة)
            buttons.push([Markup.button.callback('📖 معلومات المانجا', `mng_${anime.mal_id}`)]);

            const caption = `🏯 *${anime.title}*\n\n⭐ *التقييم:* ${anime.score || '7.5'}\n🎞️ *الحلقات:* ${anime.episodes || 'مستمر'}\n🎭 *النوع:* ${anime.type}\n\n📝 *القصة:* ${anime.synopsis?.substring(0, 350) || 'لا يوجد وصف متاح.'}...`;
            
            await ctx.sendPhoto(anime.images.jpg.large_image_url, {
                caption: caption,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            });
        } else {
            ctx.reply('عذراً يا ملك، لم أجد هذا العمل. تأكد من الاسم بالإنجليزية!');
        }
    } catch (e) { ctx.reply('السيرفر مشغول، حاول لاحقاً.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- إصلاح نظام الحلقات (التنقل الذكي) ---
bot.action(/eps_(\d+)_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    const page = parseInt(ctx.match[2]);
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}/episodes?page=${page}`);
        const episodes = res.data.data;
        
        if (!episodes || episodes.length === 0) return ctx.answerCbQuery('⚠️ لا تتوفر حلقات لهذا العمل حالياً.', { show_alert: true });

        let buttons = episodes.map(ep => [Markup.button.callback(`ح ${ep.mal_id}: ${ep.title.substring(0,22)}..`, `watch_${animeId}_${ep.mal_id}`)]);
        
        let nav = [];
        if (page > 1) nav.push(Markup.button.callback('⬅️ السابق', `eps_${animeId}_${page - 1}`));
        if (res.data.pagination.has_next_page) nav.push(Markup.button.callback('➡️ التالي', `eps_${animeId}_${page + 1}`));
        if (nav.length > 0) buttons.push(nav);

        await ctx.editMessageText(`🎞️ **قائمة الحلقات - ص ${page}:**`, Markup.inlineKeyboard(buttons));
        await ctx.answerCbQuery();
    } catch (e) { ctx.answerCbQuery('فشل جلب الحلقات.'); }
});

// --- إصلاح نظام المانجا (بيانات كاملة في تليجرام) ---
bot.action(/mng_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        await ctx.answerCbQuery('جاري جلب بيانات المانجا الملكية... 📖');
        const animeRes = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}`);
        const title = animeRes.data.data.title;
        
        const res = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=1`);
        const manga = res.data.data[0];

        if (manga) {
            try { await ctx.react('📖'); } catch (e) {}
            const info = `📖 **مانجا: ${manga.title}**\n\n⭐ *التقييم:* ${manga.score || '7.0'}\n📚 *الفصول:* ${manga.chapters || 'مستمرة'}\n🧐 *الحالة:* ${manga.status}\n\n📝 *الوصف:* ${manga.synopsis?.substring(0, 350)}...`;
            
            await ctx.replyWithPhoto(manga.images.jpg.large_image_url, {
                caption: info,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url('🚀 قراءة الفصول الآن', `https://gmanga.me/mangas?search=${encodeURIComponent(manga.title)}`) ],
                    [Markup.button.callback('⬅️ العودة للبحث', 'start')]
                ])
            });
        } else { ctx.reply('عذراً، لم أجد مانجا مرتبطة بهذا العمل.'); }
    } catch (e) { ctx.reply('خطأ فني في جلب المانجا.'); }
});

// --- نظام المشاهدة المنظم ---
bot.action(/watch_(\d+)_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    const epNum = parseInt(ctx.match[2]);
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('🚀 سيرفر مشاهدة HD', `https://www.google.com/search?q=watch+anime+episode+${epNum}`)],
        [Markup.button.callback('⏮️ سابقة', `watch_${animeId}_${epNum - 1}`), Markup.button.callback('تالية ⏭️', `watch_${animeId}_${epNum + 1}`)],
        [Markup.button.callback('⬅️ العودة للقائمة', `eps_${animeId}_1`)]
    ]);
    await ctx.replyWithMarkdown(`🎬 **أنت تشاهد الآن الحلقة ${epNum}**`, keyboard);
    await ctx.answerCbQuery();
});

// --- 🤖 الإذاعة التلقائية (الأخبار اليومية 9 صباحاً) ---
cron.schedule('0 9 * * *', async () => {
    try {
        const res = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
        const news = res.data.data.map(a => `🔥 *${a.title}* (⭐ ${a.score})`).join('\n\n');
        const users = getUsers();
        users.forEach(u => bot.telegram.sendMessage(u.id, `🆕 **أخبار الأنمي الصباحية من Wizzy:**\n\n${news}`, { parse_mode: 'Markdown' }));
    } catch (e) {}
});

// --- الإذاعة اليدوية للإمبراطور ---
bot.command('broadcast', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const msg = ctx.message.text.replace('/broadcast ', '');
    const users = getUsers();
    users.forEach(u => bot.telegram.sendMessage(u.id, `📢 **رسالة ملكية عاجلة:**\n\n${msg}`, { parse_mode: 'Markdown' }).catch(()=>null));
    ctx.reply(`✅ تم الإرسال لـ ${users.length} مستخدم.`);
});

// --- زر الأخبار اليدوي ---
bot.action('get_news', async (ctx) => {
    try { await ctx.react('📰'); } catch (e) {}
    const res = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
    const news = res.data.data.map(a => `🔥 *${a.title}*`).join('\n');
    ctx.replyWithMarkdown(`📰 **أحدث الأنميات المتصدرة حالياً:**\n\n${news}`);
});

// --- حل مشكلة Conflict 409 والتشغيل ---
bot.telegram.deleteWebhook().then(() => {
    bot.launch();
    console.log("✅ القلعة متصلة الآن.. جميع النسخ القديمة طُردت!");
});
