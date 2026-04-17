const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

// --- بيانات السيادة ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const CHANNEL_ID = '@wizzy_dv_sd';
const DB_FILE = './imperial_data.json';

// --- إدارة البيانات ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
const getData = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

function initUser(ctx) {
    let db = getData();
    const id = ctx.from.id;
    if (!db[id]) {
        db[id] = { 
            name: ctx.from.first_name, 
            coins: 100, 
            xp: 0, 
            level: 1,
            reminders: true, 
            joined: new Date().toLocaleDateString() 
        };
        saveData(db);
    }
    return db[id];
}

// سيرفر Render
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Imperial Core is Online!'));
app.listen(process.env.PORT || 3000);

// --- تعاريف الأزرار (ثابتة لمنع الأخطاء) ---
const btnSearch = '🔍 قنص أنمي';
const btnToday = '📅 أنميات اليوم';
const btnTop = '🔥 الأنميات المتصدرة';
const btnProfile = '👤 ملفي الملكي';
const btnHelp = '❓ مساعدة';
const btnChannel = '🔱 قناة السيادة';
const btnAdmin = '🛠️ لوحة الإمبراطور';

const mainMenu = Markup.keyboard([
    [btnSearch, btnToday],
    [btnTop, btnProfile],
    [btnHelp, btnChannel],
    [btnAdmin]
]).resize();

// --- ⏰ نظام التذكير التلقائي (الساعة 6 مساءً) ---
cron.schedule('0 18 * * *', () => {
    const db = getData();
    Object.keys(db).forEach(id => {
        if (db[id].reminders) {
            bot.telegram.sendMessage(id, `👑 **تذكير ملكي:**\n\nيا ملك، حان وقت متابعة أنمياتك المفضلة! لا تنسَ صلاتك ودراستك. 🔥`).catch(() => {});
        }
    });
});

// --- 🏠 الأوامر الأساسية ---
bot.start(async (ctx) => {
    initUser(ctx);
    try { await ctx.react('👑'); } catch (e) {}
    ctx.replyWithMarkdown(`أهلاً بك في **الإصدار المعجز لويزي** 🏯✨\n\nجميع الأزرار والأنظمة مفعلة الآن بنسبة 100%. جرب الميزات الجديدة!`, mainMenu);
});

// --- ❓ إصلاح زر المساعدة ---
bot.hears(btnHelp, async (ctx) => {
    try { await ctx.react('💡'); } catch (e) {}
    ctx.replyWithMarkdown(`❓ **دليل السيادة لويزي:**\n\n1. أرسل اسم الأنمي (بالإنجليزية) للبحث الفوري.\n2. اجمع الـ XP والعملات لرفع مستواك الإمبراطوري.\n3. التذكيرات تصلك يومياً الساعة 6 مساءً تلقائياً.\n\n📞 للدعم الفني: @Wizzy_Dev`, 
    Markup.inlineKeyboard([[Markup.button.url('تواصل مع المطور 👨‍💻', 'https://t.me/Wizzy_Dev')]]));
});

// --- 🔱 إصلاح زر قناة السيادة ---
bot.hears(btnChannel, async (ctx) => {
    try { await ctx.react('📡'); } catch (e) {}
    ctx.replyWithMarkdown(`🔱 **قناة السيادة والمصدر:**\n\nانضم لمتابعة تحديثات الإمبراطور ويزي وأحدث مشاريع البرمجة.`,
    Markup.inlineKeyboard([[Markup.button.url('دخول القناة الملكية 👑', 'https://t.me/wizzy_dv_sd')]]));
});

