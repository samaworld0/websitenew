import { useState, useEffect, useRef, Fragment } from "react"
import { Invitation } from "./types"
import { getTimeLeft, getNameFontSizeClass, DEFAULT_LAMSA_PROGRAM } from "./utils"
import { SHEETS_SCRIPT_URL } from "./backend"
import { EditableText, EditableBackground, EditableIcon } from "./LiveEditing"

interface SoftParticle {
  id: number
  symbol: string
  left: number
  size: number
  duration: number
  delay: number
}

// نفس فكرة الظهور التدريجي عند السكرول المستخدمة بقالب "وصال"
function useRevealOnScroll(active: boolean) {
  useEffect(() => {
    if (!active) return
    const els = document.querySelectorAll(".lamsa-reveal")
    if (!els.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("lamsa-revealed")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [active])
}

// يحسب نسبة تقدم السكرول عبر عنصر معيّن (٠ عند دخوله الشاشة، ١٠٠ بعد
// تجاوزه) لاستخدامها في تحريك الخط العمودي لبرنامج الحفل مع نزول الصفحة
// يحسب نسبة تقدم السكرول عبر عنصر معيّن (٠ عند دخوله الشاشة، ١٠٠ بعد
// تجاوزه) لاستخدامها في تحريك الخط العمودي لبرنامج الحفل مع نزول الصفحة.
// القالب يستخدم div داخلي overflow-y-auto بدل سكرول الصفحة نفسها، فلازم
// نلقى هالحاوية الفعلية ونسمع للسكرول عليها بدل window.
function useScrollProgress(active: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return

    let scrollParent: HTMLElement | Window = window
    let node: HTMLElement | null = el.parentElement
    while (node) {
      const style = getComputedStyle(node)
      if (
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight
      ) {
        scrollParent = node
        break
      }
      node = node.parentElement
    }

    const handle = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const pct = ((vh - rect.top) / (vh + rect.height)) * 100
      setProgress(Math.max(0, Math.min(100, pct)))
    }
    handle()
    scrollParent.addEventListener("scroll", handle, { passive: true })
    window.addEventListener("resize", handle)
    return () => {
      scrollParent.removeEventListener("scroll", handle)
      window.removeEventListener("resize", handle)
    }
  }, [active])

  return { ref, progress }
}

