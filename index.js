const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const fs = require('fs');

// --- إعدادات السيادة ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const CHANNEL_ID = '@wizzy_dv_sd';
const USERS_FILE = './users.json';
const API_URL = 'https://api.consumet.org/anime/gogoanime'; // الـ API الجاهز

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

// سيرفر ويب للبقاء حياً في Render
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Ultimate Sniper is LIVE!'));
app.listen(process.env.PORT || 3000);

// --- فحص الاشتراك الإجباري ---
async function checkSub(ctx, next) {
    if (ctx.from.id === ADMIN_ID) return next();
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
        const allowed = ['member', 'administrator', 'creator'];
        if (allowed.includes(member.status)) return next();
        
        await ctx.replyWithMarkdown(`⚠️ **يا ملك، يجب الانضمام للقناة أولاً لاستخدام البوت!**`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للقناة الآن 👑', `https://t.me/${CHANNEL_ID.replace('@','')}`)]])
        );
    } catch (e) { return next(); }
}

// --- 🏠 القائمة الرئيسية (نظام التحفة) ---
const mainMenu = Markup.keyboard([
    ['🔍 بحث عن أنمي', '📢 قناة السيادة'],
    ['🛠️ لوحة التحكم', '❓ مساعدة']
]).resize();

bot.start(checkSub, async (ctx) => {
    saveUser(ctx.from.id, ctx.from.first_name);
    try { await ctx.react('👑'); } catch (e) {}
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية القنص الأسطورية** 👑🎯\n\nأرسل اسم الأنمي بالإنجليزية وسأجلب لك روابط المشاهدة بالجودات الأربعة فوراً.`, mainMenu);
});

bot.hears('🔍 بحث عن أنمي', (ctx) => ctx.reply('أرسل اسم الأنمي الآن يا ملك (مثال: Naruto).. 🔍'));
bot.hears('📢 قناة السيادة', (ctx) => ctx.reply('قناة المطور ويزي: https://t.me/wizzy_dv_sd'));

// --- 🔍 محرك البحث الذكي (Consumet) ---
bot.on('text', checkSub, async (ctx) => {
    const query = ctx.message.text;
    if (['🔍 بحث عن أنمي', '📢 قناة السيادة', '🛠️ لوحة التحكم', '❓ مساعدة'].includes(query)) return;

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('⏳ جاري اختراق السيرفرات وجلب المحتوى...');

    try {
        const res = await axios.get(`${API_URL}/${encodeURIComponent(query)}`);
        const results = res.data.results;

        if (results && results.length > 0) {
            const anime = results[0];
            await ctx.sendPhoto(anime.image, {
                caption: `✅ **تم العثور على الهدف:**\n\n📌 *${anime.title}*\n\nاضغط أدناه لعرض قائمة الحلقات:`,
                ...Markup.inlineKeyboard([[Markup.button.callback('🎬 عرض الحلقات', `list_${anime.id}`)]])
            });
        } else { ctx.reply('❌ لم أجد نتائج! حاول كتابة الاسم بدقة.'); }
    } catch (e) { ctx.reply('⚠️ السيرفر العالمي مشغول حالياً، حاول مرة أخرى.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 🎞️ جلب قائمة الحلقات (التفاعل السريع) ---
bot.action(/list_(.+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        await ctx.answerCbQuery('جاري تجهيز الحلقات... 🎞️');
        const res = await axios.get(`${API_URL}/info/${animeId}`);
        const episodes = res.data.episodes;

        if (!episodes || episodes.length === 0) return ctx.reply('⚠️ لا تتوفر حلقات حالياً لهذا العمل.');

        // عرض أول 24 حلقة لتجنب تعليق الأزرار
        let buttons = episodes.slice(0, 24).map(ep => [
            Markup.button.callback(`الحلقة ${ep.number}`, `watch_${ep.id}`)
        ]);

        ctx.reply(`🎞️ **قائمة الحلقات لـ ${animeId}:**`, Markup.inlineKeyboard(buttons));
    } catch (e) { ctx.reply('❌ فشل جلب الحلقات.'); }
});

// --- 🚀 السطو على روابط الجودات (التحفة الحقيقية) ---
bot.action(/watch_(.+)/, async (ctx) => {
    const episodeId = ctx.match[1];
    try {
        await ctx.answerCbQuery('جاري استخراج الجودات... 📺');
        const res = await axios.get(`${API_URL}/watch/${episodeId}`);
        const sources = res.data.sources; // الروابط المباشرة

        let buttons = sources.map(src => [
            Markup.button.url(`🔗 جودة ${src.quality} (مشاهدة/تحميل)`, src.url)
        ]);
        
        buttons.push([Markup.button.callback('🔙 العودة للقائمة', 'start')]);

        ctx.replyWithMarkdown(`🎬 **أنت تشاهد الحلقة الآن:**\n\nاختر الجودة المفضلة لفتح المشاهد المباشر:`, 
            Markup.inlineKeyboard(buttons));
    } catch (e) { ctx.reply('❌ فشل جلب روابط الفيديو.'); }
});

// --- 🛠️ لوحة تحكم الأدمن ---
bot.hears('🛠️ لوحة التحكم', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('للسيادة فقط! ❌');
    const users = getUsers();
    ctx.replyWithMarkdown(`📊 **إحصائيات الإمبراطورية:**\n\n👥 عدد المستخدمين: \`${users.length}\`\n📡 السيرفر: \`Online\``,
        Markup.inlineKeyboard([[Markup.button.callback('📢 إرسال إذاعة', 'admin_brd')]])
    );
});

bot.action('admin_brd', (ctx) => ctx.reply('أرسل الإذاعة هكذا: `/broadcast نص الرسالة`'));

bot.command('broadcast', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const msg = ctx.message.text.replace('/broadcast ', '');
    const users = getUsers();
    users.forEach(u => bot.telegram.sendMessage(u.id, `📢 **رسالة ملكية:**\n\n${msg}`).catch(()=>null));
    ctx.reply('✅ تم الإرسال للجميع.');
});

// --- 🚀 تشغيل القلعة ---
bot.telegram.deleteWebhook().then(() => {
    bot.launch();
    console.log("✅ بوت القناص يعمل الآن.. جميع الأزرار مصلحة!");
});
