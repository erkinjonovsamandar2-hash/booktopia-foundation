require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("Missing BOT_TOKEN in .env file!");
  process.exit(1);
}

const bot = new Telegraf(token);

// The deployed miniapp URL
// Replace with the actual deployed Vercel URL
const WEB_APP_URL = process.env.WEBAPP_URL || 'https://booktopia-miniapp.vercel.app';

// When user sends /start
bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'kitobxon';
  
  // A clean, premium welcome message
  const welcomeText = `Assalomu alaykum, <b>${firstName}</b>! 👋\n\n<b>Booktopia</b> ga xush kelibsiz. Bizning do'konda siz eng sara va ommabop kitoblarni topishingiz mumkin.\n\n👇 Kitoblarni ko'rish va buyurtma berish uchun quyidagi tugmani bosing:`;

  return ctx.replyWithHTML(welcomeText, Markup.inlineKeyboard([
    Markup.button.webApp("📖 Kitoblarni ko'rish", WEB_APP_URL)
  ]));
});

// Fallback for any text messages
bot.on('text', (ctx) => {
  return ctx.reply("Iltimos, do'konga kirish uchun pastdagi tugmadan foydalaning.", Markup.inlineKeyboard([
    Markup.button.webApp("📖 Kitoblarni ko'rish", WEB_APP_URL)
  ]));
});

bot.launch().then(() => {
  console.log("Booktopia Bot successfully started!");
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
