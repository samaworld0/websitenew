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
    <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full bg-[#0D0706]">
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

      {/* حاوية البطاقة: مقاس ثابت بنسبة 1080×1920 (9:16) دائمًا — زي لوحة
          تصميم بكانفا — تتمدد أو تتقلص لتناسب أي شاشة بس تحافظ على نفس
          النسبة تمامًا (بعكس السلوك القديم اللي كان ياخذ عرض/ارتفاع الشاشة
          كامل بالجوال، فتختلف النسبة الظاهرة من جهاز لآخر). صيغة
          max-width/max-height أدناه (بدلالة ارتفاع/عرض الشاشة الحقيقيين)
          هي الحيلة القياسية لعمل "letterbox" — تكبّر البطاقة لأقصى حجم
          ممكن بدون ما تتجاوز حدود الشاشة بأي اتجاه، و aspect-ratio يضمن
          النسبة صح حتى لو انحسبت width/height بشكل منفصل بأي متصفح.
          خلفية داكنة حواليها (bg-[#0D0706] بالحاوية الأب) تبين كـ"حواف"
          سوداء (letterbox) لو نسبة شاشة الجهاز مختلفة عن 9:16.
          [transform:translateZ(0)] يخلي هذي الحاوية "containing block" لأي
          عنصر بداخلها معرّف position:fixed (زر كتم الصوت، طبقة فتح
          الدعوة، الفلاش...) عشان يتحددوا بالنسبة لعرض البطاقة نفسها، مو
          الشاشة كاملة. */}
      <div
        className="relative w-full h-full shadow-2xl overflow-hidden [transform:translateZ(0)]"
        style={{
          aspectRatio: "1080 / 1920",
          maxWidth: "calc(100vh * 1080 / 1920)",
          maxHeight: "calc(100vw * 1920 / 1080)",
        }}
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
