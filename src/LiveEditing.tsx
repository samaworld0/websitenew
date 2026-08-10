import { createContext, useContext, useRef, useState, ReactNode } from "react"

// ============================================================================
// نظام تعديل مباشر شبيه بفيغما: يلف أي نص داخل قوالب الدعوة (وصال/لمسة)
// بمكوّن EditableText، يخليك تضغط على النص فتحدد، وبعدها:
//   - تسحب مقبض ⇕ لتكبيره أو تصغيره
//   - تسحب مقبض ✥ لتحريكه لأي مكان بالشاشة
// كل هذا فوق المعاينة الحقيقية للدعوة — بدون ما يغيّر أي شي بالتصميم
// الأصلي إذا الوضع مو "تعديل" (editable=false، وهو وضع كل صفحات الموقع
// العادية). القياسات والمواضع تتخزّن بـ inv.textStyles وتُحفظ مع باقي
// بيانات الدعوة.
// ============================================================================

export interface TextStyle {
  size?: number
  x?: number
  y?: number
}

interface EditModeValue {
  editable: boolean
  styles: Record<string, TextStyle>
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  updateStyle: (id: string, patch: Partial<TextStyle>) => void
  resetStyle: (id: string) => void
}

const EditModeContext = createContext<EditModeValue>({
  editable: false,
  styles: {},
  selectedId: null,
  setSelectedId: () => {},
  updateStyle: () => {},
  resetStyle: () => {},
})

export function useEditMode() {
  return useContext(EditModeContext)
}

export function EditModeProvider({
  editable,
  initialStyles,
  onStylesChange,
  children,
}: {
  editable: boolean
  initialStyles: Record<string, TextStyle>
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
      value={{ editable, styles, selectedId, setSelectedId, updateStyle, resetStyle }}
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

export function EditableText({
  id,
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
  const { editable, styles, selectedId, setSelectedId, updateStyle, resetStyle } =
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

  const Tag = as as any

  if (!editable) {
    return (
      <Tag className={className} style={style}>
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
      updateStyle(id, { x: d.startX0 + dx, y: d.startY0 + dy })
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

  return (
    <Tag
      ref={ref}
      className={className}
      style={mergedStyle}
      data-editable-id={id}
      onClick={(e: React.MouseEvent) => {
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
