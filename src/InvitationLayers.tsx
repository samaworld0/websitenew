import { useEffect, type ReactNode } from "react"
import {
  useEditMode,
  EditableText,
  EditableImage,
  CUSTOM_PREFIX,
  CUSTOM_IMAGE_PREFIX,
  SECTION_PREFIX,
  type TextStyle,
} from "./LiveEditing"

const DEFAULT_SECTION_HEIGHT = 220

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

export function ReorderableSection({
  id,
  label,
  index,
  children,
}: {
  id: string
  label: string
  index: number
  children: ReactNode
}) {
  const { editable, styles, selectedId, setSelectedId, registerCoreSection, registerElRef } =
    useEditMode()

  useEffect(() => {
    if (editable) registerCoreSection(id, label, index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, id, label, index])

  const isHidden = !!styles[id]?.hidden
  const order = styles[id]?.order ?? index

  if (!editable) {
    if (isHidden) return null
    return <div style={{ order }}>{children}</div>
  }

  const isSelected = selectedId === id

  return (
    <div
      ref={(el) => registerElRef(id, el)}
      className="relative w-full"
      style={{
        order,
        outline: "1px dashed rgba(184,134,47,0.35)",
        outlineOffset: -1,
        opacity: isHidden ? 0.35 : 1,
        transition: "opacity .15s ease",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setSelectedId(id)
        }}
        className="absolute z-40 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white border backdrop-blur-sm shadow-lg"
        style={{
          position: "sticky",
          top: 8,
          insetInlineStart: 8,
          background: isSelected ? "#3B82F6" : "rgba(0,0,0,0.55)",
          borderColor: isSelected ? "#3B82F6" : "rgba(255,255,255,0.25)",
          fontFamily: "Cairo, sans-serif",
        }}
        title={`تحريك قسم: ${label}`}
      >
        {isHidden && "⊘ "}
        ✥ {label}
      </button>
      {isSelected && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 3px #3B82F6", zIndex: 35 }}
        />
      )}
      {children}
    </div>
  )
}

export function CustomSectionsLayer() {
  const { editable, styles, selectedId, setSelectedId, registerElRef } = useEditMode()
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

        if (st.rawHtml) {
          return (
            <section
              key={key}
              ref={(el) => registerElRef(key, el)}
              className="w-full relative"
              style={{
                order: st.order ?? 1000,
                cursor: editable ? "pointer" : undefined,
                boxShadow: isSelected
                  ? "inset 0 0 0 3px #3B82F6"
                  : "inset 0 0 0 0px transparent",
                outline: editable ? "1px dashed rgba(184,134,47,0.35)" : undefined,
                outlineOffset: -1,
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
            >
              <div style={{ pointerEvents: editable ? "none" : "auto" }}
                dangerouslySetInnerHTML={{ __html: st.rawHtml }} />
            </section>
          )
        }

        return (
          <section
            key={key}
            ref={(el) => registerElRef(key, el)}
            className="w-full"
            style={{
              order: st.order ?? 1000,
              height: st.size ?? DEFAULT_SECTION_HEIGHT,
              backgroundColor: st.color || "#FBF3EF",
              cursor: editable ? "pointer" : undefined,
              boxShadow: isSelected
                ? "inset 0 0 0 3px #3B82F6"
                : "inset 0 0 0 0px transparent",
              outline: editable ? "1px dashed rgba(184,134,47,0.35)" : undefined,
              outlineOffset: -1,
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

export function CustomTextLayer() {
  const { styles, registerElRef } = useEditMode()
  const ids = Object.keys(styles).filter((k) => k.startsWith(CUSTOM_PREFIX))
  if (ids.length === 0) return null

  return (
    <div className="relative w-full" style={{ height: 0 }}>
      {ids.map((key, i) => (
        <div
          key={key}
          ref={(el) => registerElRef(key, el)}
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

export function CustomImageLayer() {
  const { styles, registerElRef } = useEditMode()
  const ids = Object.keys(styles).filter((k) => k.startsWith(CUSTOM_IMAGE_PREFIX))
  if (ids.length === 0) return null

  return (
    <div className="relative w-full" style={{ height: 0 }}>
      {ids.map((key, i) => (
        <div
          key={key}
          ref={(el) => registerElRef(key, el)}
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

