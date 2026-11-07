import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

function ttsProxyPlugin() {
  const handler = async (req: any, res: any) => {
    try {
      const urlObj = new URL(req.url, "http://localhost:3000");
      const text = urlObj.searchParams.get("text") || urlObj.searchParams.get("q") || "Merhaba";
      const voice = urlObj.searchParams.get("voice") || "tr-TR-EmelNeural";
      const rate = urlObj.searchParams.get("rate") || "+18%";

      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text, { rate });

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Access-Control-Allow-Origin", "*");
      audioStream.pipe(res);
    } catch (e: any) {
      console.error("TTS Proxy Error:", e);
      res.statusCode = 500;
      res.end(e?.message || "TTS Error");
    }
  };

  return {
    name: "tts-proxy-plugin",
    configureServer(server: any) {
      server.middlewares.use("/api/tts", handler);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use("/api/tts", handler);
    },
  };
}

function searchProxyPlugin() {
  const handler = async (req: any, res: any) => {
    try {
      const urlObj = new URL(req.url, "http://localhost:3000");
      const query = urlObj.searchParams.get("q") || "";
      const hl = (urlObj.searchParams.get("hl") || "tr").toLowerCase();
      const gl = (urlObj.searchParams.get("gl") || (hl === "tr" ? "TR" : hl === "en" ? "US" : hl === "de" ? "DE" : "TR")).toUpperCase();
      const ceid = `${gl}:${hl}`;
      const kl = `${gl.toLowerCase()}-${hl}`;

      if (!query.trim()) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify({ results: [] }));
        return;
      }

      const results: string[] = [];

      // 1. Instant Real-Time Currency / FX Widget (matches Google Direct Answer)
      if (/(?:dolar|usd|euro|eur|sterlin|gbp|döviz|kur|altın|faiz|currency|exchange)/i.test(query)) {
        try {
          const fxResp = await fetch("https://open.er-api.com/v6/latest/USD");
          if (fxResp.ok) {
            const fxData = await fxResp.json();
            const tryRate = fxData?.rates?.TRY;
            const eurRate = fxData?.rates?.EUR;
            const gbpRate = fxData?.rates?.GBP;
            if (tryRate) {
              const eurTry = (tryRate / (eurRate || 1)).toFixed(2);
              const gbpTry = (tryRate / (gbpRate || 1)).toFixed(2);
              results.push(`💵 [CANLI PİYASA KURLARI - SERBEST PİYASA/TCMB]: 1 USD = ${tryRate.toFixed(2)} TL | 1 EUR = ${eurTry} TL | 1 GBP = ${gbpTry} TL`);
            }
          }
        } catch (fxErr) {
          console.warn("FX fetch err:", fxErr);
        }
      }

      // 2. Instant Real-Time Crypto Widget
      if (/(?:bitcoin|btc|kripto|ethereum|eth)/i.test(query)) {
        try {
          const btcResp = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT");
          if (btcResp.ok) {
            const btcData = await btcResp.json();
            results.push(`🪙 [CANLI KRİPTO BORSASI]: Bitcoin (BTC) = $${parseFloat(btcData.price).toLocaleString("en-US", { maximumFractionDigits: 2 })} USD`);
          }
        } catch (cErr) {
          console.warn("Crypto fetch err:", cErr);
        }
      }

      // 3. Google News RSS for live / current events (Dynamic Country & Language)
      try {
        const gUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
        const gResp = await fetch(gUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (gResp.ok) {
          const xml = await gResp.text();
          const matches = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<source[^>]*>(.*?)<\/source>[\s\S]*?<pubDate>(.*?)<\/pubDate>/g)].slice(0, 5);
          for (const m of matches) {
            const cleanTitle = m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim();
            const source = m[2] || "Google Haberler";
            results.push(`📰 [${source} (${gl})] ${cleanTitle} (Tarih: ${m[3]})`);
          }
        }
      } catch (err) {
        console.warn("Google News search proxy err:", err);
      }

      // 4. DuckDuckGo Lite for detailed organic web snippets (Scores, Names, Specific Answers)
      try {
        const ddgResp = await fetch("https://lite.duckduckgo.com/lite/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
          },
          body: `q=${encodeURIComponent(query)}&kl=${kl}`,
        });
        if (ddgResp.ok) {
          const html = await ddgResp.text();
          const snippets = [...html.matchAll(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi)].slice(0, 3);
          for (const s of snippets) {
            const cleanText = s[1].replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim();
            if (cleanText) results.push(`🌐 [Web Arama Detayı]: ${cleanText}`);
          }
        }
      } catch (err) {
        console.warn("DuckDuckGo search proxy err:", err);
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify({ results }));
    } catch (e: any) {
      console.error("Search Proxy Error:", e);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e?.message || "Search Error", results: [] }));
    }
  };

  return {
    name: "search-proxy-plugin",
    configureServer(server: any) {
      server.middlewares.use("/api/search", handler);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use("/api/search", handler);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  preview: {
    host: "::",
    port: 3000,
  },
  plugins: [
    ttsProxyPlugin(),
    searchProxyPlugin(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
