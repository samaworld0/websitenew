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
  persistSiteSettings,
  applyThemeColors,
  applySiteFont,
  applySiteMeta,
} from "./backend"
import { SiteSettings, DEFAULT_SITE_SETTINGS } from "./siteSettings"
import { TemplatePicker } from "./TemplatePicker"
import { AdminCreateForm } from "./AdminCreateForm"
import { AdminEditForm } from "./AdminEditForm"
import { SiteSettingsForm } from "./SiteSettingsForm"
import { LiveTemplateEditor } from "./LiveTemplateEditor"

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [unlocked, setUnlocked] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState(false)

  const [activeTab, setActiveTab] = useState<"invitations" | "settings">(
    "invitations",
  )

  const [list, setList] = useState<Invitation[]>([])
  const [listLoaded, setListLoaded] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [designEditingInv, setDesignEditingInv] = useState<Invitation | null>(
    null,
  )
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastIsError, setToastIsError] = useState(false)

  const [siteSettings, setSiteSettings] =
    useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [siteSettingsLoaded, setSiteSettingsLoaded] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // تدفّق إنشاء الدعوة الخاصة: مغلق -> اختيار تصميم -> تعبئة تفاصيل
  const [createStep, setCreateStep] =
    useState<"closed" | "template" | "details">("closed")
  const [createTemplate, setCreateTemplate] = useState<Invitation | null>(null)

  // لو تعذّر النسخ التلقائي للحافظة (شائع بالمتصفحات أو المعاينات المقيّدة)
  // نعرض الرابط بمربع نص يقدر المستخدم يحدده وينسخه يدوياً بنفسه
  const [shareLinkModal, setShareLinkModal] = useState<string | null>(null)

  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    isAdminLoggedIn().then(setUnlocked)
  }, [])

  useEffect(() => {
    if (unlocked) loadInvitations().then((data) => {
      setList(data)
      setListLoaded(true)
    })
  }, [unlocked])

  useEffect(() => {
    if (unlocked)
      loadSiteSettings().then((data) => {
        setSiteSettings(data)
        setSiteSettingsLoaded(true)
      })
  }, [unlocked])

  const handleSaveSiteSettings = async (settings: SiteSettings) => {
    setSavingSettings(true)
    const result = await persistSiteSettings(settings)
    setSavingSettings(false)
    setSiteSettings(settings)
    applyThemeColors(settings.colors)
    applySiteFont(settings.typography)
    applySiteMeta(settings.meta)
    if (result.ok) {
      flash("تم حفظ إعدادات الواجهة ✅ — التغييرات ظاهرة الآن بالصفحة الرئيسية")
    } else {
      flash(result.error || "تعذّر حفظ إعدادات الواجهة", true)
    }
  }

  const flash = (msg: string, isError = false) => {
    setToastMsg(msg)
    setToastIsError(isError)
    setTimeout(() => setToastMsg(null), isError ? 9000 : 4500)
  }

  // تسجيل الدخول الآن حقيقي عبر Supabase Auth بالإيميل والباسورد
  // (حقل "username" صار يستقبل الإيميل)
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

  // كل تكرار ياخذ رقم أصول جديد (hero-bg-N.jpg / weeding-N.jpg / intro-poster-N.jpg / intro-N.mp4)
  // حتى ما تشتبك ملفات الدعوة المكررة مع أي دعوة ثانية. الملفات نفسها لازم تنرفع
  // يدوياً بنفس الاسم داخل public/images، public/mnbra، public/videos.
  const handleDuplicate = async (id: number) => {
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
    const ok = await persistInvitations(updated)
    if (!ok) {
      flash("تعذّر تكرار الدعوة — راجع رسالة الخطأ اللي طلعت وحاول مرة ثانية", true)
      return
    }
    setList(updated)
    flash(
      `تم تكرار الدعوة ✅ — ارفع هالملفات: hero-bg-${n}.jpg (public/images) · weeding-${nn}.jpg (public/mnbra) · intro-poster-${n}.jpg و intro-${n}.mp4 (public/videos)`,
    )
  }

  const handleDelete = async (id: number) => {
    const updated = list.filter((inv) => inv.id !== id)
    const ok = await persistInvitations(updated)
    if (!ok) {
      flash("تعذّر حذف الدعوة — راجع رسالة الخطأ اللي طلعت وحاول مرة ثانية", true)
      return
    }
    setList(updated)
    setConfirmDeleteId(null)
    flash("تم حذف الدعوة 🗑️")
  }

  // ملاحظة مهمة: فورم "تعديل" العادي (AdminEditForm) ياخذ نسخة من الدعوة
  // لحظة ما ينفتح ويضلها مجمّدة طول ما هو مفتوح — يعني لو انفتح "تعديل
  // التصميم مباشر" بنفس الوقت (أو بعده) وحفظ textStyles جديدة، وبعدين
  // المستخدم حفظ فورم "تعديل" العادي، بيرجّع textStyles القديمة ويدهس
  // (overwrite) التصميم الجديد لأنه شايل نسخة كاملة قديمة من الدعوة.
  // الحل: فورم "تعديل" العادي ما يلمس أبداً textStyles — نرجّعها هنا من
  // أحدث نسخة موجودة بالـ list وقت الحفظ، مو من الفورم نفسه.
  const handleSaveEdit = async (updated: Invitation) => {
    const newList = list.map((inv) =>
      inv.id === updated.id ? { ...updated, textStyles: inv.textStyles } : inv,
    )
    const ok = await persistInvitations(newList)
    if (!ok) {
      // نسيب الفورم مفتوح بنفس القيم اللي كتبها الأدمن (ما نفقدها)، ونعرض
      // خطأ واضح بدل ما نقول "تم الحفظ" وهو أصلاً ما انحفظ بقاعدة البيانات
      flash("تعذّر حفظ التعديل — راجع رسالة الخطأ اللي طلعت وحاول مرة ثانية", true)
      return
    }
    setList(newList)
    setEditingId(null)
    flash("تم حفظ التعديل ✅")
  }

  // نفس الفكرة بالاتجاه المعاكس: "تعديل التصميم مباشر" لازم يلمس بس حقل
  // textStyles، ويحافظ على أحدث نسخة من باقي الحقول (نص/بيانات/إعدادات)
  // اللي ممكن تكون انحفظت من فورم "تعديل" العادي أثناء ما هو مفتوح —
  // حتى لو الاثنين انفتحوا أو انحفظوا بنفس الفترة، ولا وحدة تدهس الثانية.
  const handleSaveDesign = async (updated: Invitation) => {
    const newList = list.map((inv) =>
      inv.id === updated.id
        ? { ...inv, textStyles: updated.textStyles }
        : inv,
    )
    const ok = await persistInvitations(newList)
    if (!ok) {
      flash("تعذّر حفظ التصميم — راجع رسالة الخطأ اللي طلعت وحاول مرة ثانية", true)
      return false
    }
    setList(newList)
    setDesignEditingInv(null)
    flash("تم حفظ التصميم ✅")
    return true
  }

  const buildShareLink = (inv: Invitation) =>
    `${window.location.origin}${window.location.pathname}?inv=${encodeInvitationForUrl(inv)}`

  // نسخ رابط الدعوة للحافظة: نجرب أولاً الـ Clipboard API الحديثة، ولو فشلت
  // (شائع بالمعاينات أو الصفحات المقيّدة اللي تمنع الوصول للحافظة) نرجع
  // لطريقة execCommand الاحتياطية، ولو فشلت هي الثانية نعرض الرابط بمربع نص
  // يقدر المستخدم يحدده وينسخه يدوياً — حتى ما نقول "تم النسخ" وهو ما انسخ فعلاً
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
      // ما قدرنا ننسخ تلقائياً — نعرض الرابط حتى ينسخه المستخدم يدوياً
      setShareLinkModal(link)
    }
  }

  // إنشاء دعوة خاصة جديدة اعتماداً على تصميم دعوة موجودة بالضبط (نفس الخلفيات
  // والصور والفيديوهات والألوان) — بس بتفاصيل نصية جديدة. ما فيه أي أسماء
  // ملفات جديدة لازم تُرفع لأننا نستخدم نفس ملفات القالب المختار.
  //
  // كل دعوة خاصة تاخذ شيت خاص فيها (createSheet) — هذا الشيت هو اللي راح
  // تتخزن فيه تأكيدات الحضور (RSVP) لما الضيوف يعبّون النموذج، عن طريق
  // action: "addGuest" داخل WisalTemplateView.
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
        <div className="flex items-center justify-between mb-8">
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
          <div className="flex items-center gap-2">
            {activeTab === "invitations" && (
              <button
                onClick={() => {
                  if (createStep === "closed") {
                    setCreateStep("template")
                  } else {
                    setCreateStep("closed")
                    setCreateTemplate(null)
                  }
                }}
                className="px-4 py-2 rounded-full text-sm font-bold bg-[#B8862F] text-white"
              >
                {createStep === "closed" ? "+ دعوة خاصة جديدة" : "إغلاق"}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full text-sm font-bold border border-border"
            >
              تسجيل خروج
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-bold border border-border"
            >
              رجوع للموقع
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab("invitations")}
            className={`px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${
              activeTab === "invitations"
                ? "border-[#B8862F] text-[#B8862F]"
                : "border-transparent text-muted-foreground"
            }`}
          >
            الدعوات
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${
              activeTab === "settings"
                ? "border-[#B8862F] text-[#B8862F]"
                : "border-transparent text-muted-foreground"
            }`}
          >
            إعدادات الواجهة
          </button>
        </div>

        {activeTab === "settings" && (
          <>
            {!siteSettingsLoaded ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                جاري تحميل إعدادات الواجهة...
              </p>
            ) : (
              <SiteSettingsForm
                initial={siteSettings}
                saving={savingSettings}
                onSave={handleSaveSiteSettings}
                onPreviewColors={applyThemeColors}
                onPreviewFont={applySiteFont}
                onPreviewMeta={applySiteMeta}
              />
            )}
          </>
        )}

        {activeTab === "invitations" && createStep === "template" && (
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

        {activeTab === "invitations" && createStep === "details" && createTemplate && (
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

        {activeTab === "invitations" && (() => {
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
                    {inv.unlisted && !inv.sheetId && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                        بدون شيت — RSVP ما راح ينحفظ
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
                  {inv.templateType === "wisal" && (
                    <button
                      onClick={() => setDesignEditingInv(inv)}
                      className="px-4 py-2 rounded-full text-xs font-bold bg-[#4A2B32] text-white inline-flex items-center gap-1.5"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                      تعديل التصميم مباشر
                    </button>
                  )}
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

          if (!listLoaded) {
            return (
              <p className="text-sm text-muted-foreground py-10 text-center">
                جاري تحميل الدعوات...
              </p>
            )
          }

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
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-lg px-6 py-3 rounded-2xl text-sm font-bold shadow-xl text-white text-center leading-relaxed whitespace-pre-line ${
              toastIsError ? "bg-red-800" : "bg-[#1F2A20]"
            }`}
          >
            {toastMsg}
          </div>
        )}

        {shareLinkModal && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-6"
            onClick={() => setShareLinkModal(null)}
          >
            <div
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold mb-2">رابط الدعوة</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                المتصفح منع النسخ التلقائي للحافظة — حدد الرابط بالأسفل وانسخه
                يدوياً (Ctrl+C أو اضغط مطولاً واختر نسخ)
              </p>
              <input
                readOnly
                value={shareLinkModal}
                onFocus={(e) => e.currentTarget.select()}
                autoFocus
                dir="ltr"
                className="w-full border border-border rounded-xl px-4 py-3 text-xs mb-4 bg-[#FAF7F2]"
              />
              <button
                onClick={() => setShareLinkModal(null)}
                className="w-full py-3 bg-[#B8862F] text-white rounded-2xl font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {activeTab === "invitations" && (
          <p className="text-xs text-muted-foreground mt-10 leading-relaxed">
            ✅ الدعوات هلأ تنخزن بقاعدة بيانات Supabase، يعني أي تعديل تسويه يظهر
            لكل الزوار ومن أي جهاز أو متصفح فوراً.
            <br />
            ⚠️ الدعوة الخاصة الجديدة تستخدم نفس صور وفيديوهات التصميم اللي تختاره
            بالضبط، فما تحتاج ترفع أي ملفات جديدة. زر "تكرار" وحده هو اللي يولّد
            أسماء ملفات جديدة (لأنه يفترض تصميم مستقل)، وبهاي الحالة لازم ترفعها
            يدوياً بنفس الاسم داخل public/images و public/mnbra و public/videos.
            <br />
            ⚠️ تأكيدات الحضور (RSVP) تترسل فقط للدعوات الخاصة اللي عندها شيت
            (sheetId) — الدعوات العامة و"جرّب دعوتك" تضل معاينة محلية فقط بدون
            إرسال، حسب طلبك.
          </p>
        )}
      </div>

      {designEditingInv && (
        <LiveTemplateEditor
          inv={designEditingInv}
          onClose={() => setDesignEditingInv(null)}
          onSave={handleSaveDesign}
        />
      )}
    </div>
  )
}

