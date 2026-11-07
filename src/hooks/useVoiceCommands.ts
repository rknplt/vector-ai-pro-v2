import { useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";

interface VoiceCommandResult {
  handled: boolean;
  action?: string;
  description?: string;
}

// App deep links and web URLs
const APP_LINKS: Record<string, { web: string; deep?: string }> = {
  whatsapp: { web: "https://web.whatsapp.com", deep: "whatsapp://" },
  instagram: { web: "https://www.instagram.com", deep: "instagram://" },
  youtube: { web: "https://www.youtube.com", deep: "vnd.youtube://" },
  twitter: { web: "https://twitter.com", deep: "twitter://" },
  x: { web: "https://x.com", deep: "twitter://" },
  facebook: { web: "https://www.facebook.com", deep: "fb://" },
  spotify: { web: "https://open.spotify.com", deep: "spotify://" },
  telegram: { web: "https://web.telegram.org", deep: "tg://" },
  tiktok: { web: "https://www.tiktok.com", deep: "snssdk1233://" },
  netflix: { web: "https://www.netflix.com", deep: "nflx://" },
  linkedin: { web: "https://www.linkedin.com", deep: "linkedin://" },
  pinterest: { web: "https://www.pinterest.com", deep: "pinterest://" },
  reddit: { web: "https://www.reddit.com", deep: "reddit://" },
  discord: { web: "https://discord.com", deep: "discord://" },
  twitch: { web: "https://www.twitch.tv", deep: "twitch://" },
  gmail: { web: "https://mail.google.com", deep: "googlegmail://" },
  maps: { web: "https://maps.google.com", deep: "comgooglemaps://" },
  harita: { web: "https://maps.google.com", deep: "comgooglemaps://" },
  amazon: { web: "https://www.amazon.com", deep: "com.amazon.mobile.shopping://" },
  google: { web: "https://www.google.com" },
  github: { web: "https://github.com" },
  stackoverflow: { web: "https://stackoverflow.com" },
};

const WEBSITE_PATTERNS: Record<string, string> = {
  google: "https://www.google.com",
  gmail: "https://mail.google.com",
  youtube: "https://www.youtube.com",
  facebook: "https://www.facebook.com",
  twitter: "https://twitter.com",
  instagram: "https://www.instagram.com",
  whatsapp: "https://web.whatsapp.com",
  linkedin: "https://www.linkedin.com",
  github: "https://github.com",
  reddit: "https://www.reddit.com",
  amazon: "https://www.amazon.com",
  netflix: "https://www.netflix.com",
  spotify: "https://open.spotify.com",
  haber: "https://news.google.com",
  harita: "https://maps.google.com",
  maps: "https://maps.google.com",
  çeviri: "https://translate.google.com",
  translate: "https://translate.google.com",
  hava: "https://www.google.com/search?q=hava+durumu",
  "hava durumu": "https://www.google.com/search?q=hava+durumu",
};

const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const openApp = (appName: string): VoiceCommandResult => {
  const normalizedName = appName.toLowerCase().trim();
  const appInfo = APP_LINKS[normalizedName];

  if (!appInfo) {
    const url = WEBSITE_PATTERNS[normalizedName];
    if (url) {
      window.open(url, "_blank");
      return { handled: true, action: "web_open", description: `${appName} açıldı` };
    }
    if (normalizedName.includes(".")) {
      const fullUrl = normalizedName.startsWith("http") ? normalizedName : `https://${normalizedName}`;
      window.open(fullUrl, "_blank");
      return { handled: true, action: "web_open", description: `${normalizedName} açıldı` };
    }
    return { handled: false };
  }

  if (isMobileDevice() && appInfo.deep) {
    window.location.href = appInfo.deep;
    setTimeout(() => {
      window.open(appInfo.web, "_blank");
    }, 1500);
    return { handled: true, action: "app_open", description: `${appName} uygulaması açılıyor...` };
  }

  window.open(appInfo.web, "_blank");
  return { handled: true, action: "web_open", description: `${appName} açıldı` };
};

// ===== DEVICE CONTROL FUNCTIONS =====

const openCamera = async (): Promise<VoiceCommandResult> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    // Create a fullscreen video overlay
    const overlay = document.createElement("div");
    overlay.id = "vector-camera-overlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;";
    
    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.style.cssText = "max-width:100%;max-height:85vh;border-radius:12px;";
    
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Kapat";
    closeBtn.style.cssText = "margin-top:16px;padding:12px 32px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;";
    closeBtn.onclick = () => {
      stream.getTracks().forEach(t => t.stop());
      overlay.remove();
    };
    
    overlay.appendChild(video);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
    
    return { handled: true, action: "camera", description: "Kamera açıldı" };
  } catch {
    toast({ variant: "destructive", title: "Kamera Hatası", description: "Kamera erişimi reddedildi veya cihazda kamera bulunamadı." });
    return { handled: true, action: "camera_error", description: "Kamera açılamadı" };
  }
};

