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
app.get('/', (req, res) => res.send('🔱 Wizzy Sovereign System is ONLINE!'));
app.listen(process.env.PORT || 3000);

// دالة تنظيف النصوص للروابط
function cleanTitle(t) { return encodeURIComponent(t.replace(/\s+/g, '+')); }

// فحص الاشتراك
async function checkSub(ctx, next) {
    try {
        if (ctx.from.id === ADMIN_ID) return next();
        const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
        const allowed = ['member', 'administrator', 'creator'];
        if (allowed.includes(member.status)) return next();
        
        await ctx.replyWithMarkdown(`⚠️ **عذراً يا ملك، يجب الانضمام للقناة أولاً!**`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للقناة الآن 👑', `https://t.me/wizzy_dv_sd`)]])
        );
    } catch (e) { return next(); }
}

// --- 🏠 أمر البداية ---
bot.start(checkSub, async (ctx) => {
    saveUser(ctx.from.id, ctx.from.first_name);
    try { await ctx.react('👑'); } catch (e) {} 
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية الأنمي والمانجا** 👑🏮\n\nأرسل اسم الأنمي (بالإنجليزية) وسأرتبه لك فوراً.`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📰 أخبار اليوم', 'get_news')],
            [Markup.button.url('🔱 قناة السيادة', 'https://t.me/wizzy_dv_sd')]
        ])
    );
});

// --- 🛠️ لوحة الأدمن (Admin Panel) ---
bot.command('admin', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const users = getUsers();
    ctx.replyWithMarkdown(`🔱 **أهلاً بك يا إمبراطور في لوحة التحكم**\n\n👥 عدد المستخدمين: \`${users.length}\`\n📡 الحالة: \`متصل\``,
        Markup.inlineKeyboard([
            [Markup.button.callback('📢 إرسال إذاعة للجميع', 'admin_broadcast')],
            [Markup.button.callback('📊 تحديث البيانات', 'admin_refresh')]
        ])
    );
});

bot.action('admin_broadcast', (ctx) => {
    ctx.reply('قم بإرسال رسالتك مسبوقة بكلمة: \n`/broadcast` ثم النص');
});

