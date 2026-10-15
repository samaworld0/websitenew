import { useState, useEffect, useRef, type RefObject, type ReactNode } from "react"
import { Invitation, TextStyle, CustomFont } from "./types"
import { submitRSVP, uploadMedia } from "./backend"
import Reveal from "./Reveal"
import { RoseIcon } from "./icons"
import {
  EditModeProvider,
  DeselectSurface,
  EditableText,
  EditableBackground,
  EditableButton,
  EditableLinkBackground,
  EditPanel,
  BackgroundsMenu,
  TransitionsMenu,
  useEditMode,
} from "./LiveEditor"

// تدرّج اللمعة: لو ما فيه لون مخصص يرجع للذهبي الأصلي، وإلا يبنيه من اللون المختار.
function flashBackground(color?: string) {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return "radial-gradient(circle at center, rgba(255,241,196,0.6) 0%, rgba(212,175,55,0.3) 35%, transparent 70%)"
  }
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const bl = parseInt(color.slice(5, 7), 16)
  return `radial-gradient(circle at center, rgba(${r},${g},${bl},0.6) 0%, rgba(${r},${g},${bl},0.3) 35%, transparent 70%)`
}

function OpenFlash({ inv }: { inv: Invitation }) {
  const { styles } = useEditMode()
  const st = styles["bg-open-flash"]
  if (inv.flashEnabled === false || st?.hidden) return null
  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none"
      style={{
        background: flashBackground(st?.bgColor || inv.flashColor),
        animation: "goldFlash 1300ms ease-in-out forwards",
      }}
    />
  )
}

function KnockRipple({ x, y }: { x: number; y: number }) {
  const { styles } = useEditMode()
  const st = styles["bg-knock-ripple"]
  if (st?.hidden) return null
  const color = st?.bgColor || "#F1D989"
  return (
    <span
      className="pointer-events-none absolute rounded-full border-2"
      style={{
        left: x,
        top: y,
        width: 70,
        height: 70,
        borderColor: color,
        animation: "knockRipple 600ms ease-out forwards",
      }}
    />
  )
}

async function uploadDesignImage(file: File): Promise<string> {
  const res = await uploadMedia(file, "design-uploads")
  if (!res.success || !res.url) {
    throw new Error(
      res.bucketMissing
        ? "تخزين الوسائط غير مفعّل بعد بحساب Supabase — راجع تعليمات الإعداد."
        : res.error || "تعذر رفع الصورة، حاول مرة أخرى",
    )
  }
  return res.url
}

interface GoldenParticle {
  id: number
  type: "heart" | "star"
  left: number
  size: number
  duration: number
  delay: number
}

const PARTICLES_THEME_ID = "particles-theme"
const DOOR_TEXT_TRANSITION_ID = "transition-door-text"
const GOLD_ACCENT_ID = "bg-invitation-gold"

function GoldAccentScope({ children }: { children: ReactNode }) {
  const { styles } = useEditMode()
  const gold = styles[GOLD_ACCENT_ID]?.bgColor || "#D4AF37"
  return (
    <div className="contents" style={{ ["--gold" as string]: gold } as any}>
      {children}
    </div>
  )
}

function HeroGlow() {
  const { styles } = useEditMode()
  const st = styles["bg-hero-glow"]
  if (st?.hidden) return null
  const opacity = (st?.size ?? 20) / 100
  const bg = st?.bgColor ? { backgroundColor: st.bgColor } : undefined
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity }}>
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[var(--gold)] blur-[180px] top-[-150px] right-[-120px]" style={bg} />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[var(--gold)] blur-[180px] bottom-[-180px] left-[-120px]" style={bg} />
    </div>
  )
}

function ScheduleTitleFlower() {
  const { styles } = useEditMode()
  const color = styles["bg-schedule-title-flowers"]?.bgColor || "#D4AF37"
  return (
    <span className="text-base opacity-80" style={{ color }}>
      ❁
    </span>
  )
}

