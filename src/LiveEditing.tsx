import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react"
import { uploadInvitationFile } from "./backend"

// ============================================================================
// نظام تعديل مباشر شبيه بفيغما: يلف أي نص داخل قوالب الدعوة (وصال/لمسة)
// بمكوّن EditableText، أو أي قسم خلفية بمكوّن EditableBackground، يخليك
// تضغط عليه فيتحدد، وبعدها تتحكم فيه من لوحة خصائص ثابتة على جانب الشاشة
// (نفس فكرة لوحة الخصائص بفيغما):
//   - إخفاء/إظهار النص
//   - تغيير لون النص أو لون الخلفية
//   - تكبير/تصغير حجم الخط
//   - تغيير الخط (من قائمة جاهزة أو رفع ملف خط)
//   - تحريك النص لأي مكان (سحب مقبض ✥ على العنصر نفسه بالتصميم)
//   - استرجاع الوضع الأصلي
// كل هذا فوق المعاينة الحقيقية للدعوة — بدون ما يغيّر أي شي بالتصميم
// الأصلي إذا الوضع مو "تعديل" (editable=false، وهو وضع كل صفحات الموقع
// العادية). كل القيم تتخزّن بـ inv.textStyles وتُحفظ مع باقي بيانات الدعوة.
// خلفيات الأقسام (EditableBackground) تتخزّن بنفس الكائن، بس بمفتاح مسبوق
// بـ"bg:" حتى ما تتعارض مع مفاتيح النصوص ولا نحتاج عمود قاعدة بيانات جديد.
// ============================================================================

export interface TextStyle {
  size?: number
  x?: number
  y?: number
  // زاوية الدوران بالدرجات (0-360) — نطبّقها بخاصية CSS المستقلة "rotate"
  // (وليس ضمن transform) حتى ما تتعارض مع أي transform ثاني موجود على نفس
  // العنصر أصلاً (مثال: أيقونات النقاط اللي تستخدم translate للتوسيط)
  rotation?: number
  // اسم عائلة الخط المرفوع (يتولّد تلقائياً) ورابط ملف الخط بعد رفعه لـ
  // Supabase Storage — لازم الاثنين مع بعض حتى نقدر نطبّق @font-face
  // بالمعاينة النهائية (خارج وضع التعديل) مو بس بالمحرر
  font?: string
  fontUrl?: string
  // لون مخصص — يُستخدم للنص (color) وللخلفيات (نفس الحقل، background)
  color?: string
  // إخفاء العنصر بالكامل من المعاينة النهائية (يبقى ظاهر بوضع التعديل
  // بشفافية أقل حتى يقدر الأدمن يلقاه ويرجّعه)
  hidden?: boolean
  // نص مخصّص يحل محل النص الأصلي المكتوب بالقالب. لو undefined نستخدم
  // النص الأصلي كما هو. للنصوص المُضافة يدويًا (custom:) هذا الحقل هو
  // مصدر النص الوحيد (ما فيه نص أصلي أصلاً)
  text?: string
  // رابط صورة مرفوعة (Supabase Storage) — يُستخدم فقط للعناصر اللي معرّفها
  // مسبوق بـ IMAGE_PREFIX (صور يضيفها الأدمن يدويًا فوق التصميم). حقل
  // "size" بهالحالة يمثّل عرض الصورة بالبكسل (مو حجم خط)
  imageUrl?: string
  // ترتيب القسم بين باقي الأقسام المُضافة يدويًا (رقم أصغر = أعلى). يُستخدم
  // فقط للعناصر المسبوقة بـ SECTION_PREFIX، ويبقى undefined لحد ما الأدمن
  // يستخدم أزرار "نقل لأعلى/أسفل" أول مرة — قبلها الترتيب يعتمد على وقت
  // الإضافة (نفس السلوك القديم) عبر sortSectionIds بالأسفل
  order?: number
}

const BG_PREFIX = "bg:"
const ICON_PREFIX = "icon:"
// نصوص يضيفها الأدمن يدويًا فوق التصميم (زر "✚ إضافة نص") — ما تقابل أي
// عنصر مكتوب مسبقًا بالقالب، فكل معلوماتها (النص نفسه، موضعها، لونها...)
// تتخزّن بالكامل تحت مفتاح مسبوق بـ"custom:"، وتُعرض عبر CustomTextLayer
export const CUSTOM_PREFIX = "custom:"
// صور يرفعها الأدمن يدويًا فوق التصميم (زر "🖼 رفع صورة" بتبويب "العناصر")
// — نفس فكرة CUSTOM_PREFIX بالضبط (عنصر عائم يُسحب لأي مكان، مو جزء من
// ترتيب الصفحة)، بس مصدره ملف مرفوع مو نص. الرابط نفسه يتخزّن بحقل
// imageUrl، والعرض بالبكسل بحقل size العادي
export const CUSTOM_IMAGE_PREFIX = "image:"
// أقسام جديدة يضيفها الأدمن يدويًا (زر "➕ إضافة قسم") — كل قسم عبارة عن
// صندوق بعرض الشاشة كامل، ياخذ مساحة حقيقية بترتيب الصفحة (مو عائم زي
// النصوص المُضافة)، ينضاف بآخر الدعوة بعد كل الأقسام الجاهزة. لونه يتخزّن
// بحقل color العادي وارتفاعه بحقل size (كبكسل)، بنفس كائن الأنماط، بمفتاح
// مسبوق بـ"section:"
export const SECTION_PREFIX = "section:"
const DEFAULT_SECTION_HEIGHT = 220
const MIN_SECTION_HEIGHT = 80
const MAX_SECTION_HEIGHT = 900

// ترتيب معرّفات الأقسام المُضافة يدويًا: نعتمد على حقل order الصريح إذا
// كان موجود على القسمين المُقارَنين (يتغيّر بأزرار نقل لأعلى/أسفل)، وإلا
// نرجع لنفس الترتيب الزمني القديم حسب المعرّف (وقت الإضافة) — بذا الأقسام
// اللي ما انحركت أبدًا تبقى تترتب صح زي ما كانت
function sortSectionIds(ids: string[], styles: Record<string, TextStyle>): string[] {
  return [...ids].sort((a, b) => {
    const oa = styles[a]?.order
    const ob = styles[b]?.order
    if (oa != null && ob != null) return oa - ob
    if (oa != null) return -1
    if (ob != null) return 1
    return a < b ? -1 : a > b ? 1 : 0
  })
}

// يحوّل شجرة children لنص عادي (يهتم بالنصوص الفعلية بس، يتجاهل أي عنصر
// زخرفي متداخل) — نستخدمه حتى نعرف "النص الأصلي" الحالي لأي EditableText
// ونعرضه كقيمة ابتدائية بمربع تحرير النص بلوحة الخصائص
function childrenToPlainText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(childrenToPlainText).join("")
  if (typeof node === "object" && "props" in (node as any)) {
    return childrenToPlainText((node as any).props?.children)
  }
  return ""
}

// أقسام اللوحة الجانبية على طراز Canva: شريط أيقونات ضيّق ثابت، وكل أيقونة
// تفتح لوحة فرعية (flyout) بجانبه فيها أدواتها. "properties" تتفعّل تلقائيًا
// لما تضغط على أي عنصر بالتصميم مباشرة (بدل ما يضطر الأدمن يفتحها يدويًا)
export type SidebarTab = "insert" | "text" | "background" | "properties"

interface EditModeValue {
  editable: boolean
  styles: Record<string, TextStyle>
  selectedId: string | null
  invitationId: string | number
  // "النص الأصلي" الحالي لكل EditableText (قبل أي تعديل) — يتسجّل تلقائيًا
  // من كل عنصر عند رسمه بوضع التعديل، ونستخدمه كقيمة ابتدائية بمربع تحرير
  // النص بلوحة الخصائص
  defaultTexts: Record<string, string>
  setSelectedId: (id: string | null) => void
  updateStyle: (id: string, patch: Partial<TextStyle>) => void
  resetStyle: (id: string) => void
  registerDefaultText: (id: string, text: string) => void
  // يضيف مربع نص جديد فوق التصميم ويحدده فورًا حتى يقدر الأدمن يكتب فيه
  // ويسحبه لأي مكان
  addCustomText: () => void
  // يضيف "أيقونة" جاهزة (رمز إيموجي كبير) فوق التصميم ويحددها فورًا —
  // نفس آلية addCustomText بالضبط بس بحجم افتراضي أكبر ونص ابتدائي مختلف
  addCustomIcon: (glyph: string) => void
  // يضيف صورة مرفوعة فوق التصميم (بعد رفعها لـ Supabase Storage) ويحددها
  // فورًا حتى يقدر الأدمن يكبّرها/يسحبها لأي مكان
  addCustomImage: (url: string) => void
  // يضيف قسم جديد بآخر الدعوة (بعد كل الأقسام الجاهزة) ويحدده فورًا حتى
  // يقدر الأدمن يغيّر لونه/ارتفاعه من لوحة الخصائص مباشرة
  addCustomSection: () => void
  // ينقل القسم المحدد خطوة لأعلى أو لأسفل بترتيب الأقسام المُضافة يدويًا
  // (يبدّل ترتيبه مع القسم المجاور بنفس الاتجاه مباشرة). بدون تأثير لو
  // كان أول قسم وطلبت "لأعلى"، أو آخر قسم وطلبت "لأسفل"
  moveSection: (id: string, direction: "up" | "down") => void
  // تراجع/إعادة لآخر تعديل على الأنماط (styles) — يغطي كل التغييرات: نص،
  // لون، حجم، موضع، إضافة/حذف عنصر... إلخ. مفعّلة باختصارات لوحة المفاتيح
  // (Ctrl/Cmd+Z للتراجع، Ctrl/Cmd+Shift+Z أو Ctrl/Cmd+Y للإعادة) وبزرين
  // بأعلى شريط الأيقونات
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  // التبويب المفتوح حاليًا بشريط الأيقونات (null = الشريط مقفول، ما فيه
  // لوحة فرعية ظاهرة) + دالة تغييره
  activeTab: SidebarTab | null
  setActiveTab: (tab: SidebarTab | null) => void
  // عرض اللوحة الجانبية الكلي بالبكسل الآن (الشريط + اللوحة الفرعية إذا
  // كانت مفتوحة) — تستخدمه الصفحة اللي تحتوي المحرر حتى تزيح المعاينة
  // بنفس المقدار بالضبط
  sidebarWidth: number
}

