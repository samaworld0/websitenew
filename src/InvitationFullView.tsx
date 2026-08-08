import { useEffect, useState } from "react"
import { Invitation } from "./types"
import { WisalTemplateView } from "./WisalTemplateView"
import { isAdminLoggedIn, updateSingleInvitation } from "./backend"

export function InvitationFullView({
  inv,
  onClose,
  isTrial,
}: {
  inv: Invitation
  onClose: () => void
  isTrial?: boolean
}) {
  // لو الأدمن مسجل دخول، نعرض زر قلم فوق الدعوة يفتح وضع تعديل مباشر على
  // الشاشة الأولى نفسها (نصوص + سحب لتغيير الأماكن)، بدون ما يطلع من صفحة
  // الدعوة أصلاً. دعوات التجربة (isTrial) ما تنعدّل، فما نسوي الفحص أصلاً.
  const [isAdmin, setIsAdmin] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentInv, setCurrentInv] = useState<Invitation>(inv)

  useEffect(() => {
    setCurrentInv(inv)
  }, [inv])

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

  const handleSaveEdits = async (updates: Partial<Invitation>) => {
    const merged = { ...currentInv, ...updates }
    setSaving(true)
    const ok = await updateSingleInvitation(merged)
    setSaving(false)
    if (ok) setCurrentInv(merged)
  }

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
        {saving && (
          <span
            className="px-4 py-2 rounded-full text-xs font-bold shadow-lg bg-black/70 text-white"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            جاري الحفظ...
          </span>
        )}
        {isAdmin && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            title="تعديل الدعوة"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg bg-[#B8862F] text-white backdrop-blur-md"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            ✏️ تعديل
          </button>
        )}
        {!editMode && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg bg-black/60 text-white backdrop-blur-md border border-white/20"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            ← رجوع للرئيسية
          </button>
        )}
      </div>
      {currentInv.templateType === "wisal" ? (
        <WisalTemplateView
          inv={currentInv}
          editable={isAdmin && editMode}
          onSaveEdits={handleSaveEdits}
          onExitEdit={() => setEditMode(false)}
        />
      ) : (
        <div
          className="flex-1 w-full h-full overflow-y-auto p-12 text-center"
          style={{
            background: `linear-gradient(180deg, ${currentInv.gradient[0]}, ${currentInv.gradient[1]})`,
            color: currentInv.accentColor,
          }}
        >
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "'Aref Ruqaa', serif" }}
          >
            {currentInv.title}
          </h1>
          <p className="text-xl" style={{ fontFamily: "Cairo, sans-serif" }}>
            {currentInv.subtitle}
          </p>
        </div>
      )}
    </div>
  )
}
