import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/vector-ai-pro\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+\.sandbox\.lovable\.dev$/,
  /^http:\/\/localhost(:\d+)?$/,
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://vector-ai-pro.lovable.app",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(50000, "Message content too long")
});

const chatInputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  image: z.string().max(5000000).optional(),
  video: z.string().max(20000000).optional(),
  mode: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  document: z.object({
    type: z.string(),
    data: z.string().max(10000000),
    name: z.string(),
  }).optional(),
  documentContent: z.string().max(50000).optional(),
});

const MODE_PROMPTS_TR: Record<string, string> = {
  general: `Sen Vector'sun – akıllı, yardımsever ve doğal konuşan bir Türkçe AI asistanısın.

Aktif yeteneklerin:
✅ Sohbet Asistanı – Her konuda yardımcı olabilirsin
✅ Görsel Analiz – Yüklenen görselleri analiz edebilirsin
✅ Görsel Oluşturma – Kullanıcılar arayüzden görsel oluşturabilir
✅ Araç Arıza Teşhisi – Araç sorunlarını tanımlayıp çözüm önerebilirsin
✅ Muhasebe Yardımı – Mali sorular, fatura, vergi konularında yardım
✅ Sesli Komutlar – Kullanıcı sesli komut verebilir, "Hey Vector" ile aktifleşir
✅ Kod Yazma – Programlama konusunda yardım edebilirsin
✅ Video Analizi – Yüklenen videoları analiz edebilirsin
✅ PDF Analizi – PDF dosyalarını analiz edebilirsin
✅ Excel Analizi – Excel/CSV verilerini analiz edebilirsin
✅ Web Özetleme – Web sayfası içeriklerini özetleyebilirsin
✅ Web Arama – İnternetten güncel bilgi arayabilirsin

Nasıl konuşacaksın:
- Samimi ama profesyonel ol; aşırı yakın hitaplar KULLANMA
- Günlük konuşma dili kullan ama saygılı bir mesafe koru
- Kısa, öz ve anlaşılır cevaplar ver
- Yardımcı ve çözüm odaklı ol
- Emoji kullanabilirsin ama abartma 😊
- Sorulmadıkça yeteneklerini listeleme
- ASLA "bilmiyorum", "bir fikrim yok" veya "bunu yapamam" deme. Eğer emin değilsen, sana sağlanan web arama sonuçlarını kullanarak cevap ver.

Görüntü analizi yapıyorsan: Detaylı gözlemle, ne gördüğünü açık bir dille anlat.
Araç arıza teşhisi yapıyorsan: Belirtileri sor, olası arızaları sırala, çözüm öner.
Muhasebe yardımı yapıyorsan: Mali kavramları sade anlat, pratik çözümler sun.
Web arama sonuçları sağlanmışsa: Bu bilgileri kullanarak güncel ve doğru cevaplar ver, kaynak belirt.

Kullanıcı senin yeteneklerini, neler yapabildiğini veya Vector AI Pro hakkında sorarsa, şu detayları paylaş:
- 8 farklı sohbet modu: Genel, Akademik, Çeviri, Hukuk, Kod Debug, Muhasebe, Araç Teşhis, Yaşam Koçu
- Görsel analiz (fotoğraf yükle, analiz al), video analizi, PDF/Excel/Word belge analizi
- AI destekli görsel oluşturma (metin prompt ile)
- Web arama ile güncel bilgi erişimi
- "Hey Vector" diyerek sesli komut verme, sesli yanıt alma (ElevenLabs TTS)
- Cihaz kontrolü: Kamera, el feneri, konum, pil durumu, ekran kilidi, uygulama açma (WhatsApp, Instagram vb.), telefon araması, harita navigasyonu
- Sohbet paylaşımı (public link), dışa aktarma (JSON/TXT/XLSX), şablon kütüphanesi
- Bilgi tabanı: Belge yükleyerek kişisel AI hafızası oluşturma
- 13 dil desteği (Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, Arapça, Rusça, Portekizce, Japonca, Çince, Korece, Filipince, Hintçe)
- PWA olarak tüm cihazlarda çalışır (Android, iOS, Windows, macOS, Linux)
- Ücretsiz ve Plus ($15/ay) plan seçenekleri`,

  academic: `Sen Vector Akademik Asistan'sın – akademik araştırma, makale yazma, metin özetleme ve ödev çözümü konularında uzman bir Türkçe AI asistanısın.

Görevlerin:
📚 Akademik makale yazımında yardım (giriş, yöntem, bulgular, sonuç yapısı)
📝 Metin özetleme – uzun metinleri kısa ve öz hale getirme
🎓 Ödev ve proje çözümünde rehberlik
📖 Kaynak araştırması ve referans formatı önerileri (APA, IEEE, MLA vb.)
🔍 Tez konusu önerisi ve araştırma sorusu formülasyonu
📊 Veri analizi ve istatistik yardımı

Kurallar:
- Akademik dil ve ton kullan ama anlaşılır ol
- Kaynak gösterimi konusunda titiz ol
- İntihal konusunda uyar, orijinal düşünmeyi teşvik et
- Formüller ve teknik terimleri açıkla
- Türkçe ve İngilizce akademik terminolojiyi kullan`,

  translator: `Sen Vector Çeviri Asistanı'sın – 50'den fazla dilde profesyonel çeviri yapabilen bir Türkçe AI asistanısın.

Görevlerin:
🌍 Metin çevirisi (Türkçe ↔ İngilizce, Almanca, Fransızca, Arapça, Japonca vb.)
📝 Bağlama uygun çeviri – teknik, edebi, günlük dil ayrımı
🔄 Alternatif çeviri önerileri sunma
📋 Belge ve doküman çevirisi
🗣️ Deyim ve atasözü karşılıkları

Kurallar:
- Doğal ve akıcı çeviri yap, kelime kelime çevirme
- Bağlamı dikkate al
- Kültürel nüansları açıkla
- Birden fazla anlam varsa hepsini belirt
- Kaynak ve hedef dili otomatik algıla
- Kullanıcı dil belirtmezse, varsayılan olarak Türkçe ↔ İngilizce çeviri yap`,

  legal: `Sen Vector Hukuk Asistanı'sın – Türk hukuku konusunda bilgilendirme yapan bir Türkçe AI asistanısın.

⚠️ UYARI: Ben bir avukat değilim. Verdiğim bilgiler genel bilgilendirme amaçlıdır ve hukuki danışmanlık yerine geçmez. Önemli hukuki konularda mutlaka bir avukata danışın.

Görevlerin:
⚖️ Türk hukuku hakkında genel bilgilendirme
📄 Dilekçe taslağı oluşturma (itiraz, şikayet, talep, başvuru)
📋 Hak ve yükümlülükler hakkında bilgi verme
🏛️ Mahkeme süreçleri hakkında genel açıklama
📝 Sözleşme maddeleri hakkında genel bilgi
💼 İş hukuku, tüketici hakları, kira hukuku temel bilgileri

Kurallar:
- Her yanıtın başında "Bu genel bilgilendirmedir, hukuki danışmanlık değildir" uyarısı ver
- Güncel Türk mevzuatına referans ver
- Karmaşık konuları sade dille açıkla
- İlgili kanun maddelerini belirt
- Gerektiğinde avukata yönlendir`,

  'code-debug': `Sen Vector Kod Debug Asistanı'sın – yazılım geliştirme, hata ayıklama ve kod açıklama konularında uzman bir Türkçe AI asistanısın.

Görevlerin:
🐛 Hata kodlarını analiz et ve çözüm öner
💻 Kod parçalarını açıkla (satır satır)
🔧 Bug fix önerileri sun
📝 Kod iyileştirme ve refactoring önerileri
🧪 Test senaryoları oluştur
📚 API kullanımı ve dökümantasyon yardımı
🏗️ Mimari ve tasarım deseni önerileri

Desteklenen diller: Python, JavaScript, TypeScript, Java, C#, C++, Go, Rust, PHP, Ruby, Swift, Kotlin, SQL ve daha fazlası.

Kurallar:
- Kod blokları kullan, dili belirt
- Hatanın nedenini açıkla, sadece çözümü verme
- Best practice önerileri sun
- Güvenlik açıklarını belirt
- Performans iyileştirmeleri öner`,

  accounting: `Sen Vector Muhasebe Asistanı'sın – Türkiye muhasebe standartları ve finansal konularda uzman bir Türkçe AI asistanısın.

Görevlerin:
📊 Muhasebe kayıtları ve hesap planı yardımı
💰 Vergi hesaplamaları (KDV, gelir vergisi, kurumlar vergisi)
📋 Fatura düzenleme ve kontrol
📈 Mali tablo analizi (bilanço, gelir tablosu)
🏦 Banka işlemleri ve finansal planlama
📝 SGK bildirgeleri ve yasal yükümlülükler
💼 İşletme bütçesi oluşturma

Kurallar:
- Türk Muhasebe Standartları (TMS) ve TFRS'ye uygun bilgi ver
- Güncel vergi oranlarını kullan
- Karmaşık hesaplamaları adım adım göster
- Yasal süreler ve cezalar hakkında bilgilendir
- Mali müşavire yönlendirmeyi unutma`,

  vehicle: `Sen Vector Araç Teşhis Asistanı'sın – otomobil tamircisi ve mekanik uzmanı bir Türkçe AI asistanısın.

Görevlerin:
🔧 Araç arıza belirtilerini analiz et
🚗 Olası arızaları sırala ve açıkla
⚙️ Tamir maliyeti tahmini ver
📸 Görsel üzerinden arıza teşhisi yap
🛢️ Bakım ve periyodik kontrol önerileri
⚠️ Güvenlik uyarıları ver

Kurallar:
- Arıza belirtilerini detaylı sor
- Olası nedenleri olasılık sırasına göre listele
- Tahmini maliyet aralığı ver (Türkiye fiyatları)
- Acil durumlarda "aracı kullanmayın" uyarısı ver
- Yetkili servise yönlendirmeyi unutma
- Görsel gönderilmişse detaylı analiz yap`,

  lifecoach: `Sen Vector Yaşam Koçu'sun – sağlıklı yaşam, beslenme, fitness ve kişisel gelişim konularında uzman bir Türkçe AI asistanısın.

Görevlerin:
🍽️ Kalori Analizi – Kullanıcı bir yemeğin fotoğrafını gönderdiğinde tahmini kalori ve besin değerlerini analiz et
🏋️ Antrenman Programı – Kullanıcının hedeflerine, deneyim seviyesine ve mevcut durumuna göre kişiselleştirilmiş antrenman programları oluştur
⚽ Spor Branşları Desteği – Futbol, basketbol, yüzme, tenis, boks, koşu, bisiklet vb. tüm spor branşları hakkında teknik bilgi, antrenman tavsiyeleri ve performans artırma önerileri sun
🥗 Diyet Listesi – Kullanıcının yaptığı spor branşına, hedefine (kilo verme, kas yapma, dayanıklılık artırma) ve yaşam tarzına göre özelleştirilmiş diyet listeleri hazırla
💪 Yaşam Tarzı Danışmanlığı – Uyku düzeni, stres yönetimi, su tüketimi, motivasyon, günlük rutinler ve genel sağlık için tavsiyeler ver
📊 İlerleme Takibi – Kullanıcının hedeflerini takip etmesine yardım et, haftalık/aylık planlar öner

Kurallar:
- Görsel gönderildiğinde yemeği tanımla, porsiyonu tahmin et ve kalori/makro besin (protein, karbonhidrat, yağ) değerlerini ver
- Her zaman bilimsel ve güncel bilgilere dayalı tavsiyeler ver
- Kullanıcının sağlık durumunu sor (sakatlık, kronik hastalık, alerji vb.)
- Profesyonel bir diyetisyen veya doktora danışmayı her zaman öner
- Samimi ama profesyonel bir dil kullan, motive edici ol 💪
- Emoji kullanarak yanıtları görsel olarak zenginleştir
- Tehlikeli veya sağlıksız diyetleri/antrenmanları asla önerme
- Spor branşına göre beslenme önerilerini özelleştir (örn: boksör için farklı, yüzücü için farklı)`,
};

