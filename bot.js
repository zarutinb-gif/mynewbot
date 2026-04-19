require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// -------------------------
// ЛОГ ВСЕХ АПДЕЙТОВ (очень важно для дебага)
// -------------------------
bot.use((ctx, next) => {
  console.log("UPDATE:", JSON.stringify(ctx.update, null, 2));
  return next();
});

// -------------------------
// Команда /start
// -------------------------
bot.start((ctx) => {
  return ctx.reply("Привет! Жми кнопку ниже, чтобы открыть игру 🚀", {
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
  return ctx.reply("Выбери товар 👇", {
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
bot.action("buy_100", async (ctx) => {
  try {
    await ctx.answerCbQuery();

    return ctx.replyWithInvoice({
      title: "100 монет",
      description: "Покупка 100 монет в игре",
      payload: "coins_100", // упростил payload
      provider_token: "STARS",
      currency: "XTR",
      prices: [
        { label: "100 монет", amount: 10 }
      ],
      start_parameter: "coins" // важно для стабильности
    });

  } catch (e) {
    console.error("Invoice error:", e);
  }
});

// -------------------------
// 🔴 ОБЯЗАТЕЛЬНО — подтверждение оплаты
// -------------------------
bot.on("pre_checkout_query", async (ctx) => {
  try {
    console.log("PRE CHECKOUT QUERY:", ctx.update.pre_checkout_query);

    await ctx.answerPreCheckoutQuery(true);

  } catch (e) {
    console.error("pre_checkout_query error:", e);
  }
});

// -------------------------
// Успешная оплата
// -------------------------
bot.on("message", async (ctx) => {
  if (ctx.message.successful_payment) {
    const payment = ctx.message.successful_payment;

    console.log("SUCCESSFUL PAYMENT:", payment);

    if (payment.invoice_payload === "coins_100") {
      await ctx.reply("Спасибо за покупку! 🎉 Тебе начислено 100 монет.");
    }
  }
});

// -------------------------
// Webhook сервер для Render
// -------------------------
app.use(express.json());

// ⚠️ важно: быстрый ответ Telegram
app.use("/webhook", (req, res, next) => {
  res.status(200);
  next();
});

app.use(bot.webhookCallback("/webhook"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Bot server running on port", PORT);

  try {
    await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
    console.log("Webhook set!");
  } catch (e) {
    console.error("Webhook error:", e);
  }
});
