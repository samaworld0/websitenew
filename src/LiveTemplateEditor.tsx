import { useEffect, useRef, useState } from "react"
import { Invitation } from "./types"
import { WisalTemplateView } from "./WisalTemplateView"
import {
  EditModeProvider,
  DeselectSurface,
  EditPanel,
  TextStyle,
  useEditMode,
} from "./LiveEditing"

// شريط الأزرار العلوي (إغلاق/حفظ) وحاوية المعاينة — مكوّن داخلي منفصل حتى
// يقدر يقرأ sidebarWidth من سياق وضع التعديل مباشرة (يتغيّر ديناميكيًا
// حسب كون اللوحة الفرعية بشريط Canva مفتوحة أو مقفولة حاليًا)
function EditorShell({
  inv,
  saved,
  onSave,
  onClose,
}: {
  inv: Invitation
  saved: boolean
  onSave: () => void
  onClose: () => void
}) {
  const { sidebarWidth } = useEditMode()

  return (
    <>
      {/* شريط الأزرار العلوي — ثابت بالركن المقابل تمامًا لشريط Canva
          الجانبي، حتى ما يحتاج يتحرك كل ما تنفتح/تنقفل لوحة فرعية بجانبه */}
      <div
        className="absolute top-3 z-[530] flex items-center gap-2"
        style={{ insetInlineEnd: 16 }}
      >
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-black/60 text-white border border-white/20"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          إغلاق
        </button>
        <button
          onClick={onSave}
          className="px-4 py-1.5 rounded-full text-[11px] font-bold bg-[#B8862F] text-white shadow-lg"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          {saved ? "✅ تم الحفظ" : "💾 حفظ التصميم"}
        </button>
      </div>

      <DeselectSurface>
        <div
          className="w-full h-full flex justify-center"
          style={{
            paddingInlineStart: sidebarWidth,
            transition: "padding-inline-start .15s ease",
          }}
        >
          {/* حاوية البطاقة: عرض كامل بالجوال، وبعرض ثابت يشبه شاشة الجوال
              ويتوسط المساحة المتبقية (بعد الشريط الجانبي) بالكمبيوتر، مع
              خلفية داكنة حواليها. [transform:translateZ(0)] يخلي هذي
              الحاوية "containing block" لأي عنصر position:fixed بداخلها
              (زر كتم الصوت، طبقة فتح الدعوة...) عشان يتحدد بالنسبة لعرض
              البطاقة نفسها، نفس سلوك صفحة عرض الضيف بالضبط. */}
          <div className="relative h-full w-full min-w-[320px] shrink-0 md:max-w-[480px] md:shadow-2xl overflow-hidden [transform:translateZ(0)]">
            <WisalTemplateView inv={inv} />
          </div>
        </div>
      </DeselectSurface>
      <EditPanel />
    </>
  )
}

// محرر التصميم المباشر — يفتح المعاينة الحقيقية للدعوة (نفس المكوّن اللي
// يشوفه الضيف) بس بوضع "تعديل" مفعّل، مع شريط أدوات جانبي على طراز Canva:
// أيقونات ثابتة (النص/العناصر/التصميم/الخصائص) تفتح لوحة فرعية بجانبها،
// وتحديد أي نص أو خلفية بالتصميم مباشرة يفتح تبويب "الخصائص" تلقائيًا.
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
        <EditorShell inv={inv} saved={saved} onSave={handleSave} onClose={onClose} />
      </EditModeProvider>
    </div>
  )
}
