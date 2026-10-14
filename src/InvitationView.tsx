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

// الوردتان (❁) المجاورتان لعنوان "برنامج الحفل" — لونهم مستقل تمام