const EditModeContext = createContext<EditModeValue>({
  editable: false,
  styles: {},
  selectedId: null,
  invitationId: "",
  defaultTexts: {},
  setSelectedId: () => {},
  updateStyle: () => {},
  resetStyle: () => {},
  registerDefaultText: () => {},
  addCustomText: () => {},
  addCustomIcon: () => {},
  addCustomImage: () => {},
  addCustomSection: () => {},
  moveSection: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
  activeTab: null,
  setActiveTab: () => {},
  sidebarWidth: 0,
})

export function useEditMode() {
  return useContext(EditModeContext)
}

// نخزن أسماء عائلات الخطوط اللي انحقنت بـ @font-face حتى الآن، حتى ما نضيف
// نفس القاعدة أكثر من مرة إذا تكرر نفس الخط لأكثر من نص بنفس الدعوة
const injectedFonts = new Set<string>()

function injectFontFace(family: string, url: string) {
  if (!family || !url || injectedFonts.has(family)) return
  injectedFonts.add(family)
  const styleEl = document.createElement("style")
  styleEl.setAttribute("data-uploaded-font", family)
  styleEl.textContent = `@font-face { font-family: '${family}'; src: url('${url}'); font-display: swap; }`
  document.head.appendChild(styleEl)
}

// قائمة الخطوط الجاهزة اللي تطلع بزر 🔤 — كلها محمّلة مسبقًا من Google
// Fonts بـ src/index.css فتشتغل فورًا بدون رفع أي ملف. لإضافة خط جديد:
// 1) ضيفه بسطر @import بأول index.css، 2) ضيف عنصر جديد هنا بنفس اسم
// عائلة الخط (family) بالضبط.
export const FONT_OPTIONS: { label: string; family: string }[] = [
  { label: "نسخ سنس", family: "Noto Sans Arabic, sans-serif" },
  { label: "نسخ نسخي", family: "Noto Naskh Arabic, serif" },
  { label: "قاهرة", family: "Cairo, sans-serif" },
  { label: "عارف رقعة", family: "Aref Ruqaa, serif" },
  { label: "أميري", family: "Amiri, serif" },
  { label: "المسيري", family: "El Messiri, sans-serif" },
  { label: "ريم كوفي", family: "Reem Kufi, sans-serif" },
  { label: "IBM بلكس", family: "IBM Plex Sans, sans-serif" },
  { label: "شيريش", family: "Cherish, cursive" },
]

// لوحة ألوان جاهزة تطلع بلوحة الخصائص — نفس عائلة ألوان قوالب الدعوة
// (نبيتي/عنابي، ذهبي، كريمي) حتى يقدر الأدمن يطبّق نفس هوية التصميم
// بضغطة وحدة، مع خيار لون حر بجانبها لأي لون ثاني.
export const COLOR_PRESETS: string[] = [
  "#5C2A38",
  "#4E1019",
  "#7A3546",
  "#3D2B2E",
  "#2A211D",
  "#B8862F",
  "#C9A227",
  "#D4AF37",
  "#F1D4B8",
  "#F5E9E4",
  "#FBF3EF",
  "#FAF7F2",
  "#FFFFFF",
  "#000000",
]

