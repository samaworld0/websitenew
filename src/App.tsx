import { useState, useEffect } from "react"
import { Invitation } from "./types"
import { invitations as seedInvitations, defaultSiteSettings } from "./data"
import { loadInvitations, loadSiteSettings } from "./backend"
import AdminPanel from "./AdminPanel"
import HomePage from "./HomePage"
import InvitationFullView from "./InvitationView"

// App.tsx مسؤول فقط عن التوجيه (routing) بين:
// 1) لوحة التحكم (?admin=1)
// 2) عرض دعوة كاملة (?preview=ID)
// 3) الواجهة الرئيسية (HomePage) — بملفها المستقل src/HomePage.tsx
export default function App() {
  // نبدأ بالبيانات المحلية (seedInvitations) حتى ما تنعرض الصفحة فاضية
  // لحظة التحميل الأول، وتنستبدل ببيانات Supabase الحقيقية أول ما توصل
  const [allInvitations, setAllInvitations] =
    useState<Invitation[]>(seedInvitations)
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings)

  useEffect(() => {
    loadInvitations().then(setAllInvitations)
    loadSiteSettings().then(setSiteSettings)
  }, [])

  const urlParams = new URLSearchParams(window.location.search)
  const previewId = urlParams.get("preview")
  const previewInv = allInvitations.find(
    (inv) => inv.id.toString() === previewId,
  )
  const isAdmin = urlParams.get("admin") === "1"

  const handlePreview = (inv: Invitation) => {
    window.location.href = `${window.location.pathname}?preview=${inv.id}`
  }

  if (isAdmin) {
    return (
      <AdminPanel
        invitations={allInvitations}
        onRefresh={() => loadInvitations().then(setAllInvitations)}
        siteSettings={siteSettings}
        onSiteSettingsRefresh={() => loadSiteSettings().then(setSiteSettings)}
      />
    )
  }

  if (previewInv) {
    return (
      <InvitationFullView
        inv={previewInv}
        onClose={() => {
          window.location.href = window.location.pathname
        }}
      />
    )
  }

  return (
    <HomePage
      invitations={allInvitations}
      siteSettings={siteSettings}
      onPreview={handlePreview}
    />
  )
}
