import { useState, useEffect } from "react"
import { Invitation } from "./types"
import { defaultSiteSettings } from "./data"
import { loadInvitations, loadSiteSettings } from "./backend"
import AdminPanel from "./AdminPanel"
import HomePage from "./HomePage"
import InvitationFullView from "./InvitationView"

// App.tsx مسؤول فقط عن التوجيه (routing) بين:
// 1) لوحة التحكم (?admin=1)
// 2) عرض دعوة كاملة (?preview=ID)
// 3) الواجهة الرئيسية (HomePage) — بملفها المستقل src/HomePage.tsx
function AppInner() {
  // نبدأ بـ null (مو seedInvitations) حتى ما نعرض بيانات وهمية/تجريبية
  // ولو للحظة وحدة قبل ما توصل بيانات Supabase الحقيقية — بدل الفلاش
  // (ظهور بيانات مختلفة ثم استبدالها ببياناتك الفعلية). null = لسه
  // التحميل الأول ما خلص.
  const [allInvitations, setAllInvitations] = useState<Invitation[] | null>(
    null,
  )
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings)

  useEffect(() => {
    loadInvitations().then(setAllInvitations)
    loadSiteSettings().then(setSiteSettings)
  }, [])

  // اسم الموقع بتبويب المتصفح (title) وأيقونة التبويب (favicon) — نحدّثهم
  // تلقائياً من إعدادات الموقع (لوحة التحكم → إعدادات الواجهة). لو رفعت
  // صورة شعار (logoImageUrl) نستخدمها كأيقونة مباشرة، وإلا نولّد أيقونة
  // بسيطة من الإيموجي/الرمز النصي (logoIcon) بدالها.
  useEffect(() => {
    document.title = siteSettings.siteName
      ? `${siteSettings.siteName} | للدعوات الألكترونية`
      : "سما | للدعوات الألكترونية"

    let iconHref = siteSettings.logoImageUrl || ""
    if (!iconHref) {
      const icon = siteSettings.logoIcon || "🌸"
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="54%" font-size="46" text-anchor="middle" dominant-baseline="middle">${icon}</text></svg>`
      iconHref = `data:image/svg+xml,${encodeURIComponent(svg)}`
    }

    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.href = iconHref
  }, [siteSettings.siteName, siteSettings.logoIcon, siteSettings.logoImageUrl])

  const urlParams = new URLSearchParams(window.location.search)
  const previewId = urlParams.get("preview")
  const previewInv = allInvitations?.find(
    (inv) => inv.id.toString() === previewId,
  )
  const skipIntro = urlParams.get("skipIntro") === "1"
  const isAdmin = urlParams.get("admin") === "1"

  const handlePreview = (inv: Invitation) => {
    window.location.href = `${window.location.pathname}?preview=${inv.id}`
  }

  // لسه ما وصلت بيانات Supabase الحقيقية (أول تحميل) — نعرض شاشة تحميل
  // بسيطة بدل ما نعرض بيانات وهمية مؤقتة.
  if (allInvitations === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#fefcf8" }}
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-9 h-9 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin"
            aria-hidden
          />
          <span className="text-sm text-[#8a7561]">...جارٍ التحميل</span>
        </div>
      </div>
    )
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
        customFonts={siteSettings.customFonts}
        skipIntro={skipIntro}
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

// على شاشات الكمبيوتر نعرض معاينة الدعوة داخل إطار بمقاس الآيفون (iframe)،
// عشان تظهر بالضبط مثل ما تظهر على الجوال (نفس الـ viewport والـ fixed
// والـ vh). الـ iframe يفتح نفس الرابط مع embed=1 عشان ما يتكرر الإطار.
function usePhoneFrameNeeded() {
  const compute = () => {
    const p = new URLSearchParams(window.location.search)
    return (
      !!p.get("preview") &&
      p.get("admin") !== "1" &&
      p.get("embed") !== "1" &&
      window.innerWidth >= 768
    )
  }
  const [needed, setNeeded] = useState(compute)
  useEffect(() => {
    const onResize = () => setNeeded(compute())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return needed
}

export default function App() {
  const needFrame = usePhoneFrameNeeded()

  if (needFrame) {
    const p = new URLSearchParams(window.location.search)
    p.set("embed", "1")
    const src = `${window.location.pathname}?${p.toString()}`
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#14110f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: "min(844px, calc(100dvh - 48px))",
            aspectRatio: "390 / 844",
            borderRadius: 48,
            border: "10px solid #2a2522",
            boxShadow:
              "0 0 0 2px #4a423c, 0 30px 80px rgba(0,0,0,0.6)",
            overflow: "hidden",
            background: "#000",
            position: "relative",
          }}
        >
          <iframe
            src={src}
            title="معاينة الدعوة"
            allow="autoplay; fullscreen"
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          />
        </div>
      </div>
    )
  }

  return <AppInner />
}