export function EditModeProvider({
  editable,
  initialStyles,
  invitationId = "",
  onStylesChange,
  children,
}: {
  editable: boolean
  initialStyles: Record<string, TextStyle>
  invitationId?: string | number
  onStylesChange?: (styles: Record<string, TextStyle>) => void
  children: ReactNode
}) {
  const [styles, setStyles] = useState<Record<string, TextStyle>>(
    initialStyles,
  )
  const [selectedId, setSelectedIdRaw] = useState<string | null>(null)
  const [defaultTexts, setDefaultTexts] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null)

  // سجل التراجع/الإعادة — كل عنصر عبارة عن "لقطة" كاملة لكائن الأنماط قبل
  // تعديل معيّن. نحتفظ بمرجع (ref) يواكب آخر قيمة لـ styles أول بأول حتى
  // نقدر نلتقطها من داخل updateStyle/resetStyle وقت الاستدعاء بالضبط (بدل
  // الاعتماد على قيمة styles بإغلاق دالة قديمة، اللي ممكن تكون غير محدّثة
  // لو انسحب العنصر بسرعة/تكرر النداء بنفس اللحظة)
  const stylesRef = useRef(styles)
  stylesRef.current = styles
  const [past, setPast] = useState<Record<string, TextStyle>[]>([])
  const [future, setFuture] = useState<Record<string, TextStyle>[]>([])
  // حد أقصى لعدد الخطوات المحفوظة حتى ما تكبر الذاكرة المستخدمة بلا داعي
  // بجلسة تعديل طويلة (تعديلات أقدم من هذا العدد تنمحي تلقائيًا)
  const MAX_HISTORY = 100

  const pushHistory = () => {
    setPast((p) => {
      const next = [...p, stylesRef.current]
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
    })
    // أي تعديل جديد يلغي فرع "الإعادة" القديم (نفس سلوك كل برامج التحرير)
    setFuture([])
  }

  // تحديد أي عنصر مباشرة بالتصميم (نص/خلفية/أيقونة) يفتح تبويب "الخصائص"
  // بشريط الأيقونات تلقائيًا — بالضبط زي ما يصير بفيغما/كانفا لما تضغط على
  // عنصر بلوحة الرسم. إلغاء التحديد (id = null) يقفل التبويب لو كان
  // "الخصائص" هو المفتوح حاليًا (ما نلمس تبويب ثاني فتحه الأدمن يدويًا،
  // مثل "العناصر" أو "التصميم")
  const setSelectedId = (id: string | null) => {
    setSelectedIdRaw(id)
    if (id) {
      setActiveTab("properties")
    } else {
      setActiveTab((prev) => (prev === "properties" ? null : prev))
    }
  }

  const updateStyle = (id: string, patch: Partial<TextStyle>) => {
    pushHistory()
    setStyles((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } }
      onStylesChange?.(next)
      return next
    })
  }

  const resetStyle = (id: string) => {
    pushHistory()
    setStyles((prev) => {
      const next = { ...prev }
      delete next[id]
      onStylesChange?.(next)
      return next
    })
  }

  // يرجّع لآخر لقطة محفوظة بسجل "الماضي" ويحط الوضع الحالي بسجل "المستقبل"
  // حتى تقدر تعيده لو غيّرت رأيك (نفس سلوك Ctrl+Z بأي برنامج تحرير)
  const undo = () => {
    if (past.length === 0) return
    const prevSnapshot = past[past.length - 1]
    setFuture((f) => [...f, stylesRef.current])
    setPast((p) => p.slice(0, -1))
    setStyles(prevSnapshot)
    onStylesChange?.(prevSnapshot)
  }

  // عكس undo تمامًا — يرجّع آخر لقطة انلغت بالتراجع
  const redo = () => {
    if (future.length === 0) return
    const nextSnapshot = future[future.length - 1]
    setPast((p) => [...p, stylesRef.current])
    setFuture((f) => f.slice(0, -1))
    setStyles(nextSnapshot)
    onStylesChange?.(nextSnapshot)
  }

  // اختصارات لوحة المفاتيح: Ctrl/Cmd+Z للتراجع، Ctrl/Cmd+Shift+Z أو
  // Ctrl/Cmd+Y للإعادة — نتجاهلها تمامًا لو التركيز حاليًا داخل حقل كتابة
  // (input/textarea/select أو أي عنصر contentEditable) حتى ما نصادم
  // تراجع/إعادة الكتابة الطبيعي بالمتصفح داخل مربعات لوحة الخصائص
  useEffect(() => {
    if (!editable) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey
      if (!isMod) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isTypingField =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!target?.isContentEditable
      if (isTypingField) return
      const key = e.key.toLowerCase()
      if (key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  const registerDefaultText = (id: string, text: string) => {
    setDefaultTexts((prev) => (prev[id] === text ? prev : { ...prev, [id]: text }))
  }

  // معرّف فريد للنص الجديد + قيم ابتدائية بسيطة (حجم متوسط، بدون لون
  // مخصص حتى ياخذ اللون الافتراضي المكتوب بـ CustomTextLayer) — ونحدده
  // فورًا حتى تفتح لوحة الخصائص عليه ويكتب الأدمن نصه مباشرة
  const addCustomText = () => {
    const id =
      CUSTOM_PREFIX + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    updateStyle(id, { text: "نص جديد", size: 22 })
    setSelectedId(id)
  }

  // نفس فكرة addCustomText بالضبط، بس بنص ابتدائي = الرمز نفسه وحجم أكبر
  // (الأيقونات الجاهزة إيموجي عادي، فنستخدم نفس آلية النصوص المُضافة —
  // بدون حاجة لأي رسم أو نوع عنصر جديد)
  const addCustomIcon = (glyph: string) => {
    const id =
      CUSTOM_PREFIX + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    updateStyle(id, { text: glyph, size: 40 })
    setSelectedId(id)
  }

  // معرّف فريد للصورة المرفوعة + عرض ابتدائي معقول (180px) — ونحددها فورًا
  // حتى تفتح لوحة الخصائص عليها ويقدر الأدمن يكبّرها/يسحبها على طول
  const addCustomImage = (url: string) => {
    const id =
      CUSTOM_IMAGE_PREFIX + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    updateStyle(id, { imageUrl: url, size: 180 })
    setSelectedId(id)
  }

  // معرّف فريد للقسم الجديد + ارتفاع ابتدائي معقول (بدون لون مخصص حتى
  // ياخذ لون خلفي فاتح افتراضي من CustomSectionsLayer) — ونحدده فورًا حتى
  // تفتح لوحة الخصائص عليه ويقدر الأدمن يغيّر لونه/ارتفاعه على طول
  const addCustomSection = () => {
    const id =
      SECTION_PREFIX + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    updateStyle(id, { size: DEFAULT_SECTION_HEIGHT })
    setSelectedId(id)
  }

  // يبدّل ترتيب القسم المحدد مع القسم المجاور بنفس الاتجاه. نطبّع أولًا
  // ترتيب كل الأقسام الحالية (نعطي كل وحد رقم order صريح حسب ترتيبه الظاهر
  // حاليًا) حتى يشتغل التبديل صح حتى لو بعضها ما كان له order من قبل
  // (أقسام قديمة كانت تعتمد على ترتيب المعرّف الزمني بس)
  const moveSection = (id: string, direction: "up" | "down") => {
    const ids = sortSectionIds(
      Object.keys(stylesRef.current).filter((k) => k.startsWith(SECTION_PREFIX)),
      stylesRef.current,
    )
    const idx = ids.indexOf(id)
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (idx === -1 || swapIdx < 0 || swapIdx >= ids.length) return
    pushHistory()
    setStyles((prev) => {
      const next = { ...prev }
      ids.forEach((key, i) => {
        next[key] = { ...next[key], order: i }
      })
      const a = ids[idx]
      const b = ids[swapIdx]
      const orderA = next[a].order
      next[a] = { ...next[a], order: next[b].order }
      next[b] = { ...next[b], order: orderA }
      onStylesChange?.(next)
      return next
    })
  }

  const sidebarWidth = editable ? RAIL_WIDTH + (activeTab ? FLYOUT_WIDTH : 0) : 0

  return (
    <EditModeContext.Provider
      value={{
        editable,
        styles,
        selectedId,
        invitationId,
        defaultTexts,
        setSelectedId,
        updateStyle,
        resetStyle,
        registerDefaultText,
        addCustomText,
        addCustomIcon,
        addCustomImage,
        addCustomSection,
        moveSection,
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        activeTab,
        setActiveTab,
        sidebarWidth,
      }}
    >
      {children}
    </EditModeContext.Provider>
  )
}

// طبقة شفافة تلغي التحديد الحالي لما تضغط بأي مكان فاضي (غير فوق نص قابل
// للتعديل) — نفس سلوك فيغما لما تضغط بره العنصر المحدد
export function DeselectSurface({ children }: { children: ReactNode }) {
  const { setSelectedId, editable } = useEditMode()
  if (!editable) return <>{children}</>
  return (
    <div className="w-full h-full" onClick={() => setSelectedId(null)}>
      {children}
    </div>
  )
}

const MIN_PX = 8
const MAX_PX = 220
// أقصى مسافة تحريك مسموحة (بالنسبة المئوية من عرض الشاشة) بأي اتجاه — رقم
// كبير جداً عملياً يعني حرية تحريك كاملة بأي مكان، مع بقاء حد أقصى احترازي
// بسيط يمنع بس قيم تالفة/غير منطقية (لو انحفظت غلط) من تكسير التصميم
// بشكل متطرف
const MAX_OFFSET = 500

// إحداثيات السحب (x, y) تتخزّن كنسبة مئوية من عرض الشاشة، مو كبكسل ثابت —
// حتى لو الأدمن سحب عنصر وهو يشتغل على شاشة كمبيوتر عريضة، نفس النسبة
// تنطبّق صح على شاشة جوال ضيقة بدل ما تطلع القيمة المطلقة (مثلاً 300px)
// نسبة ضخمة من عرض شاشة الجوال الصغيرة وتدفع العنصر برّه حدود الشاشة.
// نستخدم عرض الشاشة (window.innerWidth) كمرجع للاتجاهين الأفقي والرأسي
// معًا (بدل ارتفاع الحاوية اللي يختلف بشكل كبير وغير منطقي بسبب السكرول)
// حتى تنسحب العناصر بنفس مقياس التكبير/التصغير بالاتجاهين بدون تشويه.
function referenceWidth() {
  return typeof window !== "undefined" && window.innerWidth ? window.innerWidth : 1200
}
function pxToPercent(px: number) {
  return (px / referenceWidth()) * 100
}
function percentToPx(percent: number) {
  return (percent / 100) * referenceWidth()
}

export function EditableText({
  id,
  as = "span",
  className,
  style,
  children,
  href,
  target,
  rel,
}: {
  id: string
  as?: string
  className?: string
  style?: React.CSSProperties
  children: ReactNode
  // تدعم فقط لو as="a" — تخلي العنصر كامل (مو بس النص) قابل للسحب والتحريك
  // مع احتفاظه بخاصيته كرابط (مثال: زر "الموقع على الخريطة")
  href?: string
  target?: string
  rel?: string
}) {
  const { editable, styles, selectedId, setSelectedId, updateStyle, registerDefaultText } =
    useEditMode()
  const ref = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{
    mode: "resize" | "move" | "rotate"
    startY: number
    startX: number
    startSize: number
    startX0: number
    startY0: number
    // مركز العنصر بإحداثيات الشاشة وقت بدء السحب + زاويته الحالية —
    // نحتاجهم بس بوضع الدوران، لحساب الزاوية بين المركز والمؤشر
    centerX: number
    centerY: number
    startRotation: number
  } | null>(null)

  // إذا هالنص عنده خط مرفوع (بوضع التعديل أو بالمعاينة النهائية للضيف)،
  // نحقن قاعدة @font-face بالصفحة أول ما تتوفر بياناته — هذا الـ effect
  // لازم ينفّذ دائماً (حتى برّه وضع التعديل) عشان يشتغل الخط عند الضيوف
  const currentStyle = styles[id]
  useEffect(() => {
    if (currentStyle?.font && currentStyle?.fontUrl) {
      injectFontFace(currentStyle.font, currentStyle.fontUrl)
    }
  }, [currentStyle?.font, currentStyle?.fontUrl])

  // نسجّل "النص الأصلي" الحالي بوضع التعديل بس (ما فيه داعي نحسبه عند
  // الضيف)، حتى تقدر لوحة الخصائص تعرضه كقيمة ابتدائية بمربع تحرير النص
  useEffect(() => {
    if (editable && !id.startsWith(CUSTOM_PREFIX)) {
      registerDefaultText(id, childrenToPlainText(children))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, id, children])

  const Tag = as as any
  const linkProps = as === "a" ? { href, target, rel } : {}
  // لو الأدمن كتب نص مخصص من لوحة الخصائص نعرضه بدل النص الأصلي المكتوب
  // بالقالب — بدون ما يغيّر أي شي إذا ما فيه تعديل (undefined = النص
  // الأصلي كما هو)
  const displayChildren = currentStyle?.text !== undefined ? currentStyle.text : children

  if (!editable) {
    const savedStyle = styles[id]
    // العنصر مخفي من الأدمن — ما ينعرض إطلاقاً عند الضيف، وما ياخذ أي
    // مساحة بالتصميم
    if (savedStyle?.hidden) return null
    if (!savedStyle) {
      return (
        <Tag className={className} style={style} {...linkProps}>
          {children}
        </Tag>
      )
    }
    // برّه وضع التعديل (المعاينة الحقيقية أو رابط الدعوة النهائي) نطبّق
    // الحجم/الموضع/الخط/اللون المحفوظ فقط، بدون أي إطار أو مقابض تفاعلية —
    // مع حد أقصى احترازي حتى لو انحفظت قيمة كبيرة قديمة (قبل إضافة القيد)
    // ما تطلع النص برّه حدود الشاشة. القيم المحفوظة نسبة مئوية من عرض
    // الشاشة، فنحوّلها لبكسل فعلي حسب عرض شاشة الجهاز الحالي (جوال أو
    // كمبيوتر) — هذا اللي يخلي نفس الموضع يبان صح على كل المقاسات
    const clampedXPct = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, savedStyle.x || 0))
    const clampedYPct = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, savedStyle.y || 0))
    const clampedX = percentToPx(clampedXPct)
    const clampedY = percentToPx(clampedYPct)
    // لو النص انسحب لمكان بعيد عن موضعه الأصلي، نرفع طبقته (z-index) حتى
    // ما يختفي وراء القسم اللي بعده لما يتداخل بصرياً معه (القسم التالي له
    // خلفية خاصة تُرسم فوقه بترتيب DOM العادي وإلا)
    const isMoved = clampedXPct !== 0 || clampedYPct !== 0
    const readOnlyStyle: React.CSSProperties = {
      ...style,
      ...(savedStyle.size ? { fontSize: `${savedStyle.size}px` } : null),
      ...(savedStyle.font ? { fontFamily: savedStyle.font } : null),
      ...(savedStyle.color ? { color: savedStyle.color } : null),
      transform: `translate(${clampedX}px, ${clampedY}px)`,
      // خاصية CSS مستقلة عن transform حتى تشتغل مع الـ translate اللي فوق
      // بدون ما تلغيه (المتصفحات الحديثة تدعم rotate/scale/translate
      // كخصائص منفصلة تتركّب فوق بعض تلقائياً)
      ...(savedStyle.rotation ? { rotate: `${savedStyle.rotation}deg` } : null),
      display: "inline-block",
      position: "relative",
      ...(isMoved ? { zIndex: 40 } : null),
    }
    return (
      <Tag className={className} style={readOnlyStyle} {...linkProps}>
        {displayChildren}
      </Tag>
    )
  }

  const isSelected = selectedId === id
  const st = styles[id] || {}
  const px = st.size
  const offX = st.x || 0
  const offY = st.y || 0
  const rotation = st.rotation || 0

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    const currentPx =
      px ?? (el ? parseFloat(getComputedStyle(el).fontSize) : 24)
    dragRef.current = {
      mode: "resize",
      startY: e.clientY,
      startX: e.clientX,
      startSize: currentPx,
      startX0: offX,
      startY0: offY,
      centerX: 0,
      centerY: 0,
      startRotation: rotation,
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  const startMove = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      mode: "move",
      startY: e.clientY,
      startX: e.clientX,
      startSize: px ?? 24,
      startX0: offX,
      startY0: offY,
      centerX: 0,
      centerY: 0,
      startRotation: rotation,
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  // يبدأ سحب مقبض الدوران ⟳ — نحسب مركز العنصر فعليًا بالشاشة (getBoundingClientRect)
  // حتى نقدر نحسب زاوية المؤشر بالنسبة له بأي لحظة أثناء السحب
  const startRotate = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    const rect = el?.getBoundingClientRect()
    const centerX = rect ? rect.left + rect.width / 2 : e.clientX
    const centerY = rect ? rect.top + rect.height / 2 : e.clientY
    dragRef.current = {
      mode: "rotate",
      startY: e.clientY,
      startX: e.clientX,
      startSize: px ?? 24,
      startX0: offX,
      startY0: offY,
      centerX,
      centerY,
      startRotation: rotation,
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  const handleMove = (ev: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    if (d.mode === "resize") {
      const delta = ev.clientY - d.startY
      const next = Math.max(MIN_PX, Math.min(MAX_PX, d.startSize + delta * 0.6))
      updateStyle(id, { size: next })
    } else if (d.mode === "rotate") {
      // زاوية المؤشر الحالية بالنسبة لمركز العنصر، ناقص زاويته وقت بدء
      // السحب، تعطينا مقدار الدوران الإضافي — نضيفه لزاوية البداية
      const startAngle =
        (Math.atan2(d.startY - d.centerY, d.startX - d.centerX) * 180) / Math.PI
      const currentAngle =
        (Math.atan2(ev.clientY - d.centerY, ev.clientX - d.centerX) * 180) / Math.PI
      let next = d.startRotation + (currentAngle - startAngle)
      // نلفّها لتبقى بين 0 و360 حتى ما تتراكم أرقام كبيرة بلا داعي
      next = ((next % 360) + 360) % 360
      // تثبيت تلقائي قريب من زوايا شائعة (0/45/90/135/180...) يسهّل
      // محاذاة العنصر بدقة، بس لو المؤشر مو قريب منها فعلاً يطبّق القيمة
      // الحرة بدون أي تثبيت
      const snapped = Math.round(next / 15) * 15
      if (Math.abs(snapped - next) < 4) next = snapped % 360
      updateStyle(id, { rotation: next })
    } else {
      // d.startX0/d.startY0 محفوظة كنسبة مئوية — نحوّل فرق حركة الماوس
      // بالبكسل لنفس النسبة قبل ما نضيفه لهم، حتى يبقى كل شي بنفس الوحدة
      const dxPct = pxToPercent(ev.clientX - d.startX)
      const dyPct = pxToPercent(ev.clientY - d.startY)
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

  const isHidden = !!st.hidden

  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(px ? { fontSize: `${px}px` } : null),
    ...(st.font ? { fontFamily: st.font } : null),
    ...(st.color ? { color: st.color } : null),
    // offX/offY نسبة مئوية من عرض الشاشة — نحوّلها لبكسل فعلي للعرض بوضع
    // التعديل (نفس التحويل المطبّق بالمعاينة النهائية عند الضيف)
    transform: `translate(${percentToPx(offX)}px, ${percentToPx(offY)}px)`,
    ...(rotation ? { rotate: `${rotation}deg` } : null),
    display: "inline-block",
    position: "relative",
    cursor: "pointer",
    opacity: isHidden ? 0.35 : 1,
    outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
    outlineOffset: 4,
    borderRadius: 4,
    transition: "outline-color .15s ease, opacity .15s ease",
    zIndex: isSelected ? 350 : offX !== 0 || offY !== 0 ? 40 : undefined,
  }

  const handleBtnStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#1A1210",
    border: "1px solid #B8862F",
    color: "#F1D989",
    fontSize: 12,
    lineHeight: "20px",
    userSelect: "none",
  }

  return (
    <Tag
      ref={ref}
      className={className}
      style={mergedStyle}
      data-editable-id={id}
      {...(as === "a" ? { href, target, rel } : {})}
      onClick={(e: React.MouseEvent) => {
        // بوضع التعديل نمنع فتح الرابط فعليًا (مثال: زر خرائط) حتى ما يفتح
        // تبويب جديد أو يطلع المستخدم من المحرر لمجرد إنه ضغط على الزر
        // ليحدده أو يسحبه
        if (as === "a") e.preventDefault()
        e.stopPropagation()
        setSelectedId(id)
      }}
    >
      {displayChildren}
      {isHidden && (
        <span
          contentEditable={false}
          title="عنصر مخفي"
          style={{
            position: "absolute",
            top: -8,
            insetInlineEnd: -8,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#1A1210",
            border: "1px solid #B8862F",
            color: "#F1D989",
            fontSize: 9,
            lineHeight: "14px",
            textAlign: "center",
            zIndex: 360,
          }}
        >
          ⊘
        </span>
      )}
      {isSelected && !isHidden && (
        <span
          contentEditable={false}
          style={{
            position: "absolute",
            insetInlineStart: "50%",
            transform: "translateX(50%)",
            bottom: -30,
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "#1A1210",
            border: "1px solid #B8862F",
            borderRadius: 999,
            padding: "3px 5px",
            zIndex: 400,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(0,0,0,.35)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            onPointerDown={startResize}
            title="اسحب للتكبير/التصغير — أو استخدم لوحة الخصائص"
            style={handleBtnStyle}
          >
            <span style={{ display: "block", textAlign: "center" }}>⇕</span>
          </span>
          <span
            onPointerDown={startMove}
            title="اسحب لتحريك النص لأي مكان"
            style={handleBtnStyle}
          >
            <span style={{ display: "block", textAlign: "center" }}>✥</span>
          </span>
          <span
            onPointerDown={startRotate}
            title="اسحب لتدوير النص"
            style={handleBtnStyle}
          >
            <span style={{ display: "block", textAlign: "center" }}>⟳</span>
          </span>
        </span>
      )}
    </Tag>
  )
}

const IMAGE_MIN_PX = 40
const IMAGE_MAX_PX = 800

// نفس فكرة EditableText بالضبط (سحب/تكبير/تدوير + تحديد من لوحة الخصائص)
// بس لعنصر <img> بدل نص — حقل "size" هنا يمثّل عرض الصورة بالبكسل (الارتفاع
// يتبع تلقائيًا حسب أبعاد الصورة الأصلية)، وما فيه لون ولا خط نطبّقه عليها
export function EditableImage({ id }: { id: string }) {
  const { editable, styles, selectedId, setSelectedId, updateStyle } = useEditMode()
  const ref = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    mode: "resize" | "move" | "rotate"
    startY: number
    startX: number
    startSize: number
    startX0: number
    startY0: number
    centerX: number
    centerY: number
    startRotation: number
  } | null>(null)

  const st = styles[id] || {}
  const url = st.imageUrl
  if (!url) return null

  const isSelected = selectedId === id
  const px = st.size ?? 180
  const offX = st.x || 0
  const offY = st.y || 0
  const rotation = st.rotation || 0
  const isHidden = !!st.hidden

  if (!editable) {
    if (isHidden) return null
    const clampedXPct = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offX))
    const clampedYPct = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offY))
    const isMoved = clampedXPct !== 0 || clampedYPct !== 0
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          width: px,
          height: "auto",
          display: "inline-block",
          position: "relative",
          transform: `translate(${percentToPx(clampedXPct)}px, ${percentToPx(clampedYPct)}px)`,
          ...(rotation ? { rotate: `${rotation}deg` } : null),
          ...(isMoved ? { zIndex: 40 } : null),
        }}
      />
    )
  }

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      mode: "resize",
      startY: e.clientY,
      startX: e.clientX,
      startSize: px,
      startX0: offX,
      startY0: offY,
      centerX: 0,
      centerY: 0,
      startRotation: rotation,
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  const startMove = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      mode: "move",
      startY: e.clientY,
      startX: e.clientX,
      startSize: px,
      startX0: offX,
      startY0: offY,
      centerX: 0,
      centerY: 0,
      startRotation: rotation,
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  const startRotate = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = ref.current?.getBoundingClientRect()
    const centerX = rect ? rect.left + rect.width / 2 : e.clientX
    const centerY = rect ? rect.top + rect.height / 2 : e.clientY
    dragRef.current = {
      mode: "rotate",
      startY: e.clientY,
      startX: e.clientX,
      startSize: px,
      startX0: offX,
      startY0: offY,
      centerX,
      centerY,
      startRotation: rotation,
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  const handleMove = (ev: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    if (d.mode === "resize") {
      // الفرق بالمحورين معًا (سحب قطري) يعطي إحساس تكبير طبيعي لصورة —
      // بعكس النص اللي يكفيه محور واحد (الارتفاع) لتغيير حجم الخط
      const delta = ev.clientX - d.startX + (ev.clientY - d.startY)
      const next = Math.max(IMAGE_MIN_PX, Math.min(IMAGE_MAX_PX, d.startSize + delta))
      updateStyle(id, { size: next })
    } else if (d.mode === "rotate") {
      const startAngle =
        (Math.atan2(d.startY - d.centerY, d.startX - d.centerX) * 180) / Math.PI
      const currentAngle =
        (Math.atan2(ev.clientY - d.centerY, ev.clientX - d.centerX) * 180) / Math.PI
      let next = d.startRotation + (currentAngle - startAngle)
      next = ((next % 360) + 360) % 360
      const snapped = Math.round(next / 15) * 15
      if (Math.abs(snapped - next) < 4) next = snapped % 360
      updateStyle(id, { rotation: next })
    } else {
      const dxPct = pxToPercent(ev.clientX - d.startX)
      const dyPct = pxToPercent(ev.clientY - d.startY)
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

  const handleBtnStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#1A1210",
    border: "1px solid #B8862F",
    color: "#F1D989",
    fontSize: 12,
    lineHeight: "20px",
    userSelect: "none",
  }

  return (
    <div
      ref={ref}
      data-editable-id={id}
      style={{
        width: px,
        display: "inline-block",
        position: "relative",
        cursor: "pointer",
        opacity: isHidden ? 0.35 : 1,
        outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
        outlineOffset: 4,
        borderRadius: 4,
        transition: "outline-color .15s ease, opacity .15s ease",
        transform: `translate(${percentToPx(offX)}px, ${percentToPx(offY)}px)`,
        ...(rotation ? { rotate: `${rotation}deg` } : null),
        zIndex: isSelected ? 350 : offX !== 0 || offY !== 0 ? 40 : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedId(id)
      }}
    >
      <img src={url} alt="" draggable={false} style={{ width: "100%", height: "auto", display: "block" }} />
      {isHidden && (
        <span
          contentEditable={false}
          title="عنصر مخفي"
          style={{
            position: "absolute",
            top: -8,
            insetInlineEnd: -8,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#1A1210",
            border: "1px solid #B8862F",
            color: "#F1D989",
            fontSize: 9,
            lineHeight: "14px",
            textAlign: "center",
            zIndex: 360,
          }}
        >
          ⊘
        </span>
      )}
      {isSelected && !isHidden && (
        <span
          contentEditable={false}
          style={{
            position: "absolute",
            insetInlineStart: "50%",
            transform: "translateX(50%)",
            bottom: -30,
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "#1A1210",
            border: "1px solid #B8862F",
            borderRadius: 999,
            padding: "3px 5px",
            zIndex: 400,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(0,0,0,.35)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            onPointerDown={startResize}
            title="اسحب للتكبير/التصغير — أو استخدم لوحة الخصائص"
            style={handleBtnStyle}
          >
            <span style={{ display: "block", textAlign: "center" }}>⤡</span>
          </span>
          <span onPointerDown={startMove} title="اسحب لتحريك الصورة لأي مكان" style={handleBtnStyle}>
            <span style={{ display: "block", textAlign: "center" }}>✥</span>
          </span>
          <span onPointerDown={startRotate} title="اسحب لتدوير الصورة" style={handleBtnStyle}>
            <span style={{ display: "block", textAlign: "center" }}>⟳</span>
          </span>
        </span>
      )}
    </div>
  )
}
// الحضور الكريمي) ويخليها قابلة للتحديد وتغيير اللون من لوحة الخصائص، بنفس
// طريقة EditableText بالضبط. تُخزَّن قيمتها بنفس كائن الأنماط لكن بمفتاح
// مسبوق بـ"bg:" حتى ما تتعارض مع مفاتيح النصوص.
export function EditableBackground({
  id,
  as = "div",
  className,
  style,
  children,
  dir,
  attrs,
}: {
  id: string
  as?: string
  className?: string
  style?: React.CSSProperties
  children: ReactNode
  // تمرير اختياري لخاصية dir (مثل dir="rtl") حتى تنعكس صح على أقسام تعتمد
  // عليها لباقي التصميم (مثال: العنصر الجذر لكل قالب)
  dir?: string
  // خصائص DOM إضافية غير قابلة للتمرير عبر style أو dir (مثال: type="submit"
  // أو disabled لزر). بوضع التعديل تُستثنى منها onClick الأصلي (نستبدله
  // بمنطق التحديد) حتى ما يصير إرسال فورم أو أي فعل حقيقي وأنت تحاول تختار
  // العنصر بس؛ برّه وضع التعديل تُطبَّق كاملة عادي لأنها تخص تجربة الضيف
  attrs?: Record<string, any>
}) {
  const { editable, styles, selectedId, setSelectedId } = useEditMode()
  const Tag = as as any
  const key = BG_PREFIX + id
  const saved = styles[key]
  const extraProps = dir ? { dir } : {}

  if (!editable) {
    const mergedStyle: React.CSSProperties = {
      ...style,
      ...(saved?.color
        ? { backgroundColor: saved.color, backgroundImage: "none" }
        : null),
    }
    return (
      <Tag className={className} style={mergedStyle} {...extraProps} {...attrs}>
        {children}
      </Tag>
    )
  }

  const isSelected = selectedId === key
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(saved?.color
      ? { backgroundColor: saved.color, backgroundImage: "none" }
      : null),
    position: style?.position ?? "relative",
    cursor: "pointer",
    boxShadow: isSelected ? "inset 0 0 0 3px #3B82F6" : "inset 0 0 0 0px transparent",
    transition: "box-shadow .15s ease",
  }

  return (
    <Tag
      className={className}
      style={mergedStyle}
      data-editable-bg-id={id}
      {...extraProps}
      {...attrs}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedId(key)
      }}
    >
      {children}
    </Tag>
  )
}

// يلف أي عنصر زخرفي/رسومي بالتصميم (زهرة، نقطة، أيقونة SVG أو حرف
// زخرفي) ويخليه قابل للتحديد وتغيير لونه وحجمه وحذفه (إخفاؤه)، بنفس فكرة
// EditableText/EditableBackground. تُخزَّن قيمته بنفس كائن الأنماط بمفتاح
// مسبوق بـ"icon:". الحجم يتخزّن كنسبة مئوية (100 = الحجم الأصلي) لأن
// العناصر الزخرفية تختلف بوحدة قياسها (px لنقطة، viewBox لـ SVG...)، فكل
// عنصر يمرر getSizeStyle/getColorStyle حتى يحدد بنفسه كيف يترجم النسبة
// والّلون المختارين إلى خصائص CSS فعلية (width/height، fontSize، color،
// backgroundColor...) بدل ما نفرض عليه transform موحّد قد يكسر أي
// position/transform موجود مسبقًا على نفس العنصر (مثال: النقاط اللي
// تتوسّط بـ -translate-x-1/2 -translate-y-1/2).
// أكثر من عنصر ممكن يستخدموا نفس id (مثال: النقاط الثلاث بخط برنامج
// الحفل) حتى يتحكم فيهم الأدمن كمجموعة وحدة من لوحة خصائص واحدة.
export function EditableIcon({
  id,
  as = "span",
  className,
  style,
  children,
  attrs,
  getSizeStyle,
  getColorStyle,
}: {
  id: string
  as?: string
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
  // خصائص DOM إضافية غير قابلة للتمرير عبر style (مثال: viewBox لعنصر svg)
  attrs?: Record<string, any>
  getSizeStyle?: (percent: number) => React.CSSProperties
  getColorStyle?: (color: string) => React.CSSProperties
}) {
  const { editable, styles, selectedId, setSelectedId } = useEditMode()
  const Tag = as as any
  const key = ICON_PREFIX + id
  const st = styles[key] || {}
  const percent = st.size ?? 100
  const extraStyle: React.CSSProperties = {
    ...(getSizeStyle ? getSizeStyle(percent) : null),
    ...(st.color && getColorStyle ? getColorStyle(st.color) : null),
    // "rotate" خاصية CSS مستقلة عن transform، فما تتعارض مع أي transform
    // موجود مسبقًا بكلاسات العنصر (مثال: translate-x/y لتوسيط النقاط)
    ...(st.rotation ? { rotate: `${st.rotation}deg` } : null),
  }

  if (!editable) {
    if (st.hidden) return null
    return (
      <Tag className={className} style={{ ...style, ...extraStyle }} {...attrs}>
        {children}
      </Tag>
    )
  }

  const isSelected = selectedId === key
  const isHidden = !!st.hidden
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...extraStyle,
    cursor: "pointer",
    opacity: isHidden ? 0.35 : 1,
    outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
    outlineOffset: 3,
    borderRadius: 4,
    transition: "outline-color .15s ease, opacity .15s ease",
  }

  return (
    <Tag
      className={className}
      style={mergedStyle}
      data-editable-icon-id={id}
      {...attrs}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedId(key)
      }}
    >
      {children}
    </Tag>
  )
}

