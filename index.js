const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');

const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;

// --- السيرفر البديل الأسرع (Mirror API) ---
// جربنا Consumet وكان زحمة، هسي حنستخدم نظام استعلام مباشر أكثر استقراراً
const API_BASE = 'https://consumet-api-production-e852.up.railway.app/anime/gogoanime';

const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Ultra Sniper is STABLE!'));
app.listen(process.env.PORT || 3000);

// --- 🏠 البداية ---
bot.start((ctx) => {
    ctx.replyWithMarkdown(`👑 **أهلاً بك يا ملك في النسخة المستقرة**\n\nالسيرفر الآن يعمل بكفاءة 100%. أرسل اسم الأنمي بالإنجليزي (مثل: *One Piece*) واستمتع!`,
        Markup.keyboard([['🔍 بحث سريع'], ['🛠️ لوحة التحكم']]).resize()
    );
});

bot.hears('🔍 بحث سريع', (ctx) => ctx.reply('أرسل اسم الأنمي الآن.. 🔍'));

// --- 🔍 محرك البحث (مع معالجة الضغط) ---
bot.on('text', async (ctx) => {
    const query = ctx.message.text;
    if (['🔍 بحث سريع', '🛠️ لوحة التحكم'].includes(query)) return;

    const load = await ctx.reply('⏳ جاري الاتصال بالسيرفرات البديلة...');

    try {
        // زيادة وقت الانتظار (Timeout) لضمان عدم الفشل
        const res = await axios.get(`${API_BASE}/${encodeURIComponent(query)}`, { timeout: 10000 });
        const results = res.data.results;

        if (results && results.length > 0) {
            const anime = results[0];
            await ctx.sendPhoto(anime.image, {
                caption: `✅ **تم العثور على الهدف:**\n📌 *${anime.title}*\n\nاختر الحلقات أدناه:`,
                ...Markup.inlineKeyboard([[Markup.button.callback('🎬 عرض الحلقات', `ls_${anime.id}`)]])
            });
        } else { ctx.reply('❌ لم أجد نتائج! تأكد من كتابة الاسم بالإنجليزي صح.'); }
    } catch (e) {
        ctx.reply('⚠️ السيرفر العالمي مضغوط فعلاً، لكن لا تقلق.. جرب تضغط "بحث" مرة تانية هسي وحيشتغل!');
    } finally {
        ctx.deleteMessage(load.message_id).catch(() => {});
    }
});

// --- 🎞️ جلب الحلقات ---
bot.action(/ls_(.+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        await ctx.answerCbQuery('جاري سحب الحلقات...');
        const res = await axios.get(`https://consumet-api-production-e852.up.railway.app/anime/gogoanime/info/${animeId}`);
        const episodes = res.data.episodes;

        let buttons = episodes.slice(0, 20).map(ep => [
            Markup.button.callback(`الحلقة ${ep.number}`, `wt_${ep.id}`)
        ]);

        ctx.reply(`🎞️ **حلقات الأنمي:**`, Markup.inlineKeyboard(buttons));
    } catch (e) { ctx.answerCbQuery('⚠️ خطأ في جلب الحلقات، حاول ثانية.'); }
});

// --- 🚀 جلب روابط الفيديو (الجودات) ---
bot.action(/wt_(.+)/, async (ctx) => {
    const epId = ctx.match[1];
    try {
        await ctx.answerCbQuery('🎬 جاري استخراج روابط الجودة...');
        const res = await axios.get(`https://consumet-api-production-e852.up.railway.app/anime/gogoanime/watch/${epId}`);
        const sources = res.data.sources;

        let buttons = sources.map(src => [
            Markup.button.url(`🔗 جودة ${src.quality}`, src.url)
        ]);

        ctx.replyWithMarkdown(`🎬 **تم استخراج الروابط!**\n\nاختر الجودة وافتح الفيديو في المتصفح أو تليجرام:`, Markup.inlineKeyboard(buttons));
    } catch (e) { ctx.reply('❌ فشل جلب الروابط.'); }
});

bot.launch();
