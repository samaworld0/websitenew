import { createContext, useContext, useRef, useState, ReactNode } from "react"

// ============================================================================
// نظام تعديل مباشر شبيه بفيغما: يلف أي نص داخل قوالب الدعوة (وصال/لمسة)
// بمكوّن EditableText، يخليك تضغط على النص وتسحب مقبض تحته لتكبيره أو
// تصغيره مباشرة فوق المعاينة الحقيقية للدعوة — بدون ما يغيّر أي شي بالتصميم
// الأصلي إذا الوضع مو "تعديل" (editable=false، وهو الوضع بكل صفحات الموقع
// العادية). القياسات تتخزّن بـ inv.textSizes وتُحفظ مع باقي بيانات الدعوة.
// ============================================================================

interface EditModeValue {
  editable: boolean
  sizes: Record<string, number>
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  updateSize: (id: string, px: number) => void
}

const EditModeContext = createContext<EditModeValue>({
  editable: false,
  sizes: {},
  selectedId: null,
  setSelectedId: () => {},
  updateSize: () => {},
})

export function useEditMode() {
  return useContext(EditModeContext)
}

export function EditModeProvider({
  editable,
  initialSizes,
  onSizesChange,
  children,
}: {
  editable: boolean
  initialSizes: Record<string, number>
  onSizesChange?: (sizes: Record<string, number>) => void
  children: ReactNode
}) {
  const [sizes, setSizes] = useState<Record<string, number>>(initialSizes)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const updateSize = (id: string, px: number) => {
    setSizes((prev) => {
      const next = { ...prev, [id]: Math.round(px) }
      onSizesChange?.(next)
      return next
    })
  }

  return (
    <EditModeContext.Provider
      value={{ editable, sizes, selectedId, setSelectedId, updateSize }}
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

const MIN_PX = 10
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
  const { editable, sizes, selectedId, setSelectedId, updateSize } =
    useEditMode()
  const ref = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{ startY: number; startSize: number } | null>(null)

  const Tag = as as any

  if (!editable) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    )
  }

  const isSelected = selectedId === id
  const px = sizes[id]

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    const currentPx =
      px ?? (el ? parseFloat(getComputedStyle(el).fontSize) : 24)
    dragRef.current = { startY: e.clientY, startSize: currentPx }

    const handleMove = (ev: PointerEvent) => {
      if (!dragRef.current) return
      const delta = ev.clientY - dragRef.current.startY
      // سحب لأسفل = تكبير، لأعلى = تصغير — نفس منطق مقابض فيغما
      const next = Math.max(
        MIN_PX,
        Math.min(MAX_PX, dragRef.current.startSize + delta * 0.6),
      )
      updateSize(id, next)
    }
    const handleUp = () => {
      dragRef.current = null
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  const step = (delta: number) => {
    const el = ref.current
    const currentPx =
      px ?? (el ? parseFloat(getComputedStyle(el).fontSize) : 24)
    updateSize(id, Math.max(MIN_PX, Math.min(MAX_PX, currentPx + delta)))
  }

  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(px ? { fontSize: `${px}px` } : null),
    display: "inline-block",
    position: "relative",
    cursor: "pointer",
    outline: isSelected ? "2px dashed #B8862F" : "2px dashed transparent",
    outlineOffset: 4,
    borderRadius: 4,
    transition: "outline-color .15s ease",
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
          <button
            type="button"
            onClick={() => step(-2)}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#2A211D",
              color: "#F1D989",
              fontSize: 13,
              lineHeight: "20px",
              fontWeight: 700,
            }}
          >
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
            {Math.round(px ?? (ref.current ? parseFloat(getComputedStyle(ref.current).fontSize) : 0))}px
          </span>
          <button
            type="button"
            onClick={() => step(2)}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#2A211D",
              color: "#F1D989",
              fontSize: 13,
              lineHeight: "20px",
              fontWeight: 700,
            }}
          >
            +
          </button>
          <span
            onPointerDown={startDrag}
            title="اسحب للتكبير/التصغير"
            style={{
              cursor: "ns-resize",
              color: "#B8862F",
              fontSize: 13,
              padding: "0 2px",
              userSelect: "none",
            }}
          >
            ⇕
          </span>
        </span>
      )}
    </Tag>
  )
}
