const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const CHANNEL_ID = '@wizzy_dv_sd';
const DB_FILE = './imperial_db.json';

// --- إدارة البيانات الضخمة ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
const getData = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

function getUser(ctx) {
    let db = getData();
    const id = ctx.from.id;
    if (!db[id]) {
        db[id] = { 
            name: ctx.from.first_name, 
            coins: 50, 
            xp: 0, 
            reminders: true, 
            rank: 'رعية 🧑‍🌾',
            favs: [] 
        };
    }
    saveData(db);
    return db[id];
}

// سيرفر Render
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Imperial Core is ONLINE!'));
app.listen(process.env.PORT || 3000);

// --- الأزرار الرئيسية (التحفة) ---
const mainMenu = Markup.keyboard([
    ['🔍 قنص أنمي', '📅 أنميات الليلة'],
    ['🔥 توب الأسبوع', '🎖️ متجر الرتب'],
    ['📊 ملفي الملكي', '💡 نصيحة اليوم'],
    ['❓ مساعدة', '🔱 قناة السيادة']
]).resize();

// --- ⏰ نظام التذكير الإمبراطوري التلقائي ---
// يرسل تذكير كل يوم الساعة 7 مساءً
cron.schedule('0 19 * * *', () => {
    const db = getData();
    Object.keys(db).forEach(id => {
        if (db[id].reminders) {
            bot.telegram.sendMessage(id, `👑 **تنبيه ملكي مسائي:**\n\nيا ملك، حان وقت الاستراحة ومتابعة حلقاتك الجديدة! لا تنسَ ذكر الله. 🔥`).catch(() => {});
        }
    });
});

// --- 🏠 البداية ---
bot.start(async (ctx) => {
    getUser(ctx);
    try { await ctx.react('👑'); } catch (e) {}
    ctx.replyWithMarkdown(`أهلاً بك في **الإصدار السيادي الأقصى** 🏯✨\n\nيا ${ctx.from.first_name}، كل الأنظمة مفعلة وجاهزة لخدمتك.`, mainMenu);
});

// --- 🔍 محرك القنص المطور (معلومات كاملة) ---
bot.hears('🔍 قنص أنمي', (ctx) => ctx.reply('أرسل اسم الأنمي بالإنجليزية يا إمبراطور.. 🔍'));