// قالب "لمسة" — قالب خطوبة أنيق بدون أي فيديو (خلفيات وتدرجات CSS فقط)،
// يفتح بلمسة بسيطة (بدون تشغيل فيديو انتقالي) ويحتفظ بنفس منطق العداد
// التنازلي وتأكيد الحضور والخريطة المستخدم بقالب "وصال".
export function LamsaTemplateView({ inv }: { inv: Invitation }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  const [overlayMounted, setOverlayMounted] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [particles, setParticles] = useState<SoftParticle[]>([])

  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(inv.countdownDate))
  const [attendance, setAttendance] = useState("نعم")
  const [companions, setCompanions] = useState(0)
  const [guestName, setGuestName] = useState("")
  const [guestNote, setGuestNote] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  const mapQuery = encodeURIComponent(inv.venue)
  const mapUrl =
    inv.mapUrl && inv.mapUrl.trim()
      ? inv.mapUrl.trim()
      : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`

  useRevealOnScroll(isOpen)
  const programTimeline = useScrollProgress(isOpen)

  useEffect(() => {
    const items: SoftParticle[] = []
    const symbols = ["✦", "❀", "✧"]
    for (let i = 0; i < 20; i++) {
      items.push({
        id: i,
        symbol: symbols[i % symbols.length],
        left: Math.random() * 92 + 4,
        size: Math.random() * 7 + 7,
        duration: Math.random() * 8 + 11,
        delay: Math.random() * 6,
      })
    }
    setParticles(items)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(inv.countdownDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [inv.countdownDate])

  const handleOpen = () => {
    if (isOpen) return
    setIsOpen(true)
    setShowFlash(true)
    audioRef.current?.play().catch(() => {})
    setTimeout(() => setShowFlash(false), 800)
    setTimeout(() => setOverlayMounted(false), 900)
  }

  // زر كتم/تشغيل الصوت — يبدّل خاصية muted على عنصر الصوت مباشرة، بدون
  // ما يوقف التشغيل نفسه (الموسيقى تستمر بالخلفية، بس بدون صوت مسموع)
  const toggleMute = () => {
    if (audioRef.current) audioRef.current.muted = !isMuted
    setIsMuted((v) => !v)
  }

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(false)

    if (inv.sheetId) {
      setSubmitting(true)
      try {
        const res = await fetch(SHEETS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "addGuest",
            sheetId: inv.sheetId,
            name: guestName,
            attendance,
            companions,
            message: guestNote,
          }),
        })
        const result = await res.json().catch(() => null)
        if (result && result.success === false) {
          setSubmitError(true)
          setSubmitting(false)
          return
        }
      } catch (err) {
        console.error("RSVP submit error:", err)
        setSubmitError(true)
        setSubmitting(false)
        return
      }
      setSubmitting(false)
    }

    setSubmitted(true)
  }

  return (
    <EditableBackground
      id="pageBg"
      as="div"
      className="relative h-full w-full bg-[#FBF3EF] text-[#3D2B2E] font-sans overflow-hidden"
      dir="rtl"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Amiri:wght@400;700&family=El+Messiri:wght@400;500;600;700&family=Reem+Kufi:wght@400;500;600;700&family=Cairo:wght@300;400;500;600;700;800&display=swap');
        @keyframes lamsaParticle {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.55; }
          85% { opacity: 0.55; }
          100% { transform: translate3d(12px, -110vh, 0) rotate(360deg); opacity: 0; }
        }
        @keyframes lamsaFadeInUp {
          0% { opacity: 0; transform: translateY(50px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes lamsaBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @keyframes lamsaFlash {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lamsaPulseRing {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        .lamsa-scroll::-webkit-scrollbar { display: none; }
        .lamsa-ruqaa { font-family: 'Aref Ruqaa', serif; }
        .lamsa-amiri { font-family: 'Amiri', serif; }
        .lamsa-heading { font-family: 'El Messiri', serif; }
        .lamsa-eyebrow { font-family: 'Reem Kufi', sans-serif; }
        .lamsa-tajawal { font-family: 'Cairo', sans-serif; }

        .lamsa-reveal {
          opacity: 0;
          transform: translateY(26px);
          transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        .lamsa-reveal.lamsa-revealed { opacity: 1; transform: translateY(0); }
        .lamsa-reveal-delay-1 { transition-delay: 0.12s; }
        .lamsa-reveal-delay-2 { transition-delay: 0.24s; }
        .lamsa-reveal-delay-3 { transition-delay: 0.36s; }

        /* دخول متلاشي مع تمويه (blur) من الأسفل لنصوص برنامج الحفل */
        .blur-reveal {
          filter: blur(14px);
          transition: filter 0.9s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: filter;
        }
        .blur-reveal.lamsa-revealed { filter: blur(0); }
      `}</style>

      {inv.musicUrl && <audio ref={audioRef} src={inv.musicUrl} loop />}

      {isOpen && inv.musicUrl && (
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
          className="fixed top-6 right-6 z-[90] w-11 h-11 rounded-full flex items-center justify-center bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-lg text-lg"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      )}

      {/* لمعة وردية لحظة فتح الدعوة (بديل لمعة "وصال" الذهبية، بدون فيديو) */}
      {showFlash && (
        <div
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,235,236,0.95) 0%, rgba(201,162,39,0.45) 35%, transparent 70%)",
            animation: "lamsaFlash 800ms ease-out forwards",
          }}
        />
      )}

      <div
        className="absolute inset-0 overflow-y-auto overflow-x-hidden z-10 lamsa-scroll"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        <div
          className={`relative transition-all duration-1000 w-full ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* القسم الأول — خلفية متدرجة (صورة اختيارية + تدرج وردي/ذهبي CSS بدون فيديو) */}
          <section
            className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden text-[#FDF6F2] animate-[lamsaFadeInUp_1s] bg-cover bg-center"
            style={{
              backgroundImage: inv.heroBg
                ? `linear-gradient(180deg, rgba(74,30,40,0.55), rgba(74,30,40,0.75)), url("${inv.heroBg}")`
                : "linear-gradient(160deg, #5C2A38 0%, #7A3546 45%, #5C2A38 100%)",
            }}
          >
            <div className="absolute inset-0 opacity-25 pointer-events-none">
              <div className="absolute w-[480px] h-[480px] rounded-full bg-[#C9A227] blur-[180px] top-[-140px] right-[-110px]" />
              <div className="absolute w-[380px] h-[380px] rounded-full bg-[#C9A227] blur-[180px] bottom-[-160px] left-[-110px]" />
            </div>

            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="absolute bottom-0 text-[#F1D4B8] opacity-60"
                  style={{
                    left: `${p.left}%`,
                    fontSize: `${p.size}px`,
                    animation: `lamsaParticle ${p.duration}s linear infinite`,
                    animationDelay: `-${p.delay}s`,
                  }}
                >
                  {p.symbol}
                </div>
              ))}
            </div>

            <div className="relative z-20 w-full max-w-3xl mx-auto px-5 py-6 flex flex-col justify-between h-full min-h-screen">
              <div />
              <div className="my-auto flex flex-col items-center text-center">
                <p className="text-base md:text-lg tracking-widest text-[#EFD9C6] mb-2 lamsa-eyebrow">
                  <EditableText id="heroEyebrow">دعوة خطوبة</EditableText>
                </p>
                <span className="text-[#C9A227] text-xl mb-4">✦</span>
                {inv.groom && (
                  <EditableText
                    id="groomName"
                    as="h1"
                    className={`${getNameFontSizeClass(inv.nameFontSize, "md")} text-white mb-1 leading-none lamsa-ruqaa drop-shadow-2xl`}
                  >
                    {inv.groom}
                  </EditableText>
                )}
                {inv.groom && inv.bride && (
                  <span className="text-3xl text-[#C9A227] my-3 lamsa-ruqaa">
                    و
                  </span>
                )}
                {inv.bride && (
                  <EditableText
                    id="brideName"
                    as="h1"
                    className={`${getNameFontSizeClass(inv.nameFontSize, "md")} text-white mt-1 leading-none lamsa-ruqaa drop-shadow-2xl`}
                  >
                    {inv.bride}
                  </EditableText>
                )}
                <div className="mt-8 space-y-2">
                  <EditableText
                    id="heroDate"
                    as="p"
                    className="text-xl md:text-2xl text-[#FDF6F2] lamsa-amiri"
                  >
                    {inv.dateGreg}
                  </EditableText>
                  <p className="text-base md:text-lg text-[#EFD9C6] lamsa-tajawal">
                    <EditableText id="heroGreeting">
                      بلمسة فرح نفتح صفحة جديدة... وندعوكم لمشاركتنا فرحتنا
                    </EditableText>
                  </p>
                </div>
              </div>
              <div className="mb-4 flex flex-col items-center opacity-80">
                <p className="text-sm tracking-widest text-[#EFD9C6] mb-1 lamsa-eyebrow">
                  <EditableText id="scrollHint">مرر للأسفل</EditableText>
                </p>
                <span
                  className="text-xl text-[#C9A227]"
                  style={{ animation: "lamsaBounce 2s ease-in-out infinite" }}
                >
                  ↓
                </span>
              </div>
            </div>
          </section>

          <div className="w-full bg-[#FBF3EF] text-[#3D2B2E] relative z-20">
            <section className="py-24 px-6 flex flex-col items-center">
              <div className="text-center w-full max-w-lg mb-16 lamsa-reveal">
                <h4 className="text-2xl md:text-3xl font-bold text-[#4A2B32] mb-10 lamsa-heading">
                  <EditableText id="countdownHeading">باقي على خطوبتنا</EditableText>
                </h4>
                <div
                  className="flex justify-center items-center gap-4"
                  dir="ltr"
                >
                  <div className="flex flex-col items-center bg-white border border-[#C9A227]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A2B32] lamsa-heading">
                      <EditableText id="countdownSecondsValue">
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </EditableText>
                    </span>
                    <span className="text-sm text-[#8C6B6F] mt-1">
                      <EditableText id="countdownSecondsLabel">ثانية</EditableText>
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[#C9A227]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A2B32] lamsa-heading">
                      <EditableText id="countdownMinutesValue">
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </EditableText>
                    </span>
                    <span className="text-sm text-[#8C6B6F] mt-1">
                      <EditableText id="countdownMinutesLabel">دقيقة</EditableText>
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[#C9A227]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A2B32] lamsa-heading">
                      <EditableText id="countdownHoursValue">
                        {String(timeLeft.hours).padStart(2, "0")}
                      </EditableText>
                    </span>
                    <span className="text-sm text-[#8C6B6F] mt-1">
                      <EditableText id="countdownHoursLabel">ساعة</EditableText>
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[#C9A227]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A2B32] lamsa-heading">
                      <EditableText id="countdownDaysValue">
                        {timeLeft.days}
                      </EditableText>
                    </span>
                    <span className="text-sm text-[#8C6B6F] mt-1">
                      <EditableText id="countdownDaysLabel">يوم</EditableText>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* برنامج الحفل والمكان — خلفية عنّابية مع خط ذهبي فاصل،
                والزهرة الحمراء بالمنتصف تتحرك رأسياً حسب نسبة تقدم السكرول */}
            <EditableBackground
              id="programSectionBg"
              as="section"
              className="py-20 px-6 flex flex-col items-center bg-[#5C2A38] text-[#F5E9E4] border-t-2 border-[#C9A227]"
            >
              <div className="text-center max-w-lg w-full mb-24 lamsa-reveal">
                <h3 className="text-3xl font-bold text-[#F1D4B8] mb-12 lamsa-heading">
                  <EditableText id="programHeading">برنامج الحفل</EditableText>
                </h3>
                <div
                  className="grid gap-x-3 text-base md:text-lg lamsa-tajawal"
                  style={{ gridTemplateColumns: "1fr 2rem 1fr" }}
                >
                  {/* عمود الزينة الأوسط: يمتد عبر كل الصفوف ويحتوي النقاط
                      الثابتة + الزهرة المتحركة، بمعزل تام عن نصوص الصفوف
                      حتى ما تتراكب فوق أي كلام */}
                  <div
                    ref={programTimeline.ref}
                    className="relative"
                    style={{ gridColumn: 2, gridRow: "1 / span 3" }}
                  >
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px border-l border-dotted border-[#C9A227]/40" />
                    {[0, 50, 100].map((pos) => (
                      <EditableIcon
                        key={pos}
                        id="programTimelineDots"
                        as="span"
                        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{ top: `${pos}%`, backgroundColor: "#C9A227", width: 6, height: 6 }}
                        getSizeStyle={(pct) => ({ width: (6 * pct) / 100, height: (6 * pct) / 100 })}
                        getColorStyle={(color) => ({ backgroundColor: color })}
                      />
                    ))}
                    <EditableIcon
                      id="programTimelineFlower"
                      as="svg"
                      attrs={{ viewBox: "0 0 24 24" }}
                      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transition-[top] duration-150 ease-out drop-shadow"
                      style={{ top: `${programTimeline.progress}%`, color: "#D0342C", width: 24, height: 24 }}
                      getSizeStyle={(pct) => ({ width: (24 * pct) / 100, height: (24 * pct) / 100 })}
                      getColorStyle={(color) => ({ color })}
                    >
                      <g fill="currentColor">
                        {[0, 72, 144, 216, 288].map((angle) => (
                          <ellipse
                            key={angle}
                            cx="12"
                            cy="6"
                            rx="3.2"
                            ry="5.5"
                            transform={`rotate(${angle} 12 12)`}
                          />
                        ))}
                      </g>
                      <circle cx="12" cy="12" r="2" fill="#F1C40F" />
                    </EditableIcon>
                  </div>

                  {(inv.programItems && inv.programItems.length === 3
                    ? inv.programItems
                    : DEFAULT_LAMSA_PROGRAM
                  ).map((item, i) => {
                    const delayClass =
                      i === 1
                        ? " lamsa-reveal-delay-1"
                        : i === 2
                        ? " lamsa-reveal-delay-2"
                        : ""
                    return (
                      <Fragment key={i}>
                        <div
                          className={`flex items-center justify-end py-4 text-[#F5E9E4] lamsa-reveal blur-reveal${delayClass}`}
                          style={{ gridColumn: 1, gridRow: i + 1 }}
                        >
                          <EditableText id={`programLabel${i}`}>
                            {item.label}
                          </EditableText>
                        </div>
                        <div
                          className={`flex items-center justify-start py-4 font-bold text-[#F1D4B8] lamsa-reveal blur-reveal${delayClass}`}
                          style={{ gridColumn: 3, gridRow: i + 1 }}
                        >
                          <EditableText id={`programTime${i}`}>
                            {item.time}
                          </EditableText>
                        </div>
                      </Fragment>
                    )
                  })}
                </div>
              </div>

              <div className="text-center max-w-lg w-full mb-24 lamsa-reveal">
                <EditableText
                  id="venueHeading"
                  as="h3"
                  className="text-3xl font-bold text-[#F1D4B8] mb-7 lamsa-heading"
                >
                  مكان الحفل
                </EditableText>
                <EditableText
                  id="venueName"
                  as="h4"
                  className="text-2xl font-bold text-[#F5E9E4] mb-7 lamsa-heading"
                >
                  {inv.venue}
                </EditableText>
                <EditableText
                  id="mapButton"
                  as="a"
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-white bg-[#B8862F] hover:bg-[#9E7024] shadow-md lamsa-tajawal"
                >
                  📍 الموقع على الخريطة
                </EditableText>
              </div>
            </EditableBackground>

            {/* قسم تأكيد الحضور */}
            <EditableBackground
              id="rsvpSectionBg"
              as="section"
              className="py-20 px-6 flex flex-col items-center bg-[#FBF3EF] border-t-2 border-[#C9A227]"
            >
              <div className="max-w-md w-full bg-white border border-[#B8862F]/30 rounded-3xl p-10 shadow-lg lamsa-tajawal lamsa-reveal">
                <div className="text-center mb-10">
                  <span className="text-lg">✦</span>
                  <h3 className="text-3xl font-bold text-[#4A2B32] mt-2 lamsa-heading">
                    <EditableText id="rsvpHeading">تأكيد الحضور</EditableText>
                  </h3>
                  <p className="text-sm text-[#8C6B6F] mt-1">
                    <EditableText id="rsvpSubheading">
                      يسعدنا تأكيد حضوركم
                    </EditableText>
                  </p>
                </div>

                {submitted ? (
                  <div className="text-center py-10 text-emerald-600 font-bold text-lg">
                    <EditableText id="rsvpSuccessMessage">
                      تم إرسال تأكيد حضورك بنجاح، شكراً لك! ✦
                    </EditableText>
                  </div>
                ) : (
                  <form onSubmit={handleRSVP} className="space-y-7">
                    <div>
                      <label className="block text-sm text-[#8C6B6F] mb-2 font-medium">
                        <EditableText id="rsvpNameLabel">الاسم الكريم</EditableText>
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="اسمك الكريم"
                        className="w-full bg-[#FBF3EF] border border-[#C9A227]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[#8C6B6F] mb-2 font-medium">
                        <EditableText id="rsvpAttendanceLabel">هل ستحضر؟</EditableText>
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {["نعم", "لا", "ربما"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAttendance(opt)}
                            className={`py-3 rounded-xl text-base font-medium transition ${
                              attendance === opt
                                ? "bg-[#B8862F] text-white shadow"
                                : "bg-[#FBF3EF] border border-[#C9A227]/30 text-[#3D2B2E]"
                            }`}
                          >
                            <EditableText id={`rsvpOption-${opt}`}>
                              {opt}
                            </EditableText>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#8C6B6F] mb-2 font-medium">
                        <EditableText id="rsvpCompanionsLabel">
                          عدد المرافقين (عدا حضورك - 0 إن كنت وحدك)
                        </EditableText>
                      </label>
                      <div className="flex items-center justify-center gap-6 bg-[#FBF3EF] border border-[#C9A227]/30 rounded-2xl py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setCompanions(Math.max(0, companions - 1))
                          }
                          className="w-10 h-10 rounded-full bg-white border border-[#C9A227]/30 flex items-center justify-center text-xl font-bold shadow-sm"
                        >
                          -
                        </button>
                        <span className="text-xl font-bold text-[#4A2B32]">
                          <EditableText id="rsvpCompanionsCount">
                            {companions}
                          </EditableText>
                        </span>
                        <button
                          type="button"
                          onClick={() => setCompanions(companions + 1)}
                          className="w-10 h-10 rounded-full bg-white border border-[#C9A227]/30 flex items-center justify-center text-xl font-bold shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#8C6B6F] mb-2 font-medium">
                        <EditableText id="rsvpNoteLabel">كلمة للمخطوبين 💌</EditableText>
                      </label>
                      <textarea
                        rows={3}
                        value={guestNote}
                        onChange={(e) => setGuestNote(e.target.value)}
                        placeholder="اكتب تهنئتك..."
                        className="w-full bg-[#FBF3EF] border border-[#C9A227]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F] resize-none"
                      />
                    </div>

                    {submitError && (
                      <p className="text-sm text-red-500 text-center -mt-3">
                        <EditableText id="rsvpErrorMessage">
                          تعذّر إرسال التأكيد، حاول مرة أخرى
                        </EditableText>
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 bg-[#B8862F] hover:bg-[#9E7024] text-white font-bold rounded-2xl text-base transition shadow-md disabled:opacity-60"
                    >
                      <EditableText id="rsvpSubmitButton">
                        {submitting ? "جارٍ الإرسال..." : "إرسال التأكيد"}
                      </EditableText>
                    </button>
                  </form>
                )}
              </div>
            </EditableBackground>
          </div>
        </div>
      </div>

      {/* طبقة الفتح — بطاقة بسيطة بدون فيديو، فقط أنيميشن CSS (نبضة خاتم/تألق) */}
      {overlayMounted && (
        <div
          onClick={handleOpen}
          className={`absolute inset-0 z-50 flex items-center justify-center cursor-pointer transition-opacity duration-1000 bg-[#3A1620]/90 ${
            isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="relative flex flex-col items-center">
            <span className="absolute w-24 h-24 rounded-full border border-[#C9A227]/60 animate-[lamsaPulseRing_2.4s_ease-out_infinite]" />
            <span className="absolute w-24 h-24 rounded-full border border-[#C9A227]/40 animate-[lamsaPulseRing_2.4s_ease-out_infinite]" style={{ animationDelay: "0.8s" }} />
            <span className="relative text-5xl text-[#C9A227]">✦</span>
          </div>
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-[#C9A227] text-sm md:text-base tracking-widest lamsa-eyebrow animate-pulse">
            <EditableText id="openHint">اضغط لفتح الدعوة</EditableText>
          </p>
        </div>
      )}
    </EditableBackground>
  )
}