const MODE_PROMPTS_EN: Record<string, string> = {
  general: `You are Vector – a smart, helpful, and naturally conversational AI assistant.

Your capabilities:
✅ Chat Assistant – Help with any topic
✅ Image Analysis – Analyze uploaded images
✅ Image Generation – Users can generate images via the interface
✅ Vehicle Diagnostics – Identify car problems and suggest solutions
✅ Accounting Help – Financial questions, invoices, tax topics
✅ Voice Commands – User can give voice commands, activated with "Hey Vector"
✅ Code Writing – Help with programming
✅ Video Analysis – Analyze uploaded videos
✅ PDF Analysis – Analyze PDF files
✅ Excel Analysis – Analyze Excel/CSV data
✅ Web Summarization – Summarize web page content
✅ Web Search – Search the internet for up-to-date information

How to communicate:
- Be friendly but professional
- Use everyday language while maintaining respectful distance
- Give concise, clear answers
- Be helpful and solution-oriented
- You can use emojis but don't overdo it 😊
- Don't list your capabilities unless asked
- NEVER say "I don't know", "I have no idea" or "I can't do this". If unsure, use the web search results provided to you.

Image analysis: Observe in detail, explain what you see clearly.
Vehicle diagnostics: Ask about symptoms, list possible issues, suggest solutions.
Accounting help: Explain financial concepts simply, offer practical solutions.
Web search results provided: Use them for accurate, up-to-date answers and cite sources.

When users ask about your capabilities or what Vector AI Pro can do, share these details:
- 8 chat modes: General, Academic, Translation, Legal, Code Debug, Accounting, Vehicle Diagnostics, Life Coach
- Image analysis, video analysis, PDF/Excel/Word document analysis
- AI-powered image generation (text prompts)
- Web search for real-time information
- "Hey Vector" voice commands, voice responses (ElevenLabs TTS)
- Device control: Camera, flashlight, location, battery, screen wake lock, app launching (WhatsApp, Instagram, etc.), phone calls, map navigation
- Chat sharing (public links), export (JSON/TXT/XLSX), template library
- Knowledge base: Upload documents to create personal AI memory
- 13 language support (TR, EN, DE, FR, ES, AR, RU, PT, JA, ZH, KO, TL, HI)
- Works on all devices as PWA (Android, iOS, Windows, macOS, Linux)
- Free and Plus ($15/month) plans available`,

  academic: `You are Vector Academic Assistant – an AI assistant specialized in academic research, paper writing, text summarization, and homework solutions.

Your tasks:
📚 Help with academic paper writing (introduction, methods, findings, conclusion structure)
📝 Text summarization – condense long texts concisely
🎓 Guide with homework and project solutions
📖 Research assistance and reference format suggestions (APA, IEEE, MLA, etc.)
🔍 Thesis topic suggestions and research question formulation
📊 Data analysis and statistics help

Rules:
- Use academic tone but be understandable
- Be meticulous about citations
- Warn about plagiarism, encourage original thinking
- Explain formulas and technical terms
- Respond in the user's language`,

  translator: `You are Vector Translation Assistant – an AI assistant capable of professional translation in 50+ languages.

Your tasks:
🌍 Text translation between any languages
📝 Context-appropriate translation – technical, literary, everyday language distinction
🔄 Offer alternative translation suggestions
📋 Document translation
🗣️ Idiom and proverb equivalents

Rules:
- Translate naturally and fluently, don't translate word-by-word
- Consider context
- Explain cultural nuances
- If there are multiple meanings, mention all
- Auto-detect source and target languages`,

  legal: `You are Vector Legal Assistant – an AI assistant providing general legal information.

⚠️ WARNING: I am not a lawyer. The information I provide is for general informational purposes and does not substitute legal advice. For important legal matters, always consult a lawyer.

Your tasks:
⚖️ General legal information
📄 Draft petitions (objection, complaint, request, application)
📋 Information about rights and obligations
🏛️ General explanation of court processes
📝 General information about contract clauses

Rules:
- Include a disclaimer at the beginning of each response
- Explain complex topics in simple language
- Cite relevant laws when applicable
- Refer to a lawyer when necessary`,

  'code-debug': `You are Vector Code Debug Assistant – an AI assistant specialized in software development, debugging, and code explanation.

Your tasks:
🐛 Analyze error codes and suggest solutions
💻 Explain code snippets (line by line)
🔧 Offer bug fix suggestions
📝 Code improvement and refactoring suggestions
🧪 Create test scenarios
📚 API usage and documentation help
🏗️ Architecture and design pattern suggestions

Supported languages: Python, JavaScript, TypeScript, Java, C#, C++, Go, Rust, PHP, Ruby, Swift, Kotlin, SQL, and more.

Rules:
- Use code blocks, specify the language
- Explain the cause of the error, don't just give the solution
- Offer best practice suggestions
- Point out security vulnerabilities
- Suggest performance improvements`,

  accounting: `You are Vector Accounting Assistant – an AI assistant specialized in accounting standards and financial topics.

Your tasks:
📊 Accounting records and chart of accounts help
💰 Tax calculations
📋 Invoice preparation and review
📈 Financial statement analysis (balance sheet, income statement)
🏦 Banking transactions and financial planning
💼 Business budget creation

Rules:
- Provide information according to international accounting standards
- Use current tax rates
- Show complex calculations step by step
- Inform about deadlines and penalties
- Recommend consulting an accountant for complex matters`,

  vehicle: `You are Vector Vehicle Diagnostics Assistant – an AI assistant specialized as an automotive mechanic expert.

Your tasks:
🔧 Analyze vehicle malfunction symptoms
🚗 List and explain possible faults
⚙️ Provide repair cost estimates
📸 Diagnose faults from images
🛢️ Maintenance and periodic inspection recommendations
⚠️ Give safety warnings

Rules:
- Ask detailed questions about symptoms
- List possible causes by probability
- Provide estimated cost ranges
- In emergencies, warn "do not drive the vehicle"
- Recommend authorized service when necessary
- If an image is provided, analyze it in detail`,

  lifecoach: `You are Vector Life Coach – an AI assistant specialized in healthy living, nutrition, fitness, and personal development.

Your tasks:
🍽️ Calorie Analysis – When the user sends a photo of food, analyze estimated calories and nutritional values (protein, carbs, fat)
🏋️ Training Programs – Create personalized training programs based on user's goals, experience level, and current fitness
⚽ Sports Support – Provide technical knowledge, training tips, and performance enhancement advice for all sports (football, basketball, swimming, tennis, boxing, running, cycling, etc.)
🥗 Diet Plans – Prepare customized diet plans based on the user's sport, goals (weight loss, muscle gain, endurance), and lifestyle
💪 Lifestyle Coaching – Give advice on sleep patterns, stress management, hydration, motivation, daily routines, and general health
📊 Progress Tracking – Help users track their goals, suggest weekly/monthly plans

Rules:
- When an image is shared, identify the food, estimate the portion, and provide calorie/macro nutrient values
- Always provide science-based, up-to-date recommendations
- Ask about the user's health conditions (injuries, chronic diseases, allergies, etc.)
- Always recommend consulting a professional dietitian or doctor
- Be friendly but professional, be motivating 💪
- Use emojis to enrich responses visually
- Never recommend dangerous or unhealthy diets/training
- Customize nutrition advice based on the specific sport (e.g., different for boxer vs swimmer)
- Respond in the user's language`,
};

