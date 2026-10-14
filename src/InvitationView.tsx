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
  return `radial-gradient(circle at center, rgba(${r},${g},${bl},0.6) 0\%, rgba(${r},${g},${bl},0.3) 35%, transparent 70%)`
}

// لمعة لحظة فتح الدعوة — تُتحكم من التصميم المباشر (bg-open-flash: إخفاء=إيقاف،
// bgColor=لون) وترجع لإعدادات الدعوة (flashEnabled/flashColor) لو ما انضبط شي.
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

// دائرة الدق (الومضة اللي تطلع بمكان الضغطة على شاشة الباب قبل دخول الدعوة) —
// لونها وإيقافها من التصميم المباشر عبر bg-knock-ripple.
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

// رفع صورة من التصميم المباشر (خلفية قسم، أو أي صورة عنصر) — يستخدم
// نفس آلية رفع الوسائط الموجودة أصلاً بالمشروع (Supabase Storage)،
// ويرجّع رابط الصورة النهائي مباشرة كنص كما يتوقعه EditModeProvider
// (onUploadImage). لو فشل الرفع (مثلاً الـ bucket مو مفعّل) نرمي خطأ
// واضح بدل ما نرجّع رابط فاضي.
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

// معرّف عنصر "ثيم الورد المتطاير" بنظام التصميم المباشر — عنصر واحد يتحكم
// بشكل كل الجزيئات المتطايرة دفعة وحدة (مو كل وردة لحالها). التعديل يتم من
// نفس لوحة الخصائص العادية: النص (الحقل "النص") يغيّر الرمز (✿، ❤، ★...)،
// ولون النص يغيّر لون كل الورود مرة وحدة.
const PARTICLES_THEME_ID = "particles-theme"

// معرّف عنصر "انتقال تلاشي نصوص القسم الأول" — يتحكم بمدة/سرعة ظهور
// النصوص والعناصر (بعد اختفاء الباب/الفيديو بالكامل) من لوحة التعديل
// عبر TransitionsMenu، بدل ما تكون مثبّتة بالكود (1000ms).
const DOOR_TEXT_TRANSITION_ID = "transition-door-text"

// معرّف عنصر "اللون الذهبي العام" — لون واحد يتحكم بكل الخطوط والحدود
// والتفاصيل الذهبية المنتشرة بكامل الدعوة (خط أعلى قسم برنامج الحفل،
// حدود بطاقات العداد التنازلي وتأكيد الحضور، بطاقة الآية، تلميح فتح
// الباب...) بدل ما تكون كل وحدة منها مثبّتة على #D4AF37 لحالها.
const GOLD_ACCENT_ID = "bg-invitation-gold"

// غلاف شفاف (display:contents — ما يأثر على التخطيط إطلاقاً) يقرأ اللون
// الذهبي العام من التصميم المباشر (معرّفه GOLD_ACCENT_ID) ويحقنه كمتغيّر
// CSS (--gold) على كل ما تحته. أي عنصر تحته يقدر يستخدم var(--gold) بدل
// اللون الثابت #D4AF37 حتى يتغيّر معه تلقائياً فور تعديله من اللوحة.
function GoldAccentScope({ children }: { children: ReactNode }) {
  const { styles } = useEditMode()
  const gold = styles[GOLD_ACCENT_ID]?.bgColor || "#D4AF37"
  return (
    <div className="contents" style={{ ["--gold" as string]: gold } as any}>
      {children}
    </div>
  )
}

// دائرتا الضوء الذهبي الكبيرتان (blur) خلف القسم الأول — شفافيتهم (نسبة
// الانتشار) قابلة للتحكم من التصميم المباشر عبر bg-hero-glow (0-100،
// الافتراضي 20%) بدل ما تكون مثبّتة على opacity-20 دايمًا.
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

// الوردتان (❁) المجاورتان لعنوان "برنامج الحفل" — لونهم مستقل تمامًا عن
// اللون الذهبي العام (بطلب مستخدم)، وله عنصر تحكم خاص فيه لحاله بقائمة
// الخلفيات (bg-schedule-title-flowers).
function ScheduleTitleFlower() {
  const { styles } = useEditMode()
  const color = styles["bg-schedule-title-flowers"]?.bgColor || "#D4AF37"
  return (
    <span className="text-base opacity-80" style={{ color }}>
      ❁
    </span>
  )
}

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
        transition: doorRemoved ? `opacity ${duration}ms${easing}` : "none",
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
        position="absolute"
      />
      {/* الوردة المتحركة فوق الخط — نحركها بـ transform (مو top) حتى تكون
          الحركة أنعم (GPU-accelerated)، ومدة أطول مع تسارع طبيعي بدل القفز
          الخطي. z-20 حتى تطلع دايماً فوق النقاط الذهبية. */}
      <div
        className="absolute left-1/2 top-0 z-20 flex items-center justify-center pointer-events-none will-change-transform"
        style={{
          transform: `translate(-50%, calc