bot.on('text', async (ctx) => {
    const query = ctx.message.text;
    const reserved = ['🔍 قنص أنمي', '📅 أنميات الليلة', '🔥 توب الأسبوع', '🎖️ متجر الرتب', '📊 ملفي الملكي', '💡 نصيحة اليوم', '❓ مساعدة', '🔱 قناة السيادة'];
    if (reserved.includes(query)) return;

    let db = getData();
    db[ctx.from.id].coins += 10; // مكافأة البحث
    db[ctx.from.id].xp += 20;
    saveData(db);

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('⏳ جاري استخراج البيانات من الأرشيف العالمي...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const a = res.data.data[0];

        if (a) {
            try { await ctx.react('🔥'); } catch (e) {}
            const genres = a.genres.map(g => g.name).join(', ');
            const studio = a.studios[0]?.name || 'غير معروف';
            
            const caption = `🏯 **الأنمي:** \`${a.title}\`\n\n` +
                `⭐ **التقييم:** \`${a.score || '7.0'}\`\n` +
                `📌 **الحالة:** \`${a.status}\`\n` +
                `🎥 **الاستوديو:** \`${studio}\`\n` +
                `🎭 **التصنيف:** \`${genres}\`\n` +
                `⏳ **المدة:** \`${a.duration}\`\n\n` +
                `💰 ربحت: \`+10 عملات\`\n\n✅ اختر وجهتك للمشاهدة:`;

            const buttons = Markup.inlineKeyboard([
                [Markup.button.url('🎬 WitAnime', `https://witanime.pics/?s=${encodeURIComponent(a.title)}`)],
                [Markup.button.url('📽️ AnimeLek', `https://animelek.me/search?q=${encodeURIComponent(a.title)}`)],
                [Markup.button.url('🚀 بحث تليجرام', `tg://search?text=${encodeURIComponent(a.title)}`)]
            ]);

            await ctx.sendPhoto(a.images.jpg.large_image_url, { caption, ...buttons });
        } else { ctx.reply('❌ لم يتم العثور على نتائج.'); }
    } catch (e) { ctx.reply('⚠️ عذراً، السيرفر العالمي مضغوط.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 📊 ملفي الملكي ---
bot.hears('📊 ملفي الملكي', (ctx) => {
    const u = getUser(ctx);
    ctx.replyWithMarkdown(`📊 **السجل الإمبراطوري لـ ${ctx.from.first_name}**\n\n📜 الرتبة: \`${u.rank}\`\n💰 العملات: \`${u.coins}\`\n✨ الخبرة (XP): \`${u.xp}\`\n🔔 التذكيرات: \`${u.reminders ? 'مفعلة ✅' : 'معطلة ❌'}\``,
        Markup.inlineKeyboard([[Markup.button.callback('🔔 تبديل حالة التذكير', 'toggle_rem')]])
    );
});

bot.action('toggle_rem', (ctx) => {
    let db = getData();
    db[ctx.from.id].reminders = !db[ctx.from.id].reminders;
    saveData(db);
    ctx.answerCbQuery(`تم ${db[ctx.from.id].reminders ? 'تفعيل' : 'تعطيل'} التذكيرات`);
    ctx.reply(`🔔 حالة التذكير الجديدة: ${db[ctx.from.id].reminders ? 'مفعلة ✅' : 'معطلة ❌'}`);
});

// --- 📅 أنميات الليلة (الجدول) ---
bot.hears('📅 أنميات الليلة', async (ctx) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const res = await axios.get(`https://api.jikan.moe/v4/schedules?filter=${today}&limit=8`);
    let text = `📅 **جدول عرض الليلة (${today}):**\n\n`;
    res.data.data.forEach(a => text += `🔹 *${a.title}* (🕒 ${a.broadcast.time || 'N/A'})\n`);
    ctx.replyWithMarkdown(text);
});

// --- 🎖️ متجر الرتب ---
bot.hears('🎖️ متجر الرتب', (ctx) => {
    ctx.replyWithMarkdown(`🎖️ **مرحباً بك في سوق السيادة**\n\nاشترِ رتبتك بالعملات:\n\n1. رتبة **قناص 🎯** (500 عملة)\n2. رتبة **وزير 📜** (2000 عملة)\n3. رتبة **إمبراطور 👑** (5000 عملة)`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🎯 شراء قناص', 'buy_sniper')],
            [Markup.button.callback('👑 شراء إمبراطور', 'buy_emp')]
        ])
    );
});

// --- ❓ إصلاح زر المساعدة وقناة السيادة ---
bot.hears('❓ مساعدة', (ctx) => {
    ctx.replyWithMarkdown(`❓ **دليل السيادة لويزي:**\n\n- أرسل اسم الأنمي فقط للبحث.\n- اجمع العملات لترقية رتبتك.\n- البوت يرسل تذكيرات تلقائية يومياً 7م.\n\nتواصل مع المطور: @Wizzy_Dev`);
});

bot.hears('🔱 قناة السيادة', (ctx) => {
    ctx.replyWithMarkdown(`🔱 **قناة السيادة والمصدر:**\n\nتابع أحدث مشاريع ويزي البرمجية عبر الرابط:`,
        Markup.inlineKeyboard([[Markup.button.url('انضم للسيادة 👑', 'https://t.me/wizzy_dv_sd')]])
    );
});

bot.launch();
console.log("✅ الإمبراطورية العظمى لويزي تعمل بكفاءة 100%!");
