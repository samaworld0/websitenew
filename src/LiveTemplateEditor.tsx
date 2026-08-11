import { useEffect, useRef, useState } from "react"
import { Invitation } from "./types"
import { WisalTemplateView } from "./WisalTemplateView"
import { LamsaTemplateView } from "./LamsaTemplateView"
import { EditModeProvider, DeselectSurface, TextStyle } from "./LiveEditing"

// محرر التصميم المباشر — يفتح المعاينة الحقيقية للدعوة (نفس المكوّن اللي
// يشوفه الضيف) بس بوضع "تعديل" مفعّل، حتى يضغط الأدمن على أي نص بالصفحة
// ويكبّره/يصغّره أو يسحبه لأي مكان، بنفس فكرة فيغما.
export function LiveTemplateEditor({
  inv,
  onSave,
  onClose,
}: {
  inv: Invitation
  onSave: (updated: Invitation) => Promise<boolean> | void
  onClose: () => void
}) {
  const stylesRef = useRef<Record<string, TextStyle>>(inv.textStyles || {})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const handleSave = async () => {
    const savedOk = await onSave({ ...inv, textStyles: { ...stylesRef.current } })
    if (savedOk === false) return

    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="fixed inset-0 z-[500] flex flex-col w-full h-full bg-[#0D0706]">
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[510] max-w-[92%] text-center bg-black/70 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 text-white text-[11px] md:text-sm"
        style={{ fontFamily: "Cairo, sans-serif" }}
      >
        ✏️ اضغط على أي نص، وبعدين اسحب ⇕ لتكبيره/تصغيره أو ✥ لتحريكه —
        وزر ↺ يرجّعه لوضعه الأصلي
      </div>

      <div className="absolute top-4 right-4 z-[510] flex items-center gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-full text-xs font-bold bg-black/60 text-white border border-white/20"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          إغلاق
        </button>
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-full text-xs font-bold bg-[#B8862F] text-white shadow-lg"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          {saved ? "✅ تم الحفظ" : "💾 حفظ التصميم"}
        </button>
      </div>

      <EditModeProvider
        editable
        initialStyles={inv.textStyles || {}}
        invitationId={inv.id}
        onStylesChange={(styles) => {
          stylesRef.current = styles
        }}
      >
        <DeselectSurface>
          <div className="w-full h-full">
            {inv.templateType === "wisal" ? (
              <WisalTemplateView inv={inv} />
            ) : (
              <LamsaTemplateView inv={inv} />
            )}
          </div>
        </DeselectSurface>
      </EditModeProvider>
    </div>
  )
}
