const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

// --- إعدادات الإمبراطورية ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const CHANNEL_USER = 'wizzy_dv_sd'; // يوزر قناتك بدون @
const DB_FILE = './imperial_database.json';

// --- إدارة البيانات ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
const getData = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

function initUser(ctx, inviterId = null) {
    let db = getData();
    const id = ctx.from.id;
    if (!db[id]) {
        db[id] = { 
            name: ctx.from.first_name, 
            coins: 50, 
            xp: 0, 
            invites: 0,
            rank: 'مواطن جديد ✨',
            joined: new Date().toLocaleDateString()
        };
        if (inviterId && db[inviterId] && inviterId != id) {
            db[inviterId].coins += 100;
            db[inviterId].invites += 1;
            bot.telegram.sendMessage(inviterId, `🔔 **بشرى ملكية!**\n\nانضم عضو جديد عن طريق رابطك، حصلت على **100 عملة**! 🪙`).catch(()=>{});
        }
        saveData(db);
    }
    return db[id];
}

// سيرفر ويب للبقاء حياً
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Imperial System is LIVE!'));
app.listen(process.env.PORT || 3000);

// --- 🔱 الثوابت الفولاذية للأزرار (لمنع أي خطأ) ---
const BTN_SEARCH = '🔍 قنص أنمي';
const BTN_TOP = '🔥 توب الأسبوع';
const BTN_INVITE = '🔗 رابط الدعوة';
const BTN_PROFILE = '👤 ملفي الملكي';
const BTN_HELP = '❓ مساعدة';
const BTN_CHANNEL = '🔱 قناة السيادة';
const BTN_ADMIN = '🛠️ لوحة الإمبراطور';

const mainMenu = Markup.keyboard([
    [BTN_SEARCH, BTN_TOP],
    [BTN_INVITE, BTN_PROFILE],
    [BTN_HELP, BTN_CHANNEL],
    [BTN_ADMIN]
]).resize();

// --- دالة فحص الاشتراك ---
async function checkSub(ctx) {
    if (ctx.from.id === ADMIN_ID) return true;
    try {
        const member = await ctx.telegram.getChatMember(`@${CHANNEL_USER}`, ctx.from.id);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch (e) { return false; }
}

// --- ⏰ التذكير التلقائي (6 مساءً) ---
cron.schedule('0 18 * * *', () => {
    const db = getData();
    Object.keys(db).forEach(id => {
        bot.telegram.sendMessage(id, `👑 **تذكير ملكي يومي:**\n\nيا ملك، لا تنسَ متابعة حلقاتك اليوم! استمتع بوقتك. 🔥`).catch(() => null);
    });
});

// --- 🏠 معالجة الأوامر ---
bot.start(async (ctx) => {
    const inviterId = ctx.startPayload;
    initUser(ctx, inviterId);
    try { await ctx.react('👑'); } catch (e) {}

    const isSub = await checkSub(ctx);
    if (!isSub) {
        return ctx.replyWithMarkdown(`⚠️ **عذراً يا ملك، القلعة مغلقة!**\n\nيجب أن تشترك في القناة أولاً لتفعيل ميزات القنص.\n\nبعد الاشتراك، اضغط /start مرة أخرى.`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للسيادة 👑', `https://t.me/${CHANNEL_USER}`)]])
        );
    }
    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية ويزي المتكاملة** 🏯✨\n\nكل الميزات مفعلة الآن (بحث، دعوات، نقاط، وتذكير).`, mainMenu);
});

// --- ⚙️ تشغيل الأزرار (إصلاح نهائي) ---

bot.hears(BTN_HELP, async (ctx) => {
    try { await ctx.react('💡'); } catch (e) {}
    ctx.replyWithMarkdown(`❓ **دليل المساعدة:**\n\n1. أرسل اسم الأنمي بالإنجليزية للبحث عنه.\n2. شارك رابط الدعوة الخاص بك لجمع النقاط.\n3. التذكيرات تصلك يومياً الساعة 6 مساءً.\n\nالدعم الفني: @Wizzy_Dev`);
});

bot.hears(BTN_CHANNEL, async (ctx) => {
    try { await ctx.react('📡'); } catch (e) {}
    ctx.replyWithMarkdown(`🔱 **قناة السيادة والمصدر:**\n\nتابع تحديثات الإمبراطور ويزي عبر الرابط أدناه:`,
        Markup.inlineKeyboard([[Markup.button.url('انضم الآن 👑', `https://t.me/${CHANNEL_USER}`)]])
    );
});

