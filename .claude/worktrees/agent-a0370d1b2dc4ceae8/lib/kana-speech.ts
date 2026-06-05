export type KanaSpeechAvailability = "ready" | "no-voice" | "unsupported";

let cachedJapaneseVoiceUri: string | null = null;

function getSpeechSynthesisInstance(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function isJapaneseVoice(voice: SpeechSynthesisVoice) {
  return voice.lang.toLowerCase().startsWith("ja");
}

function scoreJapaneseVoice(voice: SpeechSynthesisVoice) {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;

  if (lang === "ja-jp") score += 80;
  else if (lang.startsWith("ja")) score += 60;

  if (voice.localService) score += 20;
  if (voice.default) score += 12;

  if (name.includes("kyoko") || name.includes("otoya")) score += 16;
  if (name.includes("haruka") || name.includes("sayaka")) score += 12;
  if (name.includes("japanese") || name.includes("日本")) score += 10;
  if (name.includes("google")) score += 6;
  if (name.includes("microsoft")) score += 4;

  return score;
}

function getJapaneseVoices(voices: SpeechSynthesisVoice[]) {
  return voices.filter(isJapaneseVoice).sort((a, b) => scoreJapaneseVoice(b) - scoreJapaneseVoice(a));
}

function readCachedVoice(voices: SpeechSynthesisVoice[]) {
  if (!cachedJapaneseVoiceUri) return null;
  return voices.find((voice) => voice.voiceURI === cachedJapaneseVoiceUri) ?? null;
}

function cacheVoice(voice: SpeechSynthesisVoice | null) {
  cachedJapaneseVoiceUri = voice?.voiceURI ?? null;
  return voice;
}

async function waitForVoices(timeoutMs = 1200) {
  const synth = getSpeechSynthesisInstance();
  if (!synth) return [] as SpeechSynthesisVoice[];

  const existing = synth.getVoices();
  if (existing.length > 0) return existing;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(synth.getVoices());
    };

    const handleChange = () => {
      cachedJapaneseVoiceUri = null;
      finish();
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      synth.removeEventListener("voiceschanged", handleChange);
    };

    const timer = window.setTimeout(finish, timeoutMs);
    synth.addEventListener("voiceschanged", handleChange);
  });
}

async function resolveBestJapaneseVoice() {
  const synth = getSpeechSynthesisInstance();
  if (!synth) return null;

  const currentVoices = synth.getVoices();
  const cached = readCachedVoice(currentVoices);
  if (cached) return cached;

  const immediateBest = getJapaneseVoices(currentVoices)[0] ?? null;
  if (immediateBest) return cacheVoice(immediateBest);

  const awaitedBest = getJapaneseVoices(await waitForVoices())[0] ?? null;
  return cacheVoice(awaitedBest);
}

export async function getKanaSpeechAvailability(): Promise<KanaSpeechAvailability> {
  const synth = getSpeechSynthesisInstance();
  if (!synth) return "unsupported";
  return (await resolveBestJapaneseVoice()) ? "ready" : "no-voice";
}

export async function hasJapaneseVoice() {
  return (await getKanaSpeechAvailability()) === "ready";
}

export async function speakKana(text: string) {
  const synth = getSpeechSynthesisInstance();
  const value = text.trim();

  if (!synth || !value) return false;

  const voice = await resolveBestJapaneseVoice();
  if (!voice) return false;

  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = "ja-JP";
  utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1;

  synth.speak(utterance);
  return true;
}

export function stopKanaSpeech() {
  getSpeechSynthesisInstance()?.cancel();
}

export function observeKanaVoices(onChange: () => void) {
  const synth = getSpeechSynthesisInstance();
  if (!synth) return () => {};

  const handleChange = () => {
    cachedJapaneseVoiceUri = null;
    onChange();
  };

  synth.addEventListener("voiceschanged", handleChange);

  return () => {
    synth.removeEventListener("voiceschanged", handleChange);
  };
}