function FloatingParticles({ particles }: { particles: GoldenParticle[] }) {
  const { editable, styles, selectedId, setSelectedId } = useEditMode()
  const style = styles[PARTICLES_THEME_ID] || {}
  const glyph = style.text || "✿"
  const color = style.color || "#F1D989"
  const isSelected = editable && selectedId === PARTICLES_THEME_ID

  return (
    <div
      data-editable-id={PARTICLES_THEME_ID}
      className="absolute inset-0 z-10 overflow-hidden"
      style={{
        pointerEvents: editable ? "auto" : "none",
        outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
        outlineOffset: -2,
        cursor: editable ? "pointer" : undefined,
      }}
      onClick={(e) => {
        if (!editable) return
        e.stopPropagation()
        setSelectedId(PARTICLES_THEME_ID)
      }}
    >
      {editable && (
        <span
          className="absolute top-3 inset-inline-end-3 z-30 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{ background: "#1A1210", border: "1px solid #B8862F", color: "#F1D989" }}
        >
          🌸 ثيم الورد المتطاير
        </span>
      )}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-0 opacity-70 pointer-events-none"
          style={{
            left: `${p.left}%`,
            fontSize: `${style.size ?? p.size}px`,
            color,
            animation: `goldenParticle ${p.duration}s linear infinite`,
            animationDelay: `-${p.delay}s`,
          }}
        >
          {glyph}
        </div>
      ))}
    </div>
  )
}

function DoorTextReveal({
  doorRemoved,
  children,
}: {
  doorRemoved: boolean
  children: ReactNode
}) {
  const { styles } = useEditMode()
  const st = styles[DOOR_TEXT_TRANSITION_ID] || {}
  const duration = st.duration ?? 1000
  const easing = st.easing || "ease"

  return (
    <div
      className="relative z-20 w-full max-w-3xl mx-auto px-5 py-6 flex flex-col justify-between h-full min-h-screen"
      style={{
        opacity: doorRemoved ? 1 : 0,
        transition: doorRemoved ? `opacity ${duration}ms ${easing}` : "none",
      }}
    >
      {children}
    </div>
  )
}