// --- 👤 ملفي الملكي ---
bot.hears(btnProfile, async (ctx) => {
    const u = initUser(ctx);
    try { await ctx.react('📊'); } catch (e) {}
    ctx.replyWithMarkdown(`👤 **البطاقة الشخصية لـ ${ctx.from.first_name}:**\n\n🆙 المستوى: \`${u.level}\`\n✨ الخبرة: \`${u.xp}\`\n🪙 العملات: \`${u.coins}\`\n📅 انضممت في: \`${u.joined}\`\n🔔 التذكير: \`${u.reminders ? 'مفعل ✅' : 'معطل ❌'}\``);
});

// --- 📅 أنميات اليوم ---
bot.hears(btnToday, async (ctx) => {
    try { await ctx.react('⏰'); } catch (e) {}
    const load = await ctx.reply('⏳ جاري جلب جدول اليوم...');
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/schedules?limit=8`);
        let text = `📅 **أنميات تعرض اليوم:**\n\n`;
        res.data.data.forEach(a => text += `🔹 *${a.title}* (🕒 ${a.broadcast.time || 'N/A'})\n`);
        ctx.replyWithMarkdown(text);
    } catch (e) { ctx.reply('السيرفر مشغول.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 🔥 الأنميات المتصدرة ---
bot.hears(btnTop, async (ctx) => {
    try { await ctx.react('🔥'); } catch (e) {}
    const res = await axios.get('https://api.jikan.moe/v4/top/anime?limit=5');
    let text = `🏆 **أفضل 5 أنميات هذا الأسبوع:**\n\n`;
    res.data.data.forEach((a, i) => text += `${i+1}. *${a.title}* (⭐ ${a.score})\n`);
    ctx.replyWithMarkdown(text);
});

// --- 🔍 محرك البحث (القناص) ---
bot.hears(btnSearch, (ctx) => ctx.reply('أرسل اسم الأنمي بالإنجليزية الآن.. 🔍'));

bot.on('text', async (ctx) => {
    const query = ctx.message.text;
    const allBtns = [btnSearch, btnToday, btnTop, btnProfile, btnHelp, btnChannel, btnAdmin];
    if (allBtns.includes(query)) return;

    let db = getData();
    const id = ctx.from.id;
    if (db[id]) { db[id].xp += 20; db[id].coins += 10; saveData(db); }

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🚀 جاري استخراج المعلومات...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const a = res.data.data[0];

        if (a) {
            try { await ctx.react('✅'); } catch (e) {}
            const caption = `🏯 **الأنمي:** \`${a.title}\`\n\n⭐ التقييم: \`${a.score || '7.5'}\`\n🎞️ الحلقات: \`${a.episodes || 'مستمر'}\`\n📌 الحالة: \`${a.status}\`\n🎬 الاستوديو: \`${a.studios[0]?.name || 'N/A'}\`\n\n✅ اختر وجهتك للمشاهدة:`;
            
            const q = encodeURIComponent(a.title);
            const buttons = Markup.inlineKeyboard([
                [Markup.button.url('🎬 سيرفر WitAnime', `https://witanime.pics/?s=${q}`)],
                [Markup.button.url('📽️ سيرفر AnimeLek', `https://animelek.me/search?q=${q}`)],
                [Markup.button.url('🚀 بحث تليجرام المباشر', `tg://search?text=${q}+مترجم`)]
            ]);
            await ctx.sendPhoto(a.images.jpg.large_image_url, { caption, ...buttons });
        } else { ctx.reply('لم أجد نتائج.'); }
    } catch (e) { ctx.reply('حدث خطأ في البحث.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 🛠️ لوحة التحكم ---
bot.hears(btnAdmin, (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('❌ للسيادة فقط!');
    ctx.replyWithMarkdown(`🔱 **غرفة القيادة:**`, Markup.inlineKeyboard([[Markup.button.callback('📊 الإحصائيات', 'stats')]]));
});

bot.action('stats', (ctx) => {
    const count = Object.keys(getData()).length;
    ctx.reply(`👥 عدد المستخدمين: ${count}`);
});

bot.launch();
console.log("✅ القلعة تعمل الآن بكامل طاقتها وبدون أخطاء!");
