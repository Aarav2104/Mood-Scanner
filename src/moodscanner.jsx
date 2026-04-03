import { useState, useRef, useEffect, useCallback } from "react";

const MEME_TEMPLATES = [
  { id: "drake", name: "Drake Approve", emoji: "🤌", color: "#FFD700" },
  { id: "npc", name: "NPC Mode", emoji: "🤖", color: "#00FF88" },
  { id: "sigma", name: "Sigma Grindset", emoji: "😤", color: "#8B5CF6" },
  { id: "this-is-fine", name: "This Is Fine", emoji: "🔥", color: "#FF6B35" },
  { id: "distracted", name: "Distracted", emoji: "👀", color: "#F43F5E" },
  { id: "gigachad", name: "GigaChad", emoji: "💪", color: "#06B6D4" },
  { id: "crying-cat", name: "Crying Cat", emoji: "😭", color: "#6366F1" },
  { id: "stonks", name: "Stonks Only Up", emoji: "📈", color: "#10B981" },
];

const MOOD_PALETTES = {
  happy: { bg: "from-yellow-100 to-amber-50", glow: "#FCD34D" },
  sad: { bg: "from-blue-100 to-indigo-50", glow: "#93C5FD" },
  angry: { bg: "from-red-100 to-rose-50", glow: "#FCA5A5" },
  surprised: { bg: "from-purple-100 to-violet-50", glow: "#C4B5FD" },
  neutral: { bg: "from-gray-100 to-slate-50", glow: "#CBD5E1" },
  fearful: { bg: "from-orange-100 to-amber-50", glow: "#FDBA74" },
  disgusted: { bg: "from-green-100 to-emerald-50", glow: "#86EFAC" },
};

