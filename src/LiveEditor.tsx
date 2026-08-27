import { useState, useEffect, useRef, type RefObject, type ReactNode } from "react"
import { Invitation, TextStyle, CustomFont } from "./types"
import { submitRSVP } from "./backend"
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

interface GoldenParticle {
  id: number
  type: "heart" | "star"
  left: number
  size: number
  duration: number
  delay: number
}

// معرّف عنصر "ثيم الورد المتطاير" بنظام التصميم المباشر — عنصر واحد يتحكم
// بشكل كل الجزيئات المتطايرة دفعة وحدة (مو كل وردة لحالها). التعديل يتم من
// نفس لوحة الخصائص العادية: النص (الحقل "النص") يغيّر الرمز (✿، ❤، ★...)،
// ولون النص يغيّر لون كل الورود مرة وحدة.
const PARTICLES_THEME_ID = "particles-theme"

// معرّف عنصر "انتقال تلاشي نصوص القسم الأول" — يتحكم بمدة/سرعة ظهور
// النصوص والعناصر (بعد اختفاء الباب/الفيديو بالكامل) من لوحة التعديل
// عبر TransitionsMenu، بدل ما تكون مثبّتة بالكود (1000ms).
const DOOR_TEXT_TRANSITION_ID = "transition-door-text"

// عنصر جزيئات الخلفية المتطايرة — قابل للتحديد بوضع التعديل مثل أي عنصر
// ثاني، ويقرأ شكله (الرمز) ولونه من TextStyle الخاص بمعرّفه بدل ما يكون
// مثبّت على "✿" دايماً.
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
          🌸 ثيم الورد المتطاير — اضغط هنا وعدّل «النص» أو «اللون» بلوحة اليمين
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

// حاوية نصوص وعناصر القسم الأول (اسم العريس/العروسة، التاريخ، رسالة
// الترحيب...) — تتلاشى للظهور بعد ما يختفي الباب/الفيديو بالكامل
// (doorRemoved)، مو بنفس لحظته. مدة وسرعة هذا التلاشي قابلة للتحكم من
// لوحة "⏱️ الانتقالات" بوضع التصميم المباشر (شوف TransitionsMenu)
// بدل ما تكون مثبّتة بالكود.
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
        // الإخفاء فوري (بدون transition) — التلاشي المقصود اتجاه واحد بس:
        // الظهور بعد اختفاء الباب. هذا كمان يخلي إعادة التشغيل (زر "جرّب
        // الآن") تشتغل صح: تختفي النصوص فوراً ثم تتلاشى للظهور من جديد
        // بنفس المدة/السرعة، بدل ما يتصادم اتجاهي الحركة مع بعض.
        transition: doorRemoved ? `opacity ${duration}ms ${easing}` : "none",
      }}
    >
      {children}
    </div>
  )
}

