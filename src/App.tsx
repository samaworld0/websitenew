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
      className="min-h-screen bg-background"
      dir="rtl"
      style={{ fontFamily: "Cairo, sans-serif" }}
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
