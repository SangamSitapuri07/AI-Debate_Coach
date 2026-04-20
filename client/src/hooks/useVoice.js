import { useState, useRef, useEffect, useCallback } from "react";

export default function useVoice() {
  const [isListening, setIsListening]   = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [transcript, setTranscript]     = useState("");
  const [supported, setSupported]       = useState({ stt: false, tts: false });
  const [voices, setVoices]             = useState([]);
  const [micError, setMicError]         = useState(null);

  const recognitionRef  = useRef(null);
  const synthRef        = useRef(null);
  const chunksRef       = useRef([]);
  const onFinalRef      = useRef(null);
  const listeningRef    = useRef(false);
  const finalTextRef    = useRef("");

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const SR =
      window.SpeechRecognition       ||
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition    ||
      window.msSpeechRecognition;

    const sttOk = !!SR;
    const ttsOk = "speechSynthesis" in window;
    setSupported({ stt: sttOk, tts: ttsOk });

    if (!sttOk) {
      setMicError("Speech recognition not supported. Use Google Chrome.");
      console.warn("❌ No SpeechRecognition support");
    } else {
      console.log("✅ SpeechRecognition supported");
    }

    // TTS setup
    if (ttsOk) {
      synthRef.current = window.speechSynthesis;
      const load = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length) setVoices(v);
      };
      window.speechSynthesis.onvoiceschanged = load;
      load();
      setTimeout(load, 500);
      setTimeout(load, 1500);
    }

    return () => {
      stopRec();
      synthRef.current?.cancel();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // CREATE RECOGNITION INSTANCE
  // ═══════════════════════════════════════════════════════════

  function createRecognition() {
    const SR =
      window.SpeechRecognition       ||
      window.webkitSpeechRecognition;

    if (!SR) return null;

    const rec              = new SR();
    rec.continuous         = false;
    rec.interimResults     = true;
    rec.lang               = "en-US";
    rec.maxAlternatives    = 1;

    rec.onstart = () => {
      console.log("🎤 STARTED");
      listeningRef.current = true;
      setIsListening(true);
      setMicError(null);
      finalTextRef.current = "";
      setTranscript("");
    };

    rec.onaudiostart = () => console.log("🎤 Audio capture started");
    rec.onsoundstart = () => console.log("🎤 Sound detected");
    rec.onspeechstart = () => console.log("🎤 Speech detected!");

    rec.onresult = (event) => {
      let interim = "";
      let final   = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
          console.log("🎤 Final:", t);
        } else {
          interim += t;
          console.log("🎤 Interim:", t);
        }
      }

      if (final) {
        finalTextRef.current = final.trim();
        setTranscript(final.trim());
      } else if (interim) {
        setTranscript(interim.trim());
      }
    };

    rec.onspeechend = () => console.log("🎤 Speech ended");

    rec.onend = () => {
      console.log("🎤 ENDED — final text:", finalTextRef.current);
      listeningRef.current = false;
      setIsListening(false);

      if (finalTextRef.current && onFinalRef.current) {
        const text = finalTextRef.current;
        finalTextRef.current = "";
        console.log("🎤 Firing callback with:", text);
        onFinalRef.current(text);
      }
    };

    rec.onerror = (e) => {
      console.error("🎤 ERROR:", e.error);
      listeningRef.current = false;
      setIsListening(false);

      if (e.error === "not-allowed") {
        setMicError("❌ Microphone blocked! Click 🔒 in address bar → Allow microphone → Refresh.");
      } else if (e.error === "no-speech") {
        setMicError("No speech detected. Try speaking louder.");
        setTimeout(() => setMicError(null), 3000);
      } else if (e.error === "audio-capture") {
        setMicError("No microphone detected. Connect a microphone.");
      } else if (e.error === "network") {
        setMicError("Network error with speech recognition.");
      } else if (e.error !== "aborted") {
        setMicError(`Error: ${e.error}`);
      }
    };

    return rec;
  }

  function stopRec() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend   = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }
    listeningRef.current = false;
    setIsListening(false);
  }

  // ═══════════════════════════════════════════════════════════
  // SET CALLBACK
  // ═══════════════════════════════════════════════════════════

  const setOnFinal = useCallback((cb) => {
    onFinalRef.current = cb;
  }, []);

  // ═══════════════════════════════════════════════════════════
  // START LISTENING
  // ═══════════════════════════════════════════════════════════

  const startListening = useCallback(async () => {
    console.log("🎤 startListening called");

    if (listeningRef.current) {
      console.log("⚠️ Already listening");
      return;
    }

    // Stop TTS
    synthRef.current?.cancel();
    setIsSpeaking(false);
    setMicError(null);
    setTranscript("");
    finalTextRef.current = "";

    // Check browser support
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError("Speech recognition not supported. Use Google Chrome.");
      return;
    }

    // Request mic permission explicitly
    console.log("🎤 Requesting mic permission...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      console.log("🎤 Permission granted!");
    } catch (err) {
      console.error("🎤 Permission denied:", err.name, err.message);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicError("❌ Microphone blocked! Click 🔒 in address bar → Allow microphone → Refresh page.");
      } else if (err.name === "NotFoundError") {
        setMicError("❌ No microphone found. Please connect a microphone.");
      } else {
        setMicError(`❌ Microphone error: ${err.message}`);
      }
      return;
    }

    // Stop any existing recognition
    stopRec();

    // Create fresh instance
    const rec = createRecognition();
    if (!rec) {
      setMicError("Speech recognition not supported. Use Google Chrome.");
      return;
    }
    recognitionRef.current = rec;

    // Small delay helps Chrome
    setTimeout(() => {
      try {
        console.log("🎤 Calling rec.start()...");
        recognitionRef.current?.start();
      } catch (err) {
        console.error("🎤 Start failed:", err.message);
        setMicError(`Failed to start: ${err.message}`);
        listeningRef.current = false;
        setIsListening(false);
      }
    }, 100);

  }, []);

  // ═══════════════════════════════════════════════════════════
  // STOP LISTENING
  // ═══════════════════════════════════════════════════════════

  const stopListening = useCallback(() => {
    console.log("🎤 stopListening called");
    if (!listeningRef.current) return;
    try {
      recognitionRef.current?.stop();
    } catch (e) { /* ignore */ }
    listeningRef.current = false;
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // ═══════════════════════════════════════════════════════════
  // FEMALE VOICE
  // ═══════════════════════════════════════════════════════════

  const getFemaleVoice = useCallback(() => {
    if (!voices.length) return null;

    const priority = [
      "Microsoft Aria Online (Natural) - English (United States)",
      "Microsoft Libby Online (Natural) - English (United Kingdom)",
      "Microsoft Zira - English (United States)",
      "Microsoft Hazel - English (United Kingdom)",
      "Google US English",
      "Samantha",
      "Karen",
    ];

    for (const name of priority) {
      const v = voices.find(
        (v) => v.name.toLowerCase() === name.toLowerCase()
      );
      if (v) { console.log("🔊 Voice:", v.name); return v; }
    }

    const partials = ["Aria", "Libby", "Zira", "Hazel", "Samantha", "Karen"];
    for (const p of partials) {
      const v = voices.find((v) => v.name.toLowerCase().includes(p.toLowerCase()));
      if (v) { console.log("🔊 Voice:", v.name); return v; }
    }

    return (
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          !["david", "mark", "george", "ravi", "guy", "james", "fred"].some(
            (m) => v.name.toLowerCase().includes(m)
          )
      ) || voices[0]
    );
  }, [voices]);

  // ═══════════════════════════════════════════════════════════
  // SPEAK
  // ═══════════════════════════════════════════════════════════

  const speak = useCallback((text, onDone) => {
    if (!synthRef.current || !voiceEnabled) return;

    synthRef.current.cancel();
    chunksRef.current = [];

    // Clean markdown
    const clean = text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
      .replace(/`[^`]+`/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[|>_~]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .replace(/[-•]\s/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!clean) return;

    // Split into 100-char chunks
    const words  = clean.split(" ");
    const chunks = [];
    let   cur    = "";

    words.forEach((w) => {
      if ((cur + " " + w).trim().length > 100) {
        if (cur.trim()) chunks.push(cur.trim());
        cur = w;
      } else {
        cur = cur ? cur + " " + w : w;
      }
    });
    if (cur.trim()) chunks.push(cur.trim());

    chunksRef.current = [...chunks];
    const voice = getFemaleVoice();

    const next = () => {
      if (!chunksRef.current.length) {
        setIsSpeaking(false);
        onDone?.();
        return;
      }
      const chunk = chunksRef.current.shift();
      if (!chunk?.trim()) { next(); return; }

      const utt     = new SpeechSynthesisUtterance(chunk);
      if (voice) utt.voice = voice;
      utt.rate   = 0.95;
      utt.pitch  = 1.1;
      utt.volume = 1.0;

      utt.onstart = () => setIsSpeaking(true);
      utt.onend   = () => setTimeout(next, 50);
      utt.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled")
          console.warn("TTS:", e.error);
        setTimeout(next, 100);
      };

      try { synthRef.current.speak(utt); }
      catch (e) { console.warn("Speak err:", e); setTimeout(next, 100); }
    };

    setIsSpeaking(true);
    next();
  }, [voiceEnabled, getFemaleVoice]);

  const stopSpeaking = useCallback(() => {
    chunksRef.current = [];
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // TOGGLE VOICE
  // ═══════════════════════════════════════════════════════════

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (!next) {
        chunksRef.current = [];
        synthRef.current?.cancel();
        stopRec();
        setIsSpeaking(false);
      }
      console.log("🔊 Voice:", next ? "ON" : "OFF");
      return next;
    });
  }, []);

  return {
    isListening,
    isSpeaking,
    voiceEnabled,
    transcript,
    supported,
    micError,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    toggleVoice,
    setTranscript,
    setOnFinal,
  };
}