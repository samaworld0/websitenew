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
}

const BG_PREFIX = "bg:"

interface EditModeValue {
  editable: boolean
  styles: Record<string, TextStyle>
  selectedId: string | null
  invitationId: string | number
  setSelectedId: (id: string | null) => void
  updateStyle: (id: string, patch: Partial<TextStyle>) => void
  resetStyle: (id: string) => void
}

const EditModeContext = createContext<EditModeValue>({
  editable: false,
  styles: {},
  selectedId: null,
  invitationId: "",
  setSelectedId: () => {},
  updateStyle: () => {},
  resetStyle: () => {},
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
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const updateStyle = (id: string, patch: Partial<TextStyle>) => {
    setStyles((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } }
      onStylesChange?.(next)
      return next
    })
  }

  const resetStyle = (id: string) => {
    setStyles((prev) => {
      const next = { ...prev }
      delete next[id]
      onStylesChange?.(next)
      return next
    })
  }

  return (
    <EditModeContext.Provider
      value={{
        editable,
        styles,
        selectedId,
        invitationId,
        setSelectedId,
        updateStyle,
        resetStyle,
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
// أقصى مسافة تحريك مسموحة (بكسل) بأي اتجاه — تمنع سحب النص بالغلط لمسافة
// كبيرة تطلعه برّه حدود الشاشة على شاشات أصغر من اللي استخدمها بالمحرر
const MAX_OFFSET = 150

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
  const { editable, styles, selectedId, setSelectedId, updateStyle } =
    useEditMode()
  const ref = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{
    mode: "resize" | "move"
    startY: number
    startX: number
    startSize: number
    startX0: number
    startY0: number
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

  const Tag = as as any
  const linkProps = as === "a" ? { href, target, rel } : {}

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
    // ما تطلع النص برّه حدود الشاشة
    const clampedX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, savedStyle.x || 0))
    const clampedY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, savedStyle.y || 0))
    const readOnlyStyle: React.CSSProperties = {
      ...style,
      ...(savedStyle.size ? { fontSize: `${savedStyle.size}px` } : null),
      ...(savedStyle.font ? { fontFamily: savedStyle.font } : null),
      ...(savedStyle.color ? { color: savedStyle.color } : null),
      transform: `translate(${clampedX}px, ${clampedY}px)`,
      display: "inline-block",
    }
    return (
      <Tag className={className} style={readOnlyStyle} {...linkProps}>
        {children}
      </Tag>
    )
  }

  const isSelected = selectedId === id
  const st = styles[id] || {}
  const px = st.size
  const offX = st.x || 0
  const offY = st.y || 0

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
    } else {
      const dx = ev.clientX - d.startX
      const dy = ev.clientY - d.startY
      const nextX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, d.startX0 + dx))
      const nextY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, d.startY0 + dy))
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
    transform: `translate(${offX}px, ${offY}px)`,
    display: "inline-block",
    position: "relative",
    cursor: "pointer",
    opacity: isHidden ? 0.35 : 1,
    outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
    outlineOffset: 4,
    borderRadius: 4,
    transition: "outline-color .15s ease, opacity .15s ease",
    zIndex: isSelected ? 350 : undefined,
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
      {children}
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
        </span>
      )}
    </Tag>
  )
}

// يلف أي قسم/خلفية بالتصميم (مثال: قسم "برنامج الحفل" العنابي، قسم تأكيد
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
}: {
  id: string
  as?: string
  className?: string
  style?: React.CSSProperties
  children: ReactNode
  // تمرير اختياري لخاصية dir (مثل dir="rtl") حتى تنعكس صح على أقسام تعتمد
  // عليها لباقي التصميم (مثال: العنصر الجذر لكل قالب)
  dir?: string
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
      <Tag className={className} style={mergedStyle} {...extraProps}>
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

export const PANEL_WIDTH = 268

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

export function EditPanel() {
  const { editable, styles, selectedId, setSelectedId, invitationId, updateStyle, resetStyle } =
    useEditMode()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingFont, setUploadingFont] = useState(false)
  const [customColor, setCustomColor] = useState("#B8862F")

  if (!editable) return null

  const isBg = !!selectedId?.startsWith(BG_PREFIX)
  const plainId = isBg ? selectedId!.slice(BG_PREFIX.length) : selectedId
  const st = selectedId ? styles[selectedId] || {} : {}

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

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        insetInlineStart: 0,
        height: "100%",
        width: PANEL_WIDTH,
        background: "#1A1210",
        borderInlineEnd: "1px solid #B8862F3D",
        zIndex: 520,
        overflowY: "auto",
        padding: "70px 16px 24px",
        boxShadow: "4px 0 24px rgba(0,0,0,.35)",
        fontFamily: "Cairo, sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#F1D989",
          marginBottom: 4,
        }}
      >
        خصائص العنصر
      </div>

      {!selectedId ? (
        <div style={{ fontSize: 12, color: "#B8A99A", lineHeight: 1.8, marginTop: 12 }}>
          اضغط على أي نص أو خلفية بالتصميم حتى تظهر خصائصه هنا — تقدر تغيّر
          لونه، تخفيه، تكبّره، أو تغيّر خطه.
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
            {isBg ? "خلفية: " : "نص: "}
            {plainId}
          </div>

          {!isBg && (
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

          <PanelSection title={isBg ? "لون الخلفية" : "لون النص"}>
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

          {!isBg && (
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
            onClick={() => resetStyle(selectedId)}
            style={{
              ...smallBtnStyle,
              width: "100%",
              background: "#5C2A38",
              color: "#F5E9E4",
              fontWeight: 700,
            }}
          >
            ↺ استرجاع الوضع الأصلي لهذا العنصر
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
      )}
    </div>
  )
}