// ============================================================================
// لوحة الخصائص — ثابتة على جانب الشاشة بوضع التعديل، شبيهة بلوحة فيغما.
// تعرض عناصر التحكم المناسبة حسب نوع العنصر المحدد حاليًا (نص أو خلفية).
// ============================================================================

// عرض شريط الأيقونات الثابت (زي شريط Canva الجانبي) + عرض اللوحة الفرعية
// (flyout) اللي تنفتح بجانبه لما تختار تبويب. الاثنين يتجمعوا بـ sidebarWidth
// بالسياق فوق حتى تعرف الصفحة اللي تحتوي المحرر كم تزيح المعاينة.
export const RAIL_WIDTH = 84
export const FLYOUT_WIDTH = 280

function swatchStyle(color: string, active: boolean): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: 8,
    background: color,
    border: active ? "2px solid #3B82F6" : "1px solid rgba(255,255,255,.25)",
    cursor: "pointer",
    boxShadow: active ? "0 0 0 2px rgba(59,130,246,.35)" : "none",
    flexShrink: 0,
  }
}

function PanelSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          color: "#B8862F",
          fontFamily: "Cairo, sans-serif",
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

// تعريف تبويبات شريط الأيقونات — نفس فكرة شريط Canva الجانبي (أيقونة +
// تسمية تحتها). "properties" ينفتح تلقائيًا لما تحدد عنصر بالتصميم
// مباشرة (شوف setSelectedId بالمزوّد فوق)، والبقية تنفتح يدويًا بالضغط.
const SIDEBAR_TABS: { id: SidebarTab; icon: string; label: string }[] = [
  { id: "text", icon: "🔤", label: "النص" },
  { id: "insert", icon: "🧩", label: "العناصر" },
  { id: "background", icon: "🎨", label: "التصميم" },
  { id: "properties", icon: "⚙️", label: "الخصائص" },
]