// --- 🔍 محرك البحث (حل مشكلة الحلقات) ---
bot.on('text', checkSub, async (ctx) => {
    const query = ctx.message.text;
    if (query.startsWith('/')) return;
    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🔍 جاري استخراج البيانات من الأرشيف...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const anime = res.data.data[0];

        if (anime) {
            try { await ctx.react('🔥'); } catch (e) {}
            const q = cleanTitle(anime.title);
            
            // أزرار ذكية: لو الحلقات مفقودة نوجه لروابط مباشرة
            const buttons = [
                [Markup.button.callback('🎬 قائمة الحلقات المنظمة', `eps_${anime.mal_id}_1`)],
                [Markup.button.url('🚀 مشاهدة مباشرة (سيرفر 1)', `https://witanime.pics/?s=${q}`)],
                [Markup.button.callback('📖 قراءة المانجا (تليجرام)', `mng_${anime.mal_id}`)]
            ];

            await ctx.sendPhoto(anime.images.jpg.large_image_url, {
                caption: `🏯 *${anime.title}*\n\n⭐ *التقييم:* ${anime.score || '7.5'}\n🎞️ *الحلقات:* ${anime.episodes || 'مستمر'}\n📝 *القصة:* ${anime.synopsis?.substring(0, 300)}...`,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            });
        } else { ctx.reply('لم أجد نتائج! حاول كتابة الاسم بدقة.'); }
    } catch (e) { ctx.reply('السيرفر مشغول، حاول لاحقاً.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- معالجة قائمة الحلقات ---
bot.action(/eps_(\d+)_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    const page = ctx.match[2];
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}/episodes?page=${page}`);
        const episodes = res.data.data;

        // إذا لم تتوفر حلقات من السيرفر العالمي
        if (!episodes || episodes.length === 0) {
            return ctx.replyWithMarkdown(`⚠️ **عذراً يا ملك، قائمة الحلقات لهذا الأنمي غير متوفرة في الأرشيف العالمي.**\n\nيمكنك استخدام أزرار المشاهدة المباشرة المرفقة مع صورة الأنمي!`);
        }

        let buttons = episodes.map(ep => [
            Markup.button.callback(`حلقة ${ep.mal_id}: ${ep.title.substring(0,20)}`, `watch_${animeId}_${ep.mal_id}`)
        ]);
        
        let nav = [];
        if (parseInt(page) > 1) nav.push(Markup.button.callback('⬅️', `eps_${animeId}_${parseInt(page)-1}`));
        if (res.data.pagination.has_next_page) nav.push(Markup.button.callback('➡️', `eps_${animeId}_${parseInt(page)+1}`));
        if (nav.length > 0) buttons.push(nav);

        await ctx.editMessageText(`🎞️ **قائمة الحلقات - ص ${page}:**`, Markup.inlineKeyboard(buttons));
    } catch (e) { ctx.answerCbQuery('السيرفر العالمي لا يستجيب حالياً.'); }
});

// --- المانجا مصلحة ---
bot.action(/mng_(\d+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        await ctx.answerCbQuery('جاري جلب المانجا... 📖');
        const animeRes = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}`);
        const title = animeRes.data.data.title;
        const res = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=1`);
        const manga = res.data.data[0];

        if (manga) {
            try { await ctx.react('📖'); } catch (e) {}
            const info = `📖 **مانجا: ${manga.title}**\n\n⭐ *التقييم:* ${manga.score}\n📚 *الفصول:* ${manga.chapters || 'مستمرة'}\n\n📝 *الوصف:* ${manga.synopsis?.substring(0, 300)}...`;
            await ctx.replyWithPhoto(manga.images.jpg.large_image_url, {
                caption: info,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.url('🚀 قراءة الفصول', `https://gmanga.me/mangas?search=${cleanTitle(manga.title)}`)]])
            });
        }
    } catch (e) { ctx.answerCbQuery('خطأ في المانجا.'); }
});

// --- المشاهدة ---
bot.action(/watch_(\d+)_(\d+)/, async (ctx) => {
    const epNum = ctx.match[2];
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('🚀 سيرفر مشاهدة HD', `https://www.google.com/search?q=watch+anime+episode+${epNum}`)],
        [Markup.button.callback('⬅️ العودة للقائمة', `eps_${ctx.match[1]}_1`)]
    ]);
    await ctx.replyWithMarkdown(`🎬 **أنت تشاهد الحلقة ${epNum}**`, keyboard);
    await ctx.answerCbQuery();
});

// --- الإذاعة اليدوية ---
bot.command('broadcast', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const msg = ctx.message.text.replace('/broadcast ', '');
    const users = getUsers();
    users.forEach(u => bot.telegram.sendMessage(u.id, `📢 **رسالة من الإمبراطور ويزي:**\n\n${msg}`).catch(()=>null));
    ctx.reply(`✅ تم الإرسال لـ ${users.length} مستخدم.`);
});

// --- أخبار الأنمي اليومية (9 صباحاً) ---
cron.schedule('0 9 * * *', async () => {
    try {
        const res = await axios.get('https://api.jikan.moe/v4/seasons/now?limit=5');
        const news = res.data.data.map(a => `🔥 *${a.title}*`).join('\n\n');
        const users = getUsers();
        users.forEach(u => bot.telegram.sendMessage(u.id, `🆕 **أخبار الصباح الملكية:**\n\n${news}`, { parse_mode: 'Markdown' }));
    } catch (e) {}
});

bot.telegram.deleteWebhook().then(() => {
    bot.launch();
    console.log("✅ القلعة متصلة بكامل قواها!");
});