const getLocation = async (): Promise<VoiceCommandResult> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Konum Desteklenmiyor", description: "Tarayıcınız konum servisini desteklemiyor." });
      resolve({ handled: true, action: "location_error", description: "Konum desteklenmiyor" });
      return;
    }
    
    toast({ title: "📍 Konum Alınıyor", description: "Lütfen konum iznini onaylayın..." });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        window.open(mapsUrl, "_blank");
        toast({ title: "📍 Konum Bulundu", description: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}` });
        resolve({ handled: true, action: "location", description: `Konumunuz haritada gösterildi` });
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Konum izni reddedildi.",
          2: "Konum bilgisi alınamıyor.",
          3: "Konum isteği zaman aşımına uğradı.",
        };
        toast({ variant: "destructive", title: "Konum Hatası", description: messages[error.code] || "Bilinmeyen hata" });
        resolve({ handled: true, action: "location_error", description: "Konum alınamadı" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

const sendNotification = async (message?: string): Promise<VoiceCommandResult> => {
  if (!("Notification" in window)) {
    toast({ variant: "destructive", title: "Bildirim Desteklenmiyor", description: "Tarayıcınız bildirimleri desteklemiyor." });
    return { handled: true, action: "notification_error", description: "Bildirim desteklenmiyor" };
  }
  
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  
  if (permission === "granted") {
    new Notification("Vector AI", {
      body: message || "Merhaba! Vector AI bildiriminiz aktif.",
      icon: "/pwa-192x192.png",
    });
    toast({ title: "🔔 Bildirim Gönderildi", description: "Bildirim başarıyla gönderildi." });
    return { handled: true, action: "notification", description: "Bildirim gönderildi" };
  }
  
  toast({ variant: "destructive", title: "Bildirim İzni", description: "Bildirim izni reddedildi." });
  return { handled: true, action: "notification_denied", description: "Bildirim izni reddedildi" };
};

const toggleFlashlight = async (turnOn: boolean): Promise<VoiceCommandResult> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } as any });
    const track = stream.getVideoTracks()[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capabilities = track.getCapabilities() as any;
    
    if (!capabilities.torch) {
      stream.getTracks().forEach(t => t.stop());
      toast({ variant: "destructive", title: "El Feneri", description: "Cihazınız el fenerini desteklemiyor." });
      return { handled: true, action: "flashlight_error", description: "El feneri desteklenmiyor" };
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await track.applyConstraints({ advanced: [{ torch: turnOn } as any] });
    
    if (!turnOn) {
      stream.getTracks().forEach(t => t.stop());
    } else {
      // Store stream reference for later stopping
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__vectorFlashlightStream = stream;
    }
    
    toast({ title: turnOn ? "🔦 El Feneri Açık" : "🔦 El Feneri Kapalı", description: turnOn ? "El feneri açıldı." : "El feneri kapatıldı." });
    return { handled: true, action: "flashlight", description: turnOn ? "El feneri açıldı" : "El feneri kapatıldı" };
  } catch {
    toast({ variant: "destructive", title: "El Feneri Hatası", description: "El fenerine erişilemedi." });
    return { handled: true, action: "flashlight_error", description: "El feneri açılamadı" };
  }
};

const vibrate = (pattern?: number[]): VoiceCommandResult => {
  if (!navigator.vibrate) {
    toast({ variant: "destructive", title: "Titreşim", description: "Cihazınız titreşimi desteklemiyor." });
    return { handled: true, action: "vibrate_error", description: "Titreşim desteklenmiyor" };
  }
  navigator.vibrate(pattern || [200, 100, 200]);
  toast({ title: "📳 Titreşim", description: "Cihaz titreştirildi." });
  return { handled: true, action: "vibrate", description: "Cihaz titreştirildi" };
};

const toggleWakeLock = async (lock: boolean): Promise<VoiceCommandResult> => {
  try {
    if (lock) {
      if (!("wakeLock" in navigator)) {
        toast({ variant: "destructive", title: "Ekran Kilidi", description: "Cihazınız bu özelliği desteklemiyor." });
        return { handled: true, action: "wakelock_error", description: "Wake lock desteklenmiyor" };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wakeLock = await (navigator as any).wakeLock.request("screen");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__vectorWakeLock = wakeLock;
      toast({ title: "☀️ Ekran Açık", description: "Ekran açık tutulacak." });
      return { handled: true, action: "wakelock_on", description: "Ekran açık tutulacak" };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wakeLock = (window as any).__vectorWakeLock;
      if (wakeLock) {
        await wakeLock.release();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__vectorWakeLock = null;
      }
      toast({ title: "🌙 Ekran Kilidi", description: "Ekran kilidi serbest bırakıldı." });
      return { handled: true, action: "wakelock_off", description: "Ekran kilidi serbest" };
    }
  } catch {
    toast({ variant: "destructive", title: "Ekran Kilidi Hatası", description: "Ekran kilidi ayarlanamadı." });
    return { handled: true, action: "wakelock_error", description: "Ekran kilidi hatası" };
  }
};

const shareContent = async (text?: string): Promise<VoiceCommandResult> => {
  if (!navigator.share) {
    toast({ variant: "destructive", title: "Paylaşım", description: "Cihazınız paylaşımı desteklemiyor." });
    return { handled: true, action: "share_error", description: "Paylaşım desteklenmiyor" };
  }
  try {
    await navigator.share({
      title: "Vector AI",
      text: text || "Vector AI - Akıllı Asistanınız",
      url: window.location.href,
    });
    toast({ title: "📤 Paylaşıldı", description: "İçerik paylaşıldı." });
    return { handled: true, action: "share", description: "İçerik paylaşıldı" };
  } catch {
    return { handled: true, action: "share_cancelled", description: "Paylaşım iptal edildi" };
  }
};

const copyToClipboard = async (text: string): Promise<VoiceCommandResult> => {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: "📋 Kopyalandı", description: `"${text.substring(0, 50)}..." panoya kopyalandı.` });
    return { handled: true, action: "clipboard", description: "Panoya kopyalandı" };
  } catch {
    toast({ variant: "destructive", title: "Kopyalama Hatası", description: "Pano erişimi reddedildi." });
    return { handled: true, action: "clipboard_error", description: "Kopyalama başarısız" };
  }
};

const getBatteryInfo = async (): Promise<VoiceCommandResult> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const battery = await (navigator as any).getBattery();
    const level = Math.round(battery.level * 100);
    const charging = battery.charging ? "Şarj oluyor" : "Şarj olmuyor";
    toast({ title: "🔋 Pil Durumu", description: `%${level} - ${charging}` });
    return { handled: true, action: "battery", description: `Pil: %${level} - ${charging}` };
  } catch {
    toast({ variant: "destructive", title: "Pil Bilgisi", description: "Pil bilgisi alınamadı." });
    return { handled: true, action: "battery_error", description: "Pil bilgisi alınamadı" };
  }
};

const toggleFullscreen = async (enable: boolean): Promise<VoiceCommandResult> => {
  try {
    if (enable) {
      await document.documentElement.requestFullscreen();
      toast({ title: "🖥️ Tam Ekran", description: "Tam ekran moduna geçildi." });
      return { handled: true, action: "fullscreen_on", description: "Tam ekran açıldı" };
    } else {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      toast({ title: "🖥️ Tam Ekran", description: "Tam ekran modundan çıkıldı." });
      return { handled: true, action: "fullscreen_off", description: "Tam ekran kapatıldı" };
    }
  } catch {
    toast({ variant: "destructive", title: "Tam Ekran", description: "Tam ekran değiştirilemedi." });
    return { handled: true, action: "fullscreen_error", description: "Tam ekran hatası" };
  }
};

// ===== PC REMOTE CONTROL FUNCTIONS (Via Render Cloud Backend) =====
const RENDER_BACKEND_URL = "https://ai-sirket-ajanlari.onrender.com";
const RENDER_SECRET_KEY = "orkun-guvenli-anahtar-2026";

const sendPcCommand = async (command: string): Promise<VoiceCommandResult> => {
  try {
    toast({
      title: "🖥️ PC Komutu İletiliyor",
      description: `"${command}" komutu evdeki bilgisayar ajanına gönderiliyor...`,
    });
    const resp = await fetch(`${RENDER_BACKEND_URL}/api/pc/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-token": RENDER_SECRET_KEY,
      },
      body: JSON.stringify({ command }),
    });
    if (resp.ok) {
      toast({
        title: "✅ PC Komutu Başarılı",
        description: `"${command}" komutu bilgisayar ajanına ulaştı.`,
      });
      return { handled: true, action: "pc_command", description: `Bilgisayara "${command}" komutu iletildi` };
    } else {
      toast({ variant: "destructive", title: "PC Bağlantısı", description: "Bilgisayar şu an çevrimdışı veya yanıt vermiyor." });
      return { handled: true, action: "pc_error", description: "PC komutu iletilemedi" };
    }
  } catch {
    toast({ variant: "destructive", title: "PC Sunucusu", description: "Bulut sunucusuna erişilemedi." });
    return { handled: true, action: "pc_error", description: "Sunucu hatası" };
  }
};