function normalizeExternalUrl(url: string | undefined, fallback: string): string {
  const trimmed = (url ?? "").trim()
  if (!trimmed) return fallback
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export const DEFAULT_SCHEDULE = [
  { label: "استقبال الضيوف", time: "٧:٠٠ مساءً" },
  { label: "عقد القران", time: "٧:٣٠ مساءً" },
  { label: "العشاء", time: "٩:٠٠ مساءً" },
]

function ScheduleTrack({
  items,
  containerRef,
}: {
  items: { label: string; time: string }[]
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const firstDotRef = useRef<HTMLSpanElement>(null)
  const lastDotRef = useRef<HTMLSpanElement>(null)
  const [line, setLine] = useState({ top: 0, bottom: 0 })
  const [flowerTop, setFlowerTop] = useState(0)
  const { styles } = useEditMode()
  const sectionBg = styles["bg-venue-section"]?.bgColor || "#4E1019"
  const flowerColor = styles["schedule-flower-icon"]?.color || "#D4AF37"
  const lineColor = styles["bg-schedule-line"]?.bgColor || "#D4AF37"

  useEffect(() => {
    const container = containerRef.current
    const track = trackRef.current
    const firstDot = firstDotRef.current
    const lastDot = lastDotRef.current
    if (!container || !track || !firstDot || !lastDot) return

    let ticking = false
    const update = () => {
      ticking = false
      const containerRect = container.getBoundingClientRect()
      const trackRect = track.getBoundingClientRect()
      const firstRect = firstDot.getBoundingClientRect()
      const lastRect = lastDot.getBoundingClientRect()

      const trackTop = firstRect.top + firstRect.height / 2 - trackRect.top
      const trackBottom = lastRect.top + lastRect.height / 2 - trackRect.top
      setLine({ top: trackTop, bottom: trackBottom })

      const containerCenter = containerRect.top + containerRect.height / 2
      const start = trackRect.top + trackTop
      const end = trackRect.top + trackBottom
      let progress = end === start ? 0 : (containerCenter - start) / (end - start)
      progress = Math.max(0, Math.min(1, progress))

      setFlowerTop(trackTop + (trackBottom - trackTop) * progress)
    }
    const handleScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    update()
    container.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)
    return () => {
      container.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [containerRef])

  return (
    <div ref={trackRef} className="relative">
      <EditableBackground
        id="bg-schedule-line"
        className="absolute left-1/2 -translate-x-1/2 w-px opacity-25"
        style={{ top: line.top, height: Math.max(0, line.bottom - line.top), backgroundColor: lineColor }}
        position="absolute"
      />
      <div
        className="absolute left-1/2 top-0 z-20 flex items-center justify-center pointer-events-none will-change-transform"
        style={{
          transform: `translate(-50%, calc(${flowerTop}px - 50%))`,
          transition: "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <span
          className="text-2xl"
          style={{
            color: flowerColor,
            filter: "drop-shadow(0 0 10px rgba(212,175,55,0.45))",
          }}
        >
          <EditableText id="schedule-flower-icon">
            <RoseIcon />
          </EditableText>
        </span>
      </div>

      {items.map((item, i) => (
        <div
          key={`${i}-${item.label}`}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-6"
        >
          <span className="text-right custom-font-tajawal">
            <EditableText id={`schedule-item-${i}-label`}>
              {item.label}
            </EditableText>
          </span>
          <span
            ref={
              i === 0
                ? firstDotRef
                : i === items.length - 1
                  ? lastDotRef
                  : undefined
            }
            className="relative z-10 px-1 text-[var(--gold)] text-xs"
            style={{ backgroundColor: sectionBg }}
          >
            <EditableText id="schedule-bullet-icon">◆</EditableText>
          </span>
          <span className="text-left font-bold text-[#F1D989] custom-font-amiri">
            <EditableText id={`schedule-item-${i}-time`}>
              {item.time}
            </EditableText>
          </span>
        </div>
      ))}
    </div>
  )
}

function WisalTemplateView({
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
  const [isOpen, setIsOpen] = useState(skipIntro)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [particles, setParticles] = useState<GoldenParticle[]>([])

  const calcTimeLeft = () => {
    if (!inv.eventDateTime) {
      return { days: 108, hours: 14, minutes: 51, seconds: 12 }
    }
    const diff = new Date(inv.eventDateTime).getTime() - Date.now()
    if (isNaN(diff) || diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    }
  }

  const [timeLeft, setTimeLeft] = useState(calcTimeLeft)
  const [attendance, setAttendance] = useState("نعم")
  const [companions, setCompanions] = useState(0)
  const [guestName, setGuestName] = useState("")
  const [guestNote, setGuestNote] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  const [doorRemoved, setDoorRemoved] = useState(skipIntro)
  const [doorBgVideoFailed, setDoorBgVideoFailed] = useState(false)
  const doorCardVisible = !doorRemoved

  const generateGoldenParticles = () => {
    const items: GoldenParticle[] = []
    for (let i = 0; i < 25; i++) {
      items.push({
        id: i,
        type: i % 2 === 0 ? "heart" : "star",
        left: Math.random() * 92 + 4,
        size: Math.random() * 8 + 8,
        duration: Math.random() * 8 + 10,
        delay: Math.random() * 5,
      })
    }
    setParticles(items)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calcTimeLeft())
    }, 1000)
    return () => clearInterval(timer)
  }, [inv.eventDateTime])

  useEffect(() => {
    if (skipIntro) generateGoldenParticles()
  }, [])

  const replayDoorTextTransition = () => {
    setDoorRemoved(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setDoorRemoved(true))
    })
  }

  const completeOpening = () => {
    audioRef.current?.play().catch(() => {})
    setIsOpen((prev) => {
      if (!prev) {
        generateGoldenParticles()
        setShowFlash(true)
        setTimeout(() => setShowFlash(false), 1300)
        setTimeout(() => setDoorRemoved(true), 1450)
      }
      return true
    })
    setIsPlaying(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const handleDoorTap = () => {
    if (isOpen) return
    if (isPlaying) {
      videoRef.current?.pause()
      completeOpening()
      return
    }
    if (inv.skipIntroVideo) {
      completeOpening()
      return
    }
    setIsPlaying(true)
    audioRef.current?.play().catch(() => {})
    if (videoRef.current) {
      videoRef.current.play().catch(() => completeOpening())
      timeoutRef.current = setTimeout(() => {
        if (videoRef.current) videoRef.current.pause()
        completeOpening()
      }, 5000)
    } else {
      completeOpening()
    }
  }

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inv.sheetId) {
      await submitRSVP({
        sheetId: inv.sheetId,
        name: guestName,
        attendance,
        companions,
        message: guestNote,
      })
    }
    setSubmitted(true)
  }

  return (
    <EditModeProvider
      editable={editable}
      initialStyles={inv.textStyles || {}}
      onStylesChange={onStylesChange}
      onUploadImage={uploadDesignImage}
      customFonts={customFonts}
    >
    <DeselectSurface>
    <GoldAccentScope>
    <div
      className="relative h-full w-full bg-[#FAF7F2] text-[#3D312A] font-sans overflow-hidden"
      dir="rtl"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700&display=swap');
        @keyframes goldenParticle {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.6; }
          85% { opacity: 0.6; }
          100% { transform: translate3d(15px, -110vh, 0) rotate(360deg); opacity: 0; }
        }
        @keyframes goldLine{
          0%{transform:translateX(-120%)}
          100%{transform:translateX(350%)}
        }
        @keyframes fadeInUp{
          0%{opacity:0;transform:translateY(60px)}
          100%{opacity:1;transform:translateY(0)}
        }
        @keyframes bounceDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @keyframes goldFlash {
          0% { opacity: 0; }
          45% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        .royal-scroll::-webkit-scrollbar { display: none; }
        .royal-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          touch-action: pan-y;
          width: 100%;
        }
        .custom-font-ruqaa { font-family: 'Aref Ruqaa', serif; }
        .custom-font-amiri { font-family: 'Amiri', serif; }
        .custom-font-tajawal { font-family: 'Tajawal', sans-serif; }
      `}</style>

      <audio
        ref={audioRef}
        src={inv.musicUrl || "/music/background.mp3"}
        loop
      />

      {showFlash && <OpenFlash inv={inv} />}

      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden z-10 royal-scroll"
      >
        <div className="relative w-full">
          <section
            className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden text-[#FDFBF7] animate-[fadeInUp_1s] bg-cover bg-center"
            style={
              inv.doorBgVideo && !doorBgVideoFailed
                ? undefined
                : {
                    backgroundImage: `url("${inv.heroBg || "/images/hero-bg.jpg"}")`,
                  }
            }
          >
            <div className="absolute top-0 left-0 w-full h-[3px] overflow-hidden z-50">
              <div className="h-full w-[35%] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent animate-[goldLine_3s_linear_infinite]" />
            </div>
            <HeroGlow />
            {(inv.doorBgVideo || !inv.heroBg) && !doorBgVideoFailed && (
              <video
                key={inv.doorBgVideo || "default-door-bg"}
                src={inv.doorBgVideo || "/videos/door-bg.mp4"}
                autoPlay
                loop
                muted
                playsInline
                onError={() => setDoorBgVideoFailed(true)}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-75"
              />
            )}
            <div className="absolute inset-0 pointer-events-none z-0" />

            <FloatingParticles particles={particles} />

            <DoorTextReveal doorRemoved={doorRemoved}>
              <div />
              <div className="my-auto flex flex-col items-center text-center">
                <p className="text-base md:text-lg tracking-widest text-[#E8DCC4] mb-2 custom-font-amiri">
                  <EditableText id="intro-title">دعوة زفاف</EditableText>
                </p>
                <span className="text-[var(--gold)] text-xl mb-4">
                  <EditableText id="intro-icon">✿</EditableText>
                </span>
                <h1 className="text-7xl md:text-9xl text-white mb-1 leading-none custom-font-ruqaa drop-shadow-2xl">
                  <EditableText id="groom">{inv.groom}</EditableText>
                </h1>
                <span className="text-3xl text-[var(--gold)] my-3 custom-font-ruqaa">
                  <EditableText id="names-separator">و</EditableText>
                </span>
                <h1 className="text-7xl md:text-9xl text-white mt-1 leading-none custom-font-ruqaa drop-shadow-2xl">
                  <EditableText id="bride">{inv.bride}</EditableText>
                </h1>
                <div className="mt-8 space-y-2">
                  <p className="text-xl md:text-2xl text-[#FDFBF7] custom-font-amiri">
                    <EditableText id="date">{inv.date}</EditableText>
                  </p>
                  <p className="text-base md:text-lg text-[#E8DCC4] custom-font-tajawal">
                    <EditableText id="welcome-message">
                      فتحنا باب فرحتنا... وطارت البشائر تدعوكم
                    </EditableText>
                  </p>
                </div>
              </div>
              <div className="mb-4 flex flex-col items-center opacity-80">
                <p className="text-sm tracking-widest text-[#E8DCC4] mb-1 custom-font-tajawal">
                  <EditableText id="scroll-hint">مرر للأسفل</EditableText>
                </p>
                <span
                  className="text-xl text-[var(--gold)]"
                  style={{ animation: "bounceDown 2s ease-in-out infinite" }}
                >
                  <EditableText id="scroll-arrow">↓</EditableText>
                </span>
              </div>
            </DoorTextReveal>
          </section>

          <div className="w-full bg-[#FAF7F2] text-[#3D312A] relative z-20">
            <EditableBackground
              id="bg-verse-section"
              className="py-24 px-6 flex flex-col items-center w-full"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="text-center max-w-xl mb-20 w-full">
                <p
                  className="whitespace-pre-line leading-loose text-[#5A4A3C] custom-font-amiri break-keep"
                  style={{ fontSize: "clamp(1rem, 4.2vw, 1.5rem)" }}
                >
                  <EditableText id="verse">{inv.verse}</EditableText>
                </p>
              </Reveal>

              <Reveal className="text-center max-w-lg mb-20 w-full">
                <p className="text-base text-[#8C7A6B] mb-6 custom-font-amiri">
                  <EditableText id="invite-line-1">
                    اللهم بارك لهما وبارك عليهما واجمع بينهما في خير
                  </EditableText>
                </p>

                <p className="text-lg md:text-xl text-[#5A4A3C] leading-loose custom-font-amiri mb-1">
                  <EditableText id="invite-line-2">في ليلة جميلة</EditableText>
                </p>
                <p className="text-lg md:text-xl text-[#5A4A3C] leading-loose custom-font-amiri mb-6">
                  <EditableText id="invite-line-3">يضوي الفرح بعالي سماها</EditableText>
                </p>

                <h3 className="text-2xl md:text-3xl font-bold text-[#4A3B2C] mb-6 custom-font-amiri">
                  <EditableText id="invite-line-4">تتشرف</EditableText>
                </h3>

                <p className="text-lg md:text-xl text-[#5A4A3C] leading-relaxed custom-font-amiri mb-6">
                  <EditableText id="invite-line-5">
                    {inv.groomFamily || "عائلة العريس"} و {inv.brideFamily || "عائلة العروس"}
                  </EditableText>
                </p>

                <p className="text-lg md:text-xl text-[#5A4A3C] leading-relaxed custom-font-amiri mb-8">
                  <EditableText id="invite-line-6">
                    بدعوتكم لحضور حفل زفاف نجلهم وابنتهم
                  </EditableText>
                </p>

                <h2 className="text-4xl md:text-5xl font-bold text-[#4A3B2C] mb-8 custom-font-amiri">
                  <EditableText id="invite-line-7">
                    {inv.groom} &amp; {inv.bride}
                  </EditableText>
                </h2>

                <p className="text-lg md:text-xl text-[#5A4A3C] leading-relaxed custom-font-amiri mb-6">
                  <EditableText id="invite-line-8">
                    وذلك بمشيئة الله تعالى {inv.date}
                  </EditableText>
                </p>

                <p className="text-base text-[#8C7A6B] custom-font-amiri">
                  <EditableText id="invite-line-9">
                    ويسعدنا حضوركم فهو زينة الفرح والسرور
                  </EditableText>
                </p>
              </Reveal>
            </EditableBackground>

            <EditableBackground
              id="bg-countdown-section"
              className="pt-16 pb-4 px-6 flex flex-col items-center w-full"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="text-center w-full max-w-lg mb-4">
                <h4 className="text-2xl md:text-3xl font-bold text-[#4A3B2C] mb-10 custom-font-amiri">
                  <EditableText id="countdown-title">باقي على فرحنا</EditableText>
                </h4>
                <div
                  className="flex justify-center items-center gap-4 w-full"
                  dir="ltr"
                >
                  <div className="flex flex-col items-center bg-white border border-[var(--gold)]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <EditableText
                      id="countdown-number-seconds"
                      className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri"
                    >
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </EditableText>
                    <span className="text-sm text-[#8C7A6B] mt-1">
                      <EditableText id="countdown-label-seconds">ثانية</EditableText>
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[var(--gold)]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <EditableText
                      id="countdown-number-minutes"
                      className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri"
                    >
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </EditableText>
                    <span className="text-sm text-[#8C7A6B] mt-1">
                      <EditableText id="countdown-label-minutes">دقيقة</EditableText>
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[var(--gold)]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <EditableText
                      id="countdown-number-hours"
                      className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri"
                    >
                      {String(timeLeft.hours).padStart(2, "0")}
                    </EditableText>
                    <span className="text-sm text-[#8C7A6B] mt-1">
                      <EditableText id="countdown-label-hours">ساعة</EditableText>
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[var(--gold)]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <EditableText
                      id="countdown-number-days"
                      className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri"
                    >
                      {timeLeft.days}
                    </EditableText>
                    <span className="text-sm text-[#8C7A6B] mt-1">
                      <EditableText id="countdown-label-days">يوم</EditableText>
                    </span>
                  </div>
                </div>
              </Reveal>
            </EditableBackground>

            <EditableBackground
              id="bg-venue-section"
              className="py-20 px-6 flex flex-col items-center text-[#F5EBE0] border-t-2 border-[var(--gold)] w-full"
              style={{ backgroundColor: "#4E1019" }}
            >
              {inv.schedule && inv.schedule.length > 0 && (
                <Reveal className="text-center max-w-lg w-full">
                  <div className="flex items-center justify-center gap-3 mb-10">
                    <ScheduleTitleFlower />
                    <h3 className="text-3xl font-bold text-[#F1D989] custom-font-amiri">
                      <EditableText id="schedule-title">برنامج الحفل</EditableText>
                    </h3>
                    <ScheduleTitleFlower />
                  </div>
                  <div className="text-base md:text-lg text-[#F5EBE0]">
                    <ScheduleTrack
                      containerRef={scrollContainerRef}
                      items={inv.schedule}
                    />
                  </div>
                </Reveal>
              )}
            </EditableBackground>

            <EditableBackground
              id="bg-location-section"
              className="py-20 px-6 flex flex-col items-center text-[#F5EBE0] border-t-2 border-[var(--gold)] w-full"
              style={{ backgroundColor: "#4E1019" }}
            >
              <Reveal className="text-center max-w-lg w-full">
                <h3 className="text-3xl font-bold text-[#F1D989] mb-7 custom-font-amiri">
                  <EditableText id="venue-title">مكان الحفل</EditableText>
                </h3>
                <h4 className="text-2xl font-bold text-[#F5EBE0] mb-3">
                  <EditableText id="venue">{inv.venue}</EditableText>
                </h4>
                <p className="text-base text-[#E8DCC4]/80 mb-7">
                  <EditableText id="city">{inv.city}</EditableText>
                </p>
                <EditableLinkBackground
                  id="bg-map-button"
                  href={normalizeExternalUrl(inv.mapUrl, "https://maps.google.com")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-white hover:bg-[#9E7024] shadow-md"
                  style={{ backgroundColor: "var(--gold)" }}
                >
                  <EditableText id="map-button-text">الموقع على الخريطة</EditableText>
                </EditableLinkBackground>
              </Reveal>
            </EditableBackground>

            <EditableBackground
              id="bg-rsvp-section"
              className="py-20 px-6 flex flex-col items-center border-t-2 border-[var(--gold)] w-full"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="max-w-md w-full">
              <EditableBackground
                id="bg-rsvp-card"
                className="bg-white border border-[var(--gold)]/30 rounded-3xl p-10 shadow-lg w-full"
              >
                <div className="text-center mb-10">
                  <span className="text-lg">
                    <EditableText id="rsvp-icon">⚙️</EditableText>
                  </span>
                  <h3 className="text-3xl font-bold text-[#4A3B2C] mt-2 custom-font-amiri">
                    <EditableText id="rsvp-title">تأكيد الحضور</EditableText>
                  </h3>
                  <p className="text-sm text-[#8C7A6B] mt-1">
                    <EditableText id="rsvp-subtitle">يسعدنا تأكيد حضوركم</EditableText>
                  </p>
                </div>

                {submitted ? (
                  <div className="text-center py-10 text-emerald-600 font-bold text-lg">
                    <EditableText id="rsvp-success-message">
                      تم إرسال تأكيد حضورك بنجاح، شكراً لك! 🌸
                    </EditableText>
                  </div>
                ) : (
                  <form onSubmit={handleRSVP} className="space-y-7">
                    <div>
                      <label className="block text-sm text-[#8C7A6B] mb-2 font-medium">
                        <EditableText id="rsvp-name-label">الاسم الكريم</EditableText>
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="اسمك الكريم"
                        className="w-full bg-[#FAF7F2] border border-[var(--gold)]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[var(--gold)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[#8C7A6B] mb-2 font-medium">
                        <EditableText id="rsvp-attend-label">هل ستحضر؟</EditableText>
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {["نعم", "لا", "ربما"].map((opt) => {
                          const isActive = attendance === opt
                          return (
                            <EditableButton
                              key={opt}
                              id={isActive ? "bg-rsvp-option-selected" : "bg-rsvp-option-unselected"}
                              type="button"
                              onClick={() => setAttendance(opt)}
                              className={`py-3 rounded-xl text-base font-medium transition ${
                                isActive
                                  ? "text-white shadow"
                                  : "border border-[var(--gold)]/30 text-[#3D312A]"
                              }`}
                              style={{ backgroundColor: isActive ? "var(--gold)" : "#FAF7F2" }}
                            >
                              <EditableText id={`rsvp-option-${opt}`}>
                                {opt}
                              </EditableText>
                            </EditableButton>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#8C7A6B] mb-2 font-medium">
                        <EditableText id="rsvp-companions-label">
                          عدد المرافقين (عدا حضورك - 0 إن كنت وحدك)
                        </EditableText>
                      </label>
                      <EditableBackground
                        id="bg-rsvp-companions-box"
                        className="flex items-center justify-center gap-6 border border-[var(--gold)]/30 rounded-2xl py-3 w-full"
                        style={{ backgroundColor: "#FAF7F2" }}
                      >
                        <EditableButton
                          id="bg-rsvp-counter-btn"
                          type="button"
                          onClick={() =>
                            setCompanions(Math.max(0, companions - 1))
                          }
                          className="w-10 h-10 rounded-full border border-[var(--gold)]/30 flex items-center justify-center text-xl font-bold shadow-sm"
                          style={{ backgroundColor: "#ffffff" }}
                        >
                          -
                        </EditableButton>
                        <span className="text-xl font-bold text-[#4A3B2C]">
                          {companions}
                        </span>
                        <EditableButton
                          id="bg-rsvp-counter-btn"
                          type="button"
                          onClick={() => setCompanions(companions + 1)}
                          className="w-10 h-10 rounded-full border border-[var(--gold)]/30 flex items-center justify-center text-xl font-bold shadow-sm"
                          style={{ backgroundColor: "#ffffff" }}
                        >
                          +
                        </EditableButton>
                      </EditableBackground>
                    </div>

                    <div>
                      <label className="block text-sm text-[#8C7A6B] mb-2 font-medium">
                        <EditableText id="rsvp-note-label">
                          كلمة للعروسين 💌
                        </EditableText>
                      </label>
                      <textarea
                        rows={3}
                        value={guestNote}
                        onChange={(e) => setGuestNote(e.target.value)}
                        placeholder="اكتب تهنئتك للعروسين..."
                        className="w-full bg-[#FAF7F2] border border-[var(--gold)]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[var(--gold)] resize-none"
                      />
                    </div>

                    <EditableButton
                      id="bg-rsvp-submit"
                      type="submit"
                      className="w-full py-4 hover:bg-[#9E7024] text-white font-bold rounded-2xl text-base transition shadow-md"
                      style={{ backgroundColor: "var(--gold)" }}
                    >
                      <EditableText id="rsvp-submit-button">
                        إرسال التأكيد
                      </EditableText>
                    </EditableButton>
                  </form>
                )}
              </EditableBackground>
              </Reveal>
            </EditableBackground>
          </div>
        </div>
      </div>

      {doorCardVisible && inv.doorStyle === "card" && (
        <div
          onClick={handleDoorTap}
          className={`fixed inset-0 z-50 flex items-end justify-center pb-14 sm:pb-20 transition-opacity duration-[1400ms] ${
            editable ? "cursor-default opacity-100" : `cursor-pointer ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`
          }`}
          style={{ height: "100dvh" }}
        >
          <video
            key={inv.introVideo || "default-intro-video"}
            ref={videoRef}
            src={inv.introVideo || "/videos/intro.mp4"}
            muted
            playsInline
            preload="none"
            poster={inv.introPoster || "/videos/intro-poster.jpg"}
            onEnded={completeOpening}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          <div
            className="relative z-10 flex flex-col items-center text-center px-6 py-6 w-[240px] sm:w-[280px] rounded-2xl border border-[var(--gold)]/40 shadow-2xl"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.06)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
          >
            <div className="pointer-events-none absolute inset-[6px] rounded-xl border border-[var(--gold)]/30" />
            <p className="text-[11px] tracking-[0.3em] text-[#E8DCC4] mb-3 custom-font-amiri">
              <EditableText id="door-card-title">دعوة زفاف</EditableText>
            </p>
            <p className="text-2xl font-bold text-[#F1D989] custom-font-ruqaa drop-shadow-lg" style={{ marginBottom: 0 }}>
              <EditableText id="door-card-tap-hint">اضغط لفتح الباب</EditableText>
            </p>
          </div>
        </div>
      )}

      {!doorRemoved && inv.doorStyle !== "card" && (
        <div
          onClick={handleDoorTap}
          className={`fixed inset-0 z-50 flex items-center justify-center cursor-pointer transition-opacity duration-[1400ms] bg-black ${
            isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          style={{ height: "100dvh" }}
        >
          <video
            key={inv.introVideo || "default-intro-video"}
            ref={videoRef}
            src={inv.introVideo || "/videos/intro.mp4"}
            muted
            playsInline
            preload="none"
            poster={inv.introPoster || "/videos/intro-poster.jpg"}
            onEnded={completeOpening}
            className="absolute inset-0 w-full h-full object-cover opacity-100 pointer-events-none"
          />
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-[var(--gold)] text-sm md:text-base tracking-widest custom-font-amiri animate-pulse">
            <EditableText id="door-tap-hint">اضغط لفتح الدعوة</EditableText>
          </p>
        </div>
      )}
    </div>
    </GoldAccentScope>
    </DeselectSurface>
    {editable && <EditPanel />}
    {editable && (
      <BackgroundsMenu
        sections={[
          { id: "bg-invitation-gold", label: "🟡 اللون الذهبي العام (كل الدعوة)" },
          { id:
