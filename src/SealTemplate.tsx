import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Invitation, TextStyle, CustomFont } from "./types"
import { submitRSVP } from "./backend"
import {
  EditModeProvider,
  DeselectSurface,
  EditableText,
  EditableBackground,
  EditPanel,
  BackgroundsMenu,
} from "./LiveEditor"

// ─────────────────────────────────────────────────────────────────────────────
// القالب الرابع "ختم الشمع" — ظرف فاخر مغلق بختم شمع بحرفي العروسين. الضيف
// يلمس الختم فينكسر، يُفتح الظرف، وتظهر الدعوة. اسم الضيف (?guest=الاسم)
// يُكتب بخط اليد. داخل الدعوة: عدّ تنازلي حقيقي، برنامج الحفل بخط يُرسم مع
// التمرير، زر إضافة للتقويم، اتجاهات الخريطة، وتأكيد الحضور.
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  wine: "#2a0e14",
  wineDeep: "#190709",
  wineSoft: "#4a1a24",
  wax: "#8a1f2b",
  waxDark: "#5e1019",
  gold: "#d2ac55",
  goldLight: "#f1d98f",
  ivory: "#f7f0e2",
  ivoryDark: "#e9dcc3",
  ink: "#3a2118",
}

const SCRIPT = "'Aref Ruqaa', 'Amiri', serif"
const SERIF = "'Amiri', 'Noto Naskh Arabic', serif"
const BODY = "'Noto Naskh Arabic', 'Noto Sans Arabic', sans-serif"

const DEFAULT_SCHEDULE = [
  { label: "استقبال الضيوف", time: "٧:٠٠ مساءً" },
  { label: "عقد القران", time: "٧:٣٠ مساءً" },
  { label: "العشاء", time: "٩:٠٠ مساءً" },
]

// ─── أدوات صغيرة ─────────────────────────────────────────────────────────────

function useFonts() {
  useEffect(() => {
    const id = "seal-template-fonts"
    if (document.getElementById(id)) return
    const link = document.createElement("link")
    link.id = id
    link.rel = "stylesheet"
    link.href =
      "https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Amiri:wght@400;700&display=swap"
    document.head.appendChild(link)
  }, [])
}

function useInView<T extends HTMLElement>(once = true) {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true)
            if (once) io.disconnect()
          } else if (!once) setSeen(false)
        }
      },
      { threshold: 0.18 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once])
  return [ref, seen] as const
}

