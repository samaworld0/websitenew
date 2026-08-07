import { useState, useEffect } from "react"
import { Invitation, CreateDetailsDraft } from "./types"
import {
  supabase,
  isAdminLoggedIn,
  loadInvitations,
  persistInvitations,
  encodeInvitationForUrl,
  loadAssetCounter,
  persistAssetCounter,
  SHEETS_SCRIPT_URL,
  loadSiteSettings,
  saveSiteSettings,
} from "./backend"
import { TemplatePicker } from "./TemplatePicker"
import { AdminCreateForm } from "./AdminCreateForm"
import { AdminEditForm } from "./AdminEditForm"

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [unlocked, setUnlocked] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState(false)

  const [list, setList] = useState<Invitation[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // حالة لوحة تعديل واجهة الموقع (القلم)
  const [isEditingInterface, setIsEditingInterface] = useState(false)
  const [heroTitle, setHeroTitle] = useState("")
  const [heroSubtitle, setHeroSubtitle] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#e11d48")
  
  // الحقول الجديدة لقسم كيف نشتغل والفوتر
  const [howItWorksTitle, setHowItWorksTitle] = useState("")
  const [howItWorksSubtitle, setHowItWorksSubtitle] = useState("")
  const [footerTitle, setFooterTitle] = useState("")
  const [footerSubtitle, setFooterSubtitle] = useState("")
  
  const [savingInterface, setSavingInterface] = useState(false)

  const [createStep, setCreateStep] =
    useState<"closed" | "template" | "details">("closed")
  const [createTemplate, setCreateTemplate] = useState<Invitation | null>(null)

  const [shareLinkModal, setShareLinkModal] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    isAdminLoggedIn().then(setUnlocked)
  }, [])

  useEffect(() => {
    if (unlocked) {
      loadInvitations().then(setList)
      loadSiteSettings().then((settings) => {
        if (settings) {
          if (settings.hero_title) setHeroTitle(settings.hero_title)
          if (settings.hero_subtitle) setHeroSubtitle(settings.hero_subtitle)
          if (settings.primary_color) setPrimaryColor(settings.primary_color)
          if (settings.how_it_works_title) setHowItWorksTitle(settings.how_it_works_title)
          if (settings.how_it_works_subtitle) setHowItWorksSubtitle(settings.how_it_works_subtitle)
          if (settings.footer_title) setFooterTitle(settings.footer_title)
          if (settings.footer_subtitle) setFooterSubtitle(settings.footer_subtitle)
        }
      })
    }
  }, [unlocked])

  const flash = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4500)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    })
    setLoginLoading(false)
    if (!error) {
      setUnlocked(true)
      setLoginError(false)
    } else {
      setLoginError(true)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUnlocked(false)
  }

  // حفظ التعديلات الشاملة إلى Supabase
  const handleSaveInterfaceSettings = async () => {
    setSavingInterface(true)
    const success = await saveSiteSettings({
      hero_title: heroTitle,
      hero_subtitle: heroSubtitle,
      primary_color: primaryColor,
      how_it_works_title: howItWorksTitle,
      how_it_works_subtitle: howItWorksSubtitle,
      footer_title: footerTitle,
      footer_subtitle: footerSubtitle,
    })
    setSavingInterface(false)
    if (success) {
      flash("تم حفظ وتحديث نصوص الموقع بنجاح لجميع الزوار! ✨")
      setIsEditingInterface(false)
    }
  }

  const handleDuplicate = (id: number) => {
    const src = list.find((inv) => inv.id === id)
    if (!src) return

    const n = loadAssetCounter()
    persistAssetCounter(n + 1)
    const nn = String(n).padStart(2, "0")

    const clone: Invitation = {
      ...src,
      id: Date.now(),
      subtitle: `${src.subtitle} (نسخة)`,
      heroBg: `/images/hero-bg-${n}.jpg`,
      coverImage: `/mnbra/weeding-${nn}.jpg`,
      introPoster: `/videos/intro-poster-${n}.jpg`,
      introVideo: `/videos/intro-${n}.mp4`,
    }

    const idx = list.findIndex((inv) => inv.id === id)
    const updated = [...list.slice(0, idx + 1), clone, ...list.slice(idx + 1)]
    persistInvitations(updated)
    setList(updated)
    flash(
      `تم تكرار الدعوة ✅ — ارفع هالملفات: hero-bg-${n}.jpg (public/images) · weeding-${nn}.jpg (public/mnbra) · intro-poster-${n}.jpg و intro-${n}.mp4 (public/videos)`,
    )
  }

  const handleDelete = (id: number) => {
    const updated = list.filter((inv) => inv.id !== id)
    persistInvitations(updated)
    setList(updated)
    setConfirmDeleteId(null)
    flash("تم حذف الدعوة 🗑️")
  }

  const handleSaveEdit = (updated: Invitation) => {
    const newList = list.map((inv) => (inv.id === updated.id ? updated : inv))
    persistInvitations(newList)
    setList(newList)
    setEditingId(null)
    flash("تم حفظ التعديل ✅")
  }

  const buildShareLink = (inv: Invitation) =>
    `${window.location.origin}${window.location.pathname}?inv=${encodeInvitationForUrl(inv)}`

  const copyShareLink = async (inv: Invitation) => {
    const link = buildShareLink(inv)
    let copied = false

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(link)
        copied = true
      } catch {
        copied = false
      }
    }

    if (!copied) {
      try {
        const textarea = document.createElement("textarea")
        textarea.value = link
        textarea.style.position = "fixed"
        textarea.style.top = "-1000px"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        copied = document.execCommand("copy")
        document.body.removeChild(textarea)
      } catch {
        copied = false
      }
    }

    if (copied) {
      flash("تم نسخ رابط الدعوة 📋")
    } else {
      setShareLinkModal(link)
    }
  }

  const handleCreateFromTemplate = async (draft: CreateDetailsDraft) => {
    if (!createTemplate) return

    const newInv: Invitation = {
      ...createTemplate,
      ...draft,
      id: Date.now(),
      unlisted: true,
      title: `دعوة خاصة — ${draft.groom} و${draft.bride}`,
      subtitle: `${draft.groom} و${draft.bride}`,
      tag: "خاصة",
      price: "-",
    }

    try {
      const response = await fetch(SHEETS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({
          action: "createSheet",
          title: newInv.title,
        }),
      })

      const result = await response.json()

      if (result.success) {
        newInv.sheetId = result.sheetId
        newInv.sheetUrl = result.sheetUrl
      }
    } catch (error) {
      console.error("Create Sheet Error:", error)
    }

    const updated = [...list, newInv]
    persistInvitations(updated)
    setList(updated)
    setCreateStep("closed")
    setCreateTemplate(null)
    flash(`تم إنشاء الدعوة الخاصة ✅ — بنفس تصميم "${createTemplate.subtitle}"`)
    copyShareLink(newInv)
  }

  if (!unlocked) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-[#0D0706] px-6"
        style={{ fontFamily: "Cairo, sans-serif" }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=El+Messiri:wght@600;700&family=Cairo:wght@400;500;700&display=swap');
        `}</style>
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl"
        >
          <h2
            className="text-xl font-bold mb-2 text-center"
            style={{ fontFamily: "'El Messiri', serif" }}
          >
            تسجيل دخول الأدمن
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            سجّل دخولك حتى توصل لصلاحيات لوحة التحكم
          </p>

          <label className="block text-xs font-bold text-muted-foreground mb-1.5">
            الإيميل
          </label>
          <input
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-border rounded-2xl px-4 py-3 mb-4 text-center focus:outline-none focus:border-[#B8862F]"
          />

          <label className="block text-xs font-bold text-muted-foreground mb-1.5">
            كلمة المرور
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-2xl px-4 py-3 text-center focus:outline-none focus:border-[#B8862F]"
          />

          {loginError && (
            <p className="text-sm text-red-500 text-center mt-3">
              بيانات الدخول غير صحيحة
            </p>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3 bg-[#B8862F] text-white rounded-2xl font-bold mt-6 disabled:opacity-60"
          >
            {loginLoading ? "جاري الدخول..." : "دخول"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 mt-2 text-sm text-muted-foreground"
          >
            رجوع للموقع
          </button>
        </form>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background"
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=El+Messiri:wght@600;700&family=Cairo:wght@400;500;600;700&display=swap');
      `}</style>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'El Messiri', serif" }}
            >
              لوحة التحكم
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              كرّر، عدّل، أو احذف أي دعوة موجودة
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-bold border border-border hover:bg-gray-50"
            >
              رجوع للموقع
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full text-sm font-bold border border-border hover:bg-gray-50"
            >
              تسجيل خروج
            </button>

            {/* زر القلم لتعديل الواجهة */}
            <button
              onClick={() => setIsEditingInterface(!isEditingInterface)}
              title="تعديل نصوص وألوان واجهة الموقع"
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-all flex items-center gap-1.5 ${
                isEditingInterface ? "bg-rose-600 text-white border-rose-600" : "bg-white text-gray-700 border-border hover:bg-gray-50"
              }`}
            >
              <span>✏️</span>
              <span>{isEditingInterface ? "إغلاق التعديل" : "تعديل الواجهة"}</span>
            </button>

            <button
              onClick={() => {
                if (createStep === "closed") {
                  setCreateStep("template")
                } else {
                  setCreateStep("closed")
                  setCreateTemplate(null)
                }
              }}
              className="px-5 py-2 rounded-full text-sm font-bold bg-[#B8862F] text-white shadow-sm"
            >
              {createStep === "closed" ? "+ دعوة خاصة جديدة" : "إغلاق"}
            </button>
          </div>
        </div>

        {/* لوحة تعديل النصوص والألوان الشاملة */}
        {isEditingInterface && (
          <div className="bg-white border-2 border-rose-200 rounded-3xl p-6 mb-8 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-rose-800 flex items-center gap-2" style={{ fontFamily: "'El Messiri', serif" }}>
              <span>🛠️</span>
              <span>تعديل محتوى واجهة الموقع (تظهر لجميع الزوار)</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">العنوان الرئيسي للواجهة:</label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-rose-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">الوصف التعريفي تحت العنوان:</label>
              <textarea
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-rose-500 shadow-sm"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">عنوان قسم "كيف نشتغل؟":</label>
                <input
                  type="text"
                  value={howItWorksTitle}
                  onChange={(e) => setHowItWorksTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-900 bg-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">العنوان الفرعي لـ "كيف نشتغل؟":</label>
                <input
                  type="text"
                  value={howItWorksSubtitle}
                  onChange={(e) => setHowItWorksSubtitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-900 bg-white shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">عنوان الفوتر (البانر الأحمر):</label>
                <input
                  type="text"
                  value={footerTitle}
                  onChange={(e) => setFooterTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-900 bg-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">نصف وصف الفوتر (البانر الأحمر):</label>
                <input
                  type="text"
                  value={footerSubtitle}
                  onChange={(e) => setFooterSubtitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-900 bg-white shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">اللون الأساسي للأزرار:</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 rounded-xl cursor-pointer border p-0.5 bg-white"
                />
                <span className="text-xs text-gray-700 font-mono">{primaryColor}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleSaveInterfaceSettings}
                disabled={savingInterface}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-sm shadow transition-all disabled:opacity-50"
              >
                {savingInterface ? "جاري الحفظ..." : "حفظ ونشر التعديلات للكل 🚀"}
              </button>
              <button
                onClick={() => setIsEditingInterface(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {createStep === "template" && (
          <TemplatePicker
            templates={list}
            onCancel={() => {
              setCreateStep("closed")
              setCreateTemplate(null)
            }}
            onSelect={(t) => {
              setCreateTemplate(t)
              setCreateStep("details")
            }}
          />
        )}

        {createStep === "details" && createTemplate && (
          <AdminCreateForm
            template={createTemplate}
            onBack={() => setCreateStep("template")}
            onCancel={() => {
              setCreateStep("closed")
              setCreateTemplate(null)
            }}
            onCreate={handleCreateFromTemplate}
          />
        )}

        {(() => {
          const renderRow = (inv: Invitation) => (
            <div
              key={inv.id}
              className="border border-border rounded-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{inv.subtitle}</p>
                    {inv.unlisted && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#B8862F]/15 text-[#B8862F]">
                        خاصة — غير ظاهرة بالموقع
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{inv.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {inv.unlisted && inv.sheetUrl && (
                    <a
                      href={inv.sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-full text-xs font-bold border border-border"
                    >
                      فتح الشيت
                    </a>
                  )}
                  {inv.unlisted && (
                    <button
                      onClick={() => copyShareLink(inv)}
                      className="px-4 py-2 rounded-full text-xs font-bold bg-[#B8862F] text-white"
                    >
                      نسخ رابط الدعوة
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setEditingId(editingId === inv.id ? null : inv.id)
                    }
                    className="px-4 py-2 rounded-full text-xs font-bold border border-border"
                  >
                    {editingId === inv.id ? "إغلاق التعديل" : "تعديل"}
                  </button>
                  <button
                    onClick={() => handleDuplicate(inv.id)}
                    className="px-4 py-2 rounded-full text-xs font-bold border border-border"
                  >
                    تكرار
                  </button>
                  <a
                    href={`?preview=${inv.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full text-xs font-bold border border-border"
                  >
                    معاينة
                  </a>
                  {confirmDeleteId === inv.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="px-3 py-2 rounded-full text-xs font-bold bg-red-600 text-white"
                      >
                        تأكيد الحذف
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-2 rounded-full text-xs font-bold border border-border"
                      >
                        تراجع
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(inv.id)}
                      className="px-4 py-2 rounded-full text-xs font-bold text-red-600 border border-red-200"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>

              {editingId === inv.id && (
                <div className="px-6 pb-6">
                  <AdminEditForm
                    inv={inv}
                    onCancel={() => setEditingId(null)}
                    onSave={handleSaveEdit}
                  />
                </div>
              )}
            </div>
          )

          const publicList = list.filter((inv) => !inv.unlisted)
          const privateList = list.filter((inv) => inv.unlisted)

          return (
            <>
              <div>
                <h2
                  className="text-lg font-bold mb-4"
                  style={{ fontFamily: "'El Messiri', serif" }}
                >
                  الدعوات العامة — تظهر بالصفحة الرئيسية
                </h2>
                {publicList.length === 0 ? (
                  <p className="text-sm text-muted-foreground mb-6">
                    ما فيه دعوات عامة حالياً
                  </p>
                ) : (
                  <div className="space-y-4 mb-10">
                    {publicList.map(renderRow)}
                  </div>
                )}
              </div>

              <div>
                <h2
                  className="text-lg font-bold mb-1 flex items-center gap-2"
                  style={{ fontFamily: "'El Messiri', serif" }}
                >
                  <span>الدعوات الخاصة</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#B8862F]/15 text-[#B8862F]">
                    برابط مباشر فقط
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  ما تظهر بشبكة الدعوات بالصفحة الرئيسية — تنفتح فقط لمن يملك
                  رابطها. تأكيدات الحضور (RSVP) بتنحفظ بالشيت المرتبط بكل دعوة
                  خاصة تلقائياً.
                </p>
                {privateList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    ما فيه دعوات خاصة حالياً
                  </p>
                ) : (
                  <div className="space-y-4">{privateList.map(renderRow)}</div>
                )}
              </div>
            </>
          )
        })()}

        {toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-lg px-6 py-3 rounded-2xl text-sm font-bold shadow-xl bg-[#1F2A20] text-white text-center leading-relaxed">
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  )
}
