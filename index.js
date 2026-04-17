const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
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

const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Sovereign System is ONLINE!'));
app.listen(process.env.PORT || 3000);

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
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية الأنمي والمانجا** 👑🏮\n\nأرسل اسم الأنمي بالإنجليزي (مثل: Naruto) وسأجلب لك كل شيء.`,
        Markup.inlineKeyboard([[Markup.button.callback('📰 أخبار اليوم', 'get_news')]]))
});

// --- البحث عن الأنمي ---
bot.on('text', checkSub, async (ctx) => {
    const query = ctx.message.text;
    if (query.startsWith('/')) return;
    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🔍 جاري البحث في الأرشيف...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const anime = res.data.data[0];

        if (anime) {
            const isMovie = anime.type === 'Movie';
            const buttons = [];

            if (isMovie) {
                buttons.push([Markup.button.url('🎬 مشاهدة الفيلم', `https://www.google.com/search?q=watch+${encodeURIComponent(anime.title)}`)]);
            } else {
                buttons.push([Markup.button.callback('🎬 قائمة الحلقات', `eps_${anime.mal_id}_1`)]);
            }

            // هنا الحل: نرسل الـ ID في الزر بدل الاسم عشان ما يعلق
            buttons.push([Markup.button.callback('📖 معلومات المانجا', `mng_${anime.mal_id}`)]);

            await ctx.sendPhoto(anime.images.jpg.large_image_url, {
                caption: `🏯 *${anime.title}*\n\n⭐ *التقييم:* ${anime.score || '7.5'}\n🎞️ *الحلقات:* ${anime.episodes || 'مستمر'}\n📝 *الوصف:* ${anime.synopsis?.substring(0, 300) || 'لا يوجد وصف.'}...`,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            });
        } else { ctx.reply('لم أجد نتائج! حاول كتابة الاسم بدقة.'); }
    } catch (e) { ctx.reply('خطأ في الاتصال، حاول مرة أخرى.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- قائمة الحلقات ---
bot.action(/eps_(\d+)_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    const page = ctx.match[2];
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}/episodes?page=${page}`);
        const episodes = res.data.data;
        if (!episodes || episodes.length === 0) return ctx.answerCbQuery('⚠️ لا توجد حلقات.');

        let buttons = episodes.map(ep => [Markup.button.callback(`ح ${ep.mal_id}: ${ep.title.substring(0,20)}`, `watch_${animeId}_${ep.mal_id}`)]);
        let nav = [];
        if (parseInt(page) > 1) nav.push(Markup.button.callback('⬅️', `eps_${animeId}_${parseInt(page)-1}`));
        if (res.data.pagination.has_next_page) nav.push(Markup.button.callback('➡️', `eps_${animeId}_${parseInt(page)+1}`));
        if (nav.length > 0) buttons.push(nav);

        await ctx.editMessageText(`🎞️ **قائمة الحلقات - ص ${page}:**`, Markup.inlineKeyboard(buttons));
    } catch (e) { ctx.answerCbQuery('خطأ في التحميل.'); }
});

// --- المانجا مصلحة بالكامل ---
bot.action(/mng_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        await ctx.answerCbQuery('جاري جلب بيانات المانجا... 📖');
        // نبحث عن المانجا باستخدام اسم الأنمي المرتبط بالآيدي
        const animeRes = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}`);
        const title = animeRes.data.data.title;
        
        const res = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=1`);
        const manga = res.data.data[0];

        if (manga) {
            const info = `📖 **مانجا: ${manga.title}**\n\n⭐ *التقييم:* ${manga.score || '7.0'}\n📚 *الفصول:* ${manga.chapters || 'مستمرة'}\n\n📝 *الوصف:* ${manga.synopsis?.substring(0, 300)}...`;
            await ctx.replyWithPhoto(manga.images.jpg.large_image_url, {
                caption: info,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.url('🚀 قراءة الفصول', `https://gmanga.me/mangas?search=${encodeURIComponent(manga.title)}`)]])
            });
        } else { ctx.reply('عذراً، لم أجد مانجا لهذا العمل.'); }
    } catch (e) { ctx.reply('حدث خطأ أثناء جلب المانجا.'); }
});

// --- المشاهدة ---
bot.action(/watch_(\d+)_(\d+)/, async (ctx) => {
    const ep = ctx.match[2];
    ctx.replyWithMarkdown(`🎬 **الحلقة ${ep}**\n\nرابط سريع:`, 
        Markup.inlineKeyboard([[Markup.button.url('🚀 مشاهدة الآن', `https://www.google.com/search?q=watch+anime+episode+${ep}`)]]));
    await ctx.answerCbQuery();
});

bot.telegram.deleteWebhook().then(() => {
    bot.launch();
    console.log("✅ القلعة متصلة وكل المشاكل حُلت!");
});