export const useVoiceCommands = () => {
  const asyncResultRef = useRef<Promise<VoiceCommandResult> | null>(null);

  const processCommand = useCallback((text: string): VoiceCommandResult => {
    const normalized = text.toLowerCase().trim();

    // --- PC REMOTE CONTROL COMMANDS ---
    if (/(?:bilgisayar|pc|laptop).*(?:ekran|görüntü|screenshot|resim)/i.test(normalized) ||
        /(?:ekran\s*görüntüsü\s*al|ekranı\s*çek)/i.test(normalized)) {
      sendPcCommand("screenshot");
      return { handled: true, action: "pc_screenshot", description: "Bilgisayardan ekran görüntüsü alınıyor..." };
    }

    if (/(?:bilgisayar|pc|laptop).*(?:kilitle|kapat|uyu)/i.test(normalized) ||
        /(?:bilgisayarı\s*kilitle|ekranı\s*kilitle)/i.test(normalized)) {
      sendPcCommand("lock");
      return { handled: true, action: "pc_lock", description: "Bilgisayar ekranı kilitleniyor..." };
    }

    if (/(?:bilgisayar|pc|laptop).*(?:durum|istatistik|ram|cpu)/i.test(normalized)) {
      sendPcCommand("stats");
      return { handled: true, action: "pc_stats", description: "Bilgisayar sistem istatistikleri alınıyor..." };
    }

    if (/(?:bilgisayarda|pc'de)\s+(.+)\s*(?:aç|başlat|çalıştır)/i.test(normalized)) {
      const match = normalized.match(/(?:bilgisayarda|pc'de)\s+(.+)\s*(?:aç|başlat|çalıştır)/i);
      if (match) {
        const appToOpen = match[1].trim();
        sendPcCommand(`open ${appToOpen}`);
        return { handled: true, action: "pc_open", description: `Bilgisayarda ${appToOpen} açılıyor...` };
      }
    }

    // --- DEVICE CONTROL COMMANDS (permission-based) ---

    // Camera
    if (/(?:kamera|kamerayı|ön\s*kamera|arka\s*kamera|fotoğraf|selfie)\s*(?:aç|başlat|göster)/i.test(normalized) ||
        /(?:aç|başlat|göster)\s*(?:kamera|kamerayı|ön\s*kamera|arka\s*kamera)/i.test(normalized) ||
        /(?:fotoğraf|resim)\s*(?:çek|al)/i.test(normalized)) {
      openCamera();
      return { handled: true, action: "camera", description: "Kamera açılıyor..." };
    }

    // Location
    if (/(?:konum|lokasyon|neredeyim|konumum|gps)/i.test(normalized) &&
        /(?:göster|aç|bul|nerede|söyle|al)/i.test(normalized) ||
        /(?:neredeyim|konumum\s*nerede|konumumu\s*göster|konumumu\s*bul)/i.test(normalized)) {
      getLocation();
      return { handled: true, action: "location", description: "Konum alınıyor..." };
    }

    // Flashlight on
    if (/(?:el\s*fener|fener|flash|ışık)\s*(?:aç|yak)/i.test(normalized) ||
        /(?:aç|yak)\s*(?:el\s*fener|fener|flash|ışık)/i.test(normalized)) {
      toggleFlashlight(true);
      return { handled: true, action: "flashlight", description: "El feneri açılıyor..." };
    }
    // Flashlight off
    if (/(?:el\s*fener|fener|flash|ışık)\s*(?:kapat|söndür|kapa)/i.test(normalized) ||
        /(?:kapat|söndür)\s*(?:el\s*fener|fener|flash|ışık)/i.test(normalized)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = (window as any).__vectorFlashlightStream;
      if (stream) {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__vectorFlashlightStream = null;
      }
      toggleFlashlight(false);
      return { handled: true, action: "flashlight_off", description: "El feneri kapatılıyor..." };
    }

    // Vibration
    if (/(?:titret|titreşim|vibrate|titreyim)/i.test(normalized)) {
      return vibrate();
    }

    // Notification
    if (/(?:bildirim|notification)\s*(?:gönder|at|yolla|yap)/i.test(normalized) ||
        /(?:gönder|at|yolla)\s*(?:bildirim|notification)/i.test(normalized) ||
        /(?:bildirim)\s*(?:test|dene)/i.test(normalized)) {
      sendNotification();
      return { handled: true, action: "notification", description: "Bildirim gönderiliyor..." };
    }

    // Wake lock (keep screen on)
    if (/(?:ekran|ekranı)\s*(?:açık\s*tut|sürekli\s*aç|kapatma|kapanmasın)/i.test(normalized) ||
        /(?:uyuma|uyumasın|kapanmasın)\s*(?:ekran)?/i.test(normalized)) {
      toggleWakeLock(true);
      return { handled: true, action: "wakelock", description: "Ekran açık tutulacak..." };
    }
    if (/(?:ekran|ekranı)\s*(?:kilidi|kilidini)\s*(?:kaldır|serbest|bırak)/i.test(normalized) ||
        /(?:ekran)\s*(?:kapanabilir|kapansın)/i.test(normalized)) {
      toggleWakeLock(false);
      return { handled: true, action: "wakelock_off", description: "Ekran kilidi serbest..." };
    }

    // Fullscreen
    if (/(?:tam\s*ekran|fullscreen)\s*(?:aç|yap|geç)/i.test(normalized) ||
        /(?:aç|yap|geç)\s*(?:tam\s*ekran|fullscreen)/i.test(normalized)) {
      toggleFullscreen(true);
      return { handled: true, action: "fullscreen", description: "Tam ekrana geçiliyor..." };
    }
    if (/(?:tam\s*ekran|fullscreen)\s*(?:kapat|çık|kapa)/i.test(normalized) ||
        /(?:kapat|çık)\s*(?:tam\s*ekran|fullscreen)/i.test(normalized)) {
      toggleFullscreen(false);
      return { handled: true, action: "fullscreen_off", description: "Tam ekrandan çıkılıyor..." };
    }

    // Share
    if (/(?:paylaş|share)/i.test(normalized)) {
      shareContent();
      return { handled: true, action: "share", description: "Paylaşım açılıyor..." };
    }

    // Battery
    if (/(?:pil|batarya|şarj)\s*(?:durumu|seviyesi|yüzdesi|ne\s*kadar|kaç)/i.test(normalized) ||
        /(?:kaç|ne\s*kadar)\s*(?:pil|batarya|şarj)/i.test(normalized)) {
      getBatteryInfo();
      return { handled: true, action: "battery", description: "Pil bilgisi alınıyor..." };
    }

    // Clipboard
    if (/(?:kopyala|panoya)\s+(.+)/i.test(normalized)) {
      const match = normalized.match(/(?:kopyala|panoya)\s+(.+)/i);
      if (match) {
        copyToClipboard(match[1].trim());
        return { handled: true, action: "clipboard", description: "Kopyalanıyor..." };
      }
    }

    // --- SPOTIFY DIRECT SEARCH & PLAY ---
    if (/spotify(?:'da|'de)?\s+(.+?)(?:\s+aç|\s+çal|\s+başlat)?$/i.test(normalized)) {
      const match = normalized.match(/spotify(?:'da|'de)?\s+(.+?)(?:\s+aç|\s+çal|\s+başlat)?$/i);
      if (match && match[1].trim()) {
        const query = match[1].trim();
        const encoded = encodeURIComponent(query);
        if (isMobileDevice()) {
          window.location.href = `spotify:search:${encoded}`;
          setTimeout(() => {
            window.open(`https://open.spotify.com/search/${encoded}`, "_blank");
          }, 1500);
        } else {
          window.open(`https://open.spotify.com/search/${encoded}`, "_blank");
        }
        toast({ title: "🎵 Spotify", description: `"${query}" açılıyor...` });
        return { handled: true, action: "spotify_play", description: `Spotify'da "${query}" açılıyor...` };
      }
    }

    // --- YOUTUBE DIRECT SEARCH & PLAY ---
    if (/youtube(?:'da|'de)?\s+(.+?)(?:\s+aç|\s+çal|\s+başlat)?$/i.test(normalized)) {
      const match = normalized.match(/youtube(?:'da|'de)?\s+(.+?)(?:\s+aç|\s+çal|\s+başlat)?$/i);
      if (match && match[1].trim()) {
        const query = match[1].trim();
        const encoded = encodeURIComponent(query);
        window.open(`https://www.youtube.com/results?search_query=${encoded}`, "_blank");
        toast({ title: "▶️ YouTube", description: `"${query}" aranıyor...` });
        return { handled: true, action: "youtube_play", description: `YouTube'da "${query}" aranıyor...` };
      }
    }

    // --- NAVIGATION DIRECT DESTINATION ---
    if (/(.+?)(?:'e|'a|'ye|'ya)?\s*navigasyon(?:\s*başlat|\s*aç)?$/i.test(normalized)) {
      const match = normalized.match(/(.+?)(?:'e|'a|'ye|'ya)?\s*navigasyon(?:\s*başlat|\s*aç)?$/i);
      if (match && match[1].trim()) {
        const dest = match[1].trim();
        const encoded = encodeURIComponent(dest);
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, "_blank");
        toast({ title: "🗺️ Navigasyon", description: `"${dest}" için yol tarifi başlatılıyor...` });
        return { handled: true, action: "navigation", description: `"${dest}" için navigasyon başlatılıyor...` };
      }
    }

    // --- APP/PROGRAM OPEN COMMANDS ---
    const openPatterns = [
      /(?:aç|açar?\s*mısın|açsana|başlat|çalıştır|göster)\s+(.+)/i,
      /(.+?)(?:\s+aç|\s+açar?\s*mısın|\s+açsana|\s+başlat|\s+çalıştır)/i,
      /(.+?)\s*(?:uygulamasını|programını|sitesini|sayfasını)\s*aç/i,
      /^(.+?)\s*(?:'[yıiuü]|'[yıiuü])\s*aç/i,
    ];

    for (const pattern of openPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const target = match[1].trim()
          .replace(/^(bana|bir|şu|bu)\s+/i, "")
          .replace(/\s*(uygulamasını|programını|sitesini|sayfasını|uygulaması|programı|sitesi|sayfası)\s*/i, "")
          .trim();
        
        if (target.length > 0 && target.length < 50) {
          const result = openApp(target);
          if (result.handled) {
            toast({ title: "🚀 Komut Çalıştırıldı", description: result.description });
            return result;
          }
        }
      }
    }

    // --- GOOGLE SEARCH ---
    // Only trigger browser search for explicit "ara/arat/araştır" commands
    // Do NOT trigger for "bilgi ver", "anlat", "açıkla" etc. - those should go to AI
    const infoPatterns = /(?:bilgi\s*ver|anlat|açıkla|özetle|nedir|ne\s*demek|ne\s*anlama)/i;
    if (!infoPatterns.test(normalized)) {
      const searchPatterns = [
        /(?:ara|arat|araştır)\s+(.+)/i,
        /(.+?)\s*(?:ara|arat|araştır)$/i,
        /google'?da?\s+(.+?)\s*(?:ara|arat|araştır)$/i,
        /internette?\s+(.+?)\s*(?:ara|arat|araştır)$/i,
      ];

      for (const pattern of searchPatterns) {
        const match = normalized.match(pattern);
        if (match) {
          const query = match[1].trim()
            .replace(/^(bana|bir|şu|bu|google'da|internette)\s+/i, "")
            .trim();
          
          if (query.length > 0 && query.length < 200) {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            window.open(searchUrl, "_blank");
            toast({ title: "🔍 Arama Yapılıyor", description: `"${query}" aranıyor...` });
            return { handled: true, action: "search", description: `"${query}" arandı` };
          }
        }
      }
    }

    // --- PHONE CALL ---
    const callPatterns = [
      /(?:ara|telefon\s*(?:et|aç)|çağır|arama\s*yap)\s+(.+)/i,
      /(.+?)(?:'[yıiuü]|'[yıiuü])?\s*(?:ara|telefon\s*et|çağır)$/i,
      /(\+?\d[\d\s\-()]{6,})/,
    ];

    for (const pattern of callPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const target = match[1].trim();
        const phoneNumber = target.replace(/[^\d+]/g, "");
        if (phoneNumber.length >= 7) {
          window.location.href = `tel:${phoneNumber}`;
          toast({ title: "📞 Arama Başlatılıyor", description: `${phoneNumber} aranıyor...` });
          return { handled: true, action: "call", description: `${phoneNumber} aranıyor` };
        }
      }
    }

    // --- EMAIL ---
    const emailPatterns = [
      /(?:e-?posta|mail|mesaj)\s*(?:gönder|yaz|at)\s*(.*)/i,
      /(.+?)\s*(?:'[eaıiou]|'[eaıiou])?\s*(?:e-?posta|mail)\s*(?:gönder|yaz|at)/i,
    ];

    for (const pattern of emailPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const emailTarget = match[1]?.trim();
        const mailtoUrl = emailTarget && emailTarget.includes("@") 
          ? `mailto:${emailTarget}` 
          : "mailto:";
        window.location.href = mailtoUrl;
        toast({ title: "📧 E-posta Açılıyor", description: "E-posta uygulaması açılıyor..." });
        return { handled: true, action: "email", description: "E-posta açıldı" };
      }
    }

    // --- NAVIGATION (MAPS) ---
    const navPatterns = [
      /(?:yol\s*tarifi|navigasyon|nasıl\s*gidilir|nerede)\s+(.+)/i,
      /(.+?)\s*(?:'[eaıiou]|'[eaıiou])?\s*(?:yol\s*tarifi|nasıl\s*gid|nerede)/i,
    ];

    for (const pattern of navPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const destination = match[1].trim();
        if (destination.length > 0) {
          const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(destination)}`;
          window.open(mapsUrl, "_blank");
          toast({ title: "🗺️ Harita Açılıyor", description: `"${destination}" haritada gösteriliyor...` });
          return { handled: true, action: "navigate", description: `${destination} haritada açıldı` };
        }
      }
    }

    return { handled: false };
  }, []);

  return { processCommand };
};