export default function MoodScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const stickerCanvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState("idle"); // idle | scanning | result | sticker
  const [cameraOn, setCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [moodData, setMoodData] = useState(null);
  const [selectedMeme, setSelectedMeme] = useState(null);
  const [stickerReady, setStickerReady] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [particles, setParticles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate floating particles
  useEffect(() => {
    const pts = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      delay: Math.random() * 5,
      duration: Math.random() * 8 + 6,
      opacity: Math.random() * 0.15 + 0.05,
    }));
    setParticles(pts);
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      setCameraOn(true);
      setPhase("idle");
    } catch (e) {
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  // Attach stream to video element after it mounts
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
    setPhase("idle");
    setCapturedImage(null);
    setMoodData(null);
    setSelectedMeme(null);
    setStickerReady(false);
  };

  const scanFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setPhase("scanning");
    setScanProgress(0);

    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    const dataURL = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataURL);

    // Animate scan progress
    let prog = 0;
    const interval = setInterval(() => {
      prog += 2;
      setScanProgress(Math.min(prog, 95));
      if (prog >= 95) clearInterval(interval);
    }, 40);

    try {
      setLoading(true);
      const base64 = dataURL.split(",")[1];
      console.log("API KEY:", import.meta.env.VITE_GEMINI_API_KEY);
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: "image/jpeg", data: base64 } },
                  {
                    text: `Analyze this person's facial expression and mood. Respond ONLY with valid JSON, no markdown or extra text:
{
  "mood": "happy|sad|angry|surprised|neutral|fearful|disgusted",
  "emoji": "single most fitting emoji",
  "moodLabel": "catchy 2-3 word mood description",
  "intensity": 1-10,
  "description": "one playful sentence about their vibe",
  "recommendedMeme": "one of: drake|npc|sigma|this-is-fine|distracted|gigachad|crying-cat|stonks",
  "memeReason": "one witty sentence why this meme fits"
}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      clearInterval(interval);
      setScanProgress(100);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setMoodData(parsed);
      const recMeme = MEME_TEMPLATES.find((m) => m.id === parsed.recommendedMeme) || MEME_TEMPLATES[0];
      setSelectedMeme(recMeme);

      setTimeout(() => setPhase("result"), 500);
    } catch (e) {
      clearInterval(interval);
      setError("Mood analysis failed. Please try again.");
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSticker = useCallback(() => {
  if (!capturedImage || !selectedMeme) {
    console.log("❌ Missing data");
    return;
  }

  // Step 1: switch UI first (this creates the canvas)
  setPhase("sticker");

  // Step 2: wait for canvas to render, then draw
  setTimeout(() => {
    const canvas = stickerCanvasRef.current;
    if (!canvas) {
      console.log("❌ Canvas not ready");
      return;
    }

    const ctx = canvas.getContext("2d");
    canvas.width = 400;
    canvas.height = 480;

    const img = new Image();
    img.onload = () => {
      // Draw face
      ctx.drawImage(img, 0, 0, 400, 380);

      // Meme bar
      ctx.fillStyle = selectedMeme.color;
      ctx.fillRect(0, 350, 400, 130);

      // Emoji
      ctx.font = "60px serif";
      ctx.textAlign = "center";
      ctx.fillText(selectedMeme.emoji, 200, 415);

      console.log("✅ Sticker generated");
    };

    img.src = capturedImage;
  }, 100);

}, [capturedImage, selectedMeme]);

  const downloadSticker = () => {
    if (!stickerCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = "moodsticker.png";
    link.href = stickerCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  const palette = moodData ? MOOD_PALETTES[moodData.mood] || MOOD_PALETTES.neutral : MOOD_PALETTES.neutral;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, #f8faff 0%, #eef2ff 30%, #fdf4ff 60%, #f0fdf4 100%)`,
        fontFamily: "'Cormorant Garamond', 'Georgia', serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Sora:wght@300;400;500;600&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .glass {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.75);
          box-shadow: 0 8px 40px rgba(120,100,200,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .glass-dark {
          background: rgba(255,255,255,0.35);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 4px 24px rgba(100,80,180,0.06);
        }

        .btn-glass {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.85);
          box-shadow: 0 4px 20px rgba(120,100,200,0.12), inset 0 1px 0 rgba(255,255,255,1);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          font-family: 'Sora', sans-serif;
        }
        .btn-glass:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 32px rgba(120,100,200,0.18), inset 0 1px 0 rgba(255,255,255,1);
        }
        .btn-glass:active { transform: scale(0.98); }

        .btn-primary {
          background: linear-gradient(135deg, rgba(139,92,246,0.85), rgba(99,102,241,0.85));
          color: white;
          border: 1px solid rgba(255,255,255,0.4);
          box-shadow: 0 6px 28px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .btn-primary:hover {
          box-shadow: 0 10px 40px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .scan-ring {
          animation: scanRing 2s ease-in-out infinite;
        }
        @keyframes scanRing {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        .scan-line {
          animation: scanLine 1.5s ease-in-out infinite;
        }
        @keyframes scanLine {
          0% { top: 0%; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        .float-particle {
          animation: floatUp var(--dur, 8s) var(--delay, 0s) ease-in-out infinite alternate;
        }
        @keyframes floatUp {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: var(--op, 0.08); }
          100% { transform: translateY(-40px) translateX(20px) scale(1.2); opacity: calc(var(--op, 0.08) * 0.5); }
        }

        .fade-in { animation: fadeIn 0.6s ease forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pulse-glow {
          animation: pulseGlow 2.5s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.2); }
          50% { box-shadow: 0 0 50px rgba(139,92,246,0.45); }
        }

        .emoji-bounce {
          animation: emojiBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes emojiBounce {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }

        .meme-card {
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          cursor: pointer;
        }
        .meme-card:hover { transform: translateY(-4px) scale(1.05); }
        .meme-card.selected {
          border-color: rgba(139,92,246,0.6) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.2), 0 8px 24px rgba(139,92,246,0.15) !important;
          transform: scale(1.04);
        }

        .progress-bar {
          transition: width 0.1s ease;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }
      `}</style>

      {/* Ambient Background Blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,181,253,0.25) 0%, transparent 70%)",
          top: "-100px", left: "-100px", filter: "blur(40px)"
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(165,243,252,0.2) 0%, transparent 70%)",
          bottom: "-50px", right: "-50px", filter: "blur(40px)"
        }} />
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(253,186,116,0.15) 0%, transparent 70%)",
          top: "50%", left: "60%", filter: "blur(50px)"
        }} />
        {particles.map((p) => (
          <div key={p.id} className="float-particle" style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            background: "rgba(139,92,246,0.4)",
            "--op": p.opacity, "--dur": `${p.duration}s`, "--delay": `${p.delay}s`,
          }} />
        ))}
      </div>

      {/* Main Layout */}
      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 1100, margin: "0 auto",
        padding: "24px 20px 60px",
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 32,
      }}>

        {/* Header */}
        <header style={{ textAlign: "center", paddingTop: 20 }}>
          <div className="glass" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 20px", borderRadius: 40, marginBottom: 20 }}>
            <span style={{ fontSize: 18 }}>✦</span>
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: "#7C3AED", fontWeight: 500 }}>AI Mood Scanner</span>
            <span style={{ fontSize: 18 }}>✦</span>
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 68px)", fontWeight: 300,
            letterSpacing: "-1px", color: "#1a0533",
            lineHeight: 1.1, marginBottom: 12,
          }}>
            Read Your <em style={{ fontStyle: "italic", color: "#7C3AED" }}>Vibe.</em>
            <br />Own Your <em style={{ fontStyle: "italic", color: "#6366F1" }}>Meme.</em>
          </h1>
          <p style={{
            fontFamily: "'Sora', sans-serif", fontSize: 15, color: "#6B7280",
            fontWeight: 300, letterSpacing: 0.3, maxWidth: 420
          }}>
            Scan your face · Discover your mood · Become an internet legend
          </p>
        </header>

        {/* Main Card */}
        <div style={{ width: "100%", maxWidth: 860 }}>

          {/* Error Banner */}
          {error && (
            <div className="glass fade-in" style={{
              background: "rgba(254,226,226,0.7)", borderColor: "rgba(252,165,165,0.5)",
              borderRadius: 16, padding: "14px 20px", marginBottom: 20,
              fontFamily: "'Sora', sans-serif", fontSize: 14, color: "#991B1B",
              display: "flex", alignItems: "center", gap: 10
            }}>
              <span>⚠️</span> {error}
              <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontSize: 18 }}>×</button>
            </div>
          )}

          {/* Camera + Result Layout */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>

            {/* Camera Panel */}
            <div className="glass pulse-glow" style={{
              borderRadius: 28, overflow: "hidden",
              flex: "1 1 380px", maxWidth: 460,
              position: "relative", aspectRatio: "4/3",
              minHeight: 300,
            }}>
              {/* Video Feed */}
              {cameraOn && (
                <video ref={videoRef} style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  display: phase === "result" || phase === "sticker" ? "none" : "block",
                  transform: "scaleX(-1)",
                }} muted playsInline />
              )}

              {/* Captured Image */}
              {capturedImage && (phase === "scanning" || phase === "result" || phase === "sticker") && (
                <img src={capturedImage} alt="Captured" style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  display: "block", transform: "scaleX(-1)",
                }} />
              )}

              {/* Idle State */}
              {!cameraOn && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 16, padding: 32,
                }}>
                  <div style={{ fontSize: 56 }}>📸</div>
                  <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, color: "#6B7280", textAlign: "center" }}>
                    Enable your camera to start mood scanning
                  </p>
                  <button className="btn-glass btn-primary" onClick={startCamera} style={{
                    padding: "14px 32px", borderRadius: 50, fontSize: 15, fontWeight: 500, border: "none"
                  }}>
                    Start Camera ✦
                  </button>
                </div>
              )}

              {/* Scanning Overlay */}
              {phase === "scanning" && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(139,92,246,0.08)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {/* Scan rings */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="scan-ring" style={{
                      position: "absolute",
                      width: `${140 + i * 55}px`,
                      height: `${140 + i * 55}px`,
                      border: `2px solid rgba(139,92,246,${0.5 - i * 0.12})`,
                      borderRadius: "50%",
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                  {/* Scan line */}
                  <div className="scan-line" style={{
                    position: "absolute", left: "10%", right: "10%", height: 2,
                    background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.8), transparent)",
                  }} />
                  <div style={{
                    fontFamily: "'Sora', sans-serif",
                    color: "rgba(139,92,246,0.9)", fontSize: 13, fontWeight: 500,
                    position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center"
                  }}>
                    Analyzing vibes... {scanProgress}%
                  </div>
                </div>
              )}

              {/* Result Emoji Overlay */}
              {phase === "result" && moodData && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: 20,
                  background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
                  display: "flex", alignItems: "flex-end", justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{ fontSize: 52, lineHeight: 1 }} className="emoji-bounce">{moodData.emoji}</div>
                    <div style={{
                      color: "white", fontWeight: 600, fontSize: 18,
                      textShadow: "0 1px 4px rgba(0,0,0,0.5)"
                    }}>{moodData.moodLabel}</div>
                  </div>
                  <div className="glass" style={{
                    padding: "6px 14px", borderRadius: 20,
                    fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 500,
                    color: "#7C3AED", background: "rgba(255,255,255,0.8)"
                  }}>
                    {moodData.intensity}/10 ⚡
                  </div>
                </div>
              )}

              {/* Scan frame corners */}
              {cameraOn && phase === "idle" && (
                <>
                  {[
                    { top: 16, left: 16, borderTop: "2px solid rgba(139,92,246,0.5)", borderLeft: "2px solid rgba(139,92,246,0.5)" },
                    { top: 16, right: 16, borderTop: "2px solid rgba(139,92,246,0.5)", borderRight: "2px solid rgba(139,92,246,0.5)" },
                    { bottom: 16, left: 16, borderBottom: "2px solid rgba(139,92,246,0.5)", borderLeft: "2px solid rgba(139,92,246,0.5)" },
                    { bottom: 16, right: 16, borderBottom: "2px solid rgba(139,92,246,0.5)", borderRight: "2px solid rgba(139,92,246,0.5)" },
                  ].map((s, i) => (
                    <div key={i} style={{ position: "absolute", width: 24, height: 24, ...s }} />
                  ))}
                </>
              )}

              {/* Progress bar */}
              {phase === "scanning" && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.2)" }}>
                  <div className="progress-bar" style={{
                    height: "100%", width: `${scanProgress}%`,
                    background: "linear-gradient(90deg, #7C3AED, #6366F1)",
                  }} />
                </div>
              )}
            </div>

            {/* Result / Info Panel */}
            <div style={{ flex: "1 1 300px", maxWidth: 360, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Controls */}
              {cameraOn && phase === "idle" && (
                <div className="glass fade-in" style={{ borderRadius: 24, padding: 28, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                  <h3 style={{ fontSize: 22, fontWeight: 400, marginBottom: 8, color: "#1a0533" }}>Ready to scan</h3>
                  <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
                    Position your face in the frame and hit scan
                  </p>
                  <button className="btn-glass btn-primary" onClick={scanFace} style={{
                    width: "100%", padding: "15px", borderRadius: 50, fontSize: 15, fontWeight: 500, border: "none"
                  }}>
                    ✦ Scan My Vibe
                  </button>
                </div>
              )}

              {phase === "scanning" && (
                <div className="glass fade-in" style={{ borderRadius: 24, padding: 28, textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12, animation: "spin 2s linear infinite" }}>🔮</div>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  <h3 style={{ fontSize: 20, fontWeight: 400, marginBottom: 6, color: "#1a0533" }}>Reading your soul...</h3>
                  <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, color: "#6B7280" }}>AI is analyzing your facial energy</p>
                </div>
              )}

              {/* Mood Result Card */}
              {(phase === "result" || phase === "sticker") && moodData && (
                <div className="glass fade-in" style={{ borderRadius: 24, padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 40 }}>{moodData.emoji}</div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "#1a0533" }}>{moodData.moodLabel}</div>
                      <div style={{
                        fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 500,
                        letterSpacing: 2, textTransform: "uppercase", color: "#7C3AED"
                      }}>{moodData.mood}</div>
                    </div>
                  </div>
                  <p style={{
                    fontFamily: "'Sora', sans-serif", fontSize: 13, color: "#4B5563",
                    lineHeight: 1.6, borderTop: "1px solid rgba(139,92,246,0.1)", paddingTop: 14, marginBottom: 14
                  }}>
                    {moodData.description}
                  </p>
                  {/* Intensity Bar */}
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, color: "#9CA3AF", marginBottom: 6, fontWeight: 500, letterSpacing: 1 }}>
                    INTENSITY LEVEL
                  </div>
                  <div style={{ background: "rgba(139,92,246,0.1)", borderRadius: 10, height: 6, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 10,
                      width: `${moodData.intensity * 10}%`,
                      background: "linear-gradient(90deg, #7C3AED, #C084FC)",
                      transition: "width 1s ease"
                    }} />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {phase === "result" && moodData && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="btn-glass btn-primary" onClick={generateSticker} style={{
                    padding: "14px", borderRadius: 50, fontSize: 14, fontWeight: 500, border: "none"
                  }}>
                    ✦ Make My Meme Sticker
                  </button>
                  <button className="btn-glass" onClick={() => { setPhase("idle"); setCapturedImage(null); setMoodData(null); }} style={{
                    padding: "12px", borderRadius: 50, fontSize: 13, color: "#6B7280"
                  }}>
                    ↩ Scan Again
                  </button>
                </div>
              )}

              {phase === "sticker" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="btn-glass btn-primary" onClick={downloadSticker} style={{
                    padding: "14px", borderRadius: 50, fontSize: 14, fontWeight: 500, border: "none"
                  }}>
                    ⬇ Download Sticker
                  </button>
                  <button className="btn-glass" onClick={() => { setPhase("idle"); setCapturedImage(null); setMoodData(null); setStickerReady(false); setSelectedMeme(null); }} style={{
                    padding: "12px", borderRadius: 50, fontSize: 13, color: "#6B7280"
                  }}>
                    ↩ Start Over
                  </button>
                </div>
              )}

              {cameraOn && (
                <button className="btn-glass" onClick={stopCamera} style={{
                  padding: "10px", borderRadius: 50, fontSize: 13, color: "#EF4444", marginTop: "auto"
                }}>
                  ✕ Turn Off Camera
                </button>
              )}
            </div>
          </div>

          {/* Meme Selector */}
          {(phase === "result" || phase === "sticker") && moodData && (
            <div className="fade-in" style={{ marginTop: 28 }}>
              <div className="glass" style={{ borderRadius: 28, padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 400, color: "#1a0533" }}>Choose Your Meme Vibe</h3>
                  {selectedMeme && (
                    <div className="glass-dark" style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontFamily: "'Sora', sans-serif", color: "#7C3AED", fontWeight: 500 }}>
                      AI Pick: {moodData.recommendedMeme} ✦
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))", gap: 12 }}>
                  {MEME_TEMPLATES.map((meme) => (
                    <div
                      key={meme.id}
                      className={`meme-card glass ${selectedMeme?.id === meme.id ? "selected" : ""}`}
                      onClick={() => setSelectedMeme(meme)}
                      style={{
                        borderRadius: 18, padding: 14, textAlign: "center",
                        cursor: "pointer",
                        borderColor: selectedMeme?.id === meme.id ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.75)",
                      }}
                    >
                      <div style={{
                        fontSize: 28, marginBottom: 6,
                        filter: selectedMeme?.id === meme.id ? "none" : "grayscale(20%)"
                      }}>
                        {meme.emoji}
                      </div>
                      <div style={{
                        fontFamily: "'Sora', sans-serif", fontSize: 10, fontWeight: 600,
                        letterSpacing: 0.5, color: selectedMeme?.id === meme.id ? "#7C3AED" : "#6B7280",
                        lineHeight: 1.3
                      }}>
                        {meme.name}
                      </div>
                    </div>
                  ))}
                </div>
                {moodData.memeReason && selectedMeme && (
                  <div style={{
                    marginTop: 16, padding: "12px 16px",
                    background: "rgba(139,92,246,0.06)", borderRadius: 14,
                    fontFamily: "'Sora', sans-serif", fontSize: 13, color: "#6B7280",
                    display: "flex", alignItems: "center", gap: 10
                  }}>
                    <span style={{ fontSize: 18 }}>💬</span>
                    <em>{moodData.memeReason}</em>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sticker Preview */}
          {phase === "sticker" && (
            <div className="fade-in" style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
              <div className="glass" style={{ borderRadius: 28, padding: 28, textAlign: "center", maxWidth: 480 }}>
                <h3 style={{ fontSize: 22, fontWeight: 400, marginBottom: 20, color: "#1a0533" }}>Your Meme Sticker ✦</h3>
                <canvas ref={stickerCanvasRef} style={{
                  borderRadius: 20, maxWidth: "100%", display: "block", margin: "0 auto",
                  boxShadow: "0 16px 60px rgba(139,92,246,0.25)",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvases */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Footer */}
        <footer style={{
          textAlign: "center", fontFamily: "'Sora', sans-serif",
          fontSize: 12, color: "#9CA3AF", letterSpacing: 1
        }}>
          ✦ MOODSCAN · Powered by Claude Vision AI · All vibes analyzed locally ✦
        </footer>
      </div>
    </div>
  );
}
