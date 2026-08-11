import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react"
import { uploadInvitationFile } from "./backend"

// ============================================================================
// نظام تعديل مباشر شبيه بفيغما: يلف أي نص داخل قوالب الدعوة (وصال/لمسة)
// بمكوّن EditableText، يخليك تضغط على النص فتحدد، وبعدها:
//   - تسحب مقبض ⇕ لتكبيره أو تصغيره
//   - تسحب مقبض ✥ لتحريكه لأي مكان بالشاشة
//   - تضغط زر 🔤 لرفع ملف خط من جهازك (ttf/otf/woff/woff2) وتطبيقه على
//     هذا النص بالذات
// كل هذا فوق المعاينة الحقيقية للدعوة — بدون ما يغيّر أي شي بالتصميم
// الأصلي إذا الوضع مو "تعديل" (editable=false، وهو وضع كل صفحات الموقع
// العادية). القياسات والمواضع والخط تتخزّن بـ inv.textStyles وتُحفظ مع باقي
// بيانات الدعوة.
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
}

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
  const {
    editable,
    styles,
    selectedId,
    invitationId,
    setSelectedId,
    updateStyle,
    resetStyle,
  } = useEditMode()
  const ref = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingFont, setUploadingFont] = useState(false)
  const [showFontList, setShowFontList] = useState(false)
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
    if (!savedStyle) {
      return (
        <Tag className={className} style={style} {...linkProps}>
          {children}
        </Tag>
      )
    }
    // برّه وضع التعديل (المعاينة الحقيقية أو رابط الدعوة النهائي) نطبّق
    // الحجم/الموضع/الخط المحفوظ فقط، بدون أي إطار أو مقابض تفاعلية — مع حد
    // أقصى احترازي حتى لو انحفظت قيمة كبيرة قديمة (قبل إضافة القيد) ما تطلع
    // النص برّه حدود الشاشة
    const clampedX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, savedStyle.x || 0))
    const clampedY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, savedStyle.y || 0))
    const readOnlyStyle: React.CSSProperties = {
      ...style,
      ...(savedStyle.size ? { fontSize: `${savedStyle.size}px` } : null),
      ...(savedStyle.font ? { fontFamily: savedStyle.font } : null),
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

  const ALLOWED_FONT_EXT = [".ttf", ".otf", ".woff", ".woff2"]

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

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
        `font-${id}-${Date.now()}`,
      )
      // اسم عائلة فريد مبني على معرف النص والوقت، حتى ما يتعارض مع أي خط
      // ثاني مرفوع بنفس الصفحة
      const family = `uploaded-${id}-${Date.now()}`.replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      )
      injectFontFace(family, url)
      updateStyle(id, { font: family, fontUrl: url })
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

  const step = (delta: number) => {
    const el = ref.current
    const currentPx =
      px ?? (el ? parseFloat(getComputedStyle(el).fontSize) : 24)
    updateStyle(id, {
      size: Math.max(MIN_PX, Math.min(MAX_PX, currentPx + delta)),
    })
  }

  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(px ? { fontSize: `${px}px` } : null),
    ...(st.font ? { fontFamily: st.font } : null),
    transform: `translate(${offX}px, ${offY}px)`,
    display: "inline-block",
    position: "relative",
    cursor: "pointer",
    outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
    outlineOffset: 4,
    borderRadius: 4,
    transition: "outline-color .15s ease",
    zIndex: isSelected ? 350 : undefined,
  }

  const btnStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#2A211D",
    color: "#F1D989",
    fontSize: 13,
    lineHeight: "20px",
    fontWeight: 700,
  }

  const fontListItemStyle: React.CSSProperties = {
    textAlign: "center",
    color: "#F5EBE0",
    fontSize: 12,
    padding: "6px 8px",
    borderRadius: 8,
    background: "transparent",
    whiteSpace: "nowrap",
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
      {isSelected && (
        <span
          contentEditable={false}
          style={{
            position: "absolute",
            insetInlineStart: "50%",
            transform: "translateX(50%)",
            bottom: -34,
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "#1A1210",
            border: "1px solid #B8862F",
            borderRadius: 999,
            padding: "3px 6px",
            zIndex: 400,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(0,0,0,.35)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={() => step(-2)} style={btnStyle}>
            −
          </button>
          <span
            style={{
              color: "#F5EBE0",
              fontSize: 11,
              fontFamily: "Cairo, sans-serif",
              minWidth: 30,
              textAlign: "center",
            }}
          >
            {Math.round(
              px ??
                (ref.current
                  ? parseFloat(getComputedStyle(ref.current).fontSize)
                  : 0),
            )}
            px
          </span>
          <button type="button" onClick={() => step(2)} style={btnStyle}>
            +
          </button>
          <span
            onPointerDown={startResize}
            title="اسحب للتكبير/التصغير"
            style={{
              cursor: "ns-resize",
              color: "#B8862F",
              fontSize: 13,
              padding: "0 3px",
              userSelect: "none",
            }}
          >
            ⇕
          </span>
          <span
            onPointerDown={startMove}
            title="اسحب لتحريك النص لأي مكان"
            style={{
              cursor: "move",
              color: "#B8862F",
              fontSize: 13,
              padding: "0 3px",
              userSelect: "none",
            }}
          >
            ✥
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            onChange={handleFontUpload}
            style={{ display: "none" }}
          />
          <span style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowFontList((v) => !v)}
              disabled={uploadingFont}
              title="اختيار الخط"
              style={{ ...btnStyle, fontSize: 11, opacity: uploadingFont ? 0.5 : 1 }}
            >
              {uploadingFont ? "…" : "🔤"}
            </button>
            {showFontList && (
              <div
                contentEditable={false}
                style={{
                  position: "absolute",
                  bottom: 28,
                  insetInlineStart: "50%",
                  transform: "translateX(50%)",
                  background: "#1A1210",
                  border: "1px solid #B8862F",
                  borderRadius: 12,
                  padding: 6,
                  zIndex: 410,
                  width: 150,
                  maxHeight: 220,
                  overflowY: "auto",
                  boxShadow: "0 4px 14px rgba(0,0,0,.35)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    updateStyle(id, { font: undefined, fontUrl: undefined })
                    setShowFontList(false)
                  }}
                  style={fontListItemStyle}
                >
                  الخط الأصلي
                </button>
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.family}
                    type="button"
                    onClick={() => {
                      updateStyle(id, { font: f.family, fontUrl: undefined })
                      setShowFontList(false)
                    }}
                    style={{ ...fontListItemStyle, fontFamily: f.family }}
                  >
                    {f.label}
                  </button>
                ))}
                <div style={{ height: 1, background: "#B8862F55", margin: "4px 0" }} />
                <button
                  type="button"
                  onClick={() => {
                    setShowFontList(false)
                    fileInputRef.current?.click()
                  }}
                  style={{ ...fontListItemStyle, color: "#B8862F" }}
                >
                  ⬆ رفع خط من جهازك
                </button>
              </div>
            )}
          </span>
          <button
            type="button"
            onClick={() => resetStyle(id)}
            title="استرجاع الوضع الأصلي"
            style={{ ...btnStyle, fontSize: 11 }}
          >
            ↺
          </button>
        </span>
      )}
    </Tag>
  )
}
