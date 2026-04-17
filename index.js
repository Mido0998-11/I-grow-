const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');

// --- إعدادات السيادة ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const GITHUB_URL = 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json';

// سيرفر ويب للبقاء حياً في Render
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy GitHub Engine is LIVE!'));
app.listen(process.env.PORT || 3000);

// دالة لتنظيف الأسماء للبحث في المواقع العربية
const cleanName = (t) => encodeURIComponent(t.replace(/[^a-zA-Z0-9 ]/g, ""));

// --- 🏠 البداية ---
bot.start((ctx) => {
    ctx.replyWithMarkdown(`👑 **أهلاً بك في إمبراطورية ويزي للأنمي**\n\nأنا الآن متصل بأرشيف GitHub العالمي. أرسل اسم الأنمي بالإنجليزي (مثل: *Blue Lock*) وسأقوم بجلبه فوراً!`,
    Markup.keyboard([['🔍 ابحث عن أنمي'], ['🔱 قناة السيادة']]).resize());
});

bot.hears('🔍 ابحث عن أنمي', (ctx) => ctx.reply('أرسل اسم الأنمي الآن يا ملك.. 🔍'));

// --- 🔍 محرك البحث (يقرأ من جيت هوب ويحول لمشاهدة عربية) ---
bot.on('text', async (ctx) => {
    const query = ctx.message.text.toLowerCase();
    if (['🔍 ابحث عن أنمي', '🔱 قناة السيادة'].includes(ctx.message.text)) return;

    const load = await ctx.reply('⏳ جاري التنقيب في أرشيف جيت هوب (الملف ضخم، انتظر ثانية)...');

    try {
        // سحب البيانات من الرابط اللي إنت جبته
        const res = await axios.get(GITHUB_URL, { timeout: 15000 });
        const animeData = res.data;

        // البحث عن أول نتيجة تطابق الاسم
        const anime = animeData.find(a => a.title.toLowerCase().includes(query));

        if (anime) {
            const q = cleanName(anime.title);
            
            // صناعة "روابط المشاهدة العربية" فوراً
            const buttons = [
                [Markup.button.url('🎬 مشاهدة (سيرفر 1)', `https://witanime.pics/?s=${q}`)],
                [Markup.button.url('📺 مشاهدة (سيرفر 2)', `https://animelek.me/search?q=${q}`)],
                [Markup.button.url('🚀 بحث شامل في تليجرام', `tg://search?text=${q}+مترجم`)]
            ];

            // لو في روابط عالمية تانية في الملف بنضيفها
            if (anime.mal_id) buttons.push([Markup.button.url('ℹ️ معلومات MyAnimeList', `https://myanimelist.net/anime/${anime.mal_id}`)]);

            await ctx.replyWithMarkdown(
                `✅ **تم العثور على الأنمي في أرشيف جيت هوب!**\n\n` +
                `🏯 **الاسم:** \`${anime.title}\`\n` +
                `🎞️ **الحلقات:** \`${anime.episodes || 'مستمر'}\`\n` +
                `🎭 **النوع:** \`${anime.type || 'TV'}\`\n\n` +
                `🔥 اختر سيرفر المشاهدة المباشرة الآن:`,
                Markup.inlineKeyboard(buttons)
            );
        } else {
            ctx.reply('❌ لم أجد هذا الأنمي في المستودع حالياً! تأكد من الاسم بالإنجليزي.');
        }
    } catch (e) {
        ctx.reply('⚠️ السيرفر العالمي مضغوط حالياً (حجم الملف 10MB)، جرب تضغط "بحث" مرة تانية هسي!');
    } finally {
        ctx.deleteMessage(load.message_id).catch(() => {});
    }
});

bot.launch();
console.log("✅ القلعة متصلة بـ GitHub بنجاح!");
