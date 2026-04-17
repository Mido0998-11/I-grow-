const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const express = require('express');

// --- إعدادات الإمبراطورية ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678; 
const CHANNEL_ID = '@wizzy_dv_sd';
const DB_FILE = './database.json';

// --- إدارة قاعدة البيانات (تخزين الحلقات) ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
const getDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// سيرفر ويب للبقاء حياً في Render
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Sovereign Storage is LIVE!'));
app.listen(process.env.PORT || 3000);

// --- فحص الاشتراك الإجباري ---
async function checkSub(ctx, next) {
    if (ctx.from.id === ADMIN_ID) return next();
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(member.status)) return next();
        
        await ctx.replyWithMarkdown(`⚠️ **يا ملك، يجب الانضمام للقناة أولاً لاستخدام البوت!**`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للقناة الآن 👑', `https://t.me/${CHANNEL_ID.replace('@','')}`)]])
        );
    } catch (e) { return next(); }
}

// --- 🏠 القائمة الرئيسية (نظام التحفة) ---
const mainMenu = Markup.keyboard([
    ['🔍 بحث عن أنمي', '📂 مكتبة الأنمي'],
    ['🔱 قناة السيادة', '🛠️ لوحة التحكم']
]).resize();

bot.start(checkSub, async (ctx) => {
    try { await ctx.react('👑'); } catch (e) {}
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية ويزي للأنمي** 👑🏯\n\nأرسل اسم الأنمي للبحث عنه، أو استخدم القائمة أدناه.`, mainMenu);
});

// --- 🛠️ ميزة الأدمن: تخزين الحلقات (فقط قم بتحويل الفيديو للبوت) ---
bot.on('video', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const fileId = ctx.message.video.file_id;
    const caption = ctx.message.caption || 'حلقة جديدة';
    
    ctx.replyWithMarkdown(`✅ **وصل الهدف يا إمبراطور!**\n\nالاسم: \`${caption}\`\n\nتحت أي أنمي تريد تخزينها؟ (أرسل الاسم بالإنجليزية الآن)`);
    bot.context.tempVideo = { fileId, caption };
});

// --- 🔍 محرك البحث الذكي (محلي + عالمي) ---
bot.on('text', checkSub, async (ctx) => {
    const text = ctx.message.text;

    // 1. لو الأدمن بيخزن حلقة
    if (ctx.from.id === ADMIN_ID && bot.context.tempVideo) {
        let db = getDB();
        const animeName = text.toLowerCase();
        if (!db[animeName]) db[animeName] = [];
        
        db[animeName].push({ id: bot.context.tempVideo.fileId, info: bot.context.tempVideo.caption });
        saveDB(db);
        bot.context.tempVideo = null;
        return ctx.reply(`✅ تم إضافة الحلقة لمكتبة **${text}** بنجاح!`);
    }

    if (['🔍 بحث عن أنمي', '📂 مكتبة الأنمي', '🔱 قناة السيادة', '🛠️ لوحة التحكم'].includes(text)) {
        if (text === '🔍 بحث عن أنمي') return ctx.reply('أرسل اسم الأنمي الذي تبحث عنه الآن.. 🔍');
        if (text === '📂 مكتبة الأنمي') {
            const keys = Object.keys(getDB());
            return ctx.reply(keys.length > 0 ? `📂 القائمة المتوفرة:\n\n${keys.join('\n')}` : 'المكتبة فارغة حالياً.');
        }
        if (text === '🛠️ لوحة التحكم' && ctx.from.id === ADMIN_ID) {
            return ctx.reply(`📊 **إحصائيات الإمبراطورية:**\n\nعدد الأنميات المخزنة: \`${Object.keys(getDB()).length}\``);
        }
        return;
    }

    // 2. البحث الفعلي
    const db = getDB();
    const query = text.toLowerCase();

    if (db[query]) {
        // لو موجود في مخزننا
        let buttons = db[query].map((ep, index) => [
            Markup.button.callback(`🎞️ ${ep.info}`, `show_${query}_${index}`)
        ]);
        ctx.reply(`🎬 **نتائج الأرشيف لـ ${text}:**`, Markup.inlineKeyboard(buttons));
    } else {
        // لو مش موجود، نفتح "البحث العالمي" في تليجرام (Zero Effort)
        const tgSearch = `tg://search?text=${encodeURIComponent(text + " مترجم")}`;
        const buttons = Markup.inlineKeyboard([
            [Markup.button.url('🚀 ابحث في كل قنوات تليجرام', tgSearch)],
            [Markup.button.url('📂 ابحث في مكتبة الأنمي العربية', `https://t.me/s/Anime_Library?q=${encodeURIComponent(text)}`)]
        ]);
        ctx.replyWithMarkdown(`❌ **لم أجد "${text}" في مخزني الخاص بعد..**\n\nلكن لا تقلق، اضغط أدناه وسيفتح لك تليجرام كل القنوات التي توفره فوراً:`, buttons);
    }
});

// --- 🎞️ عرض الفيديو من المخزن ---
bot.action(/show_(.+)_(.+)/, async (ctx) => {
    const [_, name, index] = ctx.match;
    const db = getDB();
    const episode = db[name][index];
    
    await ctx.replyWithVideo(episode.id, {
        caption: `🎬 **${episode.info}**\n\n🔥 مشاهدة ممتعة من مكتبة ويزي! @wizzy_dv_sd`,
        ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ العودة للنتائج', 'start')]])
    });
    await ctx.answerCbQuery();
});

bot.launch();
console.log("✅ القلعة متصلة بنظام التخزين والبحث العالمي!");
