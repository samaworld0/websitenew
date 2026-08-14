import { useEffect, useRef, useState } from "react"
import { Invitation } from "./types"
import { WisalTemplateView } from "./WisalTemplateView"
import {
  EditModeProvider,
  DeselectSurface,
  EditPanel,
  TextStyle,
  useEditMode,
  MIN_ZOOM,
  MAX_ZOOM,
} from "./LiveEditing"

// شريط التحكم بالتكبير/التصغير — كبسولة عائمة بأسفل منتصف الشاشة (نفس
// مكان أدوات الزوم بمحررات التصميم المعروفة)، بعيدة عن شريط الأزرار
// العلوي وعن لوحة الخصائص الجانبية حتى ما تتزاحم معهم بأي حجم شاشة
function ZoomControls() {
  const { zoom, setZoom } = useEditMode()
  const step = 0.1
  const percent = Math.round(zoom * 100)

  return (
    <div
      className="absolute bottom-4 left-1/2 z-[530] flex items-center gap-1 rounded-full bg-black/60 border border-white/20 backdrop-blur-sm px-1.5 py-1.5"
      style={{ transform: "translateX(-50%)" }}
    >
      <button
        onClick={() => setZoom(zoom - step)}
        disabled={zoom <= MIN_ZOOM}
        className="w-7 h-7 grid place-items-center rounded-full text-white text-sm font-bold disabled:opacity-30"
        title="تصغير"
        type="button"
      >
        −
      </button>
      <button
        onClick={() => setZoom(1)}
        className="min-w-[42px] px-1 text-[11px] font-bold text-white text-center"
        style={{ fontFamily: "Cairo, sans-serif" }}
        title="إعادة الحجم الطبيعي"
        type="button"
      >
        {percent}%
      </button>
      <button
        onClick={() => setZoom(zoom + step)}
        disabled={zoom >= MAX_ZOOM}
        className="w-7 h-7 grid place-items-center rounded-full text-white text-sm font-bold disabled:opacity-30"
        title="تكبير"
        type="button"
      >
        +
      </button>
    </div>
  )
}

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
  const { sidebarWidth, zoom } = useEditMode()

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
          className="w-full h-full flex justify-center overflow-auto"
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
              البطاقة نفسها، نفس سلوك صفحة عرض الضيف بالضبط.
              خاصية zoom (منفصلة تمامًا عن transform) تكبّر/تصغّر البطاقة
              كاملة بمحرر التصميم فقط — تحافظ على مساحتها الحقيقية بالتخطيط
              (بعكس transform:scale) فيبقى التوسيط والسكرول الداخلي صحيحين
              تلقائيًا بأي مستوى تكبير */}
          <div
            data-invitation-viewport
            className="relative h-full w-full min-w-0 shrink-0 md:w-[480px] md:max-w-[480px] md:shadow-2xl overflow-hidden [transform:translateZ(0)]"
            style={
              {
                zoom,
                transition: "zoom .15s ease",
              } as React.CSSProperties & { zoom?: number }
            }
          >
            <WisalTemplateView inv={inv} />
          </div>
        </div>
      </DeselectSurface>
      <EditPanel />
      <ZoomControls />
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
