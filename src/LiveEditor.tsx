/**
 * ============================================================================
 * Live Editor — نظام تعديل مباشر شبيه بـ Figma/Canva
 * ============================================================================
 * نسخة "فريش" مجرّدة بالكامل من أي إعدادات أو بيانات أو Cache خاصة بأي
 * مشروع. ما فيها أي اعتماد على Supabase أو أي Backend محدد — كل حفظ/رفع
 * صورة يمر عبر Callbacks تمررها أنت من مشروعك.
 *
 * الاستخدام الأساسي:
 *
 *   <EditModeProvider editable={isEditing} initialStyles={{}} onSave={handleSave}>
 *     <EditableText id="title">عنوان قابل للتعديل</EditableText>
 *     <EditableImage id="hero-img" src="/img.jpg" alt="" />
 *     <EditPanel />
 *   </EditModeProvider>
 *
 * كل التعديلات (نص/لون/حجم/موضع/خط...) تتجمع بكائن واحد:
 *   Record<elementId, TextStyle>
 * وتوصلك جاهزة بدالة onSave اللي تمررها — احفظها وين ما تحب (DB, API...).
 * ما فيه أي تخزين محلي (localStorage/cache) داخل المكتبة نفسها.
 * ============================================================================
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react"

// ---------------------------------------------------------------------------
// النموذج الأساسي للبيانات
// ---------------------------------------------------------------------------

export interface TextStyle {
  size?: number // px
  x?: number // % من عرض الشاشة (إزاحة أفقية)
  y?: number // % من عرض الشاشة (إزاحة رأسية)
  rotation?: number // درجات 0-360
  font?: string
  fontUrl?: string // رابط ملف خط مرفوع (اختياري)
  color?: string
  bgColor?: string
  // لون الخط الفاصل العلوي لأقسام الخلفية (EditableBackground) اللي
  // بالأصل يرسم خط رفيع ذهبي فوقها (border-t). لو محدد، يحل محل اللون
  // الافتراضي. يُتجاهل تماماً لو hideBorder مفعّل.
  borderColor?: string
  // يخفي الخط الفاصل العلوي نهائياً (بدون ما يأثر على أي حدود ثانية).
  hideBorder?: boolean
  hidden?: boolean
  // إطفاء محتويات القسم فقط (EditableBackground): كل ما داخل القسم من نصوص
  // وصور وبطاقات يختفي، وتبقى خلفية القسم (لون/صورة/فيديو) وحجمه فاضيين.
  hideContents?: boolean
  // --- أحجام الأقسام (EditableBackground) ---
  // أدنى ارتفاع للقسم كنسبة % من ارتفاع الشاشة (vh). غير محدد = تلقائي.
  sectionHeight?: number
  // المسافة الداخلية العلوية والسفلية للقسم بالبكسل. غير محدد = الافتراضي.
  sectionPadding?: number
  // تكبير/تصغير القسم كامل بمحتواه (%). غير محدد = 100.
  sectionScale?: number
  text?: string // نص مخصص يحل محل النص الأصلي
  imageUrl?: string // للصور المضافة يدويًا فقط
  videoUrl?: string // فيديو خلفية قسم (بدل صورة) — لعناصر EditableBackground فقط
  // لو العنصر ده "نسخة مكرّرة" من عنصر ثاني (زر "تكرار العنصر")، هذا
  // الحقل يحمل معرّف العنصر الأصلي اللي انسخت منه. العنصر الأصلي (id)
  // نفسه هو اللي يتكفّل يعرض كل نسخه المكرّرة جنبه (شوف EditableText).
  duplicateOf?: string
  // مدة انتقال/تلاشي (بالميلي ثانية) — تُستخدم بعناصر "انتقال" خاصة
  // (مو نص عادي) زي عنصر تلاشي فتح الدعوة. شوف TransitionsMenu.
  duration?: number
  // عدد نسخ القسم المكرّرة (شوف DuplicableSection). يُخزَّن بعنصر خاص باسم section-copies-<قسم>
  copies?: number
  // نوع منحنى الحركة (سرعة الانتقال) — CSS transition-timing-function.
  easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out"
  // نمط ظهور النص عند وصول الزائر له بالتمرير (شوف TEXT_REVEAL_OPTIONS).
  // غير محدد = يتبع النمط العام (text-reveal-all) أو الافتراضي الحالي.
  reveal?: TextRevealStyle
  // ضبابية خلفية العنصر (backdrop-filter: blur) بالبكسل — للمربعات الزجاجية
  // مثل مربع "اطرق لفتح الباب". غير محدد = القيمة الافتراضية للعنصر.
  blur?: number
  // حجم وحدود "البوكس" (px): العرض/الارتفاع، انحناء الزوايا، سماكة ولون الحد.
  // غير محدد = القيمة الافتراضية للعنصر.
  boxWidth?: number
  boxHeight?: number
  radius?: number
  borderWidth?: number
  // سرعة الظهور: 0.5 (أبطأ) … 2 (أسرع). الافتراضي 1.
  revealSpeed?: number
}

// بوابة بدء أنميشن ظهور النصوص: نصوص الواجهة الأولى (الأسماء، العناوين...)
// تكون موجودة خلف الباب/الفيديو من لحظة التحميل، فلازم ما نبدأ حركتها إلا بعد
// ما يختفي الباب، وإلا تخلص الحركة وهي مخفية والزائر ما يشوفها.
// الافتراضي true (بدون بوابة)، ومكوّن DoorTextReveal يمرّر doorRemoved.
export const TextRevealGateContext = createContext<boolean>(true)

export type TextRevealStyle =
  | "none"
  | "rise"
  | "blur"
  | "rise-blur"
  | "fade"
  | "write"
  | "type"

export const TEXT_REVEAL_OPTIONS: { id: TextRevealStyle; label: string }[] = [
  { id: "rise", label: "⬆️ صعود سلس" },
  { id: "blur", label: "🌫 ضبابية تنجلي" },
  { id: "rise-blur", label: "✨ صعود + ضبابية" },
  { id: "fade", label: "🌙 تلاشي ناعم" },
  { id: "write", label: "✍️ كتابة سلسة" },
  { id: "type", label: "⌨️ كتابة فورية ناعمة" },
  { id: "none", label: "🚫 بدون حركة" },
]

function boxStyleFrom(st: TextStyle): React.CSSProperties {
  const o: any = {}
  if (st.boxWidth !== undefined) {
    o.width = st.boxWidth
    o.maxWidth = "none"
  }
  if (st.boxHeight !== undefined) o.height = st.boxHeight
  if (st.radius !== undefined) {
    o.borderRadius = st.radius
    o["--box-r"] = `${st.radius}px`
  }
  if (st.borderWidth !== undefined || st.borderColor) {
    o.borderStyle = "solid"
    if (st.borderWidth !== undefined) o.borderWidth = st.borderWidth
    if (st.borderColor) o.borderColor = st.borderColor
  }
  return o
}

// يشغّل أنميشن ظهور النص على عنصر DOM (Web Animations API) — نستخدم خصائص
// ما تتعارض مع تحريك/تدوير العنصر بالتصميم (translate المستقلة، opacity،
// filter، mask، clip-path). يرجّع الأنميشن حتى نقدر نلغيه.
export function playTextReveal(
  el: HTMLElement,
  style: TextRevealStyle,
  speed = 1,
  delay = 0,
): Animation | null {
  if (style === "none" || typeof el.animate !== "function") return null
  const sp = Math.min(2, Math.max(0.5, speed || 1))
  const len = Math.max(1, (el.textContent || "").trim().length)
  const soft = "cubic-bezier(.22,.7,.25,1)"
  const opt = (duration: number, easing = soft): KeyframeAnimationOptions => ({
    duration: duration / sp,
    delay,
    easing,
    fill: "both",
  })
  let anim: Animation
  switch (style) {
    case "rise":
      anim = el.animate(
        [
          { opacity: 0, translate: "0 22px" },
          { opacity: 1, translate: "0 0" },
        ],
        opt(1100),
      )
      break
    case "blur":
      anim = el.animate(
        [
          { opacity: 0, filter: "blur(10px)" },
          { opacity: 1, filter: "blur(0px)" },
        ],
        opt(1300),
      )
      break
    case "rise-blur":
      anim = el.animate(
        [
          { opacity: 0, filter: "blur(10px)", translate: "0 20px" },
          { opacity: 1, filter: "blur(0px)", translate: "0 0" },
        ],
        opt(1300),
      )
      break
    case "fade":
      anim = el.animate([{ opacity: 0 }, { opacity: 1 }], opt(1400, "ease-out"))
      break
    case "write": {
      // مسح ناعم بحافة متدرجة من اليمين لليسار (كأن الحبر ينتشر)
      const grad = "linear-gradient(to left, #000 0%, #000 35%, transparent 60%)"
      const e = el.style as any
      e.maskImage = e.webkitMaskImage = grad
      e.maskSize = e.webkitMaskSize = "300% 100%"
      e.maskRepeat = e.webkitMaskRepeat = "no-repeat"
      anim = el.animate(
        [
          { maskPosition: "0% 0%", webkitMaskPosition: "0% 0%" },
          { maskPosition: "100% 0%", webkitMaskPosition: "100% 0%" },
        ] as Keyframe[],
        opt(Math.min(3200, Math.max(1100, len * 80)), "cubic-bezier(.45,.1,.3,1)"),
      )
      const clean = () => {
        e.maskImage = e.webkitMaskImage = ""
        e.maskSize = e.webkitMaskSize = ""
        e.maskRepeat = e.webkitMaskRepeat = ""
      }
      anim.onfinish = clean
      anim.oncancel = clean
      return anim
    }
    case "type":
      anim = el.animate(
        [
          { clipPath: "inset(0 0 0 100%)", filter: "blur(3px)", opacity: 0.4 },
          { clipPath: "inset(0 0 0 0)", filter: "blur(0px)", opacity: 1 },
        ],
        opt(
          Math.min(2200, Math.max(600, len * 38)),
          `steps(${Math.min(80, Math.max(10, len * 2))}, end)`,
        ),
      )
      break
    default:
      return null
  }
  anim.onfinish = () => anim.cancel()
  return anim
}

export type SidebarTab = "text" | "background" | "properties" | "insert"

const MIN_PX = 8
const MAX_PX = 160
const MAX_OFFSET = 40 // % حد أقصى للإزاحة حتى لا يخرج العنصر عن الشاشة
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 1.5

// المرجع اللي نستخدمه لتحويل نسبة% <-> بكسل بناءً على عرض شاشة العميل فعليًا
function referenceWidth() {
  if (typeof window === "undefined") return 400
  return Math.min(window.innerWidth, 480)
}
function pxToPercent(px: number) {
  return (px / referenceWidth()) * 100
}
function percentToPx(percent: number) {
  return (percent / 100) * referenceWidth()
}

// ---------------------------------------------------------------------------
// خطوط وألوان جاهزة (استبدلها بما يناسب مشروعك الجديد بحرية تامة)
// ---------------------------------------------------------------------------

export const FONT_OPTIONS: { label: string; family: string }[] = [
  { label: "افتراضي", family: "inherit" },
  { label: "Sans", family: "system-ui, sans-serif" },
  { label: "Serif", family: "Georgia, serif" },
  { label: "Mono", family: "ui-monospace, monospace" },
]

export const COLOR_PRESETS: string[] = [
  "#111111",
  "#333333",
  "#666666",
  "#B8862F",
  "#D4AF37",
  "#7A3546",
  "#2A6F97",
  "#2F7A4F",
  "#F5E9E4",
  "#FFFFFF",
]

const injectedFonts = new Set<string>()
export function injectFontFace(family: string, url: string) {
  if (!family || !url || injectedFonts.has(family)) return
  injectedFonts.add(family)
  const styleEl = document.createElement("style")
  styleEl.textContent = `@font-face { font-family: '${family}'; src: url('${url}'); font-display: swap; }`
  document.head.appendChild(styleEl)
}

// خط مخصص واحد أضافه المشرف (اسم + رابط ملف الخط) — شكله هنا مطابق
// لـ CustomFont بـ types.ts لكن معرّف محلياً حتى LiveEditor يضل مستقل
// بالكامل عن باقي المشروع (شوف تعليق أعلى الملف).
export interface CustomFontOption {
  name: string
  url: string
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface EditModeValue {
  editable: boolean
  styles: Record<string, TextStyle>
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  updateStyle: (id: string, patch: Partial<TextStyle>) => void
  resetStyle: (id: string) => void
  // ينشئ نسخة جديدة كاملة من عنصر موجود (نفس الستايل) بمعرّف جديد،
  // ويحددها تلقائياً حتى يقدر المستخدم يسحبها لمكانها فوراً.
  duplicateElement: (id: string) => void
  // تكرار قسم كامل: يزيد/ينقص عدد نسخه. onCopy: يعطي معرّفات عناصر الأصل لنسخ تصميمها
  setSectionCopies: (key: string, count: number, sourceIds?: string[]) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  activeTab: SidebarTab | null
  setActiveTab: (tab: SidebarTab | null) => void
  zoom: number
  setZoom: (z: number) => void
  // اختياري: تمرره لو تحتاج رفع صور حقيقية (بدل base64 المؤقت)
  onUploadImage?: (file: File) => Promise<string>
  // خطوط مخصصة إضافية (فوق FONT_OPTIONS الثابتة) — تظهر بقائمة اختيار
  // الخط بـ EditPanel. تُحقن كـ @font-face تلقائياً عند التوفر.
  customFonts: CustomFontOption[]
}

const EditModeContext = createContext<EditModeValue>({
  editable: false,
  styles: {},
  selectedId: null,
  setSelectedId: () => {},
  updateStyle: () => {},
  resetStyle: () => {},
  duplicateElement: () => {},
  setSectionCopies: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
  activeTab: null,
  setActiveTab: () => {},
  zoom: 1,
  setZoom: () => {},
  customFonts: [],
})

// بادئة معرّفات العناصر داخل نسخ الأقسام المكرّرة (DuplicableSection):
// كل نسخة عندها بادئة خاصة، فكل نص/خلفية فيها يتخزن بمعرّف مستقل ولا يلمس الأصل.
export const IdPrefixContext = createContext<string>("")

// بوابة فيديوهات الأقسام: الزوّار ما يبدأ فيديو القسم عندهم إلا بعد ما
// ينفتح فيديو الفتح ويختفي الباب (القيمة الافتراضية true = يشتغل مباشرة).
export const VideoGateContext = createContext<boolean>(true)

export function useEditMode() {
  return useContext(EditModeContext)
}

// ---------------------------------------------------------------------------
// Provider — القلب: يمسك الحالة، التراجع/الإعادة، والحفظ
// ---------------------------------------------------------------------------

export function EditModeProvider({
  editable,
  initialStyles = {},
  onStylesChange,
  onUploadImage,
  customFonts = [],
  children,
}: {
  editable: boolean
  initialStyles?: Record<string, TextStyle>
  // يُستدعى مع كل تغيير — مرره لدالة تحفظ بمشروعك (API/DB). لا تخزين داخلي.
  onStylesChange?: (styles: Record<string, TextStyle>) => void
  onUploadImage?: (file: File) => Promise<string>
  // خطوط مخصصة (اسم + رابط ملف) تضاف لقائمة اختيار الخط — مرّرها من
  // إعدادات مشروعك (مثلاً SiteSettings.customFonts) حتى تبقى محفوظة
  // ومتاحة بكل مكان يستخدم هذا الـ Provider.
  customFonts?: CustomFontOption[]
  children: ReactNode
}) {
  const [styles, setStyles] = useState<Record<string, TextStyle>>(initialStyles)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null)
  const [zoom, setZoomState] = useState(1)
  // مرجع دايم التحديث لآخر عنصر محدد — نستخدمه بمستمع لوحة المفاتيح
  // (تحريك بالأسهم) حتى ما نحتاج نعيد تسجيل الـ listener كل مرة يتغيّر
  // فيها التحديد (وإلا تصير كل خطوة سهم "تتأخر" خطوة عن آخر تحديث).
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedId

  // تراجع/إعادة بسيط: مكدّس من اللقطات الكاملة لـ styles
  const undoStack = useRef<Record<string, TextStyle>[]>([])
  const redoStack = useRef<Record<string, TextStyle>[]>([])

  const pushHistory = (prev: Record<string, TextStyle>) => {
    undoStack.current.push(prev)
    if (undoStack.current.length > 50) undoStack.current.shift()
    redoStack.current = []
  }

  const updateStyle = (id: string, patch: Partial<TextStyle>) => {
    setStyles((prev) => {
      pushHistory(prev)
      const next = { ...prev, [id]: { ...prev[id], ...patch } }
      onStylesChange?.(next)
      return next
    })
  }

  const resetStyle = (id: string) => {
    setStyles((prev) => {
      pushHistory(prev)
      const next = { ...prev }
      delete next[id]
      onStylesChange?.(next)
      return next
    })
  }

  // تكرار عنصر: ننسخ كل خصائص التصميم الحالية للعنصر الأصلي (النص،
  // اللون، الخط، الحجم...) بمعرّف جديد فريد، ونربطه بالأصل عبر
  // duplicateOf حتى EditableText يعرف يعرض النسخة جنب عنصرها الأصلي.
  // ننزّل النسخة شوي (y +6%) حتى تبان كعنصر منفصل بدل ما تتراكب بالضبط
  // فوق الأصل، ونحددها فوراً حتى المستخدم يقدر يسحبها لمكانها.
  const duplicateElement = (id: string) => {
    const newId = `${id}__dup${Date.now()}`
    setStyles((prev) => {
      pushHistory(prev)
      const base = prev[id] || {}
      const next = {
        ...prev,
        [newId]: { ...base, duplicateOf: id, y: (base.y || 0) + 6 },
      }
      onStylesChange?.(next)
      return next
    })
    setSelectedId(newId)
  }

  const sectionPrefix = (key: string, i: number) => `sec-${key}-${i}--`
  const setSectionCopies = (key: string, count: number, sourceIds: string[] = []) => {
    const n = Math.max(0, Math.min(5, Math.floor(count)))
    setStyles((prev) => {
      pushHistory(prev)
      const next = { ...prev }
      const old = prev[`section-copies-${key}`]?.copies || 0
      if (n > old) {
        // نسخة جديدة: ننسخ تصميم عناصر الأصل (ألوان/خطوط/نصوص) لمعرّفات النسخة
        for (let i = old + 1; i <= n; i++) {
          const pre = sectionPrefix(key, i)
          for (const sid of sourceIds) {
            if (prev[sid]) {
              const st = { ...prev[sid] }
              if (st.duplicateOf) st.duplicateOf = pre + st.duplicateOf
              next[pre + sid] = st
            }
          }
        }
      } else if (n < old) {
        // حذف نسخ: نمسح كل ستايلاتها حتى ما يبقى شي يتسرّب لو انضافت من جديد
        for (let i = n + 1; i <= old; i++) {
          const pre = sectionPrefix(key, i)
          for (const k of Object.keys(next)) if (k.startsWith(pre)) delete next[k]
        }
      }
      next[`section-copies-${key}`] = { ...(prev[`section-copies-${key}`] || {}), copies: n }
      onStylesChange?.(next)
      return next
    })
  }

  const undo = () => {
    const prev = undoStack.current.pop()
    if (!prev) return
    setStyles((current) => {
      redoStack.current.push(current)
      onStylesChange?.(prev)
      return prev
    })
  }

  const redo = () => {
    const next = redoStack.current.pop()
    if (!next) return
    setStyles((current) => {
      undoStack.current.push(current)
      onStylesChange?.(next)
      return next
    })
  }

  const setZoom = (z: number) => setZoomState(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)))

  // نحقن @font-face لكل خط مخصص فور توفره (لو الصفحة تحمّل خطوط قبل ما
  // أي عنصر يختارها فعلياً) حتى معاينة الخط بقائمة الاختيار نفسها تبان
  // بشكلها الصح فوراً، مو بس بعد ما ينحفظ باستايل عنصر.
  useEffect(() => {
    customFonts.forEach((f) => injectFontFace(f.name, f.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFonts])

  // اختصارات لوحة المفاتيح: Ctrl/Cmd+Z للتراجع، Ctrl/Cmd+Shift+Z للإعادة
  useEffect(() => {
    if (!editable) return
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod || e.key.toLowerCase() !== "z") return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable])

  // تحريك بالأسهم: تحريك العنصر المحدد حبة حبة (خطوة صغيرة ثابتة) بدل
  // السحب الحر — أدق وأسهل للتحكم، خصوصاً لضبط موضع دقيق. Shift+سهم
  // يعطي خطوة أكبر للتحريك السريع. نتجاهل الضغط لو المستخدم يكتب داخل
  // حقل نص/textarea (مثلاً بنموذج RSVP الحقيقي بالمعاينة) حتى ما نخطف
  // أسهم لوحة المفاتيح من التمرير/التحرير داخل الحقل.
  useEffect(() => {
    if (!editable) return
    const ARROW_KEYS: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    }
    const STEP = 0.4 // % — خطوة صغيرة دقيقة
    const STEP_FAST = 2 // % — خطوة أكبر مع Shift
    const handler = (e: KeyboardEvent) => {
      const dir = ARROW_KEYS[e.key]
      if (!dir) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return
      // عناصر الخلفية (EditableBackground) ما تدعم تحريك أصلاً (بس لون/صورة)
      if (!selectedRef.current || selectedRef.current.startsWith("bg-")) return
      e.preventDefault()
      const step = e.shiftKey ? STEP_FAST : STEP
      setStyles((prev) => {
        pushHistory(prev)
        const id = selectedRef.current as string
        const cur = prev[id] || {}
        const nextX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, (cur.x || 0) + dir[0] * step))
        const nextY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, (cur.y || 0) + dir[1] * step))
        const next = { ...prev, [id]: { ...cur, x: nextX, y: nextY } }
        onStylesChange?.(next)
        return next
      })
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable])

  return (
    <EditModeContext.Provider
      value={{
        editable,
        styles,
        selectedId,
        setSelectedId,
        updateStyle,
        resetStyle,
        duplicateElement,
        setSectionCopies,
        undo,
        redo,
        canUndo: undoStack.current.length > 0,
        canRedo: redoStack.current.length > 0,
        activeTab,
        setActiveTab,
        zoom,
        setZoom,
        onUploadImage,
        customFonts,
      }}
    >
      {children}
    </EditModeContext.Provider>
  )
}

// يلغي التحديد لو ضغط المستخدم على مساحة فاضية (خارج أي عنصر قابل للتعديل)
export function DeselectSurface({ children }: { children: ReactNode }) {
  const { setSelectedId } = useEditMode()
  return (
    <div style={{ width: "100%", height: "100%" }} onClick={() => setSelectedId(null)}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditableText — نص قابل للتحديد/السحب/التكبير/التدوير/التلوين
// ---------------------------------------------------------------------------

type DragMode = "resize" | "move" | "rotate"
interface DragState {
  mode: DragMode
  startX: number
  startY: number
  startSize: number
  startX0: number
  startY0: number
  centerX: number
  centerY: number
  startRotation: number
}

export function EditableText({
  id: rawId,
  as = "span",
  className,
  style,
  children,
}: {
  id: string
  as?: string
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}) {
  const { editable, styles, selectedId, setSelectedId, updateStyle, zoom } = useEditMode()
  const id = useContext(IdPrefixContext) + rawId
  const ref = useRef<HTMLElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const currentStyle = styles[id]
  useEffect(() => {
    if (currentStyle?.font && currentStyle?.fontUrl) {
      injectFontFace(currentStyle.font, currentStyle.fontUrl)
    }
  }, [currentStyle?.font, currentStyle?.fontUrl])

  const Tag = as as any
  const displayChildren = currentStyle?.text !== undefined ? currentStyle.text : children

  // نمط ظهور النص بالتمرير: نمط العنصر نفسه، وإلا النمط العام (text-reveal-all)
  const revealStyle = currentStyle?.reveal ?? styles["text-reveal-all"]?.reveal
  const revealSpeed = currentStyle?.revealSpeed ?? styles["text-reveal-all"]?.revealSpeed ?? 1
  const reducedMotion =
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  const revealActive = !editable && !!revealStyle && revealStyle !== "none" && !reducedMotion
  const revealGateOpen = useContext(TextRevealGateContext)
  const [revealWaiting, setRevealWaiting] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!revealActive || !el || !revealGateOpen) return
    if (typeof IntersectionObserver === "undefined") {
      setRevealWaiting(false)
      return
    }
    let anim: Animation | null = null
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((en) => en.isIntersecting)) return
        io.disconnect()
        anim = playTextReveal(el, revealStyle as TextRevealStyle, revealSpeed, 120)
        // الأنميشن (fill: both) يمسك أول إطار طول فترة التأخير، فنقدر نشيل
        // الإخفاء المبدئي بدون وميض.
        setRevealWaiting(false)
      },
      { threshold: 0.2, rootMargin: "0px 0px -30px 0px" },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      anim?.cancel()
    }
  }, [revealActive, revealStyle, revealSpeed, revealGateOpen])
  const revealAttrs = revealStyle
    ? {
        "data-reveal-style": revealStyle,
        ref,
      }
    : { ref }
  const revealHideStyle: React.CSSProperties | null =
    revealActive && revealWaiting
      ? { opacity: 0, ...(as === "span" ? { display: "inline-block" } : null) }
      : revealActive && as === "span"
        ? { display: "inline-block" }
        : null

  // أي عناصر ثانية بستايلز الصفحة مربوطة بهالعنصر عن طريق duplicateOf
  // (يعني اتسوّت له بزر "تكرار") — نعرضها كنسخ شقيقة جنبه مباشرة، بنفس
  // الشكل (as/className/style/children) بس كل وحدة فيها تدير نفسها
  // بمعرّفها الخاص (موقعها/لونها/نصها...) بشكل مستقل تماماً عن الأصل.
  const duplicateIds = Object.keys(styles).filter(
    (key) => styles[key]?.duplicateOf === id,
  )
  const duplicatesNode =
    duplicateIds.length > 0 ? (
      <>
        {duplicateIds.map((dupId) => (
          <IdPrefixContext.Provider key={dupId} value="">
            <EditableText id={dupId} as={as} className={className} style={style}>
              {children}
            </EditableText>
          </IdPrefixContext.Provider>
        ))}
      </>
    ) : null

  // ---- وضع العرض العادي (خارج التعديل) ----
  if (!editable) {
    const saved = styles[id]
    if (saved?.hidden) return duplicatesNode
    if (!saved && !revealStyle) {
      return (
        <>
          <Tag className={className} style={style}>
            {children}
          </Tag>
          {duplicatesNode}
        </>
      )
    }
    if (!saved) {
      return (
        <>
          <Tag className={className} style={{ ...style, ...revealHideStyle }} {...revealAttrs}>
            {children}
          </Tag>
          {duplicatesNode}
        </>
      )
    }
    const x = percentToPx(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, saved.x || 0)))
    const y = percentToPx(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, saved.y || 0)))
    return (
      <>
        <Tag
          {...revealAttrs}
          className={className}
          style={{
            ...style,
            ...(saved.size ? { fontSize: `${saved.size}px` } : null),
            ...(saved.font ? { fontFamily: saved.font } : null),
            ...(saved.color ? { color: saved.color } : null),
            ...(saved.bgColor ? { backgroundColor: saved.bgColor } : null),
            ...(saved.blur !== undefined
              ? { backdropFilter: `blur(${saved.blur}px)`, WebkitBackdropFilter: `blur(${saved.blur}px)` }
              : null),
            ...boxStyleFrom(saved),
            transform: `translate(${x}px, ${y}px)`,
            ...(saved.rotation ? { rotate: `${saved.rotation}deg` } : null),
            display: (style?.display as any) ?? "inline-block",
            position: "relative",
            ...(revealActive && revealWaiting ? { opacity: 0 } : null),
          }}
        >
          {displayChildren}
        </Tag>
        {duplicatesNode}
      </>
    )
  }

  // ---- وضع التعديل ----
  const isSelected = selectedId === id
  const st = styles[id] || {}
  const px = st.size
  const offX = st.x || 0
  const offY = st.y || 0
  const rotation = st.rotation || 0

  const handleMove = (ev: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    if (d.mode === "resize") {
      const delta = (ev.clientY - d.startY) / zoomRef.current
      const next = Math.max(MIN_PX, Math.min(MAX_PX, d.startSize + delta * 0.6))
      updateStyle(id, { size: next })
    } else if (d.mode === "rotate") {
      const startAngle = (Math.atan2(d.startY - d.centerY, d.startX - d.centerX) * 180) / Math.PI
      const currentAngle = (Math.atan2(ev.clientY - d.centerY, ev.clientX - d.centerX) * 180) / Math.PI
      let next = d.startRotation + (currentAngle - startAngle)
      next = ((next % 360) + 360) % 360
      const snapped = Math.round(next / 15) * 15
      if (Math.abs(snapped - next) < 4) next = snapped % 360
      updateStyle(id, { rotation: next })
    } else {
      const dxPct = (pxToPercent(ev.clientX - d.startX))
      const dyPct = (pxToPercent(ev.clientY - d.startY))
      const nextX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, d.startX0 + dxPct))
      const nextY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, d.startY0 + dyPct))
      updateStyle(id, { x: nextX, y: nextY })
    }
  }
  const handleUp = () => {
    dragRef.current = null
    window.removeEventListener("pointermove", handleMove)
    window.removeEventListener("pointerup", handleUp)
  }

  const beginDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    const rect = el?.getBoundingClientRect()
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startSize: px ?? (el ? parseFloat(getComputedStyle(el).fontSize) : 24),
      startX0: offX,
      startY0: offY,
      centerX: rect ? rect.left + rect.width / 2 : e.clientX,
      centerY: rect ? rect.top + rect.height / 2 : e.clientY,
      startRotation: rotation,
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  const isHidden = !!st.hidden
  const handleBtnStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#1A1210",
    border: "1px solid #B8862F",
    color: "#F1D989",
    fontSize: 12,
    lineHeight: "20px",
    textAlign: "center",
    userSelect: "none",
    touchAction: "none",
  }

  return (
    <>
    <Tag
      ref={ref}
      className={className}
      data-editable-id={id}
      style={{
        ...style,
        ...(px ? { fontSize: `${px}px` } : null),
        ...(st.font ? { fontFamily: st.font } : null),
        ...(st.color ? { color: st.color } : null),
        ...(st.bgColor ? { backgroundColor: st.bgColor } : null),
        ...(st.blur !== undefined
          ? { backdropFilter: `blur(${st.blur}px)`, WebkitBackdropFilter: `blur(${st.blur}px)` }
          : null),
        ...boxStyleFrom(st),
        transform: `translate(${percentToPx(offX)}px, ${percentToPx(offY)}px)`,
        ...(rotation ? { rotate: `${rotation}deg` } : null),
        display: (style?.display as any) ?? "inline-block",
        position: "relative",
        cursor: "pointer",
        opacity: isHidden ? 0.35 : 1,
        outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
        outlineOffset: 4,
        borderRadius: st.radius ?? (style?.borderRadius as any) ?? 4,
        transition: "outline-color .15s ease, opacity .15s ease",
        zIndex: isSelected ? 350 : offX || offY ? 40 : undefined,
      }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedId(id)
      }}
    >
      {displayChildren}
      {isSelected && (
        <span
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            insetInlineStart: "50%",
            transform: "translateX(-50%)",
            bottom: -30,
            display: "flex",
            gap: 5,
            background: "#1A1210",
            border: "1px solid #B8862F",
            borderRadius: 999,
            padding: "3px 5px",
            zIndex: 400,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(0,0,0,.35)",
          }}
        >
          <span onPointerDown={beginDrag("resize")} title="تكبير/تصغير" style={handleBtnStyle}>⇕</span>
          <span onPointerDown={beginDrag("move")} title="تحريك" style={handleBtnStyle}>✥</span>
          <span onPointerDown={beginDrag("rotate")} title="تدوير" style={handleBtnStyle}>⟳</span>
        </span>
      )}
    </Tag>
    {duplicatesNode}
    </>
  )
}

// ---------------------------------------------------------------------------
// EditableLinkBackground — رابط <a> حقيقي (مثل زر "الموقع على الخريطة")
// بخلفية قابلة للتلوين. بوضع التعديل: الضغط يحدد الرابط بدل ما يفتحه
// فعلياً (حتى ما ينقلك لصفحة الخريطة وأنت بس عم تلوّن الزر).
// ---------------------------------------------------------------------------

export function EditableLinkBackground({
  id: rawId,
  href,
  target,
  rel,
  className,
  style,
  children,
}: {
  id: string
  href: string
  target?: string
  rel?: string
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
}) {
  const { editable, styles, selectedId, setSelectedId } = useEditMode()
  const id = useContext(IdPrefixContext) + rawId
  const st = styles[id] || {}
  const isSelected = editable && selectedId === id

  if (!editable && st.hidden) return null

  return (
    <a
      href={editable ? undefined : href}
      target={editable ? undefined : target}
      rel={editable ? undefined : rel}
      data-editable-id={id}
      className={className}
      style={{
        ...style,
        ...(st.bgColor ? { backgroundColor: st.bgColor } : null),
        ...(st.color ? { color: st.color } : null),
        cursor: editable ? "pointer" : undefined,
        outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
        outlineOffset: 2,
        ...(editable && st.hidden ? { opacity: 0.35 } : null),
      }}
      onClick={(e) => {
        if (editable) {
          e.preventDefault()
          e.stopPropagation()
          setSelectedId(id)
        }
      }}
    >
      {children}
    </a>
  )
}

// ---------------------------------------------------------------------------
// EditableImage — نفس فكرة EditableText بس لصورة (بدون لون/خط)
// ---------------------------------------------------------------------------

export function EditableImage({
  id: rawId,
  src,
  alt = "",
  className,
  style,
}: {
  id: string
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
}) {
  const { editable, styles, selectedId, setSelectedId, updateStyle } = useEditMode()
  const id = useContext(IdPrefixContext) + rawId
  const st = styles[id] || {}
  const finalSrc = st.imageUrl || src
  const isSelected = editable && selectedId === id

  if (!editable && st.hidden) return null

  const x = percentToPx(st.x || 0)
  const y = percentToPx(st.y || 0)

  return (
    <img
      src={finalSrc}
      alt={alt}
      data-editable-id={id}
      className={className}
      style={{
        ...style,
        ...(st.size ? { width: `${st.size}px` } : null),
        transform: `translate(${x}px, ${y}px)`,
        ...(st.rotation ? { rotate: `${st.rotation}deg` } : null),
        position: "relative",
        cursor: editable ? "pointer" : undefined,
        outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
        outlineOffset: 4,
        opacity: st.hidden ? 0.35 : 1,
      }}
      onClick={(e) => {
        if (!editable) return
        e.stopPropagation()
        setSelectedId(id)
      }}
      onError={() => {}}
    />
  )
}

// ---------------------------------------------------------------------------
// EditableButton — زر حقيقي (submit/button) بخلفية قابلة للتلوين من لوحة
// التصميم. بوضع التعديل: الضغط يحدد الزر بدل ما ينفّذ فعله الأصلي (مهم
// خصوصاً لأزرار type="submit" حتى ما ترسل نموذج RSVP فعلياً وإحنا بس
// عم نلوّن الزر).
// ---------------------------------------------------------------------------

export function EditableButton({
  id: rawId,
  type = "button",
  onClick,
  className,
  style,
  children,
  disabled,
}: {
  id: string
  type?: "button" | "submit" | "reset"
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
  disabled?: boolean
}) {
  const { editable, styles, selectedId, setSelectedId } = useEditMode()
  const id = useContext(IdPrefixContext) + rawId
  const st = styles[id] || {}
  const isSelected = editable && selectedId === id

  return (
    <button
      type={editable ? "button" : type}
      disabled={disabled}
      data-editable-id={id}
      className={className}
      style={{
        ...style,
        ...(st.bgColor ? { backgroundColor: st.bgColor } : null),
        ...(st.color ? { color: st.color } : null),
        outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
        outlineOffset: 2,
      }}
      onClick={(e) => {
        if (editable) {
          e.preventDefault()
          e.stopPropagation()
          setSelectedId(id)
          return
        }
        onClick?.(e)
      }}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// EditableBackground — خلفية قسم قابلة لتغيير اللون/الصورة
// ---------------------------------------------------------------------------

export function EditableBackground({
  id: rawId,
  className,
  style,
  children,
  position = "relative",
}: {
  id: string
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
  // بعض الاستخدامات (زي خط برنامج الحفل) تحتاج "absolute" بدل الافتراضي
  // "relative" حتى تتوسط بالضبط داخل حاويتها بدل ما تاخذ مكانها بالتدفق
  // العادي للصفحة. الافتراضي "relative" يحافظ على السلوك القديم لكل
  // الاستخدامات الثانية بدون أي تغيير.
  position?: React.CSSProperties["position"]
}) {
  const { editable, styles, selectedId, setSelectedId } = useEditMode()
  const id = useContext(IdPrefixContext) + rawId
  const st = styles[id] || {}
  const isSelected = editable && selectedId === id
  const videoGateOpen = useContext(VideoGateContext)
  const sectionVideoRef = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    if (videoGateOpen || editable) sectionVideoRef.current?.play().catch(() => {})
  }, [videoGateOpen, editable, st.videoUrl])

  // وضع العرض العادي (زوار الدعوة الحقيقيين): لو القسم اتطفى بالكامل من
  // التصميم المباشر، ما نرندر منه ولا حرف — القسم كله (بكل ما فيه من
  // نصوص/صور/بطاقات) يختفي من الصفحة تمامًا، مو بس تصير خلفيته شفافة.
  if (!editable && st.hidden) return null

  return (
    <div
      data-editable-id={id}
      className={className}
      style={{
        ...style,
        ...(st.bgColor ? { backgroundColor: st.bgColor, backgroundImage: "none" } : null),
        ...(st.imageUrl && !st.videoUrl
          ? { backgroundImage: `url(${st.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : null),
        // تخصيص/إخفاء الخط الفاصل العلوي (لو القسم أصلاً فيه border-t
        // بالـ className). الإخفاء له أولوية على تخصيص اللون.
        ...(st.hideBorder
          ? { borderTopWidth: 0, borderTopStyle: "none" }
          : st.borderColor
            ? { borderTopColor: st.borderColor }
            : null),
        // أحجام القسم من التصميم المباشر
        ...(st.sectionHeight
          ? { minHeight: `${st.sectionHeight}vh`, justifyContent: "center" }
          : null),
        ...(st.sectionPadding !== undefined
          ? { paddingTop: st.sectionPadding, paddingBottom: st.sectionPadding }
          : null),
        ...(st.sectionScale && st.sectionScale !== 100
          ? ({ zoom: st.sectionScale / 100 } as React.CSSProperties)
          : null),
        position,
        overflow: st.videoUrl ? "hidden" : undefined,
        outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
        outlineOffset: -2,
        // بوضع التصميم المباشر نفسه نبقي القسم ظاهر (باهت) حتى المصمم
        // يقدر يرجّعه أو يعدّل عليه، بدل ما يختفي كليًا ويصير يصعب الوصول له.
        ...(editable && st.hidden ? { opacity: 0.35 } : null),
      }}
      onClick={(e) => {
        if (!editable) return
        e.stopPropagation()
        setSelectedId(id)
      }}
    >
      {st.videoUrl && (
        <video
          key={st.videoUrl}
          ref={sectionVideoRef}
          src={st.videoUrl}
          preload="auto"
          autoPlay={editable || videoGateOpen}
          loop
          muted
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}
      {editable && st.hideContents && !st.hidden && (
        <div
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 8,
            insetInlineStart: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "#1A1210",
            border: "1px solid #B8862F",
            color: "#F1D989",
            fontSize: 11,
            fontFamily: "system-ui, sans-serif",
            padding: "4px 12px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          🧹 محتويات هذا القسم مطفية عن الزوار
        </div>
      )}
      {editable && st.hidden && (
        <div
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 8,
            insetInlineStart: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "#1A1210",
            border: "1px solid #B8862F",
            color: "#F1D989",
            fontSize: 11,
            fontFamily: "system-ui, sans-serif",
            padding: "4px 12px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          🚫 هذا القسم مخفي عن الزوار
        </div>
      )}
      {st.hideContents ? (
        // نبقي المحتوى بمكانه (حتى يبقى ارتفاع القسم نفسه) لكن غير مرئي
        // للزوار؛ بوضع التصميم نعرضه باهتاً حتى تقدرين ترجعينه.
        <div
          aria-hidden={!editable}
          style={{
            position: "relative",
            zIndex: 1,
            visibility: editable ? "visible" : "hidden",
            opacity: editable ? 0.15 : undefined,
            pointerEvents: editable ? undefined : "none",
          }}
        >
          {children}
        </div>
      ) : st.videoUrl ? (
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      ) : (
        children
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditPanel — لوحة الخصائص الجانبية (بسيطة: نص/لون/خط/حجم/إخفاء/تصفير)
// ---------------------------------------------------------------------------

export function EditPanel() {
  const {
    editable,
    selectedId,
    styles,
    updateStyle,
    resetStyle,
    duplicateElement,
    setSelectedId,
    undo,
    redo,
    canUndo,
    canRedo,
    onUploadImage,
    customFonts,
  } = useEditMode()

  if (!editable || !selectedId) return null
  const st = styles[selectedId] || {}
  const isDuplicate = !!st.duplicateOf
  // عناصر الخلفية (EditableBackground) معرّفها يبدأ بـ "bg-" — نعرض لها
  // لوحة مختصرة (لون خلفية + صورة + إخفاء) بدل كل خصائص النص اللي ما
  // تنطبق عليها (حجم خط، خط، تدوير...).
  const isBackground = selectedId.startsWith("bg-")

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    insetInlineEnd: 16,
    top: 64,
    width: 260,
    maxHeight: "calc(100vh - 96px)",
    overflowY: "auto",
    background: "#15100E",
    border: "1px solid #3A2A1E",
    borderRadius: 16,
    padding: 16,
    color: "#F1D989",
    fontFamily: "system-ui, sans-serif",
    fontSize: 13,
    zIndex: 500,
    boxShadow: "0 20px 50px rgba(0,0,0,.4)",
  }

  const row: React.CSSProperties = { marginBottom: 14 }
  const label: React.CSSProperties = { display: "block", marginBottom: 6, opacity: 0.8, fontSize: 11 }
  const input: React.CSSProperties = {
    width: "100%",
    background: "#1F1712",
    border: "1px solid #3A2A1E",
    borderRadius: 8,
    color: "#fff",
    padding: "6px 8px",
    fontSize: 13,
  }
  const btn: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #3A2A1E",
    background: "transparent",
    color: "#F1D989",
    fontSize: 11,
    cursor: "pointer",
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={btn} disabled={!canUndo} onClick={undo}>↶ تراجع</button>
          <button style={btn} disabled={!canRedo} onClick={redo}>↷ إعادة</button>
        </div>
        <button style={btn} onClick={() => setSelectedId(null)}>✕</button>
      </div>

      {isBackground ? (
        <>
          {selectedId === "bg-open-flash" || selectedId === "bg-knock-ripple" ? (
            <div style={row}>
              <label style={label}>{selectedId === "bg-knock-ripple" ? "دائرة الدق (ومضة الضغط على شاشة الباب)" : "لمعة لحظة فتح الدعوة"}</label>
              <button
                style={{
                  ...btn,
                  width: "100%",
                  borderColor: st.hidden ? "#B8862F" : "#3A2A1E",
                  background: st.hidden ? "rgba(184,134,47,.18)" : "transparent",
                }}
                onClick={() => updateStyle(selectedId, { hidden: !st.hidden })}
              >
                {st.hidden ? "🔆 تشغيل" : "🚫 إيقاف"}
              </button>
              <label style={{ ...label, marginTop: 12 }}>اللون</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="color"
                  value={st.bgColor || (selectedId === "bg-knock-ripple" ? "#F1D989" : "#D4AF37")}
                  onChange={(e) => updateStyle(selectedId, { bgColor: e.target.value })}
                  style={{ width: 32, height: 28, padding: 0, border: "none", background: "none" }}
                />
                <button style={btn} onClick={() => updateStyle(selectedId, { bgColor: undefined })}>
                  رجوع للذهبي
                </button>
              </div>
              <div style={{ fontSize: 10, color: "#8C7A6B", marginTop: 6 }}>
                تشوفها بالمعاينة العادية (مو بوضع التعديل).
              </div>
            </div>
          ) : selectedId === "bg-hero-glow" ? (
            <div style={row}>
              <label style={label}>نسبة التوهج ({st.size ?? 20}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={st.size ?? 20}
                onChange={(e) => updateStyle(selectedId, { size: Number(e.target.value) })}
                style={{ width: "100%" }}
              />
              <button style={{ ...btn, marginTop: 6 }} onClick={() => updateStyle(selectedId, { size: undefined })}>
                افتراضي (20%)
              </button>
              <button style={{ ...btn, marginTop: 6, marginInlineStart: 6 }} onClick={() => updateStyle(selectedId, { size: 0 })}>
                إيقاف التوهج
              </button>
              <label style={{ ...label, marginTop: 12 }}>لون التوهج</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="color"
                  value={st.bgColor || "#D4AF37"}
                  onChange={(e) => updateStyle(selectedId, { bgColor: e.target.value })}
                  style={{ width: 32, height: 28, padding: 0, border: "none", background: "none" }}
                />
                <button style={btn} onClick={() => updateStyle(selectedId, { bgColor: undefined })}>
                  رجوع للذهبي
                </button>
              </div>
            </div>
          ) : selectedId === "bg-rsvp-option-selected" ? (
            <div style={row}>
              <label style={label}>خيار "تأكيد الحضور" وقت ما يكون محدد</label>
              <div style={{ fontSize: 11, color: "#C9B896", lineHeight: 1.6 }}>
                لون هذا العنصر ثابت على الذهبي مع حلقة تمييز، وما تقدرين
                تغيّرينه من هنا — عشان كذا دايماً يبان واضح إنه "محدد" مهما
                كان لون باقي الخيارات.
              </div>
            </div>
          ) : (
            <>
              <div style={row}>
                <label style={label}>لون الخلفية</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateStyle(selectedId, { bgColor: c, imageUrl: undefined, videoUrl: undefined })}
                      style={{
                        width: 22, height: 22, borderRadius: "50%", background: c,
                        border: st.bgColor === c ? "2px solid #F1D989" : "1px solid #3A2A1E",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={st.bgColor || "#ffffff"}
                    onChange={(e) => updateStyle(selectedId, { bgColor: e.target.value, imageUrl: undefined, videoUrl: undefined })}
                    style={{ width: 26, height: 26, padding: 0, border: "none", background: "none" }}
                  />
                  <button style={btn} onClick={() => updateStyle(selectedId, { bgColor: undefined })}>افتراضي</button>
                </div>
              </div>

              {onUploadImage && (
                <div style={row}>
                  <label style={label}>صورة أو مقطع فيديو للخلفية (اختياري)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    style={input}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const url = await onUploadImage(file)
                      if (file.type.startsWith("video/")) {
                        updateStyle(selectedId, { videoUrl: url, imageUrl: undefined })
                      } else {
                        updateStyle(selectedId, { imageUrl: url, videoUrl: undefined })
                      }
                    }}
                  />
                  <div style={{ fontSize: 10, color: "#8C7A6B", marginTop: 4 }}>
                    اختاري صورة (jpg/png...) أو مقطع فيديو (mp4...) — يشتغل خلفية متحركة تلقائيًا.
                  </div>
                  {(st.imageUrl || st.videoUrl) && (
                    <button
                      style={{ ...btn, marginTop: 6 }}
                      onClick={() => updateStyle(selectedId, { imageUrl: undefined, videoUrl: undefined })}
                    >
                      إزالة {st.videoUrl ? "الفيديو" : "الصورة"}
                    </button>
                  )}
                </div>
              )}

              <div style={row}>
                <label style={label}>الخط الفاصل العلوي</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      disabled={!!st.hideBorder}
                      onClick={() => updateStyle(selectedId, { borderColor: c })}
                      style={{
                        width: 22, height: 22, borderRadius: "50%", background: c,
                        border: st.borderColor === c ? "2px solid #F1D989" : "1px solid #3A2A1E",
                        cursor: st.hideBorder ? "not-allowed" : "pointer",
                        opacity: st.hideBorder ? 0.4 : 1,
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    disabled={!!st.hideBorder}
                    value={st.borderColor || "#D4AF37"}
                    onChange={(e) => updateStyle(selectedId, { borderColor: e.target.value })}
                    style={{ width: 26, height: 26, padding: 0, border: "none", background: "none", opacity: st.hideBorder ? 0.4 : 1 }}
                  />
                  <button
                    style={btn}
                    disabled={!!st.hideBorder}
                    onClick={() => updateStyle(selectedId, { borderColor: undefined })}
                  >
                    افتراضي
                  </button>
                </div>
                <button
                  style={{ ...btn, marginTop: 6 }}
                  onClick={() => updateStyle(selectedId, { hideBorder: !st.hideBorder })}
                >
                  {st.hideBorder ? "إرجاع الخط الفاصل" : "حذف الخط الفاصل"}
                </button>
              </div>
            </>
          )}

          {/* حجم القسم: ارتفاع + مسافة داخلية + تكبير/تصغير. نخفيه عن
              العناصر الخاصة (خط البرنامج، لمعة الفتح، التوهج) لأن حجمها
              محسوب تلقائياً من مكان ثاني. */}
          {!["bg-schedule-line", "bg-open-flash", "bg-knock-ripple", "bg-hero-glow"].includes(selectedId) && (
            <div style={row}>
              <label style={label}>📐 حجم القسم</label>

              <label style={{ ...label, marginBottom: 2 }}>
                الارتفاع ({st.sectionHeight ? `${st.sectionHeight}% من الشاشة` : "تلقائي"})
              </label>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={st.sectionHeight ?? 10}
                onChange={(e) => updateStyle(selectedId, { sectionHeight: Number(e.target.value) })}
                style={{ width: "100%" }}
              />

              <label style={{ ...label, marginBottom: 2, marginTop: 8 }}>
                المسافة العلوية والسفلية ({st.sectionPadding !== undefined ? `${st.sectionPadding}px` : "افتراضي"})
              </label>
              <input
                type="range"
                min={0}
                max={300}
                step={4}
                value={st.sectionPadding ?? 80}
                onChange={(e) => updateStyle(selectedId, { sectionPadding: Number(e.target.value) })}
                style={{ width: "100%" }}
              />

              <label style={{ ...label, marginBottom: 2, marginTop: 8 }}>
                تكبير/تصغير المحتوى ({st.sectionScale ?? 100}%)
              </label>
              <input
                type="range"
                min={50}
                max={150}
                step={5}
                value={st.sectionScale ?? 100}
                onChange={(e) => updateStyle(selectedId, { sectionScale: Number(e.target.value) })}
                style={{ width: "100%" }}
              />

              <button
                style={{ ...btn, marginTop: 8, width: "100%" }}
                onClick={() =>
                  updateStyle(selectedId, {
                    sectionHeight: undefined,
                    sectionPadding: undefined,
                    sectionScale: undefined,
                  })
                }
              >
                إرجاع الحجم الافتراضي
              </button>
            </div>
          )}

          {/* إطفاء محتويات القسم فقط: يشيل كل شي بالقسم ويبقي الخلفية فاضية */}
          <div style={row}>
            <button
              style={{
                ...btn,
                width: "100%",
                fontWeight: 700,
                borderColor: st.hideContents ? "#B8862F" : "#3A2A1E",
                background: st.hideContents ? "rgba(184,134,47,.18)" : "transparent",
              }}
              onClick={() => updateStyle(selectedId, { hideContents: !st.hideContents })}
            >
              {st.hideContents ? "🧹 إرجاع محتويات القسم" : "🧹 إطفاء محتويات القسم"}
            </button>
            <p style={{ fontSize: 10, opacity: 0.6, margin: "4px 0 0" }}>
              يشيل كل شي بالقسم ويترك الخلفية فاضية.
            </p>
          </div>

          {/* تشغيل/إطفاء القسم بالكامل — يخفي كل محتوى القسم (نصوصه
              وصوره وبطاقاته) عن الزوار دفعة وحدة، مو بس لونه/صورته. */}
          <div style={row}>
            <button
              style={{
                ...btn,
                width: "100%",
                fontWeight: 700,
                borderColor: st.hidden ? "#B8862F" : "#3A2A1E",
                background: st.hidden ? "rgba(184,134,47,.18)" : "transparent",
              }}
              onClick={() => updateStyle(selectedId, { hidden: !st.hidden })}
            >
              {st.hidden ? "👁 تشغيل (إظهار) القسم" : "🚫 إطفاء (إخفاء) القسم كامل"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={row}>
            <label style={label}>النص</label>
            <textarea
              style={{ ...input, minHeight: 60, resize: "vertical" }}
              value={st.text ?? ""}
              placeholder="(النص الأصلي)"
              onChange={(e) => updateStyle(selectedId, { text: e.target.value || undefined })}
            />
          </div>

          <div style={row}>
            <label style={label}>حجم الخط ({st.size ?? "افتراضي"})</label>
            <input
              type="range"
              min={MIN_PX}
              max={MAX_PX}
              value={st.size ?? 24}
              style={{ width: "100%" }}
              onChange={(e) => updateStyle(selectedId, { size: Number(e.target.value) })}
            />
          </div>

          <div style={row}>
            <label style={label}>الخط</label>
            <select
              style={input}
              value={st.font ?? ""}
              onChange={(e) => {
                const chosenFamily = e.target.value || undefined
                // لو اختار خط مخصص (من قائمة "خطوط مضافة")، نخزن رابط ملفه
                // (fontUrl) مع اسمه بنفس TextStyle العنصر، مو بس الاسم —
                // حتى الخط يشتغل بأي صفحة يفتح فيها العنصر لحاله (مثل رابط
                // المعاينة ?preview=ID) حتى لو ما وصلتها قائمة customFonts
                // الكاملة لأي سبب، بدل ما يعتمد بس على حقن الخط العام وقت
                // فتح لوحة التصميم.
                const customMatch = customFonts.find((f) => f.name === chosenFamily)
                updateStyle(selectedId, {
                  font: chosenFamily,
                  fontUrl: customMatch?.url,
                })
              }}
            >
              <option value="">افتراضي</option>
              {FONT_OPTIONS.map((f) => (
                <option key={f.family} value={f.family}>{f.label}</option>
              ))}
              {customFonts.length > 0 && (
                <optgroup label="خطوط مضافة">
                  {customFonts.map((f) => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div style={row}>
            <label style={label}>لون النص</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateStyle(selectedId, { color: c })}
                  style={{
                    width: 22, height: 22, borderRadius: "50%", background: c,
                    border: st.color === c ? "2px solid #F1D989" : "1px solid #3A2A1E",
                    cursor: "pointer",
                  }}
                />
              ))}
              <input
                type="color"
                value={st.color || "#ffffff"}
                onChange={(e) => updateStyle(selectedId, { color: e.target.value })}
                style={{ width: 26, height: 26, padding: 0, border: "none", background: "none" }}
              />
            </div>
          </div>

          <div style={row}>
            <label style={label}>لون الخلفية</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateStyle(selectedId, { bgColor: c })}
                  style={{
                    width: 22, height: 22, borderRadius: "50%", background: c,
                    border: st.bgColor === c ? "2px solid #F1D989" : "1px solid #3A2A1E",
                    cursor: "pointer",
                  }}
                />
              ))}
              <button style={btn} onClick={() => updateStyle(selectedId, { bgColor: undefined })}>بدون</button>
            </div>
          </div>

          <div style={row}>
            <label style={label}>
              ضبابية الخلفية خلف العنصر (Blur):{" "}
              {st.blur === undefined ? "افتراضي" : `${st.blur}px`}
            </label>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={st.blur ?? 18}
              onChange={(e) => updateStyle(selectedId, { blur: Number(e.target.value) })}
              style={{ width: "100%" }}
            />
            <button style={{ ...btn, marginTop: 6 }} onClick={() => updateStyle(selectedId, { blur: undefined })}>
              رجوع للافتراضي
            </button>
          </div>

          <div style={row}>
            <label style={label}>📦 حجم البوكس وحدوده</label>
            {(
              [
                { key: "boxWidth", text: "العرض", min: 100, max: 420, def: 240 },
                { key: "boxHeight", text: "الارتفاع", min: 40, max: 420, def: 110 },
                { key: "radius", text: "انحناء الزوايا", min: 0, max: 60, def: 16 },
                { key: "borderWidth", text: "سماكة الحد", min: 0, max: 8, def: 1 },
              ] as const
            ).map((f) => {
              const v = st[f.key]
              return (
                <div key={f.key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.8 }}>
                    <span>
                      {f.text}: {v === undefined ? "تلقائي" : `${v}px`}
                    </span>
                    {v !== undefined && (
                      <span
                        style={{ textDecoration: "underline", cursor: "pointer" }}
                        onClick={() => updateStyle(selectedId, { [f.key]: undefined })}
                      >
                        تلقائي
                      </span>
                    )}
                  </div>
                  <input
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={1}
                    value={v ?? f.def}
                    onChange={(e) => updateStyle(selectedId, { [f.key]: Number(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </div>
              )
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
              <span>لون الحد</span>
              <input
                type="color"
                value={st.borderColor || "#d4af37"}
                onChange={(e) => updateStyle(selectedId, { borderColor: e.target.value })}
                style={{ width: 26, height: 26, padding: 0, border: "none", background: "none" }}
              />
              {st.borderColor && (
                <span
                  style={{ textDecoration: "underline", cursor: "pointer" }}
                  onClick={() => updateStyle(selectedId, { borderColor: undefined })}
                >
                  تلقائي
                </span>
              )}
            </div>
          </div>

          {onUploadImage && (
            <div style={row}>
              <label style={label}>رفع صورة (لو العنصر صورة)</label>
              <input
                type="file"
                accept="image/*"
                style={input}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const url = await onUploadImage(file)
                  updateStyle(selectedId, { imageUrl: url })
                }}
              />
            </div>
          )}

          <div style={row}>
            <label style={label}>✨ نمط ظهور النص (عند التمرير)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                style={{
                  ...btn,
                  borderColor: st.reveal === undefined ? "#B8862F" : "#3A2A1E",
                  background: st.reveal === undefined ? "rgba(184,134,47,.18)" : "transparent",
                }}
                onClick={() => updateStyle(selectedId, { reveal: undefined })}
                title="يتبع النمط العام أو الافتراضي الحالي"
              >
                افتراضي
              </button>
              {TEXT_REVEAL_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  style={{
                    ...btn,
                    borderColor: st.reveal === o.id ? "#B8862F" : "#3A2A1E",
                    background: st.reveal === o.id ? "rgba(184,134,47,.18)" : "transparent",
                  }}
                  onClick={() => {
                    updateStyle(selectedId, { reveal: o.id })
                    const el = document.querySelector<HTMLElement>(
                      `[data-editable-id="${selectedId}"]`,
                    )
                    if (el) playTextReveal(el, o.id, st.revealSpeed ?? 1)
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <label style={{ ...label, marginTop: 10 }}>
              السرعة ({(st.revealSpeed ?? 1).toFixed(1)}×)
            </label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={st.revealSpeed ?? 1}
              onChange={(e) => updateStyle(selectedId, { revealSpeed: Number(e.target.value) })}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button
                style={{ ...btn, flex: 1 }}
                onClick={() => {
                  const el = document.querySelector<HTMLElement>(
                    `[data-editable-id="${selectedId}"]`,
                  )
                  if (el && st.reveal) playTextReveal(el, st.reveal, st.revealSpeed ?? 1)
                }}
              >
                ▶ معاينة
              </button>
              <button
                style={{ ...btn, flex: 1 }}
                onClick={() =>
                  updateStyle("text-reveal-all", {
                    reveal: st.reveal,
                    revealSpeed: st.revealSpeed,
                  })
                }
                title="يطبّق هذا النمط والسرعة على كل النصوص اللي ما لها نمط خاص"
              >
                تطبيق على كل النصوص
              </button>
            </div>
            {styles["text-reveal-all"]?.reveal && (
              <p style={{ fontSize: 10, opacity: 0.7, margin: "6px 0 0" }}>
                النمط العام الحالي: {TEXT_REVEAL_OPTIONS.find((o) => o.id === styles["text-reveal-all"]?.reveal)?.label}{" "}
                <span
                  style={{ textDecoration: "underline", cursor: "pointer" }}
                  onClick={() => resetStyle("text-reveal-all")}
                >
                  إلغاء
                </span>
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              style={{ ...btn, flex: 1 }}
              onClick={() => updateStyle(selectedId, { hidden: !st.hidden })}
            >
              {st.hidden ? "إظهار" : "إخفاء"}
            </button>
            <button style={{ ...btn, flex: 1 }} onClick={() => duplicateElement(selectedId)}>
              ⧉ تكرار
            </button>
          </div>
        </>
      )}

      <div style={{ marginTop: 8 }}>
        <button
          style={{ ...btn, width: "100%" }}
          onClick={() => {
            resetStyle(selectedId)
            if (isDuplicate) setSelectedId(null)
          }}
        >
          {isBackground ? "إرجاع الخلفية الأصلية" : isDuplicate ? "🗑 حذف النسخة" : "إرجاع الأصل"}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BackgroundsMenu — قائمة سريعة لتحديد أي خلفية بالصفحة بالاسم بدل الضغط
// عليها مباشرة بالمعاينة. مفيدة لخلفيات صار مساحتها الظاهرة صغيرة/متغطاة
// (مثل خلفية قسم كامل ورا بطاقة كبيرة بتاخذ كل المساحة) وصعب توصلها
// بالضغط المباشر — هذا الطريق يضمن اختيارها دايماً بشكل مضمون ١٠٠٪.
// ---------------------------------------------------------------------------

export interface BackgroundSectionOption {
  id: string
  label: string
}

export function BackgroundsMenu({ sections }: { sections: BackgroundSectionOption[] }) {
  const { editable, styles, selectedId, setSelectedId, updateStyle } = useEditMode()
  const [open, setOpen] = useState(false)

  if (!editable || sections.length === 0) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        insetInlineStart: 16,
        zIndex: 530,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      {open && (
        <div
          style={{
            marginBottom: 8,
            background: "#15100E",
            border: "1px solid #3A2A1E",
            borderRadius: 12,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            maxHeight: 320,
            overflowY: "auto",
            minWidth: 240,
            boxShadow: "0 12px 30px rgba(0,0,0,.4)",
          }}
        >
          {sections.map((s) => {
            const isHidden = !!styles[s.id]?.hidden
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={() => {
                    setSelectedId(s.id)
                    setOpen(false)
                  }}
                  style={{
                    flex: 1,
                    textAlign: "start",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: selectedId === s.id ? "1px solid #B8862F" : "1px solid transparent",
                    background: selectedId === s.id ? "rgba(184,134,47,.18)" : "transparent",
                    color: isHidden ? "#8C7A6B" : "#F1D989",
                    fontSize: 12,
                    fontFamily: "system-ui, sans-serif",
                    cursor: "pointer",
                    textDecoration: isHidden ? "line-through" : "none",
                  }}
                >
                  {s.label}
                </button>
                {/* تشغيل/إطفاء سريع بدون فتح اللوحة الجانبية */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateStyle(s.id, { hidden: !isHidden })
                  }}
                  title={isHidden ? "إظهار القسم" : "إخفاء القسم"}
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: isHidden ? "1px solid #B8862F" : "1px solid #3A2A1E",
                    background: isHidden ? "rgba(184,134,47,.18)" : "transparent",
                    color: "#F1D989",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {isHidden ? "🚫" : "👁"}
                </button>
              </div>
            )
          })}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
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
        🎨 الخلفيات
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TransitionsMenu — قائمة سريعة للتحكم بمدة/سرعة أي "انتقال تلاشي" بالصفحة
// (مثل تلاشي ظهور النصوص بعد فتح الدعوة). كل عنصر انتقال له id مستقل
// يُخزَّن ضبطه (duration + easing) بنفس نظام styles العام، فينحفظ وينحمّل
// تلقائياً زي أي تعديل ثاني بدون أي تخزين إضافي.
// ---------------------------------------------------------------------------

export interface TransitionOption {
  id: string
  label: string
  defaultDuration?: number // ms — لو ما فيه قيمة محفوظة بعد
  // اختياري: تمرّرها لو تبي زر "جرّب الآن" يعيد تشغيل الانتقال فعلياً
  // بالمعاينة (بنفس المدة/السرعة الحالية) بدل ما يبقى بس سلايدر بدون
  // نتيجة مرئية فورية.
  onPreview?: () => void
}

const EASING_OPTIONS: {
  value: NonNullable<TextStyle["easing"]>
  label: string
}[] = [
  { value: "linear", label: "ثابتة" },
  { value: "ease", label: "طبيعية" },
  { value: "ease-in", label: "بطيئة البداية" },
  { value: "ease-out", label: "بطيئة النهاية" },
  { value: "ease-in-out", label: "بطيئة الطرفين" },
]

export function TransitionsMenu({ items }: { items: TransitionOption[] }) {
  const { editable, styles, updateStyle } = useEditMode()
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null)

  if (!editable || items.length === 0) return null

  const active = items.find((i) => i.id === activeId) || items[0]
  const st = styles[active.id] || {}
  const duration = st.duration ?? active.defaultDuration ?? 1000
  const easing = st.easing || "ease"

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        insetInlineStart: 150,
        zIndex: 530,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      {open && (
        <div
          style={{
            marginBottom: 8,
            background: "#15100E",
            border: "1px solid #3A2A1E",
            borderRadius: 12,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 240,
            boxShadow: "0 12px 30px rgba(0,0,0,.4)",
          }}
        >
          {items.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setActiveId(it.id)}
                  style={{
                    textAlign: "start",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border:
                      activeId === it.id
                        ? "1px solid #B8862F"
                        : "1px solid transparent",
                    background:
                      activeId === it.id
                        ? "rgba(184,134,47,.18)"
                        : "transparent",
                    color: "#F1D989",
                    fontSize: 12,
                    fontFamily: "system-ui, sans-serif",
                    cursor: "pointer",
                  }}
                >
                  {it.label}
                </button>
              ))}
            </div>
          )}

          <div>
            <label
              style={{
                color: "#F1D989",
                fontSize: 11,
                fontFamily: "system-ui, sans-serif",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span>مدة التلاشي</span>
              <span>{(duration / 1000).toFixed(1)} ثانية</span>
            </label>
            <input
              type="range"
              min={200}
              max={3000}
              step={100}
              value={duration}
              onChange={(e) =>
                updateStyle(active.id, { duration: Number(e.target.value) })
              }
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label
              style={{
                color: "#F1D989",
                fontSize: 11,
                fontFamily: "system-ui, sans-serif",
                display: "block",
                marginBottom: 6,
              }}
            >
              سرعة الحركة
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {EASING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateStyle(active.id, { easing: opt.value })}
                  style={{
                    padding: "5px 9px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontFamily: "system-ui, sans-serif",
                    border:
                      easing === opt.value
                        ? "1px solid #B8862F"
                        : "1px solid rgba(255,255,255,.15)",
                    background:
                      easing === opt.value
                        ? "rgba(184,134,47,.25)"
                        : "transparent",
                    color: "#F1D989",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {active.onPreview && (
            <button
              onClick={active.onPreview}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                border: "1px solid #B8862F",
                background: "rgba(184,134,47,.18)",
                color: "#F1D989",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              ▶ جرّب الآن
            </button>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
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
        ⏱️ الانتقالات
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ZoomControls — شريط تحكم بالزوم (اختياري، للعرض بالمحرر فقط)
// ---------------------------------------------------------------------------

export function ZoomControls() {
  const { zoom, setZoom } = useEditMode()
  const percent = Math.round(zoom * 100)
  const btn: React.CSSProperties = {
    width: 28, height: 28, borderRadius: "50%", border: "none",
    background: "transparent", color: "#fff", fontSize: 14, cursor: "pointer",
  }
  return (
    <div
      style={{
        position: "fixed", bottom: 16, insetInlineStart: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,.6)",
        border: "1px solid rgba(255,255,255,.2)", borderRadius: 999, padding: 6, zIndex: 530,
      }}
    >
      <button style={btn} disabled={zoom <= MIN_ZOOM} onClick={() => setZoom(zoom - 0.1)}>−</button>
      <span style={{ color: "#fff", fontSize: 11, minWidth: 40, textAlign: "center" }}>{percent}%</span>
      <button style={btn} disabled={zoom >= MAX_ZOOM} onClick={() => setZoom(zoom + 0.1)}>+</button>
    </div>
  )
}


// ---------------------------------------------------------------------------
// DuplicableSection — يلفّ قسم ويسمح بتكراره من التصميم المباشر. الأصل يبقى
// بمعرّفاته كما هي (بدون أي تغيير بالبيانات المحفوظة)، وكل نسخة تشتغل
// بمعرّفات ببادئة خاصة فتتعدّل باستقلال. للأقسام اللي بدون حالة خاصة فقط
// (مو نموذج تأكيد الحضور).
// ---------------------------------------------------------------------------
export function DuplicableSection({ sectionKey, children }: { sectionKey: string; children: ReactNode }) {
  const { editable, styles, setSectionCopies } = useEditMode()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const copies = Math.max(0, Math.min(5, styles[`section-copies-${sectionKey}`]?.copies || 0))
  const parentPrefix = useContext(IdPrefixContext)

  const bar = (label: string, onClick: () => void, danger = false) => (
    <div style={{ display: "flex", justifyContent: "center", padding: "6px 0", background: "#fefcf8" }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          padding: "6px 16px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          border: `1px solid ${danger ? "#dc2626" : "#B8862F"}`,
          color: danger ? "#dc2626" : "#8a5f14",
          background: "#fff",
        }}
      >
        {label}
      </button>
    </div>
  )

  const add = () => {
    const ids = Array.from(wrapRef.current?.querySelectorAll<HTMLElement>("[data-editable-id]") || [])
      .map((el) => el.getAttribute("data-editable-id") || "")
      .filter(Boolean)
    setSectionCopies(sectionKey, copies + 1, ids)
  }

  return (
    <>
      <div ref={wrapRef} style={{ display: "contents" }}>
        {children}
      </div>
      {editable && copies < 5 && bar("➕ تكرار هذا القسم", add)}
      {Array.from({ length: copies }, (_, idx) => (
        <IdPrefixContext.Provider key={idx} value={`${parentPrefix}sec-${sectionKey}-${idx + 1}--`}>
          {children}
          {editable && idx === copies - 1 && bar("🗑 حذف آخر نسخة من القسم", () => setSectionCopies(sectionKey, copies - 1), true)}
        </IdPrefixContext.Provider>
      ))}
    </>
  )
}
