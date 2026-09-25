import { options } from "@/lib/api";

export const dynamic = "force-static";

const skill = `# Superstonk Agent API v1

Superstonk provides live research on PreStocks tokenized pre-IPO stocks. Use it to find daily, weekly, or monthly runners, inspect DEX liquidity and flow, and generate a suggested launch kit for a Meteora Dynamic Bonding Curve token. PreStocks tokenPrice is the canonical quote; GeckoTerminal is DEX context and may diverge.

## Endpoints

- \`GET /api/v1/research\` — complete report with market status, all tokens, and runners.
  \`curl https://YOUR_APP/api/v1/research\`
- \`GET /api/v1/runners?window=1d|7d|30d\` — ranked runners (default \`7d\`).
  \`curl 'https://YOUR_APP/api/v1/runners?window=7d'\`
- \`GET /api/v1/tokens\` — all token research without candles, for lightweight polling.
  \`curl https://YOUR_APP/api/v1/tokens\`
- \`GET /api/v1/tokens/{symbol}\` — one token, including daily OHLCV candles.
  \`curl https://YOUR_APP/api/v1/tokens/SPACEX\`
- \`GET /api/v1/tokens/{symbol}/launch-kit\` — suggested metadata, quote mints, research, and links.
  \`curl https://YOUR_APP/api/v1/tokens/SPACEX/launch-kit\`
- \`GET /api/v1/openapi.json\` — machine-readable endpoint reference.

Fields include \`quotePrice\` (canonical PreStocks quote), \`markPrice\` (private-market reference), \`premiumPct\`, \`verdict\`, \`change\`, \`score\`, signal text, and DEX liquidity/volume/flow. \`dexPriceUsd\` is exposed as \`dex.priceUsd\`; \`dexDivergencePct\` quantifies DEX-versus-quote divergence. Candles are ascending Unix-second OHLCV values.

## Runner → launch kit → Meteora DBC

1. Request \`/runners?window=7d\`, then inspect a runner with \`/tokens/{symbol}\`.
2. Request \`/tokens/{symbol}/launch-kit\` for suggested metadata, links, and quote-mint choices.
3. Review the suggestions, choose USDC or the underlying PreStocks mint, use the Meteora DBC SDK (\`buildCurve → createConfig → createPool\`), simulate, and only then consider signing a transaction. This API never launches tokens or handles wallets.

## Caching and sources

Responses include \`Cache-Control: s-maxage=60, stale-while-revalidate=300\` and allow CORS. PreStocks and GeckoTerminal data are public sources. DEX data can diverge substantially from the canonical PreStocks quote. Missing history is normal while candles warm up. This is research, not financial advice.
`;

export async function GET() {
  return new Response(skill, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export function OPTIONS() {
  return options();
}
