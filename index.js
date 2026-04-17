const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

// --- بيانات السيادة ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const CHANNEL_USER = 'wizzy_dv_sd';
const DB_FILE = './imperial_master_db.json';

// --- إدارة البيانات ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
const getData = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

function initUser(ctx) {
    let db = getData();
    const id = ctx.from.id;
    if (!db[id]) {
        db[id] = { name: ctx.from.first_name, coins: 100, xp: 0, watchlist: [], rank: 'مواطن ✨' };
        saveData(db);
    }
    return db[id];
}

const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Sniper Pro is LIVE!'));
app.listen(process.env.PORT || 3000);

// --- الأزرار الفولاذية ---
const BTN_SEARCH = '🔍 قنص أنمي';
const BTN_MY_LIST = '📂 أرشيفي الخاص';
const BTN_TOP = '🏆 قائمة النخبة';
const BTN_PROFILE = '👤 ملفي الملكي';
const BTN_HELP = '❓ مساعدة';
const BTN_CHANNEL = '🔱 قناة السيادة';

const mainMenu = Markup.keyboard([
    [BTN_SEARCH, BTN_MY_LIST],
    [BTN_TOP, BTN_PROFILE],
    [BTN_HELP, BTN_CHANNEL]
]).resize();

// --- 🏠 البداية وفحص الاشتراك ---
bot.start(async (ctx) => {
    initUser(ctx);
    try { await ctx.react('👑'); } catch (e) {}
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية القنص المتقدمة** 🏮✨\n\nالبحث الآن يدعم التريلرات، الشخصيات، وحفظ المفضلات!`, mainMenu);
});

// --- 🔍 محرك البحث الاحترافي (Advanced Sniper) ---
bot.hears(BTN_SEARCH, (ctx) => ctx.reply('أرسل اسم الأنمي الآن لقنص كافة المعلومات والروابط.. 🔍'));

bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const reserved = [BTN_SEARCH, BTN_MY_LIST, BTN_TOP, BTN_PROFILE, BTN_HELP, BTN_CHANNEL];
    if (reserved.includes(text)) return;

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('⏳ جاري اختراق قواعد البيانات وجلب التفاصيل...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`);
        const a = res.data.data[0];

        if (a) {
            const genres = a.genres.map(g => g.name).join(' | ');
            const producers = a.producers.map(p => p.name).slice(0, 2).join(', ');
            
            const caption = `🏯 **الأنمي:** \`${a.title}\`\n\n` +
                `⭐ **التقييم:** \`${a.score || 'N/A'}\` (المرتبة: #${a.rank})\n` +
                `📌 **الحالة:** \`${a.status}\`\n` +
                `🎬 **الاستوديو:** \`${a.studios[0]?.name || 'N/A'}\`\n` +
                `🎭 **التصنيف:** \`${genres}\`\n` +
                `🔞 **الفئة العمرية:** \`${a.rating}\`\n` +
                `👥 **الشعبية:** \`#${a.popularity}\`\n\n` +
                `📝 **القصة:** ${a.synopsis ? a.synopsis.substring(0, 200) + '...' : 'لا يوجد وصف.'}\n\n` +
                `✅ اختر من خيارات القنص أدناه:`;

            const q = encodeURIComponent(a.title);
            const buttons = [
                [Markup.button.url('🎬 مشاهدة (WitAnime)', `https://witanime.pics/?s=${q}`), Markup.button.url('📽️ مشاهدة (AnimeLek)', `https://animelek.me/search?q=${q}`)],
                [Markup.button.callback('🌟 إضافة للمفضلة', `fav_${a.mal_id}`), Markup.button.callback('👥 الشخصيات', `chars_${a.mal_id}`)]
            ];

            if (a.trailer?.url) {
                buttons.push([Markup.button.url('📺 عرض التريلر (YouTube)', a.trailer.url)]);
            }

            await ctx.sendPhoto(a.images.jpg.large_image_url, { caption, ...Markup.inlineKeyboard(buttons) });
        } else { ctx.reply('❌ لم أجد هذا الأنمي، حاول كتابة الاسم بدقة.'); }
    } catch (e) { ctx.reply('⚠️ السيرفر العالمي مشغول، حاول مجدداً.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 🌟 ميزة الإضافة للمفضلة (أرشيفي الخاص) ---
bot.action(/fav_(.+)/, async (ctx) => {
    const animeId = ctx.match[1];
    let db = getData();
    const user = db[ctx.from.id];

    if (!user.watchlist.includes(animeId)) {
        user.watchlist.push(animeId);
        saveData(db);
        await ctx.answerCbQuery('✅ تمت الإضافة لأرشيفك الخاص!');
    } else {
        await ctx.answerCbQuery('⚠️ موجود بالفعل في أرشيفك.');
    }
});

// --- 👥 ميزة جلب الشخصيات ---
bot.action(/chars_(.+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        await ctx.answerCbQuery('جاري جلب قائمة الشخصيات...');
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}/characters`);
        const chars = res.data.data.slice(0, 5).map(c => `👤 **${c.character.name}** (${c.role})`).join('\n');
        ctx.reply(`👥 **أهم الشخصيات في هذا الأنمي:**\n\n${chars}`);
    } catch (e) { ctx.reply('⚠️ فشل جلب الشخصيات.'); }
});

// --- 📂 عرض الأرشيف الخاص ---
bot.hears(BTN_MY_LIST, async (ctx) => {
    const u = initUser(ctx);
    if (u.watchlist.length === 0) return ctx.reply('📂 أرشيفك فارغ حالياً، ابحث عن أنمي وأضفه!');
    
    ctx.replyWithMarkdown(`📂 **أرشيفك الخاص يحتوي على ${u.watchlist.length} أنمي.**\n\nاستخدم البحث لاسترجاع معلوماتهم بسرعة!`);
});

// --- 🏆 قائمة النخبة (Top Anime) ---
bot.hears(BTN_TOP, async (ctx) => {
    const res = await axios.get('https://api.jikan.moe/v4/top/anime?limit=10');
    let text = `🏆 **قائمة النخبة (أفضل 10 أنميات):**\n\n`;
    res.data.data.forEach((a, i) => text += `${i+1}. *${a.title}* (⭐ ${a.score})\n`);
    ctx.replyWithMarkdown(text);
});

// --- 🔱 بقية الأزرار ---
bot.hears(BTN_HELP, (ctx) => ctx.reply('❓ استخدم "قنص أنمي" للبحث، و "أرشيفي" لحفظ ما يعجبك.'));
bot.hears(BTN_CHANNEL, (ctx) => ctx.reply(`🔱 قناة السيادة: https://t.me/${CHANNEL_USER}`));

bot.launch();
console.log("✅ إمبراطورية القنص المتقدمة تعمل الآن!");
