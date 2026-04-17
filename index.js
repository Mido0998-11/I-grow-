const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const express = require('express');

// --- إعدادات الإمبراطورية ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const CHANNEL_ID = '@wizzy_dv_sd';
const DB_FILE = './users.json';

// --- إدارة قاعدة البيانات ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
function getData() { return JSON.parse(fs.readFileSync(DB_FILE)); }
function saveData(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

function updateUser(ctx) {
    let db = getData();
    const id = ctx.from.id;
    if (!db[id]) {
        db[id] = { 
            name: ctx.from.first_name, 
            username: ctx.from.username, 
            searches: 0, 
            rank: 'رعية 🧑‍🌾',
            lastSearch: 'لا يوجد'
        };
    }
    db[id].searches += 1;
    // نظام الرتب السوداني
    if (db[id].searches > 10) db[id].rank = 'محارب ⚔️';
    if (db[id].searches > 50) db[id].rank = 'قائد فرسان 🏇';
    if (db[id].searches > 100) db[id].rank = 'وزير 📜';
    if (db[id].searches > 200) db[id].rank = 'ملك 👑';
    saveData(db);
    return db[id];
}

// سيرفر ويب للبقاء حياً
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Imperial System is Online!'));
app.listen(process.env.PORT || 3000);

// --- الاشتراك الإجباري ---
async function checkSub(ctx, next) {
    if (ctx.from.id === ADMIN_ID) return next();
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(member.status)) return next();
        await ctx.replyWithMarkdown(`⚠️ **عذراً يا ملك، يجب الانضمام للقناة أولاً!**\n\nالقناة هي مصدر قوتنا، اشترك لتفعيل البوت.`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للقناة الآن 👑', `https://t.me/${CHANNEL_ID.replace('@','')}`)]])
        );
    } catch (e) { return next(); }
}

// --- 🏠 القائمة الرئيسية ---
const userMenu = Markup.keyboard([
    ['🔍 بحث سريع', '🔥 أنميات متصدرة'],
    ['🎲 أنمي عشوائي', '👤 ملفي الشخصي'],
    ['🔱 قناة المطور', '❓ مساعدة']
]).resize();

bot.start(checkSub, async (ctx) => {
    updateUser(ctx);
    try { await ctx.react('👑'); } catch (e) {}
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية ويزي للأنمي** 🏯🏮\n\nأقوى محرك بحث وتحويل في تليجرام. استخدم الأزرار بالأسفل لبدء الرحلة.`, userMenu);
});

// --- 👤 الملف الشخصي ---
bot.hears('👤 ملفي الشخصي', checkSub, (ctx) => {
    const user = getData()[ctx.from.id];
    ctx.replyWithMarkdown(`👤 **بطاقة الهوية الإمبراطورية:**\n\n🔹 **الاسم:** ${user.name}\n🔹 **الرتبة:** ${user.rank}\n🔹 **عدد عمليات البحث:** ${user.searches}\n🔹 **آخر بحث:** \`${user.lastSearch}\`\n\nاستمر في البحث لترقية رتبتك! 🚀`);
});

