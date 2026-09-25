import { json, options } from "@/lib/api";

export const dynamic = "force-static";

const document = {
  openapi: "3.1.0",
  info: {
    title: "Superstonk Agent API",
    version: "1.0.0",
    description:
      "Live PreStocks token research and launch-ready Meteora DBC suggestions.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/research": {
      get: {
        summary: "Full research report",
        responses: { "200": { description: "ResearchReport" } },
      },
    },
    "/runners": {
      get: {
        summary: "Ranked runners",
        parameters: [
          {
            name: "window",
            in: "query",
            schema: { enum: ["1d", "7d", "30d"], default: "7d" },
          },
        ],
        responses: {
          "200": { description: "Runner list" },
          "400": { description: "Invalid window" },
        },
      },
    },
    "/tokens": {
      get: {
        summary: "All token research without candles",
        responses: { "200": { description: "TokenResearch list" } },
      },
    },
    "/tokens/{symbol}": {
      get: {
        summary: "One token with OHLCV candles",
        parameters: [
          {
            name: "symbol",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "TokenResearch" },
          "404": { description: "Unknown symbol" },
        },
      },
    },
    "/tokens/{symbol}/launch-kit": {
      get: {
        summary: "Suggested Meteora DBC launch kit",
        parameters: [
          {
            name: "symbol",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "LaunchKit" },
          "404": { description: "Unknown symbol" },
        },
      },
    },
    "/openapi.json": {
      get: {
        summary: "This OpenAPI document",
        responses: { "200": { description: "OpenAPI 3.1 document" } },
      },
    },
    "/skill.md": {
      get: {
        summary: "Agent usage guide",
        responses: { "200": { description: "Markdown guide" } },
      },
    },
  },
  components: {
    schemas: {
      Candle: {
        type: "object",
        required: ["t", "o", "h", "l", "c", "v"],
        properties: {
          t: { type: "integer" },
          o: { type: "number" },
          h: { type: "number" },
          l: { type: "number" },
          c: { type: "number" },
          v: { type: "number" },
        },
      },
      Runner: {
        type: "object",
        required: ["symbol", "name", "changePct", "score"],
        properties: {
          symbol: { type: "string" },
          name: { type: "string" },
          image: { type: "string" },
          changePct: { type: "number" },
          volume24hUsd: { type: ["number", "null"] },
          premiumPct: { type: "number" },
          verdict: { type: "string", enum: ["discount", "fair", "overpriced"] },
          score: { type: "integer" },
        },
      },
      Signal: {
        type: "object",
        required: ["kind", "tone", "text"],
        properties: {
          kind: { type: "string" },
          tone: { type: "string" },
          text: { type: "string" },
        },
      },
      TokenResearch: {
        type: "object",
        required: [
          "symbol",
          "name",
          "mint",
          "quotePrice",
          "markPrice",
          "premiumPct",
          "verdict",
          "change",
          "score",
          "signals",
          "summary",
        ],
        properties: {
          symbol: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          image: { type: "string" },
          externalUrl: { type: "string" },
          mint: { type: "string" },
          quotePrice: { type: "number" },
          markPrice: { type: "number" },
          premiumPct: { type: "number" },
          verdict: { type: "string" },
          supply: { type: "number" },
          marketSize: { type: "number" },
          dex: { type: ["object", "null"] },
          change: { type: "object" },
          volatility7d: { type: ["number", "null"] },
          rangePos30d: { type: ["number", "null"] },
          dexDivergencePct: { type: ["number", "null"] },
          score: { type: "integer" },
          signals: {
            type: "array",
            items: { $ref: "#/components/schemas/Signal" },
          },
          summary: { type: "string" },
        },
      },
    },
  },
} as const;

export async function GET() {
  return json(document);
}

export function OPTIONS() {
  return options();
}
