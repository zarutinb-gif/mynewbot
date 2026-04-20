require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");
const crypto = require("crypto");

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

app.use(express.json());

// =====================================================
// 🔐 ВАЛИДАЦИЯ TELEGRAM initData (ОЧЕНЬ ВАЖНО)
// =====================================================
function verifyTelegramInitData(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    urlParams.delete("hash");

    const dataCheckString = Array.from(urlParams.entries())
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto
      .createHash("sha256")
      .update(process.env.BOT_TOKEN)
      .digest();

    const hmac = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return hmac === hash;
  } catch (e) {
    console.error("InitData validation error:", e);
    return false;
  }
}

// =====================================================
// 🧠 ВСПОМОГАТЕЛЬНОЕ
// =====================================================
function getUserFromInitData(initData) {
  const data = Object.fromEntries(new URLSearchParams(initData));
  return JSON.parse(data.user);
}

// =====================================================
// 📡 API ДЛЯ MINI APP
// =====================================================

// 👤 Пользователь
app.post("/api/user", (req, res) => {
  const { initData } = req.body;

  if (!verifyTelegramInitData(initData)) {
    return res.status(403).send("Invalid initData");
  }

  const user = getUserFromInitData(initData);

  res.json({
    id: user.id,
    username: user.username,
  });
});

// 💰 Баланс (заглушка)
app.post("/api/balance", (req, res) => {
  const { initData } = req.body;

  if (!verifyTelegramInitData(initData)) {
    return res.status(403).send("Invalid initData");
  }

  const user = getUserFromInitData(initData);

  // TODO: подключить БД
  res.json({
    balance: 100,
  });
});

// 💳 Оплата Stars
app.post("/api/pay", async (req, res) => {
  try {
    const { initData } = req.body;

    if (!verifyTelegramInitData(initData)) {
      return res.status(403).send("Invalid initData");
    }

    const user = getUserFromInitData(initData);
    const chatId = user.id;

    await bot.telegram.sendInvoice(chatId, {
      title: "100 монет",
      description: "Покупка 100 монет",
      payload: "coins_100",
      provider_token: "", // ⭐ ОБЯЗАТЕЛЬНО пусто для Stars
      currency: "XTR",
      prices: [{ label: "100 монет", amount: 10 }],
      start_parameter: "coins",
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("PAY ERROR:", e);
    res.status(500).send("Payment error");
  }
});

// =====================================================
// 🤖 TELEGRAM BOT
// =====================================================

// Лог апдейтов
bot.use((ctx, next) => {
  console.log("UPDATE:", JSON.stringify(ctx.update, null, 2));
  return next();
});

// /start
bot.start((ctx) => {
  return ctx.reply("Привет! Жми кнопку ниже, чтобы открыть игру 🚀", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Открыть Ракетку",
            web_app: { url: "https://rocketcrush.vercel.app" },
          },
        ],
      ],
    },
  });
});

// /buy (оставим как fallback)
bot.command("buy", (ctx) => {
  return ctx.reply("Выбери товар 👇", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💫 Купить 100 монет", callback_data: "buy_100" }],
      ],
    },
  });
});

// Покупка через кнопку (fallback)
bot.action("buy_100", async (ctx) => {
  try {
    await ctx.answerCbQuery();

    return ctx.replyWithInvoice({
      title: "100 монет",
      description: "Покупка 100 монет",
      payload: "coins_100",
      provider_token: "",
      currency: "XTR",
      prices: [{ label: "100 монет", amount: 10 }],
      start_parameter: "coins",
    });
  } catch (e) {
    console.error("Invoice error:", e);
  }
});

// Подтверждение оплаты
bot.on("pre_checkout_query", async (ctx) => {
  try {
    await ctx.answerPreCheckoutQuery(true);
  } catch (e) {
    console.error("pre_checkout error:", e);
  }
});

// Успешная оплата
bot.on("message", async (ctx) => {
  if (ctx.message.successful_payment) {
    const payment = ctx.message.successful_payment;

    console.log("SUCCESS PAYMENT:", payment);

    if (payment.invoice_payload === "coins_100") {
      // TODO: начислить в БД
      await ctx.reply("🎉 Оплата прошла! 100 монет зачислены.");
    }
  }
});

// =====================================================
// 🌐 WEBHOOK (Render)
// =====================================================

app.use("/webhook", (req, res, next) => {
  res.status(200);
  next();
});

app.use(bot.webhookCallback("/webhook"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Server running on port", PORT);

  try {
    await bot.telegram.setWebhook(
      `${process.env.WEBHOOK_URL}/webhook`
    );
    console.log("Webhook set!");
  } catch (e) {
    console.error("Webhook error:", e);
  }
});
