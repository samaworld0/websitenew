import { useEffect, useState } from "react"
import { Invitation } from "./types"
import { WisalTemplateView } from "./WisalTemplateView"
import { isAdminLoggedIn } from "./backend"

export function InvitationFullView({
  inv,
  onClose,
  isTrial,
}: {
  inv: Invitation
  onClose: () => void
  isTrial?: boolean
}) {
  // لو الأدمن مسجل دخول، نعرض زر قلم فوق الدعوة يوديه مباشرة لفورم تعديل
  // هالدعوة بالذات بلوحة التحكم — بدون ما يدور عليها يدوياً بالقائمة.
  // دعوات التجربة (isTrial) ما تنعدّل، فما نسوي الفحص أصلاً بهالحالة.
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isTrial) {
      isAdminLoggedIn().then(setIsAdmin)
    }
  }, [isTrial])

  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-[#0D0706]">
      <div className="absolute top-6 left-6 z-[100] flex items-center gap-2">
        {isTrial && (
          <span
            className="px-4 py-2 rounded-full text-xs font-bold shadow-lg bg-[#B8862F] text-white"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            وضع تجربة — معاينة فقط
          </span>
        )}
        {isAdmin && (
          <a
            href={`?admin=1&edit=${inv.id}`}
            title="تعديل الدعوة"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg bg-[#B8862F] text-white backdrop-blur-md"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            ✏️ تعديل
          </a>
        )}
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg bg-black/60 text-white backdrop-blur-md border border-white/20"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          ← رجوع للرئيسية
        </button>
      </div>
      {inv.templateType === "wisal" ? (
        <WisalTemplateView inv={inv} />
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
  )
}