// --- 🔥 أنميات متصدرة (Top Anime) ---
bot.hears('🔥 أنميات متصدرة', checkSub, async (ctx) => {
    const load = await ctx.reply('⏳ جاري جلب قائمة النخبة...');
    try {
        const res = await axios.get('https://api.jikan.moe/v4/top/anime?limit=10');
        let text = `🏆 **أفضل 10 أنميات حالياً:**\n\n`;
        res.data.data.forEach((a, i) => {
            text += `${i+1}. *${a.title}* (⭐ ${a.score})\n`;
        });
        ctx.replyWithMarkdown(text);
    } catch (e) { ctx.reply('فشل الاتصال بالأرشيف.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 🎲 أنمي عشوائي ---
bot.hears('🎲 أنمي عشوائي', checkSub, async (ctx) => {
    const load = await ctx.reply('🎲 جاري اختيار أنمي لك...');
    try {
        const res = await axios.get('https://api.jikan.moe/v4/random/anime');
        const a = res.data.data;
        ctx.replyWithPhoto(a.images.jpg.large_image_url, {
            caption: `🎲 **أنمي عشوائي لك:**\n\n📌 *${a.title}*\n⭐ التقييم: ${a.score || '??'}\n\nاختر المشاهدة:`,
            ...Markup.inlineKeyboard([[Markup.button.url('🎬 مشاهدة الآن', `https://witanime.pics/?s=${encodeURIComponent(a.title)}`)]])
        });
    } catch (e) { ctx.reply('حاول مرة أخرى.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 🔍 محرك البحث المطور ---
bot.hears('🔍 بحث سريع', (ctx) => ctx.reply('أرسل اسم الأنمي الذي تبحث عنه الآن يا ملك.. 🔍'));

bot.on('text', checkSub, async (ctx) => {
    const query = ctx.message.text;
    if (['🔍 بحث سريع', '🔥 أنميات متصدرة', '🎲 أنمي عشوائي', '👤 ملفي الشخصي', '🔱 قناة المطور', '❓ مساعدة', '/admin'].includes(query)) return;

    const user = updateUser(ctx);
    let db = getData();
    db[ctx.from.id].lastSearch = query;
    saveData(db);

    const load = await ctx.reply('🚀 جاري قنص روابط المشاهدة...');
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const anime = res.data.data[0];

        if (anime) {
            const q = encodeURIComponent(anime.title);
            const buttons = Markup.inlineKeyboard([
                [Markup.button.url('🎬 WitAnime (عربي)', `https://witanime.pics/?s=${q}`)],
                [Markup.button.url('📽️ AnimeLek (عربي)', `https://animelek.me/search?q=${q}`)],
                [Markup.button.url('🚀 بحث تليجرام المباشر', `tg://search?text=${q}+مترجم`)]
            ]);

            await ctx.sendPhoto(anime.images.jpg.large_image_url, {
                caption: `🏯 **الأنمي:** \`${anime.title}\`\n⭐ **التقييم:** \`${anime.score || '7.5'}\`\n🎞️ **الحلقات:** \`${anime.episodes || 'مستمر'}\`\n\n✅ اختر سيرفر المشاهدة:`,
                ...buttons
            });
        } else { ctx.reply('لم أجد نتائج، جرب اسماً آخر.'); }
    } catch (e) { ctx.reply('السيرفر مشغول.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- 🛠️ لوحة تحكم الإمبراطور (Admin Panel) ---
bot.command('admin', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('❌ هذه المنطقة لسيادة الإمبراطور ويزي فقط!');
    ctx.replyWithMarkdown(`🔱 **مرحباً بك في غرفة القيادة يا ملك**\n\nاختر من الأدوات أدناه لإدارة إمبراطوريتك:`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📊 الإحصائيات', 'adm_stats'), Markup.button.callback('📡 حالة السيرفر', 'adm_ping')],
            [Markup.button.callback('📢 إذاعة ملكية', 'adm_brd'), Markup.button.callback('👥 قائمة الرعايا', 'adm_users')]
        ])
    );
});

bot.action('adm_stats', async (ctx) => {
    const users = Object.keys(getData()).length;
    let totalSearches = 0;
    Object.values(getData()).forEach(u => totalSearches += u.searches);
    await ctx.answerCbQuery();
    ctx.replyWithMarkdown(`📊 **إحصائيات الإمبراطورية:**\n\n👥 عدد المستخدمين: \`${users}\`\n🔍 إجمالي البحث: \`${totalSearches}\`\n📂 ملف البيانات: \`JSON\``);
});

bot.action('adm_ping', async (ctx) => {
    const start = Date.now();
    await ctx.answerCbQuery('جاري الفحص...');
    const ping = Date.now() - start;
    ctx.reply(`📡 حالة السيرفر: مستقر\n⏱️ سرعة الاستجابة: ${ping}ms\n🚀 النظام: Node.js / Telegraf`);
});

bot.action('adm_brd', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('أرسل الإذاعة بالتنسيق التالي:\n\n`اذاعة|نص الرسالة هنا`');
});

bot.hears(/^اذاعة\|(.+)/, (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const msg = ctx.match[1];
    const users = Object.keys(getData());
    let count = 0;
    users.forEach(id => {
        bot.telegram.sendMessage(id, `📢 **رسالة من إمبراطورية ويزي:**\n\n${msg}`, { parse_mode: 'Markdown' })
            .then(() => count++)
            .catch(() => {});
    });
    ctx.reply(`✅ تم البدء في الإذاعة. سيتم الإرسال لـ ${users.length} مستخدم.`);
});

bot.launch();
console.log("✅ إمبراطورية ويزي تعمل بكامل طاقتها!");
