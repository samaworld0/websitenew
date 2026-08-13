import { useEffect, useRef, useState } from "react"
import { Invitation } from "./types"
import { WisalTemplateView } from "./WisalTemplateView"
import { LamsaTemplateView } from "./LamsaTemplateView"
import {
  EditModeProvider,
  DeselectSurface,
  EditPanel,
  TextStyle,
  PANEL_WIDTH,
  AddTextButton,
  AddSectionButton,
  PageBackgroundButton,
} from "./LiveEditing"

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
      <EditModeProvider
        editable
        initialStyles={inv.textStyles || {}}
        invitationId={inv.id}
        onStylesChange={(styles) => {
          stylesRef.current = styles
        }}
      >
        <div
          className="absolute top-3 z-[510] max-w-[90%] text-center bg-black/70 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 text-white text-[11px] md:text-sm"
          style={{
            fontFamily: "Cairo, sans-serif",
            insetInlineStart: `calc(50% + ${PANEL_WIDTH / 2}px)`,
            transform: "translateX(-50%)",
          }}
        >
          ✏️ اضغط على أي نص أو خلفية، وعدّل خصائصه من اللوحة على يسار الشاشة
          — وزر ✥ يحرّكه لأي مكان
        </div>

        {/* شريط الأزرار — مثبّت بمنتصف المساحة المتاحة (نفس منطق تمركز شريط
            التعليمات فوقه: نطرح نص عرض لوحة الخصائص من نقطة المنتصف حتى
            يتمركز بمعزل عنها مو بمنتصف الشاشة كاملة)، تحت شريط التعليمات
            مباشرة حتى ما يتراكبوا فوق بعض */}
        <div
          className="absolute top-14 z-[530] flex items-center gap-2"
          style={{
            insetInlineStart: `calc(50% + ${PANEL_WIDTH / 2}px)`,
            transform: "translateX(-50%)",
          }}
        >
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-black/60 text-white border border-white/20"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            إغلاق
          </button>
          <AddTextButton />
          <AddSectionButton />
          <PageBackgroundButton />
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-full text-[11px] font-bold bg-[#B8862F] text-white shadow-lg"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            {saved ? "✅ تم الحفظ" : "💾 حفظ التصميم"}
          </button>
        </div>

        <DeselectSurface>
          <div className="w-full h-full" style={{ paddingInlineStart: PANEL_WIDTH }}>
            {inv.templateType === "wisal" ? (
              <WisalTemplateView inv={inv} />
            ) : (
              <LamsaTemplateView inv={inv} />
            )}
          </div>
        </DeselectSurface>
        <EditPanel />
      </EditModeProvider>
    </div>
  )
}