// رابط الموقع اللي يحطه المشرف بلوحة التحكم أحياناً يكون ناقص البروتوكول
// (مثلاً "maps.google.com/..." أو "goo.gl/maps/xyz" بدون "https://" بالأول)
// — بهالحالة يعامله المتصفح كرابط داخلي نسبي لموقعنا نفسه فيصير الزر ما
// يسوي شي فعلياً (أو يوديك لصفحة غير موجودة بنفس الدومين) بدل ما يفتح
// خرائط جوجل. هذي الدالة تتأكد إن الرابط دايماً يبدأ ببروتوكول صحيح قبل
// ما نستخدمه بـ href، وترجع الرابط الافتراضي لو الحقل فاضي.
function normalizeExternalUrl(url: string | undefined, fallback: string): string {
  const trimmed = (url ?? "").trim()
  if (!trimmed) return fallback
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

// برنامج الحفل الافتراضي — يُستخدم لو الدعوة ما عندها جدول مخصص محفوظ
// (schedule فاضي أو غير موجود، مثلاً دعوات قديمة قبل إضافة هالحقل).
export const DEFAULT_SCHEDULE = [
  { label: "استقبال الضيوف", time: "٧:٠٠ مساءً" },
  { label: "عقد القران", time: "٧:٣٠ مساءً" },
  { label: "العشاء", time: "٩:٠٠ مساءً" },
]

// مسار برنامج الحفل: خط ذهبي رفيع يربط النقاط الذهبية، ووردة زخرفية
// تبدأ من أول نقطة ذهبية (استقبال الضيوف) وتنزل تدريجياً مع تمرير
// الصفحة لتصل آخر نقطة (العشاء). نعتمد على موضع أول وآخر نقطة فعلياً
// (بدل نسب ثابتة) حتى تبقى الوردة مثبتة على الخط بالضبط مهما تغيّر ارتفاع
// الأسطر. نربطها بحاوية السكرول الفعلية عبر containerRef (مو window، لأن
// صفحة الدعوة تستخدم div داخلي قابل للتمرير بدل الصفحة نفسها).
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
  // نقطة ◆ الفاصلة بين كل بند تحتاج خلفية بنفس لون خلفية القسم (مو لون
  // ثابت) حتى "تقطع" الخط الذهبي اللي ماشي وراها بدون ما تبين كصندوق
  // غريب أو "مرقّع" لو المستخدم غيّر لون خلفية القسم (bg-venue-section)
  // من لوحة التصميم المباشر. نقرأها من نفس التخزين اللي تقرأ منه
  // EditableBackground حتى تبقى متزامنة تلقائياً بدون أي إعداد إضافي.
  const { styles } = useEditMode()
  const sectionBg = styles["bg-venue-section"]?.bgColor || "#4E1019"
  // لون الوردة المتحركة — نقرأه هنا (مو بس جوّا EditableText) حتى نقدر
  // نستخدمه بتوهج الظل (drop-shadow) لحظة تحريكها بنفس اللون المختار.
  const flowerColor = styles["schedule-flower-icon"]?.color || "#D4AF37"
  // لون الخط الرفيع الواصل بين النقاط — قابل للتغيير من قائمة "الخلفيات"
  // بالتصميم المباشر (معرّفه bg-schedule-line)، بنفس آلية لون خلفية القسم.
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

      // موضع أول وآخر نقطة نسبةً لأعلى المسار (ثابت، ما يتغير إلا بتغيير الحجم)
      const trackTop = firstRect.top + firstRect.height / 2 - trackRect.top
      const trackBottom = lastRect.top + lastRect.height / 2 - trackRect.top
      setLine({ top: trackTop, bottom: trackBottom })

      // تقدّم التمرير: 0 لما توصل أول نقطة منتصف الشاشة المرئية للحاوية،
      // و1 لما توصل آخر نقطة نفس المنتصف — فتتحرك الوردة تدريجياً بينهما.
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
      {/* الخط الذهبي الرفيع الواصل بين النقاط — لونه قابل للتغيير من قائمة
          "الخلفيات" بالتصميم المباشر (معرّفه bg-schedule-line) */}
      <EditableBackground
        id="bg-schedule-line"
        className="absolute left-1/2 -translate-x-1/2 w-px opacity-25"
        style={{ top: line.top, height: Math.max(0, line.bottom - line.top), backgroundColor: lineColor }}
      />
      {/* الوردة المتحركة فوق الخط — نحركها بـ transform (مو top) حتى تكون
          الحركة أنعم (GPU-accelerated)، ومدة أطول مع تسارع طبيعي بدل القفز
          الخطي. z-20 حتى تطلع دايماً فوق النقاط الذهبية. */}
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
            className="relative z-10 px-1 text-[#D4AF37] text-xs"
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

  // نحسب الوقت المتبقي فعلياً بالاعتماد على موعد المناسبة (eventDateTime).
  // لو الدعوة ما عندها موعد محدد (دعوات قديمة قبل إضافة هالحقل)، نرجع
  // لنفس القيم الافتراضية اللي كانت موجودة سابقاً حتى ما ينكسر العرض.
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
  // بعض متصفحات الجوال (خصوصاً Safari بالآيفون) عندها خلل معروف: طبقة
  // كانت شغالة فوق الشاشة (position:absolute) لو انخفت بس بـ opacity+
  // pointer-events-none (بدون ما تنشال فعلياً من الصفحة)، أحياناً توقف
  // التمرير باللمس حتى لو صارت شفافة تماماً — كإنها تفضل "عالقة" بمنطقة
  // اكتشاف اللمس. الحل الأضمن: نشيل طبقة "اضغط لفتح الدعوة" كلياً من
  // الشجرة (unmount) بعد ما تخلص حركة التلاشي (نفس مدة duration-[1400ms])،
  // بدل الاعتماد على opacity/pointer-events فقط.
  const [doorRemoved, setDoorRemoved] = useState(skipIntro)
  const [doorBgVideoFailed, setDoorBgVideoFailed] = useState(false)
  // بوضع "التصميم المباشر" ما نتخطى شاشة الباب أبداً — تظهر وتتصرف
  // بالضبط زي ما يشوفها الضيف (تُضغط لتنتقل لحركة الفتح ثم لمحتوى
  // الدعوة)، حتى يقدر المصمم يشرف على الخطوات الثلاث كلها لا بس الأخيرة.
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

  // بوضع "التصميم المباشر" ما نتخطى خطوات فتح الدعوة — يشوف المصمم
  // شاشة الباب المغلق أول شي (زي أي زائر بالظبط)، ويضغط عليها بنفسه
  // لينتقل لحركة الفتح ثم لمحتوى الدعوة، حتى يقدر يعدّل ويشرف على
  // الخطوات الثلاث كلها (الباب، حركة الفتح/الدق، ثم المحتوى) لا بس
  // الخطوة الأخيرة. زر "🔄 ابدأ من شاشة الباب" تحت يرجّعه لأول خطوة
  // بأي وقت أثناء التصميم.

  // معاينة بدون فيديو الفتح (skipIntro) — بما إن isOpen/doorRemoved
  // بدؤوا true من الأساس، نولّد الورد المتطاير مرة وحدة فقط أول ما
  // تفتح الصفحة، حتى يطلع نفس تأثير لحظة اكتمال الفتح العادية.
  useEffect(() => {
    if (skipIntro) generateGoldenParticles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // إعادة تشغيل تلاشي نصوص القسم الأول عند الطلب (زر "▶ جرّب الآن" بلوحة
  // الانتقالات) — نخفي النصوص فوراً (بدون أي انتقال مرئي لهالخطوة نفسها)
  // ثم نرجعها تظهر بالإطار التالي، حتى تشتغل حركة CSS transition من جديد
  // بنفس المدة/السرعة المختارة حالياً، وتشوف المصمم النتيجة النهائية فوراً.
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
        // نفس مدة "transition-opacity duration-[1400ms]" لطبقة الباب، زائد
        // هامش بسيط، حتى تخلص اللمعة وتلاشي الصورة سوا بدون قفزة بينهم.
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
    // "تخطي فيديو الفتح": نبقي شاشة "اضغط لفتح الدعوة" (الخطوة الأولى)
    // زي ما هي، بس لما الضيف يضغط نفتح المحتوى فوراً بدون ما نشغّل
    // فيديو/حركة الفتح.
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

    // يترسل فعلياً لشيت جوجل بس لو الدعوة عندها sheetId (دعوة خاصة
    // اتنشأت من لوحة تحكم). بدونه تبقى معاينة محلية فقط زي قبل.
    if (inv.sheetId) {
      const result = await submitRSVP({
        sheetId: inv.sheetId,
        name: guestName,
        attendance,
        companions,
        message: guestNote,
      })
      if (!result.success) {
        console.error("فشل إرسال تأكيد الحضور للشيت")
      }
    }

    setSubmitted(true)
  }

  return (
    <EditModeProvider
      editable={editable}
      initialStyles={inv.textStyles || {}}
      onStylesChange={onStylesChange}
      customFonts={customFonts}
    >
    <DeselectSurface>
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

      {/* لمعة ذهبية لحظة فتح الدعوة */}
      {showFlash && (
        <div
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,241,196,0.6) 0%, rgba(212,175,55,0.3) 35%, transparent 70%)",
            animation: "goldFlash 1300ms ease-in-out forwards",
          }}
        />
      )}

      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden z-10 royal-scroll"
      >
        <div className="relative w-full">
          {/* القسم الأول مع الخلفية والزهور — إما صورة أو مقطع فيديو
              (لو المستخدم ما اختار وحدة منهم، نرجع للافتراضي: صورة + فيديو
              خفيف فوقها، بنفس الشكل الأصلي) */}
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
              <div className="h-full w-[35%] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-[goldLine_3s_linear_infinite]" />
            </div>
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute w-[500px] h-[500px] rounded-full bg-[#D4AF37] blur-[180px] top-[-150px] right-[-120px]" />
              <div className="absolute w-[400px] h-[400px] rounded-full bg-[#D4AF37] blur-[180px] bottom-[-180px] left-[-120px]" />
            </div>
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
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60 pointer-events-none z-0" />


            <FloatingParticles particles={particles} />

            <DoorTextReveal doorRemoved={doorRemoved}>
              <div />
              <div className="my-auto flex flex-col items-center text-center">
                <p className="text-base md:text-lg tracking-widest text-[#E8DCC4] mb-2 custom-font-amiri">
                  <EditableText id="intro-title">دعوة زفاف</EditableText>
                </p>
                <span className="text-[#D4AF37] text-xl mb-4">
                  <EditableText id="intro-icon">✿</EditableText>
                </span>
                <h1 className="text-7xl md:text-9xl text-white mb-1 leading-none custom-font-ruqaa drop-shadow-2xl">
                  <EditableText id="groom">{inv.groom}</EditableText>
                </h1>
                <span className="text-3xl text-[#D4AF37] my-3 custom-font-ruqaa">
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
                  className="text-xl text-[#D4AF37]"
                  style={{ animation: "bounceDown 2s ease-in-out infinite" }}
                >
                  <EditableText id="scroll-arrow">↓</EditableText>
                </span>
              </div>
            </DoorTextReveal>
          </section>

          {/* الأقسام السفلية (مكبرة بنسبة 20%) */}
          <div className="w-full bg-[#FAF7F2] text-[#3D312A] relative z-20">
            {/* قسم الآية وبطاقة الدعوة والعداد التنازلي — خلفية كريمية
                (قابلة للتلوين أو وضع صورة من التصميم المباشر) */}
            <EditableBackground
              id="bg-verse-section"
              className="py-24 px-6 flex flex-col items-center"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="text-center max-w-xl mb-20">
                <p
                  className="whitespace-pre-line leading-loose text-[#5A4A3C] custom-font-amiri break-keep"
                  style={{ fontSize: "clamp(1rem, 4.2vw, 1.5rem)" }}
                >
                  <EditableText id="verse">{inv.verse}</EditableText>
                </p>
              </Reveal>

              {/* بطاقة الدعوة التقليدية — نص تقليدي مكوّن من 9 أسطر منفصلة
                  (كل سطر EditableText مستقل، قابل للتعديل والتحكم بحجمه
                  ولونه من التصميم المباشر لكل دعوة على حدة) */}
              <Reveal className="text-center max-w-lg mb-20">
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

            {/* قسم العداد التنازلي (باقي على فرحنا) — منفصل عن قسم الآية
                وبطاقة الدعوة، خلفية كريمية مستقلة قابلة للتلوين/الإخفاء
                لحالها من التصميم المباشر (معرّفها bg-countdown-section). */}
            <EditableBackground
              id="bg-countdown-section"
              className="py-16 px-6 flex flex-col items-center"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="text-center w-full max-w-lg mb-16">
                <h4 className="text-2xl md:text-3xl font-bold text-[#4A3B2C] mb-10 custom-font-amiri">
                  <EditableText id="countdown-title">باقي على فرحنا</EditableText>
                </h4>
                <div
                  className="flex justify-center items-center gap-4"
                  dir="ltr"
                >
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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

            {/* برنامج الحفل والمكان — خلفية حمراء مع خط ذهبي فاصل (قابلة للتلوين من التصميم المباشر) */}
            <EditableBackground
              id="bg-venue-section"
              className="py-20 px-6 flex flex-col items-center text-[#F5EBE0] border-t-2 border-[#D4AF37]"
              style={{ backgroundColor: "#4E1019" }}
            >
              {inv.schedule && inv.schedule.length > 0 && (
                <Reveal className="text-center max-w-lg w-full mb-24">
                  <div className="flex items-center justify-center gap-3 mb-10">
                    <span className="text-[#D4AF37] text-base opacity-80">
                      ❁
                    </span>
                    <h3 className="text-3xl font-bold text-[#F1D989] custom-font-amiri">
                      <EditableText id="schedule-title">برنامج الحفل</EditableText>
                    </h3>
                    <span className="text-[#D4AF37] text-base opacity-80">
                      ❁
                    </span>
                  </div>
                  <div className="text-base md:text-lg text-[#F5EBE0]">
                    <ScheduleTrack
                      containerRef={scrollContainerRef}
                      items={inv.schedule}
                    />
                  </div>
                </Reveal>
              )}

              <Reveal className="text-center max-w-lg w-full mb-24">
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
                  style={{ backgroundColor: "#B8862F" }}
                >
                  <EditableText id="map-button-text">الموقع على الخريطة</EditableText>
                </EditableLinkBackground>
              </Reveal>
            </EditableBackground>

            {/* قسم تأكيد الحضور — يرجع كريمي مع خط ذهبي فاصل (قابلة للتلوين من التصميم المباشر) */}
            <EditableBackground
              id="bg-rsvp-section"
              className="py-20 px-6 flex flex-col items-center border-t-2 border-[#D4AF37]"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="max-w-md w-full">
              <EditableBackground
                id="bg-rsvp-card"
                className="bg-white border border-[#B8862F]/30 rounded-3xl p-10 shadow-lg"
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
                        className="w-full bg-[#FAF7F2] border border-[#D4AF37]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F]"
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
                                  : "border border-[#D4AF37]/30 text-[#3D312A]"
                              }`}
                              style={{ backgroundColor: isActive ? "#B8862F" : "#FAF7F2" }}
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
                        className="flex items-center justify-center gap-6 border border-[#D4AF37]/30 rounded-2xl py-3"
                        style={{ backgroundColor: "#FAF7F2" }}
                      >
                        <EditableButton
                          id="bg-rsvp-counter-btn"
                          type="button"
                          onClick={() =>
                            setCompanions(Math.max(0, companions - 1))
                          }
                          className="w-10 h-10 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-xl font-bold shadow-sm"
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
                          className="w-10 h-10 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-xl font-bold shadow-sm"
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
                        className="w-full bg-[#FAF7F2] border border-[#D4AF37]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F] resize-none"
                      />
                    </div>

                    <EditableButton
                      id="bg-rsvp-submit"
                      type="submit"
                      className="w-full py-4 hover:bg-[#9E7024] text-white font-bold rounded-2xl text-base transition shadow-md"
                      style={{ backgroundColor: "#B8862F" }}
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

      {/* طبقة الضغط لفتح الدعوة — بدون بطاقة أو زر ظاهر.
          ملاحظة: ما نشيلها فوراً لمن isOpen تصير true، لأن هذا يقطع
          حركة التلاشي البصرية. بدل هيك نخليها opacity-0 لحد ما تخلص
          الحركة (١٠٠٠ملي ثانية) ثم doorRemoved يشيلها كلياً. */}
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

          {/* المربع الصغير أسفل الشاشة — خلفية Blur بدل السواد، وحد مزدوج (خارجي وداخلي رفيع) */}
          <div
            className="relative z-10 flex flex-col items-center text-center px-6 py-6 w-[240px] sm:w-[280px] rounded-2xl border border-[#D4AF37]/40 shadow-2xl"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.06)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
          >
            {/* الحد الداخلي الرفيع */}
            <div className="pointer-events-none absolute inset-[6px] rounded-xl border border-[#D4AF37]/30" />

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
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-[#D4AF37] text-sm md:text-base tracking-widest custom-font-amiri animate-pulse">
            <EditableText id="door-tap-hint">اضغط لفتح الدعوة</EditableText>
          </p>
        </div>
      )}
    </div>
    </DeselectSurface>
    {editable && <EditPanel />}
    {editable && (
      <BackgroundsMenu
        sections={[
          { id: "bg-verse-section", label: "خلفية قسم الآية وبطاقة الدعوة" },
          { id: "bg-countdown-section", label: "خلفية قسم العداد التنازلي (باقي على فرحنا)" },
          { id: "bg-venue-section", label: "خلفية قسم البرنامج والموقع" },
          { id: "schedule-bullet-icon", label: "لون نقاط برنامج الحفل" },
          { id: "schedule-flower-icon", label: "أيقونة ولون الوردة المتحركة" },
          { id: "bg-schedule-line", label: "لون الخط الرفيع بين نقاط البرنامج" },
          { id: "bg-map-button", label: "خلفية زر الموقع على الخريطة" },
          { id: "bg-rsvp-section", label: "خلفية قسم تأكيد الحضور (كاملة)" },
          { id: "bg-rsvp-card", label: "خلفية بطاقة تأكيد الحضور" },
          { id: "bg-rsvp-companions-box", label: "خلفية صندوق عدد المرافقين" },
          { id: "bg-rsvp-counter-btn", label: "خلفية زري + / -" },
          { id: "bg-rsvp-option-selected", label: "خلفية زر الحضور (وهو محدد)" },
          { id: "bg-rsvp-option-unselected", label: "خلفية أزرار الحضور (غير محددة)" },
          { id: "bg-rsvp-submit", label: "خلفية زر إرسال التأكيد" },
        ]}
      />
    )}
    {editable && (
      <TransitionsMenu
        items={[
          {
            id: DOOR_TEXT_TRANSITION_ID,
            label: "تلاشي نصوص القسم الأول",
            defaultDuration: 1000,
            onPreview: replayDoorTextTransition,
          },
        ]}
      />
    )}
    {editable && (
      // بوضع التصميم المباشر الباب يشتغل عادي زي عند الزوّار (اضغطي عليه
      // بنفسك لتفتحينه)، وهذا الزر يرجّعك لشاشة الباب المغلقة من جديد
      // بأي لحظة، حتى تقدرين تعدّلين نصوصها أو تعيدين تجربة الفتح كم
      // مرة ما تحتاجين بدون ما تسكرين لوحة التصميم وترجعين تفتحينها.
      <button
        onClick={() => {
          setIsPlaying(false)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
          }
          setShowFlash(false)
          setIsOpen(false)
          setDoorRemoved(false)
        }}
        style={{
          position: "fixed",
          bottom: 70,
          insetInlineStart: 16,
          zIndex: 530,
          padding: "9px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(0,0,0,.65)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,.35)",
        }}
      >
        🔄 ابدأ من شاشة الباب
      </button>
    )}
    {editable && isPlaying && (
      // زر تخطي فيديو الفتح وقت التصميم بس — يقفل الفيديو فوراً وينهي
      // حركة الفتح زي ما لو خلصت لحالها، حتى ما تنتظرين مدتها كل مرة
      // تجربين تصميم خطوة المحتوى النهائي وأنتِ بنص خطوة الفتح.
      <button
        onClick={() => {
          videoRef.current?.pause()
          completeOpening()
        }}
        style={{
          position: "fixed",
          bottom: 114,
          insetInlineStart: 16,
          zIndex: 530,
          padding: "9px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(184,134,47,.85)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,.35)",
        }}
      >
        ⏭️ تخطي فيديو الفتح
      </button>
    )}
    </EditModeProvider>
  )
}

// ─── نسخة كاملة ثانية من نفس قالب "وصال" (نفس الكود بالضبط) — نسخة
// مستقلة تماماً بملفها عشان تقدرين تعدّلين تصميمها لاحقاً بدون ما يأثر
// على القالب الأصلي فوق. تُختار من لوحة التحكم عبر templateType="wisal2".
// ───────────────────────────────────────────────────────────────────
function WisalTemplateTwoView({
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
  // القالب 2: الباب ما ينفتح إلا بعد ٣ "دقّات" (ضغطات) متتالية بدل ضغطة
  // وحدة — هذا العداد يتابع كم دقة صارت لحد الآن.
  const [knockCount, setKnockCount] = useState(0)
  // المربع (والتعليمة تحته) يختفي أول بمجرد ما تكتمل الدقة الثالثة،
  // وبعدها بلحظة يبدأ فيديو الفتح — حتى ما يضلوا فوق بعض بنفس الوقت.
  const [boxHidden, setBoxHidden] = useState(false)
  // دوائر "الدق" اللي تطلع بمكان الضغطة بالضبط وتختفي بعد لحظات
  const [knockRipples, setKnockRipples] = useState<
    { id: number; x: number; y: number }[]
  >([])
  const knockRippleIdRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const knockAudioRef = useRef<HTMLAudioElement | null>(null)

  // صوت دقّة الباب: لو المشرف رفع صوت مخصص (knockSoundUrl) نشغّله هو —
  // وإلا نرجع لصوت مُصنَّع بالمتصفح مباشرة (بدون ملف صوتي خارجي)، نغمتين
  // خشبيتين قصيرتين متتاليتين تحاكي صوت "طق طق" بسيط.
  const playKnockSound = () => {
    if (inv.knockSoundUrl) {
      try {
        if (
          !knockAudioRef.current ||
          knockAudioRef.current.src !== inv.knockSoundUrl
        ) {
          knockAudioRef.current = new Audio(inv.knockSoundUrl)
        }
        const audio = knockAudioRef.current
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      } catch {
        // نكمل لصوت المتصفح الافتراضي لو الصوت المرفوع ما اشتغل
      }
    }
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx()
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") ctx.resume()

      const now = ctx.currentTime
      ;[0, 0.09].forEach((delay) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "triangle"
        osc.frequency.setValueAtTime(140, now + delay)
        osc.frequency.exponentialRampToValueAtTime(70, now + delay + 0.08)
        gain.gain.setValueAtTime(0.0001, now + delay)
        gain.gain.exponentialRampToValueAtTime(0.5, now + delay + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.12)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + delay)
        osc.stop(now + delay + 0.14)
      })
    } catch {
      // متصفحات ما تدعم Web Audio API — نتجاهل الصوت بصمت بدون كسر الضغطة
    }
  }
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [particles, setParticles] = useState<GoldenParticle[]>([])

  // نحسب الوقت المتبقي فعلياً بالاعتماد على موعد المناسبة (eventDateTime).
  // لو الدعوة ما عندها موعد محدد (دعوات قديمة قبل إضافة هالحقل)، نرجع
  // لنفس القيم الافتراضية اللي كانت موجودة سابقاً حتى ما ينكسر العرض.
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
  // بعض متصفحات الجوال (خصوصاً Safari بالآيفون) عندها خلل معروف: طبقة
  // كانت شغالة فوق الشاشة (position:absolute) لو انخفت بس بـ opacity+
  // pointer-events-none (بدون ما تنشال فعلياً من الصفحة)، أحياناً توقف
  // التمرير باللمس حتى لو صارت شفافة تماماً — كإنها تفضل "عالقة" بمنطقة
  // اكتشاف اللمس. الحل الأضمن: نشيل طبقة "اضغط لفتح الدعوة" كلياً من
  // الشجرة (unmount) بعد ما تخلص حركة التلاشي (نفس مدة duration-[1400ms])،
  // بدل الاعتماد على opacity/pointer-events فقط.
  const [doorRemoved, setDoorRemoved] = useState(skipIntro)
  const [doorBgVideoFailed, setDoorBgVideoFailed] = useState(false)
  // بوضع "التصميم المباشر" ما نتخطى شاشة الباب أبداً — تظهر وتتصرف
  // بالضبط زي ما يشوفها الضيف (تُضغط لتنتقل لحركة الفتح ثم لمحتوى
  // الدعوة)، حتى يقدر المصمم يشرف على الخطوات الثلاث كلها لا بس الأخيرة.
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

  // بوضع "التصميم المباشر" ما نتخطى خطوات فتح الدعوة — يشوف المصمم
  // شاشة الباب المغلق أول شي (زي أي زائر بالظبط)، ويضغط عليها بنفسه
  // لينتقل لحركة الفتح ثم لمحتوى الدعوة، حتى يقدر يعدّل ويشرف على
  // الخطوات الثلاث كلها (الباب، حركة الفتح/الدق، ثم المحتوى) لا بس
  // الخطوة الأخيرة. زر "🔄 ابدأ من شاشة الباب" تحت يرجّعه لأول خطوة
  // بأي وقت أثناء التصميم.

  // معاينة بدون فيديو الفتح (skipIntro) — بما إن isOpen/doorRemoved
  // بدؤوا true من الأساس، نولّد الورد المتطاير مرة وحدة فقط أول ما
  // تفتح الصفحة، حتى يطلع نفس تأثير لحظة اكتمال الفتح العادية.
  useEffect(() => {
    if (skipIntro) generateGoldenParticles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // إعادة تشغيل تلاشي نصوص القسم الأول عند الطلب (زر "▶ جرّب الآن" بلوحة
  // الانتقالات) — نخفي النصوص فوراً (بدون أي انتقال مرئي لهالخطوة نفسها)
  // ثم نرجعها تظهر بالإطار التالي، حتى تشتغل حركة CSS transition من جديد
  // بنفس المدة/السرعة المختارة حالياً، وتشوف المصمم النتيجة النهائية فوراً.
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
        // نفس مدة "transition-opacity duration-[1400ms]" لطبقة الباب، زائد
        // هامش بسيط، حتى تخلص اللمعة وتلاشي الصورة سوا بدون قفزة بينهم.
        setTimeout(() => setDoorRemoved(true), 1450)
      }
      return true
    })
    setIsPlaying(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  // مدة حركة دائرة الدق (لازم تطابق KNOCK_RIPPLE_MS بمدة @keyframes
  // knockRipple بالـ<style> تحت — نستخدمها هنا كمان لتأخير بداية فيديو
  // الفتح بالدقة الثالثة حتى تختفي الدائرة أول.
  const KNOCK_RIPPLE_MS = 600

  const startDoorOpenSequence = () => {
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

  const handleDoorTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOpen) return
    if (isPlaying) {
      videoRef.current?.pause()
      completeOpening()
      return
    }

    // دائرة الدق تطلع بمكان الضغطة بالضبط (إحداثيات نسبية لحاوية الطبقة)
    // وتختفي تلقائياً بعد ما تخلص حركة التكبير/التلاشي.
    const rect = e.currentTarget.getBoundingClientRect()
    const rippleId = ++knockRippleIdRef.current
    setKnockRipples((prev) => [
      ...prev,
      { id: rippleId, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ])
    setTimeout(() => {
      setKnockRipples((prev) => prev.filter((r) => r.id !== rippleId))
    }, KNOCK_RIPPLE_MS)
    playKnockSound()

    // القالب 2: أول دقتين بس نعدّهم ونعرض النقاط تتعبى، وبالدقة الثالثة
    // نبدأ فعلياً حركة فتح الباب — بس نستنى لحد ما دائرة الدق تختفي أول
    // (نفس مدة KNOCK_RIPPLE_MS) قبل ما نشغّل فيديو الفتح.
    const nextKnock = knockCount + 1
    if (nextKnock < 3) {
      setKnockCount(nextKnock)
      return
    }
    setKnockCount(nextKnock)
    setBoxHidden(true)
    // "تخطي فيديو الفتح": نخلي الثلاث دقّات (الخطوة الأولى) زي ما هي،
    // بس بعد آخر دقة نفتح المحتوى فوراً بدون تشغيل فيديو/حركة الفتح.
    if (inv.skipIntroVideo) {
      setTimeout(completeOpening, KNOCK_RIPPLE_MS)
    } else {
      setTimeout(startDoorOpenSequence, KNOCK_RIPPLE_MS)
    }
  }

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault()

    // يترسل فعلياً لشيت جوجل بس لو الدعوة عندها sheetId (دعوة خاصة
    // اتنشأت من لوحة تحكم). بدونه تبقى معاينة محلية فقط زي قبل.
    if (inv.sheetId) {
      const result = await submitRSVP({
        sheetId: inv.sheetId,
        name: guestName,
        attendance,
        companions,
        message: guestNote,
      })
      if (!result.success) {
        console.error("فشل إرسال تأكيد الحضور للشيت")
      }
    }

    setSubmitted(true)
  }

  return (
    <EditModeProvider
      editable={editable}
      initialStyles={inv.textStyles || {}}
      onStylesChange={onStylesChange}
      customFonts={customFonts}
    >
    <DeselectSurface>
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
        @keyframes knockRipple {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.65; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
        .royal-scroll::-webkit-scrollbar { display: none; }
        .royal-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          touch-action: pan-y;
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

      {/* لمعة ذهبية لحظة فتح الدعوة */}
      {showFlash && (
        <div
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,241,196,0.6) 0%, rgba(212,175,55,0.3) 35%, transparent 70%)",
            animation: "goldFlash 1300ms ease-in-out forwards",
          }}
        />
      )}

      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden z-10 royal-scroll"
      >
        <div className="relative w-full">
          {/* القسم الأول مع الخلفية والزهور — إما صورة أو مقطع فيديو
              (لو المستخدم ما اختار وحدة منهم، نرجع للافتراضي: صورة + فيديو
              خفيف فوقها، بنفس الشكل الأصلي) */}
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
              <div className="h-full w-[35%] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-[goldLine_3s_linear_infinite]" />
            </div>
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute w-[500px] h-[500px] rounded-full bg-[#D4AF37] blur-[180px] top-[-150px] right-[-120px]" />
              <div className="absolute w-[400px] h-[400px] rounded-full bg-[#D4AF37] blur-[180px] bottom-[-180px] left-[-120px]" />
            </div>
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
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60 pointer-events-none z-0" />


            <FloatingParticles particles={particles} />

            <DoorTextReveal doorRemoved={doorRemoved}>
              <div />
              <div className="my-auto flex flex-col items-center text-center">
                <p className="text-base md:text-lg tracking-widest text-[#E8DCC4] mb-2 custom-font-amiri">
                  <EditableText id="intro-title">دعوة زفاف</EditableText>
                </p>
                <span className="text-[#D4AF37] text-xl mb-4">
                  <EditableText id="intro-icon">✿</EditableText>
                </span>
                <h1 className="text-7xl md:text-9xl text-white mb-1 leading-none custom-font-ruqaa drop-shadow-2xl">
                  <EditableText id="groom">{inv.groom}</EditableText>
                </h1>
                <span className="text-3xl text-[#D4AF37] my-3 custom-font-ruqaa">
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
                  className="text-xl text-[#D4AF37]"
                  style={{ animation: "bounceDown 2s ease-in-out infinite" }}
                >
                  <EditableText id="scroll-arrow">↓</EditableText>
                </span>
              </div>
            </DoorTextReveal>
          </section>

          {/* الأقسام السفلية (مكبرة بنسبة 20%) */}
          <div className="w-full bg-[#FAF7F2] text-[#3D312A] relative z-20">
            {/* قسم الآية وبطاقة الدعوة والعداد التنازلي — خلفية كريمية
                (قابلة للتلوين أو وضع صورة من التصميم المباشر) */}
            <EditableBackground
              id="bg-verse-section"
              className="py-24 px-6 flex flex-col items-center"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="text-center max-w-xl mb-20">
                <p
                  className="whitespace-pre-line leading-loose text-[#5A4A3C] custom-font-amiri break-keep"
                  style={{ fontSize: "clamp(1rem, 4.2vw, 1.5rem)" }}
                >
                  <EditableText id="verse">{inv.verse}</EditableText>
                </p>
              </Reveal>

              {/* بطاقة الدعوة التقليدية — نص تقليدي مكوّن من 9 أسطر منفصلة
                  (كل سطر EditableText مستقل، قابل للتعديل والتحكم بحجمه
                  ولونه من التصميم المباشر لكل دعوة على حدة) */}
              <Reveal className="text-center max-w-lg mb-20">
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

            {/* قسم العداد التنازلي (باقي على فرحنا) — منفصل عن قسم الآية
                وبطاقة الدعوة، خلفية كريمية مستقلة قابلة للتلوين/الإخفاء
                لحالها من التصميم المباشر (معرّفها bg-countdown-section). */}
            <EditableBackground
              id="bg-countdown-section"
              className="py-16 px-6 flex flex-col items-center"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="text-center w-full max-w-lg mb-16">
                <h4 className="text-2xl md:text-3xl font-bold text-[#4A3B2C] mb-10 custom-font-amiri">
                  <EditableText id="countdown-title">باقي على فرحنا</EditableText>
                </h4>
                <div
                  className="flex justify-center items-center gap-4"
                  dir="ltr"
                >
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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

            {/* برنامج الحفل والمكان — خلفية حمراء مع خط ذهبي فاصل (قابلة للتلوين من التصميم المباشر) */}
            <EditableBackground
              id="bg-venue-section"
              className="py-20 px-6 flex flex-col items-center text-[#F5EBE0] border-t-2 border-[#D4AF37]"
              style={{ backgroundColor: "#4E1019" }}
            >
              {inv.schedule && inv.schedule.length > 0 && (
                <Reveal className="text-center max-w-lg w-full mb-24">
                  <div className="flex items-center justify-center gap-3 mb-10">
                    <span className="text-[#D4AF37] text-base opacity-80">
                      ❁
                    </span>
                    <h3 className="text-3xl font-bold text-[#F1D989] custom-font-amiri">
                      <EditableText id="schedule-title">برنامج الحفل</EditableText>
                    </h3>
                    <span className="text-[#D4AF37] text-base opacity-80">
                      ❁
                    </span>
                  </div>
                  <div className="text-base md:text-lg text-[#F5EBE0]">
                    <ScheduleTrack
                      containerRef={scrollContainerRef}
                      items={inv.schedule}
                    />
                  </div>
                </Reveal>
              )}

              <Reveal className="text-center max-w-lg w-full mb-24">
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
                  style={{ backgroundColor: "#B8862F" }}
                >
                  <EditableText id="map-button-text">الموقع على الخريطة</EditableText>
                </EditableLinkBackground>
              </Reveal>
            </EditableBackground>

            {/* قسم تأكيد الحضور — يرجع كريمي مع خط ذهبي فاصل (قابلة للتلوين من التصميم المباشر) */}
            <EditableBackground
              id="bg-rsvp-section"
              className="py-20 px-6 flex flex-col items-center border-t-2 border-[#D4AF37]"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="max-w-md w-full">
              <EditableBackground
                id="bg-rsvp-card"
                className="bg-white border border-[#B8862F]/30 rounded-3xl p-10 shadow-lg"
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
                        className="w-full bg-[#FAF7F2] border border-[#D4AF37]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F]"
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
                                  : "border border-[#D4AF37]/30 text-[#3D312A]"
                              }`}
                              style={{ backgroundColor: isActive ? "#B8862F" : "#FAF7F2" }}
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
                        className="flex items-center justify-center gap-6 border border-[#D4AF37]/30 rounded-2xl py-3"
                        style={{ backgroundColor: "#FAF7F2" }}
                      >
                        <EditableButton
                          id="bg-rsvp-counter-btn"
                          type="button"
                          onClick={() =>
                            setCompanions(Math.max(0, companions - 1))
                          }
                          className="w-10 h-10 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-xl font-bold shadow-sm"
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
                          className="w-10 h-10 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-xl font-bold shadow-sm"
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
                        className="w-full bg-[#FAF7F2] border border-[#D4AF37]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F] resize-none"
                      />
                    </div>

                    <EditableButton
                      id="bg-rsvp-submit"
                      type="submit"
                      className="w-full py-4 hover:bg-[#9E7024] text-white font-bold rounded-2xl text-base transition shadow-md"
                      style={{ backgroundColor: "#B8862F" }}
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

      {/* طبقة الضغط لفتح الدعوة — بدون بطاقة أو زر ظاهر.
          ملاحظة: ما نشيلها فوراً لمن isOpen تصير true، لأن هذا يقطع
          حركة التلاشي البصرية. بدل هيك نخليها opacity-0 لحد ما تخلص
          الحركة (١٠٠٠ملي ثانية) ثم doorRemoved يشيلها كلياً. */}
      {doorCardVisible && inv.doorStyle === "card" && (
        <div
          onClick={handleDoorTap}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-end pb-14 sm:pb-20 transition-opacity duration-[1400ms] ${
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

          {/* دوائر الدق — توّلد بمكان الضغطة بالضبط وتكبر وتختفي */}
          {knockRipples.map((r) => (
            <span
              key={r.id}
              className="pointer-events-none absolute rounded-full border-2 border-[#F1D989]"
              style={{
                left: r.x,
                top: r.y,
                width: 70,
                height: 70,
                animation: "knockRipple 600ms ease-out forwards",
              }}
            />
          ))}

          {/* المربع الصغير أسفل الشاشة — خلفية Blur بدل السواد، وحد مزدوج (خارجي وداخلي رفيع).
              يختفي (fade) أول ما تكتمل الدقة الثالثة، قبل ما يبدأ فيديو الفتح. */}
          <div
            className={`relative z-10 flex flex-col items-center text-center px-6 py-6 w-[240px] sm:w-[280px] rounded-2xl border border-[#D4AF37]/40 shadow-2xl transition-opacity duration-500 ${
              boxHidden ? "opacity-0" : "opacity-100"
            }`}
            style={{ backgroundColor: "rgba(255, 255, 255, 0.06)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
          >
            {/* الحد الداخلي الرفيع */}
            <div className="pointer-events-none absolute inset-[6px] rounded-xl border border-[#D4AF37]/30" />

            <p className="text-[11px] tracking-[0.3em] text-[#E8DCC4] mb-3 custom-font-amiri">
              <EditableText id="door-card-title">دعوة زفاف</EditableText>
            </p>
            <p className="text-2xl font-bold text-[#F1D989] custom-font-ruqaa drop-shadow-lg" style={{ marginBottom: 0 }}>
              <EditableText id="door-card-tap-hint">اضغط لفتح الباب</EditableText>
            </p>
          </div>

          {/* تعليمة الدقّات الثلاث + النقاط — عنصر مستقل تحت المربع، بمنتصف الشاشة أفقياً.
              نفس فكرة الاختفاء قبل الفيديو. */}
          <div
            className={`relative z-10 flex flex-col items-center text-center mt-4 transition-opacity duration-500 ${
              boxHidden ? "opacity-0" : "opacity-100"
            }`}
          >
            <p className="text-sm font-bold text-[#F1D989] custom-font-amiri drop-shadow-lg mb-2">
              دُقّوا على الباب ثلاث دقّات ليُفتح
            </p>
            <div className="flex items-center justify-center gap-2.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="rounded-full transition-colors duration-300"
                  style={{
                    width: 9,
                    height: 9,
                    border: "1.5px solid #F1D989",
                    backgroundColor: i < knockCount ? "#F1D989" : "transparent",
                  }}
                />
              ))}
            </div>
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
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-[#D4AF37] text-sm md:text-base tracking-widest custom-font-amiri animate-pulse">
            <EditableText id="door-tap-hint">اضغط لفتح الدعوة</EditableText>
          </p>
        </div>
      )}
    </div>
    </DeselectSurface>
    {editable && <EditPanel />}
    {editable && (
      <BackgroundsMenu
        sections={[
          { id: "bg-verse-section", label: "خلفية قسم الآية وبطاقة الدعوة" },
          { id: "bg-countdown-section", label: "خلفية قسم العداد التنازلي (باقي على فرحنا)" },
          { id: "bg-venue-section", label: "خلفية قسم البرنامج والموقع" },
          { id: "schedule-bullet-icon", label: "لون نقاط برنامج الحفل" },
          { id: "schedule-flower-icon", label: "أيقونة ولون الوردة المتحركة" },
          { id: "bg-schedule-line", label: "لون الخط الرفيع بين نقاط البرنامج" },
          { id: "bg-map-button", label: "خلفية زر الموقع على الخريطة" },
          { id: "bg-rsvp-section", label: "خلفية قسم تأكيد الحضور (كاملة)" },
          { id: "bg-rsvp-card", label: "خلفية بطاقة تأكيد الحضور" },
          { id: "bg-rsvp-companions-box", label: "خلفية صندوق عدد المرافقين" },
          { id: "bg-rsvp-counter-btn", label: "خلفية زري + / -" },
          { id: "bg-rsvp-option-selected", label: "خلفية زر الحضور (وهو محدد)" },
          { id: "bg-rsvp-option-unselected", label: "خلفية أزرار الحضور (غير محددة)" },
          { id: "bg-rsvp-submit", label: "خلفية زر إرسال التأكيد" },
        ]}
      />
    )}
    {editable && (
      <TransitionsMenu
        items={[
          {
            id: DOOR_TEXT_TRANSITION_ID,
            label: "تلاشي نصوص القسم الأول",
            defaultDuration: 1000,
            onPreview: replayDoorTextTransition,
          },
        ]}
      />
    )}
    {editable && (
      // بوضع التصميم المباشر الباب يشتغل عادي زي عند الزوّار (اضغطي عليه
      // ثلاث ضغطات بنفسك لتفتحينه)، وهذا الزر يرجّعك لشاشة الباب المغلقة
      // (بعداد الدقّات صفر) من جديد بأي لحظة، حتى تقدرين تعدّلين نصوصها
      // أو تعيدين تجربة الفتح كم مرة ما تحتاجين بدون تسكير لوحة التصميم.
      <button
        onClick={() => {
          setIsPlaying(false)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
          }
          setShowFlash(false)
          setIsOpen(false)
          setDoorRemoved(false)
          setKnockCount(0)
          setBoxHidden(false)
          setKnockRipples([])
        }}
        style={{
          position: "fixed",
          bottom: 70,
          insetInlineStart: 16,
          zIndex: 530,
          padding: "9px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(0,0,0,.65)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,.35)",
        }}
      >
        🔄 ابدأ من شاشة الباب
      </button>
    )}
    {editable && isPlaying && (
      // زر تخطي فيديو الفتح وقت التصميم بس — يقفل الفيديو فوراً وينهي
      // حركة الفتح زي ما لو خلصت لحالها، حتى ما تنتظرين مدتها كل مرة
      // تجربين تصميم خطوة المحتوى النهائي وأنتِ بنص خطوة الفتح.
      <button
        onClick={() => {
          videoRef.current?.pause()
          completeOpening()
        }}
        style={{
          position: "fixed",
          bottom: 114,
          insetInlineStart: 16,
          zIndex: 530,
          padding: "9px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(184,134,47,.85)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,.35)",
        }}
      >
        ⏭️ تخطي فيديو الفتح
      </button>
    )}
    </EditModeProvider>
  )
}

