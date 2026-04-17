const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

// --- إعدادات السيادة ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const CHANNEL_USER = 'wizzy_dv_sd'; 
const DB_FILE = './imperial_final_db.json';

// --- إدارة البيانات ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
const getData = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

function initUser(ctx, inviterId = null) {
    let db = getData();
    const id = ctx.from.id;
    if (!db[id]) {
        db[id] = { name: ctx.from.first_name, coins: 50, xp: 0, invites: 0, rank: 'مواطن ✨', watchlist: [] };
        if (inviterId && db[inviterId] && inviterId != id) {
            db[inviterId].coins += 100;
            db[inviterId].invites += 1;
            bot.telegram.sendMessage(inviterId, `🔔 **بشرى ملكية!**\n\nانضم عضو جديد عبر رابطك، حصلت على **100 عملة**! 🪙`).catch(()=>{});
        }
        saveData(db);
    }
    return db[id];
}

// سيرفر ويب
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Imperial Core is ACTIVE!'));
app.listen(process.env.PORT || 3000);

// --- 🔱 تعريف الأزرار (الثوابت لمنع أي خطأ) ---
const BTN_SEARCH = '🔍 قنص أنمي';
const BTN_ARCHIVE = '📂 أرشيفي الخاص';
const BTN_PROFILE = '👤 ملفي الملكي';
const BTN_TOP = '🏆 قائمة النخبة';
const BTN_CHANNEL = '🔱 قناة السيادة';
const BTN_HELP = '❓ مساعدة';

const mainMenu = Markup.keyboard([
    [BTN_SEARCH, BTN_ARCHIVE],
    [BTN_PROFILE, BTN_TOP],
    [BTN_CHANNEL, BTN_HELP]
]).resize();

// فحص الاشتراك
async function isSub(ctx) {
    if (ctx.from.id === ADMIN_ID) return true;
    try {
        const m = await ctx.telegram.getChatMember(`@${CHANNEL_USER}`, ctx.from.id);
        return ['member', 'administrator', 'creator'].includes(m.status);
    } catch (e) { return false; }
}

// --- ⏰ التذكير التلقائي (6 مساءً) ---
cron.schedule('0 18 * * *', () => {
    const db = getData();
    Object.keys(db).forEach(id => {
        bot.telegram.sendMessage(id, `👑 **تذكير ملكي:** يا ملك، لا تنسَ متابعة أنمياتك اليوم! 🔥`).catch(() => null);
    });
});

// --- 🏠 معالجة الأوامر ---
bot.start(async (ctx) => {
    const inviterId = ctx.startPayload;
    initUser(ctx, inviterId);
    try { await ctx.react('👑'); } catch (e) {}

    const sub = await isSub(ctx);
    if (!sub) {
        return ctx.replyWithMarkdown(`⚠️ **القلعة مغلقة!**\n\nيجب الاشتراك في القناة أولاً لتفعيل البوت.\n\nبعد الاشتراك، اضغط /start مرة أخرى.`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للسيادة 👑', `https://t.me/${CHANNEL_USER}`)]])
        );
    }
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية ويزي** 🏯✨\nكل الميزات مفعلة الآن وبدون لاغ!`, mainMenu);
});

// --- ⚙️ تشغيل الأزرار (الاستجابة الفورية) ---

bot.hears(BTN_HELP, async (ctx) => {
    try { await ctx.react('💡'); } catch (e) {}
    ctx.replyWithMarkdown(`❓ **دليل السيادة:**\n\n1. أرسل اسم الأنمي بالإنجليزية للبحث.\n2. شارك رابطك من "ملفي الملكي" لجمع النقاط.\n3. التذكيرات تصلك يومياً 6م.\n\nالمطور: @Wizzy_Dev`);
});

bot.hears(BTN_CHANNEL, async (ctx) => {
    try { await ctx.react('📡'); } catch (e) {}
    ctx.replyWithMarkdown(`🔱 **قناة السيادة والمصدر:**`,
        Markup.inlineKeyboard([[Markup.button.url('انضم الآن 👑', `https://t.me/${CHANNEL_USER}`)]])
    );
});

bot.hears(BTN_PROFILE, (ctx) => {
    const u = initUser(ctx);
    const link = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(`👤 **ملف السيادة لـ ${ctx.from.first_name}:**\n\n📜 الرتبة: \`${u.rank}\`\n🪙 العملات: \`${u.coins}\`\n👥 الدعوات: \`${u.invites}\`\n\n🔗 رابط دعوتك:\n\`${link}\``);
});

bot.hears(BTN_ARCHIVE, (ctx) => {
    const u = initUser(ctx);
    ctx.replyWithMarkdown(`📂 **أرشيفك يحتوي على (${u.watchlist.length}) أنمي.**\n\n(الميزة قيد التطوير لإظهار القائمة كاملة)`);
});

bot.hears(BTN_TOP, async (ctx) => {
    const load = await ctx.reply('⏳ جاري قنص النخبة...');
    try {
        const res = await axios.get('https://api.jikan.moe/v4/top/anime?limit=5');
        let text = `🏆 **أفضل أنميات الأسبوع:**\n\n`;
        res.data.data.forEach((a, i) => text += `${i+1}. *${a.title}* (⭐ ${a.score})\n`);
        ctx.replyWithMarkdown(text);
    } catch (e) { ctx.reply('⚠️ السيرفر مشغول.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

bot.hears(BTN_SEARCH, (ctx) => ctx.reply('أرسل اسم الأنمي بالإنجليزي الآن يا ملك.. 🔍'));

// --- 🔍 محرك القنص المطور ---
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const reserved = [BTN_SEARCH, BTN_ARCHIVE, BTN_PROFILE, BTN_TOP, BTN_CHANNEL, BTN_HELP];
    if (reserved.includes(text)) return;

    if (!(await isSub(ctx))) return ctx.reply('⚠️ اشترك في القناة أولاً!');

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🚀 جاري القنص...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`);
        const a = res.data.data[0];
        if (a) {
            const caption = `🏯 **الأنمي:** \`${a.title}\`\n⭐ **التقييم:** \`${a.score || '7.5'}\`\n📌 **الحالة:** \`${a.status}\`\n\n✅ روابط المشاهدة:`;
            const q = encodeURIComponent(a.title);
            const buttons = Markup.inlineKeyboard([
                [Markup.button.url('🎬 WitAnime', `https://witanime.pics/?s=${q}`)],
                [Markup.button.url('📽️ AnimeLek', `https://animelek.me/search?q=${q}`)]
            ]);
            await ctx.sendPhoto(a.images.jpg.large_image_url, { caption, ...buttons });
        } else { ctx.reply('لم أجد نتائج.'); }
    } catch (e) { ctx.reply('⚠️ حاول مجدداً.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

bot.launch();
console.log("✅ الإمبراطورية تعمل بكفاءة 100% وبدون لاغ!");
