# Booktopia bot (long-polling worker)

A Telegraf bot that runs as a normal process. `render.yaml` in the project root deploys it to Render as a worker.

The full bot, with order buttons, admin commands and customer notifications, is the Vercel webhook in [`../api/bot.js`](../api/bot.js). Use this worker only if you want long polling instead of a webhook.

```bash
npm install
BOT_TOKEN=... WEBAPP_URL=... npm start
```

`BOT_TOKEN` is the bot token from BotFather. `WEBAPP_URL` is the mini app address. See the [main README](../README.md#environment-variables) for the rest.
