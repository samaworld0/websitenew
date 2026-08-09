import { useState, useEffect, useRef } from "react"
import { Invitation } from "./types"
import { getTimeLeft } from "./utils"
import { SHEETS_SCRIPT_URL } from "./backend"

interface GoldenParticle {
  id: number
  type: "heart" | "star"
  left: number
  size: number
  duration: number
  delay: number
}

// يفعّل ظهور تدريجي (fade + slide) لأي عنصر يحمل كلاس reveal-on-scroll
// لما يوصله السكرول — أنيميشن خفيف ولطيف بدون أي مكتبات خارجية.
function useRevealOnScroll(active: boolean) {
  useEffect(() => {
    if (!active) return
    const els = document.querySelectorAll(".reveal-on-scroll")
    if (!els.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
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

export function WisalTemplateView({ inv }: { inv: Invitation }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [particles, setParticles] = useState<GoldenParticle[]>([])

  // العداد التنازلي محسوب فعلياً من inv.countdownDate (يتحدث الأدمن عليه من
  // لوحة التحكم) بدل أرقام ثابتة — ويعاد حسابه كل ثانية.
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(inv.countdownDate))
  const [attendance, setAttendance] = useState("نعم")
  const [companions, setCompanions] = useState(0)
  const [guestName, setGuestName] = useState("")
  const [guestNote, setGuestNote] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  // تبقى طبقة الفتح موجودة بالـ DOM فقط أثناء التلاشي (نفس مدة الترانزيشن)،
  // وبعدها تنشال نهائياً حتى ما تبقى فوق المحتوى وتمنع السكرول لأي سبب
  const [overlayMounted, setOverlayMounted] = useState(true)

  // لو الأدمن حط رابط خرائط جوجل دقيق (inv.mapUrl) نستخدمه كما هو، وإلا
  // يتولّد رابط بحث تلقائي من اسم القاعة والمدينة كاحتياط
  // (يتحدث تلقائياً حتى بوضع "جرّب دعوتك" لما يغيّر الزائر القاعة أو المدينة)
  const mapQuery = encodeURIComponent(inv.venue)
  const mapUrl =
    inv.mapUrl && inv.mapUrl.trim()
      ? inv.mapUrl.trim()
      : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`

  // بيانات قسم "احفظ الموعد": نحسبها من inv.countdownDate (نفس التاريخ
  // المستخدم بالعداد التنازلي) حتى تكون متطابقة دائماً بدون إدخال يدوي إضافي
  const eventDate = new Date(inv.countdownDate)
  const hasValidDate = !isNaN(eventDate.getTime())
  const saveDateDayName = hasValidDate
    ? eventDate.toLocaleDateString("ar", { weekday: "long" })
    : ""
  const saveDateMonthName = hasValidDate
    ? eventDate.toLocaleDateString("ar", { month: "long" })
    : ""
  const saveDateDayNum = hasValidDate ? eventDate.getDate() : ""
  const saveDateYear = hasValidDate ? eventDate.getFullYear() : ""

  const pad2 = (n: number) => String(n).padStart(2, "0")
  const formatIcsDate = (d: Date) =>
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(
      d.getHours(),
    )}${pad2(d.getMinutes())}00`

  const eventEndDate = hasValidDate
    ? new Date(eventDate.getTime() + 3 * 60 * 60 * 1000)
    : null

  const calendarTitle = `حفل زفاف ${inv.groom} و${inv.bride}`

  const googleCalendarUrl = hasValidDate
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        calendarTitle,
      )}&dates=${formatIcsDate(eventDate)}/${formatIcsDate(
        eventEndDate as Date,
      )}&location=${encodeURIComponent(inv.venue)}&details=${encodeURIComponent(
        "يسعدنا حضوركم",
      )}`
    : "#"

  const handleDownloadIcs = () => {
    if (!hasValidDate || !eventEndDate) return
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${formatIcsDate(eventDate)}`,
      `DTEND:${formatIcsDate(eventEndDate)}`,
      `SUMMARY:${calendarTitle}`,
      `LOCATION:${inv.venue}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "save-the-date.ics"
    a.click()
    URL.revokeObjectURL(url)
  }

  useRevealOnScroll(isOpen)

  const generateGoldenParticles = () => {
    const items: GoldenParticle[] = []
    for (let i = 0; i < 25; i++) {
      items.push({
        id: i,
        type: i % 2 === 0 ? "heart" : "star",
        left: Math.random() * 92 + 4,
        size: Math.random() * 8 + 8,
        duration: Math.random() * 8 + 10,
        delay: Math.random() * 5,
      })
    }
    setParticles(items)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(inv.countdownDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [inv.countdownDate])

  const completeOpening = () => {
    setIsOpen((prev) => {
      if (!prev) {
        generateGoldenParticles()
        setShowFlash(true)
        setTimeout(() => setShowFlash(false), 900)
        // نشيل طبقة الفتح نهائياً من الـ DOM بعد ما يخلص تلاشيها (1 ثانية)
        // حتى تضمن إنها ما تقعد فوق المحتوى وتمنع السكرول لأي سبب
        setTimeout(() => setOverlayMounted(false), 1000)
      }
      return true
    })
    setIsPlaying(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const handleDoorTap = () => {
    if (isOpen) return
    if (isPlaying) {
      videoRef.current?.pause()
      completeOpening()
      return
    }
    setIsPlaying(true)
    audioRef.current?.play().catch(() => {})
    if (videoRef.current) {
      videoRef.current.play().catch(() => completeOpening())
      timeoutRef.current = setTimeout(() => {
        if (videoRef.current) videoRef.current.pause()
        completeOpening()
      }, 5000)
    } else {
      completeOpening()
    }
  }

  // إرسال تأكيد الحضور: يترسل فعلياً للشيت بس لو الدعوة عندها sheetId
  // (يعني دعوة خاصة اتنشأت من لوحة التحكم). الدعوات العامة أو "جرّب دعوتك"
  // ما عندها sheetId، فبتبقى معاينة محلية فقط بدون أي إرسال.
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
    <div
      className="relative h-full w-full bg-[#FAF7F2] text-[#3D312A] font-sans overflow-hidden"
      dir="rtl"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Amiri:wght@400;700&family=El+Messiri:wght@400;500;600;700&family=Reem+Kufi:wght@400;500;600;700&family=Cairo:wght@300;400;500;600;700;800&display=swap');
        @keyframes goldenParticle {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.6; }
          85% { opacity: 0.6; }
          100% { transform: translate3d(15px, -110vh, 0) rotate(360deg); opacity: 0; }
        }
        @keyframes goldLine{
0%{transform:translateX(-120%)}
100%{transform:translateX(350%)}
}
@keyframes fadeInUp{
0%{opacity:0;transform:translateY(60px)}
100%{opacity:1;transform:translateY(0)}
}
        @keyframes bounceDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @keyframes goldFlash {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
        .royal-scroll::-webkit-scrollbar { display: none; }
        .custom-font-ruqaa { font-family: 'Aref Ruqaa', serif; }
        .custom-font-amiri { font-family: 'Amiri', serif; }
        .custom-font-heading { font-family: 'El Messiri', serif; }
        .custom-font-eyebrow { font-family: 'Reem Kufi', sans-serif; }
        .custom-font-tajawal { font-family: 'Cairo', sans-serif; }

        /* أنيميشن ظهور لطيف عند السكرول */
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-delay-1 { transition-delay: 0.12s; }
        .reveal-delay-2 { transition-delay: 0.24s; }
        .reveal-delay-3 { transition-delay: 0.36s; }
      `}</style>

      <audio
        ref={audioRef}
        src={inv.musicUrl || "/music/background.mp3"}
        loop
      />

      {/* لمعة ذهبية لحظة فتح الدعوة */}
      {showFlash && (
        <div
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,241,196,0.95) 0%, rgba(212,175,55,0.55) 35%, transparent 70%)",
            animation: "goldFlash 900ms ease-out forwards",
          }}
        />
      )}

      <div
        className="absolute inset-0 overflow-y-auto overflow-x-hidden z-10 royal-scroll"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        <div
          className={`relative transition-all duration-1000 w-full ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* القسم الأول مع الخلفية والزهور */}
          <section
            className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden text-[#FDFBF7] animate-[fadeInUp_1s] bg-cover bg-center"
            style={{
              backgroundImage: `url("${inv.heroBg || "/images/hero-bg.jpg"}")`,
            }}
          >
            <div className="absolute top-0 left-0 w-full h-[3px] overflow-hidden z-50">
              <div className="h-full w-[35%] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-[goldLine_3s_linear_infinite]" />
            </div>
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute w-[500px] h-[500px] rounded-full bg-[#D4AF37] blur-[180px] top-[-150px] right-[-120px]" />
              <div className="absolute w-[400px] h-[400px] rounded-full bg-[#D4AF37] blur-[180px] bottom-[-180px] left-[-120px]" />
            </div>
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-75"
            >
              <source
                src={inv.doorBgVideo || "/videos/door-bg.mp4"}
                type="video/mp4"
              />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60 pointer-events-none z-0" />

            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="absolute bottom-0 text-[#F1D989] opacity-70"
                  style={{
                    left: `${p.left}%`,
                    fontSize: `${p.size}px`,
                    animation: `goldenParticle ${p.duration}s linear infinite`,
                    animationDelay: `-${p.delay}s`,
                  }}
                >
                  ✿
                </div>
              ))}
            </div>

            <div className="relative z-20 w-full max-w-3xl mx-auto px-5 py-6 flex flex-col justify-between h-full min-h-screen">
              <div />
              <div className="my-auto flex flex-col items-center text-center">
                <p className="text-base md:text-lg tracking-widest text-[#E8DCC4] mb-2 custom-font-eyebrow">
                  دعوة زفاف
                </p>
                <span className="text-[#D4AF37] text-xl mb-4">✿</span>
                <h1 className="text-7xl md:text-9xl text-white mb-1 leading-none custom-font-ruqaa drop-shadow-2xl">
                  {inv.groom}
                </h1>
                <span className="text-3xl text-[#D4AF37] my-3 custom-font-ruqaa">
                  و
                </span>
                <h1 className="text-7xl md:text-9xl text-white mt-1 leading-none custom-font-ruqaa drop-shadow-2xl">
                  {inv.bride}
                </h1>
                <div className="mt-8 space-y-2">
                  <p className="text-xl md:text-2xl text-[#FDFBF7] custom-font-amiri">
                    {inv.dateGreg}
                  </p>
                  <p className="text-base md:text-lg text-[#E8DCC4] custom-font-tajawal">
                    فتحنا باب فرحتنا... وطارت البشائر تدعوكم
                  </p>
                </div>
              </div>
              <div className="mb-4 flex flex-col items-center opacity-80">
                <p className="text-sm tracking-widest text-[#E8DCC4] mb-1 custom-font-eyebrow">
                  مرر للأسفل
                </p>
                <span
                  className="text-xl text-[#D4AF37]"
                  style={{ animation: "bounceDown 2s ease-in-out infinite" }}
                >
                  ↓
                </span>
              </div>
            </div>
          </section>

          {/* الأقسام السفلية (مكبرة بنسبة 20%) */}
          <div className="w-full bg-[#FAF7F2] text-[#3D312A] relative z-20">
            <section className="py-24 px-6 flex flex-col items-center">
              {/* بطاقة احفظ الموعد */}
              <div className="text-center w-full max-w-sm mb-20 reveal-on-scroll">
                <h3 className="text-2xl md:text-3xl font-bold text-[#4A3B2C] mb-8 custom-font-heading flex items-center justify-center gap-2">
                  <span className="text-[#D4AF37]">✿</span>
                  احفظ الموعد
                </h3>
                <div className="rounded-3xl overflow-hidden border border-[#D4AF37]/30 shadow-lg bg-white">
                  <div className="bg-[#4E1019] text-[#F1D989] py-3 px-4 font-bold text-lg custom-font-heading">
                    {saveDateMonthName} {saveDateYear}
                  </div>
                  <div className="px-6 py-8">
                    <p className="text-[#8C7A6B] text-sm mb-2 custom-font-tajawal">
                      {saveDateDayName}
                    </p>
                    <p className="text-6xl font-bold text-[#4A3B2C] mb-2 custom-font-heading">
                      {saveDateDayNum}
                    </p>
                    <p className="text-[#5A4A3C] font-medium custom-font-tajawal">
                      {inv.time}
                    </p>
                  </div>
                  <div className="border-t border-[#D4AF37]/20 px-6 py-5 flex items-center justify-center gap-3">
                    <a
                      href={googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-full text-sm font-bold border border-[#D4AF37]/40 text-[#4A3B2C] hover:bg-[#FAF7F2] custom-font-tajawal"
                    >
                      تقويم جوجل
                    </a>
                    <button
                      type="button"
                      onClick={handleDownloadIcs}
                      className="px-5 py-2.5 rounded-full text-sm font-bold border border-[#D4AF37]/40 text-[#4A3B2C] hover:bg-[#FAF7F2] custom-font-tajawal"
                    >
                      تقويم آيفون
                    </button>
                  </div>
                </div>
              </div>

              {/* العداد التنازلي المكبر */}
              <div className="text-center w-full max-w-lg mb-16 reveal-on-scroll">
                <h4 className="text-2xl md:text-3xl font-bold text-[#4A3B2C] mb-10 custom-font-heading">
                  باقي على فرحنا
                </h4>
                <div
                  className="flex justify-center items-center gap-4"
                  dir="ltr"
                >
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A3B2C] custom-font-heading">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#8C7A6B] mt-1">ثانية</span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A3B2C] custom-font-heading">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#8C7A6B] mt-1">دقيقة</span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A3B2C] custom-font-heading">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#8C7A6B] mt-1">ساعة</span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A3B2C] custom-font-heading">
                      {timeLeft.days}
                    </span>
                    <span className="text-sm text-[#8C7A6B] mt-1">يوم</span>
                  </div>
                </div>
              </div>
            </section>

            {/* برنامج الحفل والمكان — خلفية حمراء مع خط ذهبي فاصل */}
            <section className="py-20 px-6 flex flex-col items-center bg-[#4E1019] text-[#F5EBE0] border-t-2 border-[#D4AF37]">
              <div className="text-center max-w-lg w-full mb-24 reveal-on-scroll">
                <h3 className="text-3xl font-bold text-[#F1D989] mb-10 custom-font-heading">
                  برنامج الحفل
                </h3>
                <div className="space-y-7 text-base md:text-lg text-[#F5EBE0] custom-font-tajawal">
                  <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-5">
                    <span className="font-bold text-[#F1D989]">٧:٠٠ مساءً</span>
                    <div className="flex-1 border-b border-dashed border-[#D4AF37]/30 mx-4" />
                    <span>استقبال الضيوف</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-5">
                    <span className="font-bold text-[#F1D989]">٧:٣٠ مساءً</span>
                    <div className="flex-1 border-b border-dashed border-[#D4AF37]/30 mx-4" />
                    <span>عقد القران</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-5">
                    <span className="font-bold text-[#F1D989]">٩:٠٠ مساءً</span>
                    <div className="flex-1 border-b border-dashed border-[#D4AF37]/30 mx-4" />
                    <span>العشاء</span>
                  </div>
                </div>
              </div>

              <div className="text-center max-w-lg w-full mb-24 reveal-on-scroll">
                <h3 className="text-3xl font-bold text-[#F1D989] mb-7 custom-font-heading">
                  مكان الحفل
                </h3>
                <h4 className="text-2xl font-bold text-[#F5EBE0] mb-7 custom-font-heading">
                  {inv.venue}
                </h4>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-white bg-[#B8862F] hover:bg-[#9E7024] shadow-md custom-font-tajawal"
                >
                  📍 الموقع على الخريطة
                </a>
              </div>
            </section>

            {/* قسم تأكيد الحضور — يرجع كريمي مع خط ذهبي فاصل */}
            <section className="py-20 px-6 flex flex-col items-center bg-[#FAF7F2] border-t-2 border-[#D4AF37]">
              <div className="max-w-md w-full bg-white border border-[#B8862F]/30 rounded-3xl p-10 shadow-lg custom-font-tajawal reveal-on-scroll">
                <div className="text-center mb-10">
                  <span className="text-lg">⚙️</span>
                  <h3 className="text-3xl font-bold text-[#4A3B2C] mt-2 custom-font-heading">
                    تأكيد الحضور
                  </h3>
                  <p className="text-sm text-[#8C7A6B] mt-1">
                    يسعدنا تأكيد حضوركم
                  </p>
                </div>

                {submitted ? (
                  <div className="text-center py-10 text-emerald-600 font-bold text-lg">
                    تم إرسال تأكيد حضورك بنجاح، شكراً لك! 🌸
                  </div>
                ) : (
                  <form onSubmit={handleRSVP} className="space-y-7">
                    <div>
                      <label className="block text-sm text-[#8C7A6B] mb-2 font-medium">
                        الاسم الكريم
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="اسمك الكريم"
                        className="w-full bg-[#FAF7F2] border border-[#D4AF37]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[#8C7A6B] mb-2 font-medium">
                        هل ستحضر؟
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
                                : "bg-[#FAF7F2] border border-[#D4AF37]/30 text-[#3D312A]"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#8C7A6B] mb-2 font-medium">
                        عدد المرافقين (عدا حضورك - 0 إن كنت وحدك)
                      </label>
                      <div className="flex items-center justify-center gap-6 bg-[#FAF7F2] border border-[#D4AF37]/30 rounded-2xl py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setCompanions(Math.max(0, companions - 1))
                          }
                          className="w-10 h-10 rounded-full bg-white border border-[#D4AF37]/30 flex items-center justify-center text-xl font-bold shadow-sm"
                        >
                          -
                        </button>
                        <span className="text-xl font-bold text-[#4A3B2C]">
                          {companions}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCompanions(companions + 1)}
                          className="w-10 h-10 rounded-full bg-white border border-[#D4AF37]/30 flex items-center justify-center text-xl font-bold shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#8C7A6B] mb-2 font-medium">
                        كلمة للعروسين 💌
                      </label>
                      <textarea
                        rows={3}
                        value={guestNote}
                        onChange={(e) => setGuestNote(e.target.value)}
                        placeholder="اكتب تهنئتك للعروسين..."
                        className="w-full bg-[#FAF7F2] border border-[#D4AF37]/30 rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[#B8862F] resize-none"
                      />
                    </div>

                    {submitError && (
                      <p className="text-sm text-red-500 text-center -mt-3">
                        تعذّر إرسال التأكيد، حاول مرة أخرى
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 bg-[#B8862F] hover:bg-[#9E7024] text-white font-bold rounded-2xl text-base transition shadow-md disabled:opacity-60"
                    >
                      {submitting ? "جارٍ الإرسال..." : "إرسال التأكيد"}
                    </button>
                  </form>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* طبقة الضغط لفتح الدعوة — بدون بطاقة أو زر ظاهر — تنشال كلياً من الـ DOM بعد الفتح */}
      {overlayMounted && (
        <div
          onClick={handleDoorTap}
          className={`absolute inset-0 z-50 flex items-center justify-center cursor-pointer transition-opacity duration-1000 bg-black/85 ${
            isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            poster={inv.introPoster || "/videos/intro-poster.jpg"}
            onEnded={completeOpening}
            className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none"
          >
            <source
              src={inv.introVideo || "/videos/intro.mp4"}
              type="video/mp4"
            />
          </video>
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-[#D4AF37] text-sm md:text-base tracking-widest custom-font-eyebrow animate-pulse">
            اضغط لفتح الدعوة
          </p>
        </div>
      )}
    </div>
  )
}