function Appear({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode
  delay?: number
  style?: React.CSSProperties
}) {
  const [ref, seen] = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "none" : "translateY(18px)",
        transition: `opacity 900ms ease ${delay}ms, transform 900ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// نص يُكتب بخط اليد: يُكشف من اليمين لليسار مع قلم ذهبي صغير يمشي مع الكتابة.
function HandWrite({
  text,
  size = 30,
  color = C.goldLight,
  duration = 2200,
  delay = 0,
  play = true,
}: {
  text: string
  size?: number
  color?: string
  duration?: number
  delay?: number
  play?: boolean
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        fontFamily: SCRIPT,
        fontSize: size,
        color,
        lineHeight: 1.6,
        padding: "0 4px",
        clipPath: play ? undefined : "inset(0 0 0 100%)",
        animation: play
          ? `seal-write ${duration}ms steps(28, end) ${delay}ms both`
          : undefined,
        textShadow: "0 0 18px rgba(210,172,85,.35)",
      }}
    >
      {text}
    </span>
  )
}

function Ornament({ width = 180, color = C.gold }: { width?: number; color?: string }) {
  return (
    <svg
      width={width}
      height={20}
      viewBox="0 0 180 20"
      fill="none"
      stroke={color}
      strokeWidth="1"
      aria-hidden
      style={{ display: "block", margin: "0 auto" }}
    >
      <path d="M2 10 H70" />
      <path d="M110 10 H178" />
      <path d="M90 2 L98 10 L90 18 L82 10 Z" fill={color} fillOpacity=".18" />
      <circle cx="74" cy="10" r="1.6" fill={color} />
      <circle cx="106" cy="10" r="1.6" fill={color} />
    </svg>
  )
}

function CornerFrame({ color = C.gold }: { color?: string }) {
  const corner = (rot: number, style: React.CSSProperties) => (
    <svg
      width="46"
      height="46"
      viewBox="0 0 46 46"
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      style={{ position: "absolute", transform: `rotate(${rot}deg)`, ...style }}
      aria-hidden
    >
      <path d="M2 44 V10 Q2 2 10 2 H44" />
      <path d="M9 44 V16 Q9 9 16 9 H44" opacity=".5" />
      <circle cx="6" cy="6" r="2" fill={color} />
    </svg>
  )
  return (
    <>
      {corner(0, { top: 10, left: 10 })}
      {corner(90, { top: 10, right: 10 })}
      {corner(180, { bottom: 10, right: 10 })}
      {corner(270, { bottom: 10, left: 10 })}
    </>
  )
}

function parseEvent(inv: Invitation): Date | null {
  if (!inv.eventDateTime) return null
  const d = new Date(inv.eventDateTime)
  return Number.isNaN(d.getTime()) ? null : d
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function icsStamp(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function escapeIcs(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

function toArabicDigits(s: string | number) {
  return String(s).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
}

function mapLink(inv: Invitation) {
  const raw = (inv.mapUrl || "").trim()
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw) return `https://${raw}`
  const q = encodeURIComponent([inv.venue, inv.city].filter(Boolean).join(" "))
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

// ─── المكوّن الرئيسي ─────────────────────────────────────────────────────────

export default function SealTemplateView({
  inv,
  editable = false,
  onStylesChange,
  customFonts = [],
  skipIntro = false,
}: {
  inv: Invitation
  editable?: boolean
  onStylesChange?: (styles: Record<string, TextStyle>) => void
  customFonts?: CustomFont[]
  skipIntro?: boolean
}) {
  useFonts()

  const guest = useMemo(() => {
    try {
      return (new URLSearchParams(window.location.search).get("guest") || "").trim().slice(0, 40)
    } catch {
      return ""
    }
  }, [])

  const introRemoved = !!inv.textStyles?.["intro-removed"]?.hidden
  const startsOpened = skipIntro || editable || introRemoved
  // phase: closed → breaking (الختم ينكسر) → opening (الظرف يفتح) → open
  const [phase, setPhase] = useState<"closed" | "breaking" | "opening" | "open">(
    startsOpened ? "open" : "closed",
  )
  const [introGone, setIntroGone] = useState(startsOpened)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const playCrack = () => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      if (!audioCtxRef.current) audioCtxRef.current = new AC()
      const ctx = audioCtxRef.current!
      if (ctx.state === "suspended") ctx.resume()
      const len = Math.floor(ctx.sampleRate * 0.22)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        const t = i / len
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3) * (i % 37 < 3 ? 1 : 0.35)
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      const filter = ctx.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.value = 2400
      const gain = ctx.createGain()
      gain.gain.value = 0.7
      src.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      src.start()
    } catch {
      // الصوت اختياري
    }
  }

  const startMusic = () => {
    const a = audioRef.current
    if (!a || !inv.musicUrl) return
    a.volume = 0.7
    a.play().catch(() => {})
  }

  const breakSeal = () => {
    if (phase !== "closed") return
    playCrack()
    startMusic()
    try {
      navigator.vibrate?.(35)
    } catch {
      // بعض المتصفحات ما تدعم الاهتزاز
    }
    setPhase("breaking")
    window.setTimeout(() => setPhase("opening"), 750)
    window.setTimeout(() => setPhase("open"), 2300)
    window.setTimeout(() => setIntroGone(true), 3400)
  }

  // لو فتحت الدعوة مباشرة (تخطي المقدمة) نحاول تشغيل الموسيقى مع أول لمسة
  useEffect(() => {
    if (!startsOpened || editable || !inv.musicUrl) return
    const start = () => {
      audioRef.current?.play().catch(() => {})
      cleanup()
    }
    const evs = ["pointerdown", "touchend", "keydown"] as const
    const cleanup = () => evs.forEach((e) => window.removeEventListener(e, start))
    evs.forEach((e) => window.addEventListener(e, start, { passive: true }))
    return cleanup
  }, [startsOpened, editable, inv.musicUrl])

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
  }, [muted])

  const replayIntro = () => {
    setIntroGone(false)
    setPhase("closed")
  }

  // العدّ التنازلي
  const eventDate = useMemo(() => parseEvent(inv), [inv.eventDateTime])
  const calc = () => {
    if (!eventDate) return { d: 0, h: 0, m: 0, s: 0, done: false, none: true }
    const diff = eventDate.getTime() - Date.now()
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true, none: false }
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff / 3600000) % 24),
      m: Math.floor((diff / 60000) % 60),
      s: Math.floor((diff / 1000) % 60),
      done: false,
      none: false,
    }
  }
  const [left, setLeft] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 1000)
    return () => clearInterval(t)
  }, [eventDate])

  const weekday = eventDate
    ? new Intl.DateTimeFormat("ar-IQ", { weekday: "long" }).format(eventDate)
    : ""

  // إضافة للتقويم
  const calTitle = `زواج ${inv.groom} و${inv.bride}`
  const calLocation = [inv.venue, inv.city].filter(Boolean).join(" - ")
  const addToCalendar = () => {
    if (!eventDate) return
    const end = new Date(eventDate.getTime() + 4 * 3600000)
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sama Invite//AR",
      "BEGIN:VEVENT",
      `UID:${inv.id}-${eventDate.getTime()}@samainvite.com`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(eventDate)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${escapeIcs(calTitle)}`,
      `LOCATION:${escapeIcs(calLocation)}`,
      `DESCRIPTION:${escapeIcs(`دعوة زواج ${inv.groom} و${inv.bride}`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT3H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(calTitle)}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "wedding-invitation.ics"
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const googleCalUrl = eventDate
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calTitle)}&dates=${icsStamp(eventDate)}/${icsStamp(new Date(eventDate.getTime() + 4 * 3600000))}&location=${encodeURIComponent(calLocation)}`
    : ""

  // تأكيد الحضور
  const [rsvpName, setRsvpName] = useState(guest)
  const [attendance, setAttendance] = useState<"نعم" | "لا">("نعم")
  const [companions, setCompanions] = useState(0)
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [rsvpError, setRsvpError] = useState("")

  const sendRsvp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rsvpName.trim()) {
      setRsvpError("اكتب الاسم من فضلك")
      return
    }
    setRsvpError("")
    setSending(true)
    if (inv.sheetId) {
      const r = await submitRSVP({
        sheetId: inv.sheetId,
        name: rsvpName.trim(),
        attendance,
        companions,
        message: note.trim(),
      })
      setSending(false)
      if (!r.success) {
        setRsvpError("تعذّر الإرسال، حاول مرة ثانية")
        return
      }
    } else {
      setSending(false)
    }
    setSent(true)
  }

  const schedule = (inv.schedule && inv.schedule.some((s) => s.label || s.time)
    ? inv.schedule
    : DEFAULT_SCHEDULE
  ).filter((s) => s.label || s.time)

  const initials = [inv.groom, inv.bride]
    .map((n) => (n || "").trim().charAt(0))
    .filter(Boolean)

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: inv.title, url })
      else {
        await navigator.clipboard.writeText(url)
        alert("تم نسخ رابط الدعوة ✓")
      }
    } catch {
      // المستخدم أغلق نافذة المشاركة
    }
  }

  const sectionBase: React.CSSProperties = {
    position: "relative",
    padding: "64px 24px",
    textAlign: "center",
  }

  const goldBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 22px",
    borderRadius: 999,
    border: `1px solid ${C.gold}`,
    background: `linear-gradient(135deg, ${C.gold}, #b98a32)`,
    color: C.wineDeep,
    fontFamily: BODY,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 6px 20px rgba(210,172,85,.25)",
  }
  const ghostBtn: React.CSSProperties = {
    ...goldBtn,
    background: "transparent",
    color: C.goldLight,
    boxShadow: "none",
  }

  const showIntro = !introGone

  return (
    <EditModeProvider
      editable={editable}
      initialStyles={inv.textStyles || {}}
      onStylesChange={onStylesChange}
      customFonts={customFonts}
    >
      <style>{`
        @keyframes seal-write { from { clip-path: inset(0 0 0 100%); } to { clip-path: inset(0 0 0 0); } }
        @keyframes seal-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(210,172,85,.45), 0 10px 26px rgba(0,0,0,.5); } 50% { box-shadow: 0 0 0 16px rgba(210,172,85,0), 0 10px 26px rgba(0,0,0,.5); } }
        @keyframes seal-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes seal-dust { 0% { transform: translateY(20px) scale(.6); opacity: 0; } 20% { opacity: .9; } 100% { transform: translateY(-110vh) scale(1); opacity: 0; } }
        @keyframes seal-shard { 0% { transform: translate(0,0) rotate(0); opacity: 1; } 100% { transform: translate(var(--x), var(--y)) rotate(var(--r)); opacity: 0; } }
        @keyframes seal-glow { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        @keyframes seal-draw { to { stroke-dashoffset: 0; } }
        @keyframes seal-tick { 0% { transform: translateY(-30%); opacity: 0; } 100% { transform: none; opacity: 1; } }
        .seal-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        dir="rtl"
        style={{
          position: "relative",
          flex: 1,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: C.wineDeep,
          color: C.ivory,
          fontFamily: BODY,
        }}
      >
        {inv.musicUrl && <audio ref={audioRef} src={inv.musicUrl} loop preload="auto" />}

        <DeselectSurface>
          <div
            ref={scrollRef}
            className="seal-scroll"
            style={{
              position: "absolute",
              inset: 0,
              overflowY: showIntro && phase !== "open" ? "hidden" : "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorY: "contain",
              touchAction: "pan-y",
              scrollbarWidth: "none",
              background: `radial-gradient(120% 80% at 50% 0%, ${C.wineSoft} 0%, ${C.wine} 45%, ${C.wineDeep} 100%)`,
            }}
          >
            {/* ── الغلاف / القسم الأول ───────────────────────────── */}
            <EditableBackground
              id="bg-seal-hero"
              className=""
              style={{
                ...sectionBase,
                minHeight: "100dvh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                paddingTop: 70,
              }}
            >
              <CornerFrame />
              <Appear>
                <EditableText
                  id="seal-hero-kicker"
                  as="p"
                  className=""
                  style={{ fontFamily: BODY, letterSpacing: 2, color: C.gold, fontSize: 13 }}
                >
                  بسم الله الرحمن الرحيم
                </EditableText>
              </Appear>
              <Appear delay={150}>
                <Ornament />
              </Appear>
              <Appear delay={250}>
                <EditableText
                  id="seal-hero-lead"
                  as="p"
                  className=""
                  style={{ fontFamily: SERIF, fontSize: 18, color: C.ivoryDark, opacity: 0.9 }}
                >
                  يتشرف بدعوتكم لحضور حفل زفاف
                </EditableText>
              </Appear>
              <Appear delay={400}>
                <EditableText
                  id="seal-groom"
                  as="h1"
                  className=""
                  style={{
                    fontFamily: SCRIPT,
                    fontSize: "clamp(46px, 15vw, 78px)",
                    lineHeight: 1.25,
                    color: C.goldLight,
                    textShadow: "0 2px 30px rgba(210,172,85,.35)",
                  }}
                >
                  {inv.groom}
                </EditableText>
              </Appear>
              <Appear delay={550}>
                <div
                  style={{
                    fontFamily: SCRIPT,
                    fontSize: 34,
                    color: C.gold,
                    animation: "seal-glow 3.2s ease-in-out infinite",
                  }}
                >
                  &amp;
                </div>
              </Appear>
              <Appear delay={700}>
                <EditableText
                  id="seal-bride"
                  as="h1"
                  className=""
                  style={{
                    fontFamily: SCRIPT,
                    fontSize: "clamp(46px, 15vw, 78px)",
                    lineHeight: 1.25,
                    color: C.goldLight,
                    textShadow: "0 2px 30px rgba(210,172,85,.35)",
                  }}
                >
                  {inv.bride}
                </EditableText>
              </Appear>

              {guest && (
                <Appear delay={900}>
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontFamily: SERIF, fontSize: 15, color: C.ivoryDark, opacity: 0.8 }}>
                      حيّاكم الله
                    </p>
                    <HandWrite text={guest} size={34} play={phase === "open"} delay={500} />
                  </div>
                </Appear>
              )}

              <Appear delay={1000}>
                <div style={{ marginTop: 18, fontFamily: SERIF, color: C.ivory }}>
                  <EditableText
                    id="seal-hero-date"
                    as="p"
                    className=""
                    style={{ fontSize: 22, color: C.ivory }}
                  >
                    {weekday ? `${weekday} · ${inv.dateGreg}` : inv.dateGreg}
                  </EditableText>
                </div>
              </Appear>

              <div
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: 22,
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: C.gold,
                  fontSize: 11,
                  letterSpacing: 2,
                  opacity: 0.7,
                  animation: "seal-float 2.4s ease-in-out infinite",
                }}
              >
                ▾ اسحب للأسفل
              </div>
            </EditableBackground>

            {/* ── الآية ─────────────────────────────────────────── */}
            <EditableBackground id="bg-seal-verse" style={{ ...sectionBase, paddingTop: 36 }}>
              <Appear>
                <Ornament width={140} />
                <EditableText
                  id="seal-verse-text"
                  as="p"
                  className=""
                  style={{
                    fontFamily: SERIF,
                    fontSize: 21,
                    lineHeight: 2.1,
                    color: C.ivory,
                    margin: "18px auto",
                    maxWidth: 420,
                  }}
                >
                  {inv.verse}
                </EditableText>
                <EditableText
                  id="seal-verse-ref"
                  as="p"
                  className=""
                  style={{ fontFamily: BODY, fontSize: 12, color: C.gold }}
                >
                  سورة الروم · ٢١
                </EditableText>
              </Appear>
              {(inv.groomFamily || inv.brideFamily) && (
                <Appear delay={150} style={{ marginTop: 34 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                      maxWidth: 420,
                      margin: "0 auto",
                    }}
                  >
                    {[
                      { id: "seal-groom-family", t: inv.groomFamily, h: "العريس" },
                      { id: "seal-bride-family", t: inv.brideFamily, h: "العروس" },
                    ].map((f) => (
                      <div
                        key={f.id}
                        style={{
                          border: `1px solid rgba(210,172,85,.35)`,
                          borderRadius: 16,
                          padding: "16px 10px",
                          background: "rgba(255,255,255,.03)",
                        }}
                      >
                        <p style={{ color: C.gold, fontSize: 12, marginBottom: 6 }}>{f.h}</p>
                        <EditableText
                          id={f.id}
                          as="p"
                          className=""
                          style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.8 }}
                        >
                          {f.t}
                        </EditableText>
                      </div>
                    ))}
                  </div>
                </Appear>
              )}
            </EditableBackground>

            {/* ── العدّ التنازلي ───────────────────────────────── */}
            <EditableBackground id="bg-seal-countdown" style={sectionBase}>
              <Appear>
                <EditableText
                  id="seal-countdown-title"
                  as="h2"
                  className=""
                  style={{ fontFamily: SCRIPT, fontSize: 30, color: C.goldLight, marginBottom: 22 }}
                >
                  {left.done ? "حان موعد الفرح" : "باقي على الفرح"}
                </EditableText>
                {left.none ? null : (
                  <div style={{ display: "flex", justifyContent: "center", gap: 10, direction: "ltr" }}>
                    {[
                      { v: left.d, l: "يوم" },
                      { v: left.h, l: "ساعة" },
                      { v: left.m, l: "دقيقة" },
                      { v: left.s, l: "ثانية" },
                    ].map((x) => (
                      <div
                        key={x.l}
                        style={{
                          width: "clamp(64px, 20vw, 82px)",
                          padding: "14px 0 10px",
                          borderRadius: 16,
                          border: "1px solid rgba(210,172,85,.45)",
                          background: "linear-gradient(180deg, rgba(210,172,85,.14), rgba(210,172,85,.03))",
                          boxShadow: "inset 0 1px 0 rgba(241,217,143,.25)",
                        }}
                      >
                        <div
                          key={x.v}
                          style={{
                            fontFamily: SERIF,
                            fontSize: 30,
                            fontWeight: 700,
                            color: C.goldLight,
                            animation: "seal-tick 350ms ease-out",
                          }}
                        >
                          {toArabicDigits(pad(x.v))}
                        </div>
                        <div style={{ fontFamily: BODY, fontSize: 11, color: C.ivoryDark, marginTop: 2 }}>
                          {x.l}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Appear>
            </EditableBackground>

            {/* ── التفاصيل + البرنامج ─────────────────────────── */}
            <EditableBackground id="bg-seal-details" style={sectionBase}>
              <Appear>
                <div
                  style={{
                    maxWidth: 420,
                    margin: "0 auto",
                    borderRadius: 24,
                    padding: "28px 20px",
                    background: `linear-gradient(160deg, ${C.ivory}, ${C.ivoryDark})`,
                    color: C.ink,
                    boxShadow: "0 20px 60px rgba(0,0,0,.45)",
                    position: "relative",
                  }}
                >
                  <CornerFrame color="#b98a32" />
                  <EditableText
                    id="seal-details-title"
                    as="h2"
                    className=""
                    style={{ fontFamily: SCRIPT, fontSize: 28, color: C.waxDark, marginBottom: 14 }}
                  >
                    تفاصيل الحفل
                  </EditableText>
                  <div style={{ display: "grid", gap: 14, fontFamily: SERIF }}>
                    <div>
                      <p style={{ fontSize: 12, color: "#8a6a3a" }}>📅 التاريخ</p>
                      <p style={{ fontSize: 20, fontWeight: 700 }}>
                        {weekday ? `${weekday} ` : ""}
                        {inv.dateGreg}
                      </p>
                      {inv.date && <p style={{ fontSize: 14, opacity: 0.7 }}>{inv.date}</p>}
                    </div>
                    <div style={{ height: 1, background: "rgba(138,106,58,.3)" }} />
                    <div>
                      <p style={{ fontSize: 12, color: "#8a6a3a" }}>🕖 الوقت</p>
                      <p style={{ fontSize: 20, fontWeight: 700 }}>{inv.time}</p>
                    </div>
                    <div style={{ height: 1, background: "rgba(138,106,58,.3)" }} />
                    <div>
                      <p style={{ fontSize: 12, color: "#8a6a3a" }}>📍 المكان</p>
                      <p style={{ fontSize: 20, fontWeight: 700 }}>{inv.venue}</p>
                      {inv.city && <p style={{ fontSize: 14, opacity: 0.7 }}>{inv.city}</p>}
                    </div>
                  </div>
                </div>
              </Appear>

              <div style={{ maxWidth: 360, margin: "56px auto 0", position: "relative" }}>
                <Appear>
                  <EditableText
                    id="seal-schedule-title"
                    as="h2"
                    className=""
                    style={{ fontFamily: SCRIPT, fontSize: 30, color: C.goldLight, marginBottom: 26 }}
                  >
                    مسيرة الحفل
                  </EditableText>
                </Appear>
                <div style={{ position: "relative", paddingInlineStart: 0 }}>
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 8,
                      bottom: 8,
                      left: "50%",
                      width: 1,
                      background: `linear-gradient(${C.gold}, rgba(210,172,85,.1))`,
                      transform: "translateX(-50%)",
                    }}
                  />
                  {schedule.map((s, i) => (
                    <Appear key={i} delay={i * 80}>
                      <div
                        style={{
                          position: "relative",
                          display: "grid",
                          gridTemplateColumns: "1fr 28px 1fr",
                          alignItems: "center",
                          marginBottom: 26,
                        }}
                      >
                        <p
                          style={{
                            textAlign: "left",
                            fontFamily: SERIF,
                            fontSize: 16,
                            color: C.goldLight,
                            direction: "rtl",
                            paddingLeft: 4,
                          }}
                        >
                          {s.time}
                        </p>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            margin: "0 auto",
                            transform: "rotate(45deg)",
                            background: C.gold,
                            boxShadow: `0 0 0 4px ${C.wine}, 0 0 14px rgba(210,172,85,.7)`,
                          }}
                        />
                        <p
                          style={{
                            textAlign: "right",
                            fontFamily: SERIF,
                            fontSize: 17,
                            paddingRight: 4,
                          }}
                        >
                          {s.label}
                        </p>
                      </div>
                    </Appear>
                  ))}
                </div>
              </div>
            </EditableBackground>

            {/* ── الموقع + التقويم ─────────────────────────────── */}
            <EditableBackground id="bg-seal-actions" style={sectionBase}>
              <Appear>
                <EditableText
                  id="seal-actions-title"
                  as="h2"
                  className=""
                  style={{ fontFamily: SCRIPT, fontSize: 30, color: C.goldLight, marginBottom: 8 }}
                >
                  لا تفوّتوا الموعد
                </EditableText>
                <p style={{ fontFamily: SERIF, fontSize: 15, color: C.ivoryDark, marginBottom: 22 }}>
                  احفظوا الموعد بتقويمكم وخذوا الاتجاهات بضغطة وحدة
                </p>
                <div style={{ display: "grid", gap: 12, maxWidth: 320, margin: "0 auto" }}>
                  <a href={mapLink(inv)} target="_blank" rel="noopener noreferrer" style={goldBtn}>
                    🧭 الاتجاهات للقاعة
                  </a>
                  {eventDate && (
                    <>
                      <button type="button" onClick={addToCalendar} style={ghostBtn}>
                        📅 أضف الموعد للتقويم
                      </button>
                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...ghostBtn, fontSize: 12, padding: "8px 16px", opacity: 0.8 }}
                      >
                        أو افتحه بتقويم جوجل
                      </a>
                    </>
                  )}
                </div>
              </Appear>
            </EditableBackground>

            {/* ── تأكيد الحضور ─────────────────────────────────── */}
            <EditableBackground id="bg-seal-rsvp" style={sectionBase}>
              <Appear>
                <EditableText
                  id="seal-rsvp-title"
                  as="h2"
                  className=""
                  style={{ fontFamily: SCRIPT, fontSize: 30, color: C.goldLight, marginBottom: 6 }}
                >
                  تأكيد الحضور
                </EditableText>
                <p style={{ fontFamily: SERIF, fontSize: 15, color: C.ivoryDark, marginBottom: 22 }}>
                  يسعدنا تأكيدكم حتى نجهّز لكم أحلى استقبال
                </p>
                {sent ? (
                  <div
                    style={{
                      maxWidth: 360,
                      margin: "0 auto",
                      padding: "28px 18px",
                      borderRadius: 20,
                      border: "1px solid rgba(210,172,85,.5)",
                      background: "rgba(210,172,85,.08)",
                    }}
                  >
                    <div style={{ fontSize: 38, marginBottom: 8 }}>✨</div>
                    <p style={{ fontFamily: SCRIPT, fontSize: 24, color: C.goldLight }}>
                      شكراً لكم
                    </p>
                    <p style={{ fontFamily: SERIF, fontSize: 15, marginTop: 6 }}>
                      {attendance === "نعم" ? "تم تأكيد حضوركم، بانتظاركم!" : "وصلنا ردّكم، نشكر لكم اهتمامكم"}
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={sendRsvp}
                    style={{
                      maxWidth: 360,
                      margin: "0 auto",
                      display: "grid",
                      gap: 12,
                      textAlign: "right",
                    }}
                  >
                    {(() => {
                      const field: React.CSSProperties = {
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(210,172,85,.4)",
                        background: "rgba(255,255,255,.05)",
                        color: C.ivory,
                        fontFamily: BODY,
                        fontSize: 15,
                        outline: "none",
                      }
                      return (
                        <>
                          <input
                            style={field}
                            value={rsvpName}
                            onChange={(e) => setRsvpName(e.target.value)}
                            placeholder="الاسم الكريم"
                          />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {(["نعم", "لا"] as const).map((v) => (
                              <button
                                type="button"
                                key={v}
                                onClick={() => setAttendance(v)}
                                style={{
                                  ...field,
                                  cursor: "pointer",
                                  textAlign: "center",
                                  fontWeight: 700,
                                  background:
                                    attendance === v
                                      ? `linear-gradient(135deg, ${C.gold}, #b98a32)`
                                      : "rgba(255,255,255,.05)",
                                  color: attendance === v ? C.wineDeep : C.ivory,
                                }}
                              >
                                {v === "نعم" ? "✓ سأحضر" : "✕ أعتذر"}
                              </button>
                            ))}
                          </div>
                          {attendance === "نعم" && (
                            <div
                              style={{
                                ...field,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>عدد المرافقين</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <button
                                  type="button"
                                  onClick={() => setCompanions((c) => Math.max(0, c - 1))}
                                  style={{ ...ghostBtn, padding: "2px 12px", fontSize: 18 }}
                                >
                                  −
                                </button>
                                <b style={{ minWidth: 18, textAlign: "center", fontSize: 18 }}>
                                  {toArabicDigits(companions)}
                                </b>
                                <button
                                  type="button"
                                  onClick={() => setCompanions((c) => Math.min(10, c + 1))}
                                  style={{ ...ghostBtn, padding: "2px 12px", fontSize: 18 }}
                                >
                                  +
                                </button>
                              </span>
                            </div>
                          )}
                          <textarea
                            style={{ ...field, minHeight: 80, resize: "vertical" }}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="كلمة تهنئة أو ملاحظة (اختياري)"
                          />
                          {rsvpError && (
                            <p style={{ color: "#ff9a9a", fontSize: 13 }}>{rsvpError}</p>
                          )}
                          <button type="submit" disabled={sending} style={{ ...goldBtn, opacity: sending ? 0.7 : 1 }}>
                            {sending ? "جارٍ الإرسال..." : "إرسال الرد"}
                          </button>
                        </>
                      )
                    })()}
                  </form>
                )}
              </Appear>
            </EditableBackground>

            {/* ── الختام ───────────────────────────────────────── */}
            <EditableBackground id="bg-seal-footer" style={{ ...sectionBase, paddingBottom: 90 }}>
              <Appear>
                <Ornament />
                <EditableText
                  id="seal-footer-text"
                  as="p"
                  className=""
                  style={{ fontFamily: SCRIPT, fontSize: 26, color: C.goldLight, margin: "18px 0 6px" }}
                >
                  بحضوركم تكتمل فرحتنا
                </EditableText>
                <p style={{ fontFamily: SERIF, fontSize: 18 }}>
                  {inv.groom} &amp; {inv.bride}
                </p>
                <button type="button" onClick={share} style={{ ...ghostBtn, marginTop: 22, fontSize: 13 }}>
                  📤 شارك الدعوة
                </button>
              </Appear>
            </EditableBackground>
          </div>
        </DeselectSurface>

        {/* زر الموسيقى */}
        {inv.musicUrl && phase === "open" && (
          <button
            type="button"
            onClick={() => {
              if (audioRef.current?.paused) audioRef.current.play().catch(() => {})
              setMuted((m) => !m)
            }}
            aria-label="الصوت"
            style={{
              position: "absolute",
              bottom: 16,
              insetInlineEnd: 16,
              zIndex: 30,
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: `1px solid ${C.gold}`,
              background: "rgba(25,7,9,.7)",
              backdropFilter: "blur(6px)",
              color: C.goldLight,
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            {muted ? "🔇" : "🎵"}
          </button>
        )}

        {editable && (
          <button
            type="button"
            onClick={replayIntro}
            style={{
              position: "absolute",
              top: 10,
              insetInlineStart: 10,
              zIndex: 90,
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${C.gold}`,
              background: "rgba(25,7,9,.85)",
              color: C.goldLight,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔄 عرض الظرف من البداية
          </button>
        )}

        {/* ── مشهد الظرف ─────────────────────────────────────────── */}
        {showIntro && (
          <div
            onClick={breakSeal}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 80,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 26,
              background: `radial-gradient(110% 80% at 50% 30%, ${C.wineSoft} 0%, ${C.wine} 50%, ${C.wineDeep} 100%)`,
              opacity: phase === "open" ? 0 : 1,
              transition: "opacity 1000ms ease",
              pointerEvents: phase === "open" ? "none" : "auto",
              cursor: phase === "closed" ? "pointer" : "default",
              overflow: "hidden",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* غبار ذهبي */}
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: -10,
                  left: `${(i * 37 + 11) % 100}%`,
                  width: 3 + (i % 3),
                  height: 3 + (i % 3),
                  borderRadius: "50%",
                  background: C.goldLight,
                  boxShadow: `0 0 8px ${C.gold}`,
                  opacity: 0,
                  animation: `seal-dust ${9 + (i % 5) * 2}s linear ${(i * 0.9) % 7}s infinite`,
                }}
              />
            ))}

            <div style={{ textAlign: "center", minHeight: 74 }}>
              <p style={{ fontFamily: SERIF, fontSize: 14, color: C.gold, letterSpacing: 2, marginBottom: 4 }}>
                {guest ? "دعوة خاصة إلى" : "دعوة زفاف"}
              </p>
              {guest ? (
                <HandWrite text={guest} size={38} delay={400} />
              ) : (
                <p style={{ fontFamily: SCRIPT, fontSize: 32, color: C.goldLight }}>
                  {inv.groom} &amp; {inv.bride}
                </p>
              )}
            </div>

            {/* الظرف */}
            <div
              style={{
                position: "relative",
                width: "min(84vw, 340px)",
                aspectRatio: "3 / 2",
                perspective: 900,
                animation: phase === "closed" ? "seal-float 3.6s ease-in-out infinite" : undefined,
                filter: "drop-shadow(0 24px 40px rgba(0,0,0,.55))",
              }}
            >
              {/* خلفية الظرف */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 6,
                  background: `linear-gradient(160deg, ${C.ivoryDark}, #d9c8a6)`,
                }}
              />
              {/* البطاقة داخل الظرف */}
              <div
                style={{
                  position: "absolute",
                  left: "7%",
                  right: "7%",
                  top: "8%",
                  bottom: "10%",
                  borderRadius: 4,
                  background: C.ivory,
                  border: `1px solid ${C.gold}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  color: C.wax,
                  transform:
                    phase === "opening" || phase === "open" ? "translateY(-62%)" : "translateY(0)",
                  transition: "transform 1200ms cubic-bezier(.3,.7,.2,1) 450ms",
                  zIndex: 2,
                }}
              >
                <span style={{ fontFamily: SCRIPT, fontSize: 22 }}>
                  {inv.groom} &amp; {inv.bride}
                </span>
                <span style={{ fontFamily: SERIF, fontSize: 11, color: "#8a6a3a" }}>{inv.dateGreg}</span>
              </div>
              {/* جيوب الظرف الأمامية */}
              <svg
                viewBox="0 0 300 200"
                preserveAspectRatio="none"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 3 }}
                aria-hidden
              >
                <polygon points="0,0 0,200 160,105" fill="#e3d3b2" />
                <polygon points="300,0 300,200 140,105" fill="#e8d9ba" />
                <polygon points="0,200 150,98 300,200" fill="#efe2c6" />
                <path d="M0 200 L150 98 L300 200" fill="none" stroke="rgba(138,106,58,.35)" />
              </svg>
              {/* الغطاء */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: "58%",
                  transformOrigin: "50% 0%",
                  transform:
                    phase === "opening" || phase === "open" ? "rotateX(180deg)" : "rotateX(0deg)",
                  transition: "transform 900ms cubic-bezier(.5,0,.2,1) 150ms",
                  zIndex: phase === "opening" || phase === "open" ? 1 : 4,
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                    background: `linear-gradient(180deg, #f2e6cc, #dccaa5)`,
                    backfaceVisibility: "hidden",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                    background: `linear-gradient(0deg, #cdb98f, #e6d6b3)`,
                    transform: "rotateX(180deg)",
                    backfaceVisibility: "hidden",
                  }}
                />
              </div>

              {/* ختم الشمع */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "58%",
                  width: 78,
                  height: 78,
                  marginLeft: -39,
                  marginTop: -39,
                  zIndex: 6,
                  opacity: phase === "opening" || phase === "open" ? 0 : 1,
                  transition: "opacity 400ms ease",
                  animation: phase === "closed" ? "seal-pulse 2.4s ease-in-out infinite" : undefined,
                  borderRadius: "50%",
                }}
              >
                {(["l", "r"] as const).map((side) => {
                  const broken = phase !== "closed"
                  const left = side === "l"
                  return (
                    <div
                      key={side}
                      style={{
                        position: "absolute",
                        inset: 0,
                        clipPath: left
                          ? "polygon(0 0, 56% 0, 46% 22%, 54% 45%, 44% 70%, 52% 100%, 0 100%)"
                          : "polygon(56% 0, 100% 0, 100% 100%, 52% 100%, 44% 70%, 54% 45%, 46% 22%)",
                        transform: broken
                          ? `translate(${left ? -26 : 26}px, 22px) rotate(${left ? -22 : 22}deg)`
                          : "none",
                        opacity: broken ? 0 : 1,
                        transition: "transform 800ms cubic-bezier(.4,0,.6,1), opacity 800ms ease 150ms",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50% 46% 52% 48% / 48% 52% 46% 50%",
                          background: `radial-gradient(circle at 35% 30%, #c2414f 0%, ${C.wax} 45%, ${C.waxDark} 100%)`,
                          boxShadow: "inset 0 -4px 8px rgba(0,0,0,.35), inset 0 3px 6px rgba(255,255,255,.18)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 9,
                          borderRadius: "50%",
                          border: "1.5px solid rgba(241,217,143,.55)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: SCRIPT,
                          fontSize: initials.length > 1 ? 24 : 30,
                          color: C.goldLight,
                          textShadow: "0 1px 0 rgba(0,0,0,.5), 0 0 8px rgba(241,217,143,.35)",
                          direction: "rtl",
                        }}
                      >
                        {initials.join("·")}
                      </div>
                    </div>
                  )
                })}
                {/* شظايا الشمع */}
                {phase !== "closed" &&
                  [
                    [-60, -40, -120],
                    [64, -46, 140],
                    [-48, 52, 90],
                    [56, 58, -100],
                    [4, -66, 60],
                    [-8, 70, -70],
                  ].map(([x, y, r], i) => (
                    <span
                      key={i}
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 8 + (i % 3) * 3,
                        height: 6 + (i % 2) * 3,
                        borderRadius: "40% 60% 50% 50%",
                        background: C.wax,
                        ["--x" as any]: `${x}px`,
                        ["--y" as any]: `${y}px`,
                        ["--r" as any]: `${r}deg`,
                        animation: "seal-shard 900ms ease-out forwards",
                      }}
                    />
                  ))}
              </div>
            </div>

            <p
              style={{
                fontFamily: SERIF,
                fontSize: 15,
                color: C.ivoryDark,
                opacity: phase === "closed" ? 0.85 : 0,
                transition: "opacity 400ms ease",
                animation: phase === "closed" ? "seal-glow 2.4s ease-in-out infinite" : undefined,
              }}
            >
              المس الختم لفتح الدعوة
            </p>
          </div>
        )}

        {editable && <EditPanel />}
        {editable && (
          <BackgroundsMenu
            sections={[
              { id: "bg-seal-hero", label: "القسم الأول (الأسماء)" },
              { id: "bg-seal-verse", label: "قسم الآية والعائلتين" },
              { id: "bg-seal-countdown", label: "قسم العدّ التنازلي" },
              { id: "bg-seal-details", label: "قسم التفاصيل ومسيرة الحفل" },
              { id: "bg-seal-actions", label: "قسم الاتجاهات والتقويم" },
              { id: "bg-seal-rsvp", label: "قسم تأكيد الحضور" },
              { id: "bg-seal-footer", label: "قسم الختام" },
            ]}
          />
        )}
      </div>
    </EditModeProvider>
  )
}
