import { useEffect } from "react"
import { Invitation } from "./types"
import { WisalTemplateView } from "./WisalTemplateView"
import { EditModeProvider } from "./LiveEditing"

export function InvitationFullView({
  inv,
  onClose,
  isTrial,
}: {
  inv: Invitation
  onClose: () => void
  isTrial?: boolean
}) {
  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center w-full h-full bg-[#0D0706]"
      dir="ltr"
    >
      <div className="absolute top-6 left-6 z-[100] flex items-center gap-2">
        {isTrial && (
          <span
            className="px-4 py-2 rounded-full text-xs font-bold shadow-lg bg-[#B8862F] text-white"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            وضع تجربة — معاينة فقط
          </span>
        )}
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg bg-black/60 text-white backdrop-blur-md border border-white/20"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          ← رجوع للرئيسية
        </button>
      </div>

      {/* حاوية البطاقة: عرض كامل بالجوال، وبعرض ثابت يشبه شاشة الجوال
          ويتوسط الشاشة بالكمبيوتر (md وفوق)، مع خلفية داكنة حواليها
          (bg-[#0D0706] بالحاوية الأب). [transform:translateZ(0)] يخلي هذي
          الحاوية "containing block" لأي عنصر بداخلها معرّف position:fixed
          (زر كتم الصوت، طبقة فتح الدعوة، الفلاش...) عشان يتحددوا بالنسبة
          لعرض البطاقة نفسها، مو الشاشة كاملة — نفس سلوك الجوال بالضبط. */}
      <div
        data-invitation-viewport
        dir="rtl"
        className="relative w-full h-full min-w-0 md:w-[1366px] md:max-w-[1366px] md:shadow-2xl overflow-hidden [transform:translateZ(0)]"
        style={{ containerType: "inline-size" }}
      >
        {inv.templateType === "wisal" ? (
          <EditModeProvider editable={false} initialStyles={inv.textStyles || {}}>
            <WisalTemplateView inv={inv} />
          </EditModeProvider>
        ) : (
          <div
            className="flex-1 w-full h-full overflow-y-auto p-12 text-center"
            style={{
              background: `linear-gradient(180deg, ${inv.gradient[0]}, ${inv.gradient[1]})`,
              color: inv.accentColor,
            }}
          >
            <h1
              className="text-4xl font-bold mb-4"
              style={{ fontFamily: "'Aref Ruqaa', serif" }}
            >
              {inv.title}
            </h1>
            <p className="text-xl" style={{ fontFamily: "Cairo, sans-serif" }}>
              {inv.subtitle}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