export function EditPanel() {
  const {
    editable,
    styles,
    selectedId,
    setSelectedId,
    invitationId,
    defaultTexts,
    updateStyle,
    resetStyle,
    activeTab,
    setActiveTab,
    addCustomText,
    addCustomIcon,
    addCustomImage,
    addCustomSection,
    moveSection,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditMode()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingFont, setUploadingFont] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [customColor, setCustomColor] = useState("#B8862F")
  const [pageBgCustomColor, setPageBgCustomColor] = useState("#FBF3EF")

  if (!editable) return null

  const isBg = !!selectedId?.startsWith(BG_PREFIX)
  const isIcon = !!selectedId?.startsWith(ICON_PREFIX)
  const isCustom = !!selectedId?.startsWith(CUSTOM_PREFIX)
  const isSection = !!selectedId?.startsWith(SECTION_PREFIX)
  const isImage = !!selectedId?.startsWith(CUSTOM_IMAGE_PREFIX)
  // ترتيب القسم المحدد حاليًا بين باقي الأقسام — نحتاجه حتى نعطّل زر
  // "لأعلى" لو كان أول قسم، وزر "لأسفل" لو كان آخر قسم
  const sectionIds = isSection
    ? sortSectionIds(Object.keys(styles).filter((k) => k.startsWith(SECTION_PREFIX)), styles)
    : []
  const sectionIndex = isSection && selectedId ? sectionIds.indexOf(selectedId) : -1
  const plainId = isBg
    ? selectedId!.slice(BG_PREFIX.length)
    : isIcon
      ? selectedId!.slice(ICON_PREFIX.length)
      : isCustom
        ? "نص مُضاف يدويًا"
        : isSection
          ? "قسم مُضاف يدويًا"
          : isImage
            ? "صورة مُضافة يدويًا"
            : selectedId
  const st = selectedId ? styles[selectedId] || {} : {}
  const ICON_MIN_PCT = 40
  const ICON_MAX_PCT = 220

  const ALLOWED_IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]
  const READY_ICONS = ["♥", "❀", "✦", "✧", "💍", "🕊", "🌿", "✨", "🎊", "🌸", "👑", "🥂"]

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const lowerName = file.name.toLowerCase()
    const isAllowed = ALLOWED_IMAGE_EXT.some((ext) => lowerName.endsWith(ext))
    if (!isAllowed) {
      alert("صيغة الصورة غير مدعومة. الصيغ المقبولة: png, jpg, jpeg, webp, gif, svg")
      return
    }

    setUploadingImage(true)
    try {
      const url = await uploadInvitationFile(
        file,
        invitationId || "shared",
        `element-image-${Date.now()}`,
      )
      addCustomImage(url)
    } catch (err) {
      alert(
        `تعذّر رفع الصورة.\n\nتفاصيل الخطأ: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const ALLOWED_FONT_EXT = [".ttf", ".otf", ".woff", ".woff2"]

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !selectedId) return

    const lowerName = file.name.toLowerCase()
    const isAllowed = ALLOWED_FONT_EXT.some((ext) => lowerName.endsWith(ext))
    if (!isAllowed) {
      alert("صيغة الخط غير مدعومة. الصيغ المقبولة: ttf, otf, woff, woff2")
      return
    }

    setUploadingFont(true)
    try {
      const url = await uploadInvitationFile(
        file,
        invitationId || "shared",
        `font-${selectedId}-${Date.now()}`,
      )
      const family = `uploaded-${selectedId}-${Date.now()}`.replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      )
      injectFontFace(family, url)
      updateStyle(selectedId, { font: family, fontUrl: url })
    } catch (err) {
      alert(
        `تعذّر رفع ملف الخط.\n\nتفاصيل الخطأ: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    } finally {
      setUploadingFont(false)
    }
  }

  const rowLabelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#F5EBE0",
    fontFamily: "Cairo, sans-serif",
    marginBottom: 6,
  }

  const smallBtnStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    background: "#2A211D",
    border: "1px solid #B8862F55",
    color: "#F5EBE0",
    fontSize: 11,
    fontFamily: "Cairo, sans-serif",
    cursor: "pointer",
  }

  const tabTitles: Record<SidebarTab, string> = {
    text: "النص",
    insert: "العناصر",
    background: "التصميم",
    properties: "الخصائص",
  }

  const pageBgKey = BG_PREFIX + "pageBg"
  const pageBgStyle = styles[pageBgKey] || {}

  const flyoutHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  }

  const primaryBtnStyle: React.CSSProperties = {
    ...smallBtnStyle,
    width: "100%",
    padding: "10px 12px",
    background: "#B8862F",
    color: "#1A1210",
    fontWeight: 700,
    textAlign: "center",
  }

  const hintTextStyle: React.CSSProperties = {
    fontSize: 11.5,
    color: "#B8A99A",
    lineHeight: 1.8,
    marginTop: 10,
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        insetInlineStart: 0,
        height: "100%",
        display: "flex",
        zIndex: 520,
        fontFamily: "Cairo, sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* شريط الأيقونات الثابت — نفس فكرة شريط Canva الجانبي: أيقونة +
          تسمية تحتها، وتضغط عليها فتفتح/تقفل اللوحة الفرعية بجانبها */}
      <div
        style={{
          width: RAIL_WIDTH,
          height: "100%",
          background: "#150E0C",
          borderInlineEnd: "1px solid #B8862F3D",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 78,
          gap: 4,
          flexShrink: 0,
        }}
      >
        {/* تراجع/إعادة — نفس تأثير Ctrl/Cmd+Z و Ctrl/Cmd+Shift+Z، بس بزر
            ظاهر لمن ما يعرف الاختصار. تتعطّل تلقائيًا لو ما فيه شي
            نتراجع/نعيد عنه */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <button
            type="button"
            title="تراجع (Ctrl+Z)"
            disabled={!canUndo}
            onClick={undo}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "none",
              background: "#2A211D",
              color: canUndo ? "#F1D989" : "#6B5D54",
              cursor: canUndo ? "pointer" : "default",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ↺
          </button>
          <button
            type="button"
            title="إعادة (Ctrl+Shift+Z)"
            disabled={!canRedo}
            onClick={redo}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "none",
              background: "#2A211D",
              color: canRedo ? "#F1D989" : "#6B5D54",
              cursor: canRedo ? "pointer" : "default",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ↻
          </button>
        </div>

        {SIDEBAR_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const isDisabled = tab.id === "properties" && !selectedId
          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveTab(isActive ? null : tab.id)}
              style={{
                width: 64,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 4px",
                borderRadius: 12,
                border: "none",
                cursor: isDisabled ? "default" : "pointer",
                background: isActive ? "#2A211D" : "transparent",
                opacity: isDisabled ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: 19, lineHeight: 1 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#F1D989" : "#D8C7BE",
                }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* اللوحة الفرعية (flyout) — تنفتح بجانب الشريط لما تختار تبويب، وتاخذ
          مساحتها الخاصة (مو عائمة فوق المعاينة) حتى ما تحجب أي شي */}
      {activeTab && (
        <div
          style={{
            width: FLYOUT_WIDTH,
            height: "100%",
            background: "#1A1210",
            borderInlineEnd: "1px solid #B8862F3D",
            overflowY: "auto",
            padding: "70px 16px 24px",
            boxShadow: "4px 0 24px rgba(0,0,0,.35)",
            flexShrink: 0,
          }}
        >
          <div style={flyoutHeaderStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#F1D989" }}>
              {tabTitles[activeTab]}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#B8A99A",
                fontSize: 16,
                cursor: "pointer",
                lineHeight: 1,
                padding: 4,
              }}
              aria-label="إغلاق اللوحة"
            >
              ✕
            </button>
          </div>

          {activeTab === "text" && (
            <>
              <button type="button" onClick={addCustomText} style={primaryBtnStyle}>
                ✚ إضافة مربع نص جديد
              </button>
              <div style={hintTextStyle}>
                يضيف مربع نص فوق التصميم تقدر تكتب فيه وتسحبه لأي مكان. أو
                اضغط على أي نص موجود بالتصميم مباشرة حتى يفتح تبويب
                "الخصائص" وتقدر تعدّله من هناك.
              </div>
            </>
          )}

          {activeTab === "insert" && (
            <>
              <PanelSection title="صورة">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => imageInputRef.current?.click()}
                  style={{ ...primaryBtnStyle, opacity: uploadingImage ? 0.6 : 1 }}
                >
                  {uploadingImage ? "⬆ جارِ الرفع…" : "🖼 رفع صورة"}
                </button>
                <div style={hintTextStyle}>
                  ترفع صورة من جهازك (شعار، رمز، أي صورة) وتنضاف فوق
                  التصميم — تقدر تكبّرها وتسحبها لأي مكان بعدها.
                </div>
              </PanelSection>

              <PanelSection title="أيقونة جاهزة">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {READY_ICONS.map((glyph) => (
                    <button
                      key={glyph}
                      type="button"
                      onClick={() => addCustomIcon(glyph)}
                      style={{
                        ...smallBtnStyle,
                        width: 40,
                        height: 40,
                        fontSize: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      {glyph}
                    </button>
                  ))}
                </div>
                <div style={hintTextStyle}>تضيف رمزًا زخرفيًا كبيرًا فوق التصميم.</div>
              </PanelSection>

              <PanelSection title="قسم">
                <button type="button" onClick={addCustomSection} style={primaryBtnStyle}>
                  ➕ إضافة قسم جديد
                </button>
                <div style={hintTextStyle}>
                  يضيف قسمًا كاملاً بعرض الشاشة بآخر الدعوة (بعد كل الأقسام
                  الجاهزة)، وتقدر تغيّر لونه وارتفاعه بعد إضافته من تبويب
                  "الخصائص".
                </div>
              </PanelSection>
            </>
          )}

          {activeTab === "background" && (
            <>
              <PanelSection title="لون خلفية الدعوة كاملة">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {COLOR_PRESETS.map((c) => (
                    <span
                      key={c}
                      onClick={() => updateStyle(pageBgKey, { color: c })}
                      style={swatchStyle(c, pageBgStyle.color === c)}
                      title={c}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="color"
                    value={pageBgStyle.color || pageBgCustomColor}
                    onChange={(e) => {
                      setPageBgCustomColor(e.target.value)
                      updateStyle(pageBgKey, { color: e.target.value })
                    }}
                    style={{
                      width: 34,
                      height: 30,
                      border: "1px solid #B8862F55",
                      borderRadius: 6,
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#B8A99A" }}>لون حر</span>
                  {pageBgStyle.color && (
                    <button
                      type="button"
                      onClick={() => resetStyle(pageBgKey)}
                      style={{ ...smallBtnStyle, marginInlineStart: "auto" }}
                    >
                      ↺ الأصلي
                    </button>
                  )}
                </div>
              </PanelSection>
              <div style={hintTextStyle}>
                لتغيير لون قسم معيّن بس (مو الدعوة كاملة)، اضغط عليه مباشرة
                بالتصميم فيفتح تبويب "الخصائص".
              </div>
            </>
          )}

          {activeTab === "properties" &&
            (!selectedId ? (
              <div style={{ fontSize: 12, color: "#B8A99A", lineHeight: 1.8, marginTop: 4 }}>
                اضغط على أي نص أو خلفية بالتصميم حتى تظهر خصائصه هنا — تقدر
                تغيّر لونه، تخفيه، تكبّره، أو تغيّر خطه.
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 10,
                    color: "#8C6B6F",
                    marginBottom: 18,
                    wordBreak: "break-all",
                  }}
                >
                  {isBg ? "خلفية: " : isIcon ? "عنصر زخرفي: " : isCustom || isSection || isImage ? "" : "نص: "}
                  {plainId}
                </div>

                {!isBg && !isIcon && !isSection && !isImage && (
            <PanelSection title="النص">
              <textarea
                value={st.text ?? defaultTexts[selectedId] ?? ""}
                onChange={(e) => updateStyle(selectedId, { text: e.target.value })}
                rows={isCustom ? 2 : 3}
                dir="rtl"
                placeholder="اكتب النص هنا"
                style={{
                  width: "100%",
                  resize: "vertical",
                  background: "#2A211D",
                  border: "1px solid #B8862F55",
                  borderRadius: 8,
                  color: "#F5EBE0",
                  fontSize: 12,
                  fontFamily: "Cairo, sans-serif",
                  padding: 8,
                  lineHeight: 1.6,
                }}
              />
              {!isCustom && st.text !== undefined && (
                <button
                  type="button"
                  onClick={() => updateStyle(selectedId, { text: undefined })}
                  style={{ ...smallBtnStyle, marginTop: 6 }}
                >
                  ↺ النص الأصلي
                </button>
              )}
            </PanelSection>
          )}

          {(!isBg && !isSection) && (
            <PanelSection title="الإظهار">
              <button
                type="button"
                onClick={() => updateStyle(selectedId, { hidden: !st.hidden })}
                style={{
                  ...smallBtnStyle,
                  width: "100%",
                  background: st.hidden ? "#B8862F" : "#2A211D",
                  color: st.hidden ? "#1A1210" : "#F5EBE0",
                  fontWeight: 700,
                }}
              >
                {st.hidden ? "⊘ العنصر مخفي — اضغط لإظهاره" : "👁 إخفاء هذا العنصر"}
              </button>
            </PanelSection>
          )}

          {!isBg && !isSection && (
            <PanelSection title="الدوران">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() =>
                    updateStyle(selectedId, {
                      rotation: (((st.rotation ?? 0) - 15) % 360 + 360) % 360,
                    })
                  }
                >
                  ⟲
                </button>
                <span style={{ fontSize: 12, color: "#F5EBE0", minWidth: 46, textAlign: "center" }}>
                  {Math.round(st.rotation ?? 0)}°
                </span>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() =>
                    updateStyle(selectedId, {
                      rotation: ((st.rotation ?? 0) + 15) % 360,
                    })
                  }
                >
                  ⟳
                </button>
                {!!st.rotation && (
                  <button
                    type="button"
                    style={{ ...smallBtnStyle, marginInlineStart: "auto" }}
                    onClick={() => updateStyle(selectedId, { rotation: undefined })}
                  >
                    ↺ الأصلي
                  </button>
                )}
              </div>
              {!isBg && !isIcon && (
                <div style={{ fontSize: 10, color: "#8C6B6F", marginTop: 4 }}>
                  أو اسحب مقبض ⟳ فوق العنصر بالتصميم مباشرة
                </div>
              )}
            </PanelSection>
          )}

          {isSection && (
            <PanelSection title="الارتفاع">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() =>
                    updateStyle(selectedId, {
                      size: Math.max(MIN_SECTION_HEIGHT, (st.size ?? DEFAULT_SECTION_HEIGHT) - 20),
                    })
                  }
                >
                  −
                </button>
                <span style={{ fontSize: 12, color: "#F5EBE0", minWidth: 50, textAlign: "center" }}>
                  {Math.round(st.size ?? DEFAULT_SECTION_HEIGHT)}px
                </span>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() =>
                    updateStyle(selectedId, {
                      size: Math.min(MAX_SECTION_HEIGHT, (st.size ?? DEFAULT_SECTION_HEIGHT) + 20),
                    })
                  }
                >
                  +
                </button>
              </div>
            </PanelSection>
          )}

          {isSection && (
            <PanelSection title="الترتيب">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  style={{
                    ...smallBtnStyle,
                    opacity: sectionIndex <= 0 ? 0.4 : 1,
                    cursor: sectionIndex <= 0 ? "default" : "pointer",
                  }}
                  disabled={sectionIndex <= 0}
                  onClick={() => moveSection(selectedId!, "up")}
                >
                  ▲ لأعلى
                </button>
                <button
                  type="button"
                  style={{
                    ...smallBtnStyle,
                    opacity: sectionIndex === -1 || sectionIndex >= sectionIds.length - 1 ? 0.4 : 1,
                    cursor:
                      sectionIndex === -1 || sectionIndex >= sectionIds.length - 1
                        ? "default"
                        : "pointer",
                  }}
                  disabled={sectionIndex === -1 || sectionIndex >= sectionIds.length - 1}
                  onClick={() => moveSection(selectedId!, "down")}
                >
                  ▼ لأسفل
                </button>
              </div>
            </PanelSection>
          )}

          {!isImage && (
            <PanelSection title={isBg || isSection ? "لون الخلفية" : isIcon ? "اللون" : "لون النص"}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {COLOR_PRESETS.map((c) => (
                  <span
                    key={c}
                    onClick={() => updateStyle(selectedId, { color: c })}
                    style={swatchStyle(c, st.color === c)}
                    title={c}
                  />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={st.color || customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    updateStyle(selectedId, { color: e.target.value })
                  }}
                  style={{
                    width: 34,
                    height: 30,
                    border: "1px solid #B8862F55",
                    borderRadius: 6,
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: "#B8A99A" }}>لون حر</span>
                {st.color && (
                  <button
                    type="button"
                    onClick={() => updateStyle(selectedId, { color: undefined })}
                    style={{ ...smallBtnStyle, marginInlineStart: "auto" }}
                  >
                    ↺ الأصلي
                  </button>
                )}
              </div>
            </PanelSection>
          )}

          {isImage && (
            <PanelSection title="عرض الصورة">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() =>
                    updateStyle(selectedId, {
                      size: Math.max(IMAGE_MIN_PX, (st.size ?? 180) - 20),
                    })
                  }
                >
                  −
                </button>
                <span style={{ fontSize: 12, color: "#F5EBE0", minWidth: 50, textAlign: "center" }}>
                  {Math.round(st.size ?? 180)}px
                </span>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() =>
                    updateStyle(selectedId, {
                      size: Math.min(IMAGE_MAX_PX, (st.size ?? 180) + 20),
                    })
                  }
                >
                  +
                </button>
              </div>
              <div style={{ fontSize: 10, color: "#8C6B6F", marginTop: 4 }}>
                أو اسحب مقبض ⤡ فوق الصورة بالتصميم مباشرة
              </div>
            </PanelSection>
          )}

          {isIcon && (
            <PanelSection title="الحجم">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() =>
                    updateStyle(selectedId, {
                      size: Math.max(ICON_MIN_PCT, (st.size ?? 100) - 10),
                    })
                  }
                >
                  −
                </button>
                <span style={{ fontSize: 12, color: "#F5EBE0", minWidth: 46, textAlign: "center" }}>
                  {Math.round(st.size ?? 100)}٪
                </span>
                <button
                  type="button"
                  style={smallBtnStyle}
                  onClick={() =>
                    updateStyle(selectedId, {
                      size: Math.min(ICON_MAX_PCT, (st.size ?? 100) + 10),
                    })
                  }
                >
                  +
                </button>
              </div>
            </PanelSection>
          )}

          {!isBg && !isIcon && !isSection && !isImage && (
            <>
              <PanelSection title="حجم الخط">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    style={smallBtnStyle}
                    onClick={() =>
                      updateStyle(selectedId, {
                        size: Math.max(MIN_PX, (st.size ?? 24) - 2),
                      })
                    }
                  >
                    −
                  </button>
                  <span style={{ fontSize: 12, color: "#F5EBE0", minWidth: 46, textAlign: "center" }}>
                    {Math.round(st.size ?? 24)}px
                  </span>
                  <button
                    type="button"
                    style={smallBtnStyle}
                    onClick={() =>
                      updateStyle(selectedId, {
                        size: Math.min(MAX_PX, (st.size ?? 24) + 2),
                      })
                    }
                  >
                    +
                  </button>
                </div>
                <div style={rowLabelStyle} />
                <div style={{ fontSize: 10, color: "#8C6B6F", marginTop: 4 }}>
                  أو اسحب مقبض ⇕ فوق العنصر بالتصميم مباشرة
                </div>
              </PanelSection>

              <PanelSection title="الخط">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    maxHeight: 170,
                    overflowY: "auto",
                    border: "1px solid #B8862F33",
                    borderRadius: 10,
                    padding: 6,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => updateStyle(selectedId, { font: undefined, fontUrl: undefined })}
                    style={{
                      ...smallBtnStyle,
                      textAlign: "center",
                      background: !st.font ? "#B8862F" : "#2A211D",
                      color: !st.font ? "#1A1210" : "#F5EBE0",
                    }}
                  >
                    الخط الأصلي
                  </button>
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.family}
                      type="button"
                      onClick={() => updateStyle(selectedId, { font: f.family, fontUrl: undefined })}
                      style={{
                        ...smallBtnStyle,
                        textAlign: "center",
                        fontFamily: f.family,
                        background: st.font === f.family ? "#B8862F" : "#2A211D",
                        color: st.font === f.family ? "#1A1210" : "#F5EBE0",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontUpload}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  disabled={uploadingFont}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    ...smallBtnStyle,
                    width: "100%",
                    marginTop: 6,
                    opacity: uploadingFont ? 0.6 : 1,
                  }}
                >
                  {uploadingFont ? "⬆ جارِ الرفع…" : "⬆ رفع خط من جهازك"}
                </button>
              </PanelSection>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              resetStyle(selectedId)
              // النص/القسم/الصورة المُضافة ما لها "وضع أصلي" ترجع له —
              // رجوعها هو حذفها بالكامل، فنلغي تحديدها لأنها ما عادت موجودة
              if (isCustom || isSection || isImage) setSelectedId(null)
            }}
            style={{
              ...smallBtnStyle,
              width: "100%",
              background: "#5C2A38",
              color: "#F5E9E4",
              fontWeight: 700,
            }}
          >
            {isSection
              ? "🗑 حذف هذا القسم"
              : isImage
                ? "🗑 حذف هذه الصورة"
                : isCustom
                  ? "🗑 حذف هذا النص"
                  : "↺ استرجاع الوضع الأصلي لهذا العنصر"}
          </button>

          <button
            type="button"
            onClick={() => setSelectedId(null)}
            style={{
              ...smallBtnStyle,
              width: "100%",
              marginTop: 8,
              background: "transparent",
            }}
          >
            إلغاء التحديد
          </button>
              </>
            ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// إضافة نص جديد فوق التصميم — زر بسيط بشريط الأدوات، وطبقة تعرض كل النصوص
// المُضافة يدويًا فوق قسم الافتتاحية (الشاشة الأولى) لكل قالب.
// ============================================================================

// زر "✚ إضافة نص" — يوضع بشريط أدوات محرر التصميم (LiveTemplateEditor)
export function AddTextButton() {
  const { editable, addCustomText } = useEditMode()
  if (!editable) return null
  return (
    <button
      type="button"
      onClick={addCustomText}
      className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#2A211D] text-[#F1D989] border border-[#B8862F]"
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      ✚ إضافة نص
    </button>
  )
}

// زر "➕ إضافة قسم" — يوضع بشريط أدوات محرر التصميم (LiveTemplateEditor)
export function AddSectionButton() {
  const { editable, addCustomSection } = useEditMode()
  if (!editable) return null
  return (
    <button
      type="button"
      onClick={addCustomSection}
      className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#2A211D] text-[#F1D989] border border-[#B8862F]"
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      ➕ إضافة قسم
    </button>
  )
}

// زر "🎨 لون خلفية الدعوة" — يوضع بشريط أدوات محرر التصميم (LiveTemplateEditor)
// ويفتح مباشرة لوحة خصائص خلفية الصفحة الكاملة (bg:pageBg) بضغطة وحدة،
// بدل ما يحتاج الأدمن يدوّر على فراغ فاضي بالتصميم يضغط عليه حتى يحددها
// (صعب لأن أغلب مساحة الدعوة مغطاة بأقسام لها خلفياتها الخاصة اللي توقف
// انتشار الضغطة قبل ما توصل لخلفية الصفحة تحتها)
export function PageBackgroundButton() {
  const { editable, setSelectedId } = useEditMode()
  if (!editable) return null
  return (
    <button
      type="button"
      onClick={() => setSelectedId(BG_PREFIX + "pageBg")}
      className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#2A211D] text-[#F1D989] border border-[#B8862F]"
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      🎨 لون خلفية الدعوة
    </button>
  )
}

// طبقة الأقسام المُضافة يدويًا — تُوضع مرة وحدة بآخر كل أقسام القالب
// الجاهزة (بعد قسم تأكيد الحضور)، وكل قسم فيها ياخذ عرض الشاشة كامل
// ومساحة حقيقية بترتيب الصفحة (بعكس النصوص المُضافة اللي تطفو فوق
// التصميم بدون ما تاخذ مساحة). لونها قابل للتغيير من لوحة الخصائص مثل أي
// خلفية عادية، وارتفاعها قابل للتحكم بزيادة/نقصان. ما نستخدم
// EditableBackground هنا لأنها تضيف BG_PREFIX تلقائيًا لأي id تستقبله،
// ومفتاح القسم هنا مسبوق أصلاً بـ SECTION_PREFIX — فنبني منطق التحديد
// والتلوين يدويًا هنا بنفس فكرتها بالضبط.
export function CustomSectionsLayer() {
  const { editable, styles, selectedId, setSelectedId } = useEditMode()
  // ترتيب الأقسام: حسب order الصريح لو الأدمن حرّكها، وإلا حسب وقت
  // الإضافة كالمعتاد (شوف sortSectionIds بالأعلى)
  const ids = sortSectionIds(
    Object.keys(styles).filter((k) => k.startsWith(SECTION_PREFIX)),
    styles,
  )
  if (ids.length === 0) return null
  return (
    <>
      {ids.map((key) => {
        const st = styles[key] || {}
        const isSelected = selectedId === key
        return (
          <section
            key={key}
            className="w-full"
            style={{
              height: st.size ?? DEFAULT_SECTION_HEIGHT,
              backgroundColor: st.color || "#FBF3EF",
              cursor: editable ? "pointer" : undefined,
              boxShadow: isSelected ? "inset 0 0 0 3px #3B82F6" : "inset 0 0 0 0px transparent",
              transition: "box-shadow .15s ease",
            }}
            onClick={
              editable
                ? (e) => {
                    e.stopPropagation()
                    setSelectedId(key)
                  }
                : undefined
            }
          />
        )
      })}
    </>
  )
}

// طبقة النصوص المُضافة يدويًا — تُوضع مرة وحدة بأول حاوية تلف كل أقسام
// القالب (الحاوية اللي تسكرول، بدون أي overflow-hidden على طول الصفحة)،
// حتى النص المُضاف يقدر يتسحب لأي مكان بكامل الدعوة مو بس أول شاشة.
// الحاوية نفسها ارتفاعها صفر (ما تاخذ أي مساحة أو تحجب أي ضغطة) وتوضع
// بأعلى الصفحة تمامًا؛ كل نص بداخلها موضعه المبدئي بالـ position:absolute
// من هالنقطة، وبعدها ينتقل بنفس آلية السحب العادية (transform translate)
// المستخدمة لباقي عناصر EditableText، فيقدر ينزل لأي قسم تحت بحرية.
export function CustomTextLayer() {
  const { styles } = useEditMode()
  const ids = Object.keys(styles).filter((k) => k.startsWith(CUSTOM_PREFIX))
  if (ids.length === 0) return null
  return (
    <div className="relative w-full" style={{ height: 0 }}>
      {ids.map((key, i) => (
        <div
          key={key}
          className="absolute z-30"
          style={{
            top: `${90 + i * 60}px`,
            insetInlineStart: "50%",
            transform: "translateX(-50%)",
            maxWidth: "90%",
            width: "max-content",
          }}
        >
          <EditableText
            id={key}
            as="div"
            className="whitespace-pre-wrap text-center px-3"
            style={{ fontSize: 22, color: "#2A211D", fontFamily: "Cairo, sans-serif" }}
          >
            {styles[key]?.text || "نص جديد"}
          </EditableText>
        </div>
      ))}
    </div>
  )
}

// طبقة الصور المُضافة يدويًا — نفس فكرة CustomTextLayer بالضبط (عنصر عائم
// فوق التصميم، مو جزء من ترتيب الصفحة)، بس تعرض <img> بدل نص عبر
// EditableImage. تُرسم بنفس الحاوية المشتركة (ارتفاع صفر، أعلى الصفحة).
export function CustomImageLayer() {
  const { styles } = useEditMode()
  const ids = Object.keys(styles).filter((k) => k.startsWith(CUSTOM_IMAGE_PREFIX))
  if (ids.length === 0) return null
  return (
    <div className="relative w-full" style={{ height: 0 }}>
      {ids.map((key, i) => (
        <div
          key={key}
          className="absolute z-30"
          style={{
            top: `${90 + i * 60}px`,
            insetInlineStart: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <EditableImage id={key} />
        </div>
      ))}
    </div>
  )
}
