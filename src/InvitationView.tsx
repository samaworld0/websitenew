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
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity }}>
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[var(--gold)] blur-[180px] top-[-150px] right-[-120px]" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[var(--gold)] blur-[180px] bottom-[-180px] left-[-120px]" />
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