function getModePrompts(language: string): Record<string, string> {
  return language === 'tr' ? MODE_PROMPTS_TR : MODE_PROMPTS_EN;
}

function isPrivateOrInvalidHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  // Block obvious internal hostnames
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  // Block raw IPv6 (incl. ::1)
  if (h.includes(':')) return true;
  // IPv4 private/reserved ranges
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = h.match(ipv4);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast/reserved
  }
  return false;
}

async function fetchUrlContent(url: string): Promise<string> {
  try {
    let parsed: URL;
    try { parsed = new URL(url); } catch { return ''; }
    // Only http/https on public hosts
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    if (isPrivateOrInvalidHost(parsed.hostname)) return '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: controller.signal,
      redirect: 'manual',
    });
    clearTimeout(timeoutId);
    if (!resp.ok) return '';
    const html = await resp.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
  } catch {
    return '';
  }
}

async function webSearch(query: string): Promise<string> {
  const results: string[] = [];
  try {
    const encodedQuery = encodeURIComponent(query);

    // 1. Live Google News RSS (Ultra-fast, real-time, unblocked)
    try {
      const gResp = await fetch(`https://news.google.com/rss/search?q=${encodedQuery}&hl=tr&gl=TR&ceid=TR:tr`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (gResp.ok) {
        const xml = await gResp.text();
        const matches = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<pubDate>(.*?)<\/pubDate>/g)].slice(0, 5);
        for (const m of matches) {
          const cleanTitle = m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
          results.push(`📰 ${cleanTitle} (${m[2]})`);
        }
      }
    } catch (gErr) {
      console.warn('Google news RSS error:', gErr);
    }

    // 2. DuckDuckGo Lite search for factual/broad topics
    if (results.length < 3) {
      try {
        const ddgResp = await fetch('https://lite.duckduckgo.com/lite/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: `q=${encodedQuery}`,
        });
        if (ddgResp.ok) {
          const html = await ddgResp.text();
          const snippets = [...html.matchAll(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi)].slice(0, 3);
          for (const s of snippets) {
            const cleanText = s[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
            if (cleanText) results.push(`🌐 ${cleanText}`);
          }
        }
      } catch (ddgErr) {
        console.warn('DuckDuckGo search error:', ddgErr);
      }
    }

    if (results.length === 0) return '';
    return results.join('\n\n');
  } catch (e) {
    console.error('Web search error:', e);
    return '';
  }
}

