import { useState, useEffect } from "react"
import { Invitation } from "./types"
import { invitations } from "./data"
import { loadInvitations, decodeInvitationFromUrl, isAdminLoggedIn, loadSiteSettings, saveSiteSettings } from "./backend"
import { InvitationCard } from "./InvitationCard"
import { InvitationFullView } from "./InvitationFullView"
import { TryInvitationForm } from "./TryInvitationForm"
import { WhatsAppMenu } from "./WhatsAppMenu"
import { AdminPanel } from "./AdminPanel"
import HowItWorks from "./components/HowItWorks"
import Footer from "./components/Footer"

export default function App() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [allInvitations, setAllInvitations] = useState<Invitation[]>(invitations)
  const [tryStep, setTryStep] = useState<"form" | "preview" | null>(null)
  const [tryInv, setTryInv] = useState<Invitation | null>(null)
  const [tryBase, setTryBase] = useState<Invitation | null>(null)
  
  const [isLoggedAdmin, setIsLoggedAdmin] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // واجهة الموقع القابلة للتعديل
  const [heroTitle, setHeroTitle] = useState("دعوة إلكترونية تخطف الأنظار لمناسبتك القادمة")
  const [heroSubtitle, setHeroSubtitle] = useState("رابط واحد أنيق ترسله لكل المعازيم — بأنميشن يفتح كالسحر، وتأكيد حضور، وكشف بالحاضرين تشوفه برابط تحكمك لحظة بلحظة.")
  const [primaryColor, setPrimaryColor] = useState("#e11d48")

  useEffect(() => {
    loadInvitations().then(setAllInvitations)
    isAdminLoggedIn().then((loggedIn) => {
      setIsLoggedAdmin(loggedIn)
    })
    
    // جلب النصوص والألوان من Supabase لجميع الزوار
    loadSiteSettings().then((settings) => {
      if (settings) {
        if (settings.hero_title) setHeroTitle(settings.hero_title)
        if (settings.hero_subtitle) setHeroSubtitle(settings.hero_subtitle)
        if (settings.primary_color) setPrimaryColor(settings.primary_color)
      }
    })
  }, [])

  const handleSaveContent = async () => {
    const ok = await saveSiteSettings({
      hero_title: heroTitle,
      hero_subtitle: heroSubtitle,
      primary_color: primaryColor
    })
    if (ok) {
      alert("تم حفظ التعديلات وتحديث الموقع بنجاح لكل الزوار!")
      setIsEditMode(false)
    }
  }

  const urlParams = new URLSearchParams(window.location.search)
  const isAdmin = urlParams.get("admin") === "1" || isLoggedAdmin
  const previewId = urlParams.get("preview")
  const previewInv = allInvitations.find((inv) => inv.id.toString() === previewId)
  
  const sharedInvParam = urlParams.get("inv")
  const sharedInv = sharedInvParam ? decodeInvitationFromUrl(sharedInvParam) : null

  const handlePreview = (inv: Invitation) => {
    window.location.href = `${window.location.pathname}?preview=${inv.id}`
  }

  const handleTry = (inv: Invitation) => {
    setTryBase(inv)
    setTryStep("form")
  }

  const listedInvitations = allInvitations.filter((inv) => !inv.unlisted)
  const filtered = activeCategory === "all" ? listedInvitations : listedInvitations.filter((inv) => inv.category === activeCategory)

  if (isAdmin && urlParams.get("admin") === "1") {
    return (
      <AdminPanel
        onClose={() => {
          window.location.href = window.location.pathname
        }}
      />
    )
  }

  if (sharedInv) {
    return (
      <InvitationFullView
        inv={sharedInv}
        onClose={() => {
          window.location.href = window.location.pathname
        }}
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

  if (tryStep === "form" && tryBase) {
    return (
      <TryInvitationForm
        base={tryBase}
        onCancel={() => {
          setTryStep(null)
          setTryBase(null)
        }}
        onLaunch={(inv) => {
          setTryInv(inv)
          setTryStep("preview")
        }}
      />
    )
  }

  if (tryStep === "preview" && tryInv) {
    return (
      <InvitationFullView
        inv={tryInv}
        isTrial
        onClose={() => {
          setTryStep(null)
          setTryInv(null)
          setTryBase(null)
        }}
      />
    )
  }

  return (
    <div
      className="min-h-screen bg-background"
      dir="rtl"
      style={{ fontFamily: "Cairo, sans-serif", "--primary-color": primaryColor } as any}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=El+Messiri:wght@400;500;600;700&family=Reem+Kufi:wght@400;500;600;700&family=Cairo:wght@300;400;500;600;700;800&display=swap');
      `}</style>
      
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-[#2C1810]">
              ✨
            </div>
            <div>
              <h1
                className="text-lg font-bold leading-none"
                style={{ fontFamily: "'Aref Ruqaa', serif" }}
              >
                سما
              </h1>
              <p className="text-[10px] text-muted-foreground">
                للدعوات الالكترونية
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="?admin=1"
              title="لوحة التحكم"
              className="w-9 h-9 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-foreground"
            >
              ⚙️
            </a>
            <WhatsAppMenu />
          </div>
        </div>
      </nav>

      {/* ============ Hero (شاشة الاستقبال) ============ */}
      <section className="relative overflow-hidden">
        <span className="hidden sm:block absolute top-24 left-[8%] w-3 h-3 rounded-full bg-rose-400 animate-float" />
        <span className="hidden sm:block absolute top-10 left-[50%] w-2.5 h-2.5 rounded-full bg-[#93c5fd] animate-float-delay" />
        <span className="hidden sm:block absolute top-16 right-[6%] w-2 h-2 rounded-full bg-[#7dd3c8] animate-float" />
        <span className="hidden sm:block absolute bottom-40 left-[12%] w-3 h-3 rounded-full bg-[#c4b5fd] animate-float-delay" />
        <span className="hidden sm:block absolute bottom-24 right-[10%] w-2.5 h-2.5 rounded-full bg-gold-400 animate-float" />
        <span className="hidden sm:block absolute top-52 right-[3%] w-1.5 h-1.5 rounded-full bg-rose-500 animate-float-delay" />

        <div className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center relative">
          <a
            href="#try"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-bold bg-gold-50 border border-gold-200 text-gold-700 mb-8"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            🎁 جرّب دعوتك مجاناً قبل ما تدفع أي فلس
          </a>

          <h1
            className="text-4xl md:text-6xl font-bold leading-tight text-warm-900 mb-6"
            style={{ fontFamily: "'El Messiri', serif" }}
          >
            {heroTitle}
          </h1>

          <p
            className="text-warm-700/80 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            {heroSubtitle}
          </p>

          <button
            onClick={() =>
              document
                .getElementById("templates")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="btn-gold inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold text-base"
            style={{ fontFamily: "Cairo, sans-serif", backgroundColor: primaryColor }}
          >
            ✨ شاهد القوالب
          </button>
        </div>

        {/* بطاقات معاينة مكدّسة */}
        <div className="relative max-w-3xl mx-auto px-6 pb-20 pt-4">
          <div className="flex items-end justify-center gap-4 md:gap-6">
            <div
              className="w-28 md:w-40 rounded-2xl overflow-hidden shadow-xl border-4 border-white rotate-[8deg] translate-y-3"
              style={{ aspectRatio: "3/4" }}
            >
              <img
                src="/mnbra/wedding-01.jpg"
                alt="معاينة دعوة"
                className="w-full h-full object-cover"
              />
            </div>

            <div
              className="w-32 md:w-48 rounded-2xl overflow-hidden shadow-2xl border-4 border-white -translate-y-4 z-10 flex flex-col items-center justify-center text-center px-3"
              style={{
                aspectRatio: "3/4",
                background: "linear-gradient(180deg, #1A0E10 0%, #2A161A 100%)",
              }}
            >
              <p
                className="text-gold-300 text-xs mb-1"
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                دعوة زواج
              </p>
              <p
                className="text-gold-100 text-lg md:text-xl font-bold shimmer-text"
                style={{ fontFamily: "'Aref Ruqaa', serif" }}
              >
                محمد &amp; زينب
              </p>
              <span className="mt-3 text-[10px] md:text-xs px-3 py-1.5 rounded-full bg-gold-400 text-warm-900 font-bold">
                افتح الدعوة
              </span>
            </div>

            <div
              className="w-28 md:w-40 rounded-2xl overflow-hidden shadow-xl border-4 border-white rotate-[-8deg] translate-y-3"
              style={{ aspectRatio: "3/4" }}
            >
              <img
                src="/mnbra/wedding-02.jpg"
                alt="معاينة دعوة"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ القوالب ============ */}
      <section id="templates" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "'El Messiri', serif" }}
          >
            اختر دعوتك المثالية
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {filtered.map((inv) => (
            <InvitationCard
              key={inv.id}
              inv={inv}
              onPreview={handlePreview}
              onTry={handleTry}
            />
          ))}
        </div>
      </section>

      {/* ============ قسم كيف نشتغل ============ */}
      <HowItWorks />

      {/* ============ الفوتر والنافذة الحمراء ============ */}
      <Footer />

    </div>
  )
}
