require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// -------------------------
// Команда /start
// -------------------------
bot.start((ctx) => {
  ctx.reply("Привет! Жми кнопку ниже, чтобы открыть игру 🚀", {
    reply_markup: {
      inline_keyboard: [
        [
          { 
            text: "🚀 Открыть Ракетку", 
            web_app: { url: "https://rocketcrush.vercel.app" } 
          }
        ]
      ]
    }
  });
});

// -------------------------
// Команда /buy — магазин
// -------------------------
bot.command("buy", (ctx) => {
  ctx.reply("Выбери товар 👇", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💫 Купить 100 монет (10 Stars)", callback_data: "buy_100" }
        ]
      ]
    }
  });
});

// -------------------------
// Покупка 100 монет
// -------------------------
bot.action("buy_100", (ctx) => {
  ctx.answerCbQuery();

  ctx.replyWithInvoice({
    title: "100 монет",
    description: "Покупка 100 монет в игре",
    payload: "buy_100_coins",
    provider_token: "STARS",
    currency: "XTR",
    prices: [
      { label: "100 монет", amount: 10 } // ← 10 Stars
    ]
  });
});

// -------------------------
// Успешная оплата Stars
// -------------------------
bot.on("successful_payment", (ctx) => {
  const payload = ctx.message.successful_payment.invoice_payload;

  if (payload === "buy_100_coins") {
    ctx.reply("Спасибо за покупку! 🎉 Тебе начислено 100 монет.");
  }
});

// -------------------------
// Webhook сервер для Render
// -------------------------
app.use(express.json());
app.use(bot.webhookCallback("/webhook"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Bot server running on port", PORT);
  await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
});