bot.hears(BTN_INVITE, async (ctx) => {
    const link = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(`🔗 **رابط الدعوة الخاص بك:**\n\n\`${link}\`\n\nعن كل شخص يدخل من رابطك ستحصل على **100 عملة**! 🪙`);
});

bot.hears(BTN_PROFILE, (ctx) => {
    const u = initUser(ctx);
    ctx.replyWithMarkdown(`👤 **ملف السيادة لـ ${ctx.from.first_name}:**\n\n📜 الرتبة: \`${u.rank}\`\n🪙 العملات: \`${u.coins}\`\n👥 الدعوات: \`${u.invites}\`\n📅 انضممت في: \`${u.joined}\``);
});

bot.hears(BTN_TOP, async (ctx) => {
    const load = await ctx.reply('⏳ جاري قنص النخبة...');
    try {
        const res = await axios.get('https://api.jikan.moe/v4/top/anime?limit=5');
        let text = `🔥 **أفضل أنميات الأسبوع:**\n\n`;
        res.data.data.forEach((a, i) => text += `${i+1}. *${a.title}* (⭐ ${a.score})\n`);
        ctx.replyWithMarkdown(text);
    } catch (e) { ctx.reply('السيرفر مشغول.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

bot.hears(BTN_ADMIN, (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('❌ للسيادة فقط!');
    const users = Object.keys(getData()).length;
    ctx.replyWithMarkdown(`🔱 **غرفة الإدارة:**\n\nعدد الرعايا: \`${users}\``,
        Markup.inlineKeyboard([[Markup.button.callback('📢 إذاعة ملكية', 'brd')]])
    );
});

bot.hears(BTN_SEARCH, (ctx) => ctx.reply('أرسل اسم الأنمي بالإنجليزي الآن يا ملك.. 🔍'));

// --- 🔍 محرك القنص الرئيسي ---
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const reserved = [BTN_SEARCH, BTN_TOP, BTN_INVITE, BTN_PROFILE, BTN_HELP, BTN_CHANNEL, BTN_ADMIN];
    if (reserved.includes(text)) return;

    const isSub = await checkSub(ctx);
    if (!isSub) return ctx.reply('⚠️ اشترك في القناة أولاً!');

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🚀 جاري قنص المعلومات...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`);
        const a = res.data.data[0];
        if (a) {
            const genres = a.genres.map(g => g.name).join(', ');
            const caption = `🏯 **الأنمي:** \`${a.title}\`\n\n⭐ **التقييم:** \`${a.score || '7.5'}\`\n📌 **الحالة:** \`${a.status}\`\n🎥 **الاستوديو:** \`${a.studios[0]?.name || 'N/A'}\`\n🎭 **التصنيف:** \`${genres}\`\n\n✅ روابط المشاهدة:`;
            
            const q = encodeURIComponent(a.title);
            const buttons = Markup.inlineKeyboard([
                [Markup.button.url('🎬 WitAnime', `https://witanime.pics/?s=${q}`)],
                [Markup.button.url('📽️ AnimeLek', `https://animelek.me/search?q=${q}`)],
                [Markup.button.url('🚀 بحث تليجرام', `tg://search?text=${q}+مترجم`)]
            ]);
            await ctx.sendPhoto(a.images.jpg.large_image_url, { caption, ...buttons });
        } else { ctx.reply('لم أجد نتائج.'); }
    } catch (e) { ctx.reply('⚠️ السيرفر مشغول.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- أوامر الإدارة ---
bot.action('brd', (ctx) => ctx.reply('أرسل الإذاعة بالتنسيق: `اذاعة|الرسالة`'));
bot.hears(/^اذاعة\|(.+)/, (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const msg = ctx.match[1];
    const users = Object.keys(getData());
    users.forEach(id => bot.telegram.sendMessage(id, `📢 **رسالة من الإدارة:**\n\n${msg}`).catch(()=>{}));
    ctx.reply('✅ تم الإرسال للجميع.');
});

bot.launch();
console.log("✅ إمبراطورية ويزي تعمل بكفاءة 100%!");