// ─── نسخة كاملة ثالثة من نفس قالب "وصال" (نفس الكود بالضبط) — نسخة
// مستقلة تماماً بملفها عشان تقدرين تعدّلين تصميمها لاحقاً بدون ما يأثر
// على القالبين السابقين فوق. تُختار من لوحة التحكم عبر templateType="wisal3".
// ───────────────────────────────────────────────────────────────────
function WisalTemplateThreeView({
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
  // القالب 2: الباب ما ينفتح إلا بعد ٣ "دقّات" (ضغطات) متتالية بدل ضغطة
  // وحدة — هذا العداد يتابع كم دقة صارت لحد الآن.
  const [knockCount, setKnockCount] = useState(0)
  // المربع (والتعليمة تحته) يختفي أول بمجرد ما تكتمل الدقة الثالثة،
  // وبعدها بلحظة يبدأ فيديو الفتح — حتى ما يضلوا فوق بعض بنفس الوقت.
  const [boxHidden, setBoxHidden] = useState(false)
  // دوائر "الدق" اللي تطلع بمكان الضغطة بالضبط وتختفي بعد لحظات
  const [knockRipples, setKnockRipples] = useState<
    { id: number; x: number; y: number }[]
  >([])
  const knockRippleIdRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const knockAudioRef = useRef<HTMLAudioElement | null>(null)

  // صوت دقّة الباب: لو المشرف رفع صوت مخصص (knockSoundUrl) نشغّله هو —
  // وإلا نرجع لصوت مُصنَّع بالمتصفح مباشرة (بدون ملف صوتي خارجي)، نغمتين
  // خشبيتين قصيرتين متتاليتين تحاكي صوت "طق طق" بسيط.
  const playKnockSound = () => {
    if (inv.knockSoundUrl) {
      try {
        if (
          !knockAudioRef.current ||
          knockAudioRef.current.src !== inv.knockSoundUrl
        ) {
          knockAudioRef.current = new Audio(inv.knockSoundUrl)
        }
        const audio = knockAudioRef.current
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      } catch {
        // نكمل لصوت المتصفح الافتراضي لو الصوت المرفوع ما اشتغل
      }
    }
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx()
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") ctx.resume()

      const now = ctx.currentTime
      ;[0, 0.09].forEach((delay) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "triangle"
        osc.frequency.setValueAtTime(140, now + delay)
        osc.frequency.exponentialRampToValueAtTime(70, now + delay + 0.08)
        gain.gain.setValueAtTime(0.0001, now + delay)
        gain.gain.exponentialRampToValueAtTime(0.5, now + delay + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.12)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + delay)
        osc.stop(now + delay + 0.14)
      })
    } catch {
      // متصفحات ما تدعم Web Audio API — نتجاهل الصوت بصمت بدون كسر الضغطة
    }
  }
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [particles, setParticles] = useState<GoldenParticle[]>([])

  // نحسب الوقت المتبقي فعلياً بالاعتماد على موعد المناسبة (eventDateTime).
  // لو الدعوة ما عندها موعد محدد (دعوات قديمة قبل إضافة هالحقل)، نرجع
  // لنفس القيم الافتراضية اللي كانت موجودة سابقاً حتى ما ينكسر العرض.
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
  // بعض متصفحات الجوال (خصوصاً Safari بالآيفون) عندها خلل معروف: طبقة
  // كانت شغالة فوق الشاشة (position:absolute) لو انخفت بس بـ opacity+
  // pointer-events-none (بدون ما تنشال فعلياً من الصفحة)، أحياناً توقف
  // التمرير باللمس حتى لو صارت شفافة تماماً — كإنها تفضل "عالقة" بمنطقة
  // اكتشاف اللمس. الحل الأضمن: نشيل طبقة "اضغط لفتح الدعوة" كلياً من
  // الشجرة (unmount) بعد ما تخلص حركة التلاشي (نفس مدة duration-[1400ms])،
  // بدل الاعتماد على opacity/pointer-events فقط.
  const [doorRemoved, setDoorRemoved] = useState(skipIntro)
  const [doorBgVideoFailed, setDoorBgVideoFailed] = useState(false)
  // بوضع "التصميم المباشر" ما نتخطى شاشة الباب أبداً — تظهر وتتصرف
  // بالضبط زي ما يشوفها الضيف (تُضغط لتنتقل لحركة الفتح ثم لمحتوى
  // الدعوة)، حتى يقدر المصمم يشرف على الخطوات الثلاث كلها لا بس الأخيرة.
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

  // بوضع "التصميم المباشر" ما نتخطى خطوات فتح الدعوة — يشوف المصمم
  // شاشة الباب المغلق أول شي (زي أي زائر بالظبط)، ويضغط عليها بنفسه
  // لينتقل لحركة الفتح ثم لمحتوى الدعوة، حتى يقدر يعدّل ويشرف على
  // الخطوات الثلاث كلها (الباب، حركة الفتح/الدق، ثم المحتوى) لا بس
  // الخطوة الأخيرة. زر "🔄 ابدأ من شاشة الباب" تحت يرجّعه لأول خطوة
  // بأي وقت أثناء التصميم.

  // معاينة بدون فيديو الفتح (skipIntro) — بما إن isOpen/doorRemoved
  // بدؤوا true من الأساس، نولّد الورد المتطاير مرة وحدة فقط أول ما
  // تفتح الصفحة، حتى يطلع نفس تأثير لحظة اكتمال الفتح العادية.
  useEffect(() => {
    if (skipIntro) generateGoldenParticles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // إعادة تشغيل تلاشي نصوص القسم الأول عند الطلب (زر "▶ جرّب الآن" بلوحة
  // الانتقالات) — نخفي النصوص فوراً (بدون أي انتقال مرئي لهالخطوة نفسها)
  // ثم نرجعها تظهر بالإطار التالي، حتى تشتغل حركة CSS transition من جديد
  // بنفس المدة/السرعة المختارة حالياً، وتشوف المصمم النتيجة النهائية فوراً.
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
        // نفس مدة "transition-opacity duration-[1400ms]" لطبقة الباب، زائد
        // هامش بسيط، حتى تخلص اللمعة وتلاشي الصورة سوا بدون قفزة بينهم.
        setTimeout(() => setDoorRemoved(true), 1450)
      }
      return true
    })
    setIsPlaying(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  // مدة حركة دائرة الدق (لازم تطابق KNOCK_RIPPLE_MS بمدة @keyframes
  // knockRipple بالـ<style> تحت — نستخدمها هنا كمان لتأخير بداية فيديو
  // الفتح بالدقة الثالثة حتى تختفي الدائرة أول.
  const KNOCK_RIPPLE_MS = 600

  const startDoorOpenSequence = () => {
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

  const handleDoorTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOpen) return
    if (isPlaying) {
      videoRef.current?.pause()
      completeOpening()
      return
    }

    // دائرة الدق تطلع بمكان الضغطة بالضبط (إحداثيات نسبية لحاوية الطبقة)
    // وتختفي تلقائياً بعد ما تخلص حركة التكبير/التلاشي.
    const rect = e.currentTarget.getBoundingClientRect()
    const rippleId = ++knockRippleIdRef.current
    setKnockRipples((prev) => [
      ...prev,
      { id: rippleId, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ])
    setTimeout(() => {
      setKnockRipples((prev) => prev.filter((r) => r.id !== rippleId))
    }, KNOCK_RIPPLE_MS)
    playKnockSound()

    // القالب 2: أول دقتين بس نعدّهم ونعرض النقاط تتعبى، وبالدقة الثالثة
    // نبدأ فعلياً حركة فتح الباب — بس نستنى لحد ما دائرة الدق تختفي أول
    // (نفس مدة KNOCK_RIPPLE_MS) قبل ما نشغّل فيديو الفتح.
    const nextKnock = knockCount + 1
    if (nextKnock < 3) {
      setKnockCount(nextKnock)
      return
    }
    setKnockCount(nextKnock)
    setBoxHidden(true)
    // "تخطي فيديو الفتح": نخلي الثلاث دقّات (الخطوة الأولى) زي ما هي،
    // بس بعد آخر دقة نفتح المحتوى فوراً بدون تشغيل فيديو/حركة الفتح.
    if (inv.skipIntroVideo) {
      setTimeout(completeOpening, KNOCK_RIPPLE_MS)
    } else {
      setTimeout(startDoorOpenSequence, KNOCK_RIPPLE_MS)
    }
  }

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault()

    // يترسل فعلياً لشيت جوجل بس لو الدعوة عندها sheetId (دعوة خاصة
    // اتنشأت من لوحة تحكم). بدونه تبقى معاينة محلية فقط زي قبل.
    if (inv.sheetId) {
      const result = await submitRSVP({
        sheetId: inv.sheetId,
        name: guestName,
        attendance,
        companions,
        message: guestNote,
      })
      if (!result.success) {
        console.error("فشل إرسال تأكيد الحضور للشيت")
      }
    }

    setSubmitted(true)
  }

  return (
    <EditModeProvider
      editable={editable}
      initialStyles={inv.textStyles || {}}
      onStylesChange={onStylesChange}
      customFonts={customFonts}
    >
    <DeselectSurface>
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
        @keyframes knockRipple {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.65; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
        .royal-scroll::-webkit-scrollbar { display: none; }
        .royal-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          touch-action: pan-y;
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

      {/* لمعة ذهبية لحظة فتح الدعوة */}
      {showFlash && (
        <div
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,241,196,0.6) 0%, rgba(212,175,55,0.3) 35%, transparent 70%)",
            animation: "goldFlash 1300ms ease-in-out forwards",
          }}
        />
      )}

      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden z-10 royal-scroll"
      >
        <div className="relative w-full">
          {/* القسم الأول مع الخلفية والزهور — إما صورة أو مقطع فيديو
              (لو المستخدم ما اختار وحدة منهم، نرجع للافتراضي: صورة + فيديو
              خفيف فوقها، بنفس الشكل الأصلي) */}
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
              <div className="h-full w-[35%] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-[goldLine_3s_linear_infinite]" />
            </div>
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute w-[500px] h-[500px] rounded-full bg-[#D4AF37] blur-[180px] top-[-150px] right-[-120px]" />
              <div className="absolute w-[400px] h-[400px] rounded-full bg-[#D4AF37] blur-[180px] bottom-[-180px] left-[-120px]" />
            </div>
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
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60 pointer-events-none z-0" />


            <FloatingParticles particles={particles} />

            <DoorTextReveal doorRemoved={doorRemoved}>
              <div />
              <div className="my-auto flex flex-col items-center text-center">
                <p className="text-base md:text-lg tracking-widest text-[#E8DCC4] mb-2 custom-font-amiri">
                  <EditableText id="intro-title">دعوة زفاف</EditableText>
                </p>
                <span className="text-[#D4AF37] text-xl mb-4">
                  <EditableText id="intro-icon">✿</EditableText>
                </span>
                <h1 className="text-7xl md:text-9xl text-white mb-1 leading-none custom-font-ruqaa drop-shadow-2xl">
                  <EditableText id="groom">{inv.groom}</EditableText>
                </h1>
                <span className="text-3xl text-[#D4AF37] my-3 custom-font-ruqaa">
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
                  className="text-xl text-[#D4AF37]"
                  style={{ animation: "bounceDown 2s ease-in-out infinite" }}
                >
                  <EditableText id="scroll-arrow">↓</EditableText>
                </span>
              </div>
            </DoorTextReveal>
          </section>

          {/* الأقسام السفلية (مكبرة بنسبة 20%) */}
          <div className="w-full bg-[#FAF7F2] text-[#3D312A] relative z-20">
            {/* قسم الآية وبطاقة الدعوة والعداد التنازلي — خلفية كريمية
                (قابلة للتلوين أو وضع صورة من التصميم المباشر) */}
            <EditableBackground
              id="bg-verse-section"
              className="py-24 px-6 flex flex-col items-center"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="text-center max-w-xl mb-20">
                <p
                  className="whitespace-pre-line leading-loose text-[#5A4A3C] custom-font-amiri break-keep"
                  style={{ fontSize: "clamp(1rem, 4.2vw, 1.5rem)" }}
                >
                  <EditableText id="verse">{inv.verse}</EditableText>
                </p>
              </Reveal>

              {/* بطاقة الدعوة التقليدية — نص تقليدي مكوّن من 9 أسطر منفصلة
                  (كل سطر EditableText مستقل، قابل للتعديل والتحكم بحجمه
                  ولونه من التصميم المباشر لكل دعوة على حدة) */}
              <Reveal className="text-center max-w-lg mb-20">
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

            {/* قسم العداد التنازلي (باقي على فرحنا) — منفصل عن قسم الآية
                وبطاقة الدعوة، خلفية كريمية مستقلة قابلة للتلوين/الإخفاء
                لحالها من التصميم المباشر (معرّفها bg-countdown-section). */}
            <EditableBackground
              id="bg-countdown-section"
              className="py-16 px-6 flex flex-col items-center"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="text-center w-full max-w-lg mb-16">
                <h4 className="text-2xl md:text-3xl font-bold text-[#4A3B2C] mb-10 custom-font-amiri">
                  <EditableText id="countdown-title">باقي على فرحنا</EditableText>
                </h4>
                <div
                  className="flex justify-center items-center gap-4"
                  dir="ltr"
                >
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
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

            {/* برنامج الحفل والمكان — خلفية حمراء مع خط ذهبي فاصل (قابلة للتلوين من التصميم المباشر) */}
            <EditableBackground
              id="bg-venue-section"
              className="py-20 px-6 flex flex-col items-center text-[#F5EBE0] border-t-2 border-[#D4AF37]"
              style={{ backgroundColor: "#4E1019" }}
            >
              {inv.schedule && inv.schedule.length > 0 && (
                <Reveal className="text-center max-w-lg w-full mb-24">
                  <div className="flex items-center justify-center gap-3 mb-10">
                    <span className="text-[#D4AF37] text-base opacity-80">
                      ❁
                    </span>
                    <h3 className="text-3xl font-bold text-[#F1D989] custom-font-amiri">
                      <EditableText id="schedule-title">برنامج الحفل</EditableText>
                    </h3>
                    <span className="text-[#D4AF37] text-base opacity-80">
                      ❁
                    </span>
                  </div>
                  <div className="text-base md:text-lg text-[#F5EBE0]">
                    <ScheduleTrack
                      containerRef={scrollContainerRef}
                      items={inv.schedule}
                    />
                  </div>
                </Reveal>
              )}

              <Reveal className="text-center max-w-lg w-full mb-24">
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
                  style={{ backgroundColor: "#B8862F" }}
                >
                  <EditableText id="map-button-text">الموقع على الخريطة</EditableText>
                </EditableLinkBackground>
              </Reveal>
            </EditableBackground>

            {/* قسم تأكيد الحضور — يرجع كريمي مع خط ذهبي فاصل (قابلة للتلوين من التصميم المباشر) */}
            <EditableBackground
              id="bg-rsvp-section"
              className="py-20 px-6 flex flex-col items-center border-t-2 border-[#D4AF37]"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="max-w-md w-full">
              <EditableBackground
                id="bg-rsvp-card"
                className="bg-white border border-[#B8862F]/30 rounded-3xl p-10 shadow-lg"
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
                        className="w-full bg-[#FAF7F2] border border-[#D4AF37]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F]"
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
                                  : "border border-[#D4AF37]/30 text-[#3D312A]"
                              }`}
                              style={{ backgroundColor: isActive ? "#B8862F" : "#FAF7F2" }}
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
                        className="flex items-center justify-center gap-6 border border-[#D4AF37]/30 rounded-2xl py-3"
                        style={{ backgroundColor: "#FAF7F2" }}
                      >
                        <EditableButton
                          id="bg-rsvp-counter-btn"
                          type="button"
                          onClick={() =>
                            setCompanions(Math.max(0, companions - 1))
                          }
                          className="w-10 h-10 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-xl font-bold shadow-sm"
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
                          className="w-10 h-10 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-xl font-bold shadow-sm"
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
                        className="w-full bg-[#FAF7F2] border border-[#D4AF37]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F] resize-none"
                      />
                    </div>

                    <EditableButton
                      id="bg-rsvp-submit"
                      type="submit"
                      className="w-full py-4 hover:bg-[#9E7024] text-white font-bold rounded-2xl text-base transition shadow-md"
                      style={{ backgroundColor: "#B8862F" }}
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

      {/* طبقة الضغط لفتح الدعوة — بدون بطاقة أو زر ظاهر.
          ملاحظة: ما نشيلها فوراً لمن isOpen تصير true، لأن هذا يقطع
          حركة التلاشي البصرية. بدل هيك نخليها opacity-0 لحد ما تخلص
          الحركة (١٠٠٠ملي ثانية) ثم doorRemoved يشيلها كلياً. */}
      {doorCardVisible && inv.doorStyle === "card" && (
        <div
          onClick={handleDoorTap}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-end pb-14 sm:pb-20 transition-opacity duration-[1400ms] ${
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

          {/* دوائر الدق — توّلد بمكان الضغطة بالضبط وتكبر وتختفي */}
          {knockRipples.map((r) => (
            <span
              key={r.id}
              className="pointer-events-none absolute rounded-full border-2 border-[#F1D989]"
              style={{
                left: r.x,
                top: r.y,
                width: 70,
                height: 70,
                animation: "knockRipple 600ms ease-out forwards",
              }}
            />
          ))}

          {/* المربع الصغير أسفل الشاشة — خلفية Blur بدل السواد، وحد مزدوج (خارجي وداخلي رفيع).
              يختفي (fade) أول ما تكتمل الدقة الثالثة، قبل ما يبدأ فيديو الفتح. */}
          <div
            className={`relative z-10 flex flex-col items-center text-center px-6 py-6 w-[240px] sm:w-[280px] rounded-2xl border border-[#D4AF37]/40 shadow-2xl transition-opacity duration-500 ${
              boxHidden ? "opacity-0" : "opacity-100"
            }`}
            style={{ backgroundColor: "rgba(255, 255, 255, 0.06)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
          >
            {/* الحد الداخلي الرفيع */}
            <div className="pointer-events-none absolute inset-[6px] rounded-xl border border-[#D4AF37]/30" />

            <p className="text-[11px] tracking-[0.3em] text-[#E8DCC4] mb-3 custom-font-amiri">
              <EditableText id="door-card-title">دعوة زفاف</EditableText>
            </p>
            <p className="text-2xl font-bold text-[#F1D989] custom-font-ruqaa drop-shadow-lg" style={{ marginBottom: 0 }}>
              <EditableText id="door-card-tap-hint">اضغط لفتح الباب</EditableText>
            </p>
          </div>

          {/* تعليمة الدقّات الثلاث + النقاط — عنصر مستقل تحت المربع، بمنتصف الشاشة أفقياً.
              نفس فكرة الاختفاء قبل الفيديو. */}
          <div
            className={`relative z-10 flex flex-col items-center text-center mt-4 transition-opacity duration-500 ${
              boxHidden ? "opacity-0" : "opacity-100"
            }`}
          >
            <p className="text-sm font-bold text-[#F1D989] custom-font-amiri drop-shadow-lg mb-2">
              دُقّوا على الباب ثلاث دقّات ليُفتح
            </p>
            <div className="flex items-center justify-center gap-2.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="rounded-full transition-colors duration-300"
                  style={{
                    width: 9,
                    height: 9,
                    border: "1.5px solid #F1D989",
                    backgroundColor: i < knockCount ? "#F1D989" : "transparent",
                  }}
                />
              ))}
            </div>
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
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-[#D4AF37] text-sm md:text-base tracking-widest custom-font-amiri animate-pulse">
            <EditableText id="door-tap-hint">اضغط لفتح الدعوة</EditableText>
          </p>
        </div>
      )}
    </div>
    </DeselectSurface>
    {editable && <EditPanel />}
    {editable && (
      <BackgroundsMenu
        sections={[
          { id: "bg-verse-section", label: "خلفية قسم الآية وبطاقة الدعوة" },
          { id: "bg-countdown-section", label: "خلفية قسم العداد التنازلي (باقي على فرحنا)" },
          { id: "bg-venue-section", label: "خلفية قسم البرنامج والموقع" },
          { id: "schedule-bullet-icon", label: "لون نقاط برنامج الحفل" },
          { id: "schedule-flower-icon", label: "أيقونة ولون الوردة المتحركة" },
          { id: "bg-schedule-line", label: "لون الخط الرفيع بين نقاط البرنامج" },
          { id: "bg-map-button", label: "خلفية زر الموقع على الخريطة" },
          { id: "bg-rsvp-section", label: "خلفية قسم تأكيد الحضور (كاملة)" },
          { id: "bg-rsvp-card", label: "خلفية بطاقة تأكيد الحضور" },
          { id: "bg-rsvp-companions-box", label: "خلفية صندوق عدد المرافقين" },
          { id: "bg-rsvp-counter-btn", label: "خلفية زري + / -" },
          { id: "bg-rsvp-option-selected", label: "خلفية زر الحضور (وهو محدد)" },
          { id: "bg-rsvp-option-unselected", label: "خلفية أزرار الحضور (غير محددة)" },
          { id: "bg-rsvp-submit", label: "خلفية زر إرسال التأكيد" },
        ]}
      />
    )}
    {editable && (
      <TransitionsMenu
        items={[
          {
            id: DOOR_TEXT_TRANSITION_ID,
            label: "تلاشي نصوص القسم الأول",
            defaultDuration: 1000,
            onPreview: replayDoorTextTransition,
          },
        ]}
      />
    )}
    {editable && (
      // بوضع التصميم المباشر الباب يشتغل عادي زي عند الزوّار (اضغطي عليه
      // ثلاث ضغطات بنفسك لتفتحينه)، وهذا الزر يرجّعك لشاشة الباب المغلقة
      // (بعداد الدقّات صفر) من جديد بأي لحظة، حتى تقدرين تعدّلين نصوصها
      // أو تعيدين تجربة الفتح كم مرة ما تحتاجين بدون تسكير لوحة التصميم.
      <button
        onClick={() => {
          setIsPlaying(false)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
          }
          setShowFlash(false)
          setIsOpen(false)
          setDoorRemoved(false)
          setKnockCount(0)
          setBoxHidden(false)
          setKnockRipples([])
        }}
        style={{
          position: "fixed",
          bottom: 70,
          insetInlineStart: 16,
          zIndex: 530,
          padding: "9px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(0,0,0,.65)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,.35)",
        }}
      >
        🔄 ابدأ من شاشة الباب
      </button>
    )}
    {editable && isPlaying && (
      // زر تخطي فيديو الفتح وقت التصميم بس — يقفل الفيديو فوراً وينهي
      // حركة الفتح زي ما لو خلصت لحالها، حتى ما تنتظرين مدتها كل مرة
      // تجربين تصميم خطوة المحتوى النهائي وأنتِ بنص خطوة الفتح.
      <button
        onClick={() => {
          videoRef.current?.pause()
          completeOpening()
        }}
        style={{
          position: "fixed",
          bottom: 114,
          insetInlineStart: 16,
          zIndex: 530,
          padding: "9px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(184,134,47,.85)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,.35)",
        }}
      >
        ⏭️ تخطي فيديو الفتح
      </button>
    )}
    </EditModeProvider>
  )
}

export default function InvitationFullView({
  inv,
  onClose,
  editable = false,
  onStylesChange,
  customFonts = [],
  skipIntro = false,
}: {
  inv: Invitation
  onClose: () => void
  editable?: boolean
  onStylesChange?: (styles: Record<string, TextStyle>) => void
  // خطوط مخصصة (من SiteSettings.customFonts) — تمرّ لكل القوالب حتى
  // تظهر بقائمة اختيار الخط بوضع "تعديل التصميم مباشر".
  customFonts?: CustomFont[]
  // معاينة بدون مقطع فيديو/حركة فتح الباب — تفتح الدعوة مباشرة على
  // محتواها النهائي بدون ما تحتاجين تضغطين الباب أو تنتظرين الفيديو.
  // تُستخدم من رابط المعاينة بلوحة التحكم (?preview=ID&skipIntro=1).
  skipIntro?: boolean
}) {
  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-[#0D0706]">
      {inv.templateType === "wisal" ? (
        <WisalTemplateView
          inv={inv}
          editable={editable}
          onStylesChange={onStylesChange}
          customFonts={customFonts}
          skipIntro={skipIntro}
        />
      ) : inv.templateType === "wisal2" ? (
        <WisalTemplateTwoView
          inv={inv}
          editable={editable}
          onStylesChange={onStylesChange}
          customFonts={customFonts}
          skipIntro={skipIntro}
        />
      ) : inv.templateType === "wisal3" ? (
        <WisalTemplateThreeView
          inv={inv}
          editable={editable}
          onStylesChange={onStylesChange}
          customFonts={customFonts}
          skipIntro={skipIntro}
        />
      ) : (
        <EditModeProvider
          editable={editable}
          initialStyles={inv.textStyles || {}}
          onStylesChange={onStylesChange}
          customFonts={customFonts}
        >
        <DeselectSurface>
        <div
          className="flex-1 w-full h-full overflow-y-auto p-12 text-center"
          style={{
            background: `linear-gradient(180deg, ${inv.gradient[0]}, ${inv.gradient[1]})`,
            color: inv.accentColor,
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorY: "contain",
            touchAction: "pan-y",
          }}
        >
          <Reveal>
            <EditableText
              id="title"
              as="h1"
              className="text-4xl font-bold mb-4"
              style={{ fontFamily: "Amiri, serif" }}
            >
              {inv.title}
            </EditableText>
            <EditableText id="subtitle" as="p" className="text-xl">
              {inv.subtitle}
            </EditableText>
          </Reveal>
        </div>
        </DeselectSurface>
        {editable && <EditPanel />}
        </EditModeProvider>
      )}
    </div>
  )
}
