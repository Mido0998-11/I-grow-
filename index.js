const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

// --- بيانات السيادة ---
const bot = new Telegraf('8138541463:AAFL1LiWzzMZo8SCNubLSvCRrKqTqcEpcJo');
const ADMIN_ID = 5791865678;
const CHANNEL_USERNAME = 'wizzy_dv_sd'; // يوزر القناة بدون @
const DB_FILE = './imperial_growth_db.json';

// --- إدارة قاعدة البيانات ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
const getData = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// دالة فحص الاشتراك الإجباري (التحقق من القناة)
async function isSubscribed(ctx) {
    if (ctx.from.id === ADMIN_ID) return true;
    try {
        const member = await ctx.telegram.getChatMember(`@${CHANNEL_USERNAME}`, ctx.from.id);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch (e) { return false; }
}

// سيرفر ويب للبقاء حياً
const app = express();
app.get('/', (req, res) => res.send('🔱 Wizzy Growth System is LIVE!'));
app.listen(process.env.PORT || 3000);

// --- 🛠️ الأزرار الرئيسية ---
const btnSearch = '🔍 قنص أنمي';
const btnInvite = '🔗 رابط الدعوة';
const btnProfile = '👤 ملفي الملكي';
const btnHelp = '❓ مساعدة';
const btnTop = '🔥 توب الأسبوع';
const btnChannel = '🔱 قناة السيادة';

const mainMenu = Markup.keyboard([
    [btnSearch, btnInvite],
    [btnProfile, btnTop],
    [btnHelp, btnChannel]
]).resize();

// --- 🏠 معالج البداية (نظام الدعوات) ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const inviterId = ctx.startPayload; // جلب ID الشخص اللي صنع الرابط
    let db = getData();
    let isNew = !db[userId];

    // لو اليوزر جديد ودخل عن طريق رابط شخص تاني
    if (isNew && inviterId && inviterId != userId && db[inviterId]) {
        db[inviterId].coins += 100; // مكافأة للي أرسل الرابط
        db[inviterId].invites = (db[inviterId].invites || 0) + 1;
        ctx.telegram.sendMessage(inviterId, `🔔 **بشرى ملكية!**\n\nشخص جديد انضم للإمبراطورية عن طريق رابطك. حصلت على **100 عملة**! 🪙`).catch(() => {});
    }

    if (isNew) {
        db[userId] = { 
            name: ctx.from.first_name, 
            coins: 50, 
            xp: 0, 
            invites: 0,
            rank: 'مواطن جديد ✨'
        };
        saveData(db);
    }

    try { await ctx.react('👑'); } catch (e) {}
    
    // التحقق من القناة قبل الترحيب
    const sub = await isSubscribed(ctx);
    if (!sub) {
        return ctx.replyWithMarkdown(`⚠️ **عذراً يا ملك، القلعة مغلقة!**\n\nيجب أن تشترك في قناة السيادة أولاً لتستمتع بمميزات القنص.\n\nبعد الاشتراك، اضغط /start مرة أخرى.`,
            Markup.inlineKeyboard([[Markup.button.url('انضم للقناة الآن 👑', `https://t.me/${CHANNEL_USERNAME}`)]])
        );
    }

    ctx.replyWithMarkdown(`أهلاً بك في **إمبراطورية ويزي المتطورة** 🏯✨\n\nالنظام الآن يدعم دعوة الأصدقاء؛ شارك رابطك واجمع آلاف العملات!`, mainMenu);
});

// --- 🔗 ميزة صنع رابط الدعوة الشخصي ---
bot.hears(btnInvite, async (ctx) => {
    const sub = await isSubscribed(ctx);
    if (!sub) return ctx.reply('اشترك في القناة أولاً يا ملك! 🚫');
    
    const inviteLink = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(`🔗 **رابط الدعوة الخاص بك:**\n\n\`${inviteLink}\`\n\nشارك هذا الرابط مع أصدقائك. عن كل شخص يدخل الإمبراطورية ستحصل على **100 عملة** فوراً! 🪙🔥`);
});

// --- 👤 الملف الملكي (عرض النقاط والدعوات) ---
bot.hears(btnProfile, async (ctx) => {
    const db = getData();
    const u = db[ctx.from.id] || { coins: 0, invites: 0, rank: 'غير مسجل' };
    ctx.replyWithMarkdown(`👤 **ملف السيادة لـ ${ctx.from.first_name}:**\n\n📜 الرتبة: \`${u.rank}\`\n🪙 العملات: \`${u.coins}\`\n👥 عدد الناجحين في دعوتهم: \`${u.invites}\`\n\nاستخدم رابط الدعوة لزيادة ثروتك!`);
});

// --- 🔍 محرك القنص (مؤمن بالاشتراك) ---
bot.on('text', async (ctx) => {
    const query = ctx.message.text;
    const allBtns = [btnSearch, btnInvite, btnProfile, btnHelp, btnTop, btnChannel];
    if (allBtns.includes(query)) return;

    const sub = await isSubscribed(ctx);
    if (!sub) return ctx.reply('⚠️ لا يمكنك القنص بدون الاشتراك في القناة!');

    try { await ctx.react('🔍'); } catch (e) {}
    const load = await ctx.reply('🚀 جاري قنص البيانات...');

    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const a = res.data.data[0];
        if (a) {
            const q = encodeURIComponent(a.title);
            const caption = `🏯 **الأنمي:** \`${a.title}\`\n⭐ التقييم: \`${a.score || '7.5'}\`\n\n✅ روابط المشاهدة:`;
            const buttons = Markup.inlineKeyboard([
                [Markup.button.url('🎬 WitAnime', `https://witanime.pics/?s=${q}`)],
                [Markup.button.url('📽️ AnimeLek', `https://animelek.me/search?q=${q}`)]
            ]);
            await ctx.sendPhoto(a.images.jpg.large_image_url, { caption, ...buttons });
        } else { ctx.reply('لم أجد نتائج.'); }
    } catch (e) { ctx.reply('خطأ في السيرفر.'); }
    finally { ctx.deleteMessage(load.message_id).catch(() => {}); }
});

// --- ❓ زر المساعدة و 🔱 القناة (إصلاح نهائي) ---
bot.hears(btnHelp, (ctx) => ctx.reply('❓ أرسل اسم أنمي أو شارك رابطك لجمع النقاط. الدعم: @Wizzy_Dev'));
bot.hears(btnChannel, (ctx) => ctx.reply(`🔱 قناة السيادة: https://t.me/${CHANNEL_USERNAME}`));

bot.launch();
console.log("✅ إمبراطورية ويزي بنظام الريفرال والتحقق تعمل الآن!");