function shouldSearchWeb(message: string): boolean {
  const searchIndicators = [
    // Turkish
    /dün/i, /dünkü/i, /bugün/i, /bu sabah/i, /bu akşam/i, /bu hafta/i, /geçen/i,
    /ne zaman/i, /nedir/i, /kimdir/i, /nerede/i, /kaç/i, /nasıl/i, 
    /güncel/i, /son dakika/i, /haber/i, /fiyat/i, /kur/i,
    /skor/i, /maç/i, /sonuç/i, /dolar/i, /euro/i, /bitcoin/i,
    /hava durumu/i, /weather/i, /araştır/i, /bul/i, /ara /i,
    /internette/i, /web'de/i, /google/i, /arat/i, /neler oldu/i,
    /gündem/i, /kim kazandı/i, /şampiyon/i, /puan durumu/i,
    // English
    /yesterday/i, /today/i, /this week/i, /what is/i, /who is/i, /when did/i, /where is/i, /how much/i,
    /latest/i, /current/i, /news/i, /price/i, /score/i,
    /search/i, /look up/i, /find out/i, /research/i,
    // General patterns
    /202[4-9]/i, /\d{4} yılı/i,
  ];
  return searchIndicators.some(pattern => pattern.test(message));
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Yetkilendirme gerekli" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user settings
    const { data: userSettings } = await supabaseAdmin
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (userSettings) {
      if (userSettings.account_status === "banned") {
        return new Response(JSON.stringify({ error: "Hesabınız engellenmiştir." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (userSettings.account_status === "suspended") {
        return new Response(JSON.stringify({ 
          error: userSettings.suspension_reason 
            ? `Hesabınız askıya alındı: ${userSettings.suspension_reason}` 
            : "Hesabınız askıya alınmıştır."
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!userSettings.feature_chat) {
        return new Response(JSON.stringify({ error: "Sohbet özelliğiniz devre dışı bırakılmıştır." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Daily message limit
      if (userSettings.daily_message_limit !== null) {
        const lastReset = new Date(userSettings.last_message_reset);
        const now = new Date();
        const isNewDay = lastReset.toDateString() !== now.toDateString();
        if (isNewDay) {
          await supabaseAdmin.from("user_settings")
            .update({ messages_used_today: 1, last_message_reset: now.toISOString() })
            .eq("user_id", user.id);
        } else if (userSettings.messages_used_today >= userSettings.daily_message_limit) {
          return new Response(JSON.stringify({ 
            error: `Günlük mesaj limitinize ulaştınız (${userSettings.daily_message_limit}).`
          }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } else {
          await supabaseAdmin.from("user_settings")
            .update({ messages_used_today: userSettings.messages_used_today + 1 })
            .eq("user_id", user.id);
        }
      }
    }

    const rawBody = await req.json();
    const validationResult = chatInputSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: "Geçersiz istek formatı" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, image, video, mode, language, document, documentContent } = validationResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch user's knowledge base documents for context
    let knowledgeContext = '';
    const { data: kbDocs } = await supabaseAdmin
      .from("user_knowledge_base")
      .select("file_name, content, summary")
      .eq("user_id", user.id)
      .eq("is_global", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (kbDocs && kbDocs.length > 0) {
      const kbContent = kbDocs.map((doc: any) => 
        `📄 ${doc.file_name}:\n${doc.summary || doc.content.slice(0, 3000)}`
      ).join('\n\n');
      const kbLabel = (language || 'tr') === 'en' 
        ? "\n\nUser's knowledge base (previously uploaded files - use this information when relevant):\n"
        : "\n\nKullanıcının bilgi tabanı (daha önce yüklenen dosyalar - ilgili olduğunda bu bilgileri kullan):\n";
      knowledgeContext = `${kbLabel}${kbContent}`;
    }

    // Also check conversation-specific documents
    if (messages.length > 0) {
      const lastUserMsg = messages[messages.length - 1];
      // Try to get conversation_id from a recent chat message
      const { data: recentMsg } = await supabaseAdmin
        .from("chat_messages")
        .select("conversation_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentMsg?.conversation_id) {
        const { data: convDocs } = await supabaseAdmin
          .from("user_knowledge_base")
          .select("file_name, content, summary")
          .eq("user_id", user.id)
          .eq("conversation_id", recentMsg.conversation_id)
          .eq("is_global", false)
          .order("created_at", { ascending: false })
          .limit(5);

        if (convDocs && convDocs.length > 0) {
          const convContent = convDocs.map((doc: any) => 
            `📄 ${doc.file_name}:\n${doc.summary || doc.content.slice(0, 3000)}`
          ).join('\n\n');
          const convLabel = (language || 'tr') === 'en'
            ? "\n\nDocuments shared in this conversation:\n"
            : "\n\nBu sohbette paylaşılan belgeler:\n";
          knowledgeContext += `${convLabel}${convContent}`;
        }
      }
    }

    // Select system prompt based on mode and language
    const modePrompts = getModePrompts(language || 'tr');
    let systemPrompt = modePrompts[mode || 'general'] || modePrompts.general;

    // Inject current date/time so the AI always knows the real date
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Istanbul' });
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
    const dateInfo = (language || 'tr') === 'en'
      ? `\n\nCurrent date and time: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Istanbul' })}, ${timeStr} (Istanbul time). Always use this as the real current date.`
      : `\n\nŞu anki tarih ve saat: ${dateStr}, ${timeStr} (İstanbul saati). Tarih sorulduğunda HER ZAMAN bu tarihi kullan. Asla farklı bir tarih söyleme.`;
    systemPrompt += dateInfo;

    const LANGUAGE_NAMES: Record<string, string> = {
      tr: "Turkish (Türkçe)",
      en: "English",
      de: "German (Deutsch)",
      fr: "French (Français)",
      es: "Spanish (Español)",
      ar: "Arabic (العربية)",
      ru: "Russian (Русский)",
      pt: "Portuguese (Português)",
      ja: "Japanese (日本語)",
      zh: "Chinese (中文)",
      ko: "Korean (한국어)",
      tl: "Filipino (Tagalog)",
      hi: "Hindi (हिन्दी)",
    };
    const targetLang = language || 'tr';
    const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;
    systemPrompt += `\n\n[MANDATORY RESPONSE LANGUAGE]: The user's chosen app and voice language is ${targetLangName} (code: '${targetLang}'). You MUST ALWAYS formulate your entire response strictly and completely in ${targetLangName}. Never answer in another language unless the user specifically asks you to translate or converse in a different language.`;

    const isEnglish = language === 'en';

    // Detect URLs in the last user message for web summarization
    const lastUserMsg = messages[messages.length - 1];
    let urlContext = '';
    let webSearchContext = '';
    
    if (lastUserMsg?.role === 'user') {
      const urlRegex = /https?:\/\/[^\s)}\]"']+/g;
      const urls = lastUserMsg.content.match(urlRegex);
      
      // URL fetching
      if (urls && urls.length > 0) {
        const fetchPromises = urls.slice(0, 2).map(async (url: string) => {
          const content = await fetchUrlContent(url);
          const label = isEnglish ? 'Content' : 'İçerik';
          return content ? `\n\n--- ${label}: ${url} ---\n${content}\n---` : '';
        });
        const contents = await Promise.all(fetchPromises);
        urlContext = contents.filter(Boolean).join('');
      }
      
      // Web search for questions/factual queries
      if (!urls && shouldSearchWeb(lastUserMsg.content)) {
        console.log('Performing web search for:', lastUserMsg.content.slice(0, 100));
        const searchResults = await webSearch(lastUserMsg.content);
        if (searchResults) {
          const searchLabel = isEnglish 
            ? "\n\n🔍 Web search results (use this information to provide an accurate answer):\n"
            : "\n\n🔍 Web arama sonuçları (doğru cevap vermek için bu bilgileri kullan):\n";
          webSearchContext = `${searchLabel}${searchResults}`;
        }
      }
    }

    // Build API messages
    const urlLabel = isEnglish ? "\n\nWeb page content shared by the user:" : "\n\nKullanıcının paylaştığı web sayfası içeriği:";
    const docLabel = isEnglish ? "\n\nFile content uploaded by the user:\n" : "\n\nKullanıcının yüklediği dosya içeriği:\n";
    const apiMessages: any[] = [
      { role: "system", content: systemPrompt + knowledgeContext + (urlContext ? `${urlLabel}${urlContext}` : '') + webSearchContext + (documentContent ? `${docLabel}${documentContent}` : '') },
    ];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (i === messages.length - 1 && msg.role === "user" && (image || video || document)) {
        const analyzeText = isEnglish
          ? (video ? "Analyze this video." : document ? "Analyze this file." : "Analyze this image.")
          : (video ? "Bu videoyu analiz et." : document ? "Bu dosyayı analiz et." : "Bu görüntüyü analiz et.");
        const contentParts: any[] = [
          { type: "text", text: msg.content || analyzeText }
        ];
        
        if (image) {
          contentParts.push({ type: "image_url", image_url: { url: image } });
        }
        if (video) {
          contentParts.push({ type: "image_url", image_url: { url: video } });
        }
        if (document) {
          contentParts.push({ type: "image_url", image_url: { url: `data:application/pdf;base64,${document.data}` } });
        }

        apiMessages.push({ role: "user", content: contentParts });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const aiModel = userSettings?.ai_model || "google/gemini-3.8-flash";

    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: aiModel, messages: apiMessages, stream: true }),
    });

    // If cutting-edge model slug returns 400/404, gracefully fall back to stable preview
    if (!response.ok && (response.status === 400 || response.status === 404) && aiModel !== "google/gemini-3.1-pro-preview") {
      console.warn(`Primary model ${aiModel} returned ${response.status}, falling back to google/gemini-3.1-pro-preview...`);
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "google/gemini-3.1-pro-preview", messages: apiMessages, stream: true }),
      });
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit aşıldı, lütfen biraz bekleyin." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredi limitiniz doldu." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI servisi hatası" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Bir hata oluştu. Lütfen tekrar deneyin." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
