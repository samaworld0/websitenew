import { useState, useEffect } from "react"
import { Invitation } from "./types"
import { invitations } from "./data"
import { loadInvitations, decodeInvitationFromUrl } from "./backend"
import { InvitationCard } from "./InvitationCard"
import { InvitationFullView } from "./InvitationFullView"
import { TryInvitationForm } from "./TryInvitationForm"
import { WhatsAppMenu } from "./WhatsAppMenu"
import { AdminPanel } from "./AdminPanel"

export default function App() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [allInvitations, setAllInvitations] =
    useState<Invitation[]>(invitations)
  const [tryStep, setTryStep] = useState<"form" | "preview" | null>(null)
  const [tryInv, setTryInv] = useState<Invitation | null>(null)
  const [tryBase, setTryBase] = useState<Invitation | null>(null)

  useEffect(() => {
    loadInvitations().then(setAllInvitations)
  }, [])

  const urlParams = new URLSearchParams(window.location.search)
  const isAdmin = urlParams.get("admin") === "1"
  const previewId = urlParams.get("preview")
  const previewInv = allInvitations.find(
    (inv) => inv.id.toString() === previewId,
  )
  // رابط الدعوة الخاصة يحمل بياناتها كاملة داخل ?inv= — يشتغل من أي جهاز
  // أو متصفح بدون أي اعتماد على localStorage
  const sharedInvParam = urlParams.get("inv")
  const sharedInv = sharedInvParam
    ? decodeInvitationFromUrl(sharedInvParam)
    : null

  const handlePreview = (inv: Invitation) => {
    window.location.href = `${window.location.pathname}?preview=${inv.id}`
  }

  const handleTry = (inv: Invitation) => {
    setTryBase(inv)
    setTryStep("form")
  }

  const listedInvitations = allInvitations.filter((inv) => !inv.unlisted)

  const filtered =
    activeCategory === "all"
      ? listedInvitations
      : listedInvitations.filter((inv) => inv.category === activeCategory)

  if (isAdmin) {
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
      className="min-h-screen bg-cream-50"
      dir="rtl"
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=El+Messiri:wght@400;500;600;700&family=Reem+Kufi:wght@400;500;600;700&family=Cairo:wght@300;400;500;600;700;800&display=swap');
      `}</style>
      <nav className="sticky top-0 z-40 border-b border-gold-100 bg-cream-50/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gold-400 text-white">
              ✨
            </div>
            <div>
              <h1
                className="text-lg font-bold leading-none"
                style={{ fontFamily: "'Aref Ruqaa', serif" }}
              >
                سما
              </h1>
              <p className="text-[10px] text-warm-700/60">
                للدعوات الالكترونية
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="?admin=1"
              title="لوحة التحكم"
              className="w-9 h-9 rounded-full flex items-center justify-center border border-gold-100 text-warm-700/60 hover:text-warm-900"
            >
              ⚙️
            </a>
            <WhatsAppMenu />
          </div>
        </div>
      </nav>

      {/* ============ كيف نشتغل ============ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "'El Messiri', serif" }}
          >
            كيف نشتغل؟
          </h2>
          <p
            className="text-warm-700/70 text-sm md:text-base"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            أربع خطوات وتوصلك دعوتك
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              step: 1,
              icon: "✏️",
              iconBg: "bg-rose-400",
              title: "جهّز بنفسك",
              desc: "اختر قالبك واكتب اسماءكم وموعدكم بثلاث خطوات.",
            },
            {
              step: 2,
              icon: "👁️",
              iconBg: "bg-gold-400",
              title: "شاهدها بأسمائكم",
              desc: "تفتح دعوتك حية بأنميشنها الكامل قبل أي دفع.",
            },
            {
              step: 3,
              icon: "💳",
              iconBg: "bg-[#5aa9e6]",
              title: "ادفع",
              desc: "وحال الدفع يفتح رابط دعوتك ورابط التحكم فوراً.",
            },
            {
              step: 4,
              icon: "➤",
              iconBg: "bg-gold-600",
              title: "شارك الرابط",
              desc: "رابط واحد لكل المعازيم، وكشف الحضور يتحدّث برابطك لحظياً.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="relative bg-white rounded-2xl border border-gold-100 p-6 text-center shadow-sm"
            >
              <span className="absolute top-4 left-5 text-2xl font-bold text-gold-100">
                {s.step}
              </span>
              <div
                className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl text-white mb-4 ${s.iconBg}`}
              >
                {s.icon}
              </div>
              <h3
                className="font-bold text-base mb-2"
                style={{ fontFamily: "'El Messiri', serif" }}
              >
                {s.title}
              </h3>
              <p
                className="text-warm-700/70 text-sm leading-relaxed"
                style={{ fontFamily: "Cairo, sans-serif" }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-24">
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
    </div>
  )
}
