import { useState, useEffect, useRef } from "react"
import { Invitation } from "./types"
import { invitations as seedInvitations, defaultSiteSettings } from "./data"
import { loadInvitations, loadSiteSettings, submitRSVP } from "./backend"
import AdminPanel from "./AdminPanel"

const categories = [
  { id: "all", label: "الكل" },
  { id: "wedding", label: "زفاف" },
  { id: "engagement", label: "خطوبة" },
  { id: "baby", label: "مولود" },
  { id: "graduation", label: "تخرج" },
  { id: "birthday", label: "عيد ميلاد" },
]

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

interface GoldenParticle {
  id: number
  type: "heart" | "star"
  left: number
  size: number
  duration: number
  delay: number
}

function WisalTemplateView({ inv }: { inv: Invitation }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [particles, setParticles] = useState<GoldenParticle[]>([])

  const [timeLeft, setTimeLeft] = useState({
    days: 108,
    hours: 14,
    minutes: 51,
    seconds: 12,
  })
  const [attendance, setAttendance] = useState("نعم")
  const [companions, setCompanions] = useState(0)
  const [guestName, setGuestName] = useState("")
  const [guestNote, setGuestNote] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [showFlash, setShowFlash] = useState(false)

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
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        return {
          ...prev,
          seconds: 59,
          minutes: prev.minutes > 0 ? prev.minutes - 1 : 59,
        }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const completeOpening = () => {
    setIsOpen((prev) => {
      if (!prev) {
        generateGoldenParticles()
        setShowFlash(true)
        setTimeout(() => setShowFlash(false), 900)
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

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault()

    // يترسل فعلياً لشيت جوجل بس لو الدعوة عندها sheetId (دعوة خاصة
    // اتنشأت من لوحة تحكم). بدونه تبقى معاينة محلية فقط زي قبل.
    if (inv.sheetId) {
      const result = await submitRSVP({
        sheetId: inv.sheetId,
        name: guestName,
        attendance,
        companions,
        message: guestNote,
      })
      if (!result.success) {
        console.error("فشل إرسال تأكيد الحضور للشيت")
      }
    }

    setSubmitted(true)
  }

  return (
    <div
      className="relative h-full w-full bg-[#FAF7F2] text-[#3D312A] font-sans overflow-hidden"
      dir="rtl"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700&display=swap');
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
        .custom-font-tajawal { font-family: 'Tajawal', sans-serif; }
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

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden z-10 royal-scroll">
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
              key={inv.doorBgVideo || "default-door-bg"}
              src={inv.doorBgVideo || "/videos/door-bg.mp4"}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-75"
            />
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
                <p className="text-base md:text-lg tracking-widest text-[#E8DCC4] mb-2 custom-font-amiri">
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
                    {inv.date}
                  </p>
                  <p className="text-base md:text-lg text-[#E8DCC4] custom-font-tajawal">
                    فتحنا باب فرحتنا... وطارت البشائر تدعوكم
                  </p>
                </div>
              </div>
              <div className="mb-4 flex flex-col items-center opacity-80">
                <p className="text-sm tracking-widest text-[#E8DCC4] mb-1 custom-font-tajawal">
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
              <div className="text-center max-w-xl mb-20">
                <p className="text-base tracking-widest text-[#8C7A6B] mb-5 custom-font-amiri">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                <p className="text-xl md:text-2xl leading-loose text-[#5A4A3C] custom-font-amiri">
                  {inv.verse}
                </p>
                <div className="mt-5 text-[#D4AF37] text-lg">✿</div>
              </div>

              <div className="w-28 h-[1px] bg-[#D4AF37]/30 mb-20" />

              <div className="text-center max-w-lg mb-20">
                <h3 className="text-3xl md:text-4xl font-bold text-[#4A3B2C] mb-7 custom-font-amiri">
                  بطاقة دعوة
                </h3>
                <p className="text-lg md:text-xl leading-relaxed text-[#5A4A3C] mb-12 custom-font-tajawal">
                  بقلوب مفعمة بالفرح والسرور، نفتح لكم باب فرحتنا وندعوكم
                  لمشاركتنا أجمل لحظات حياتنا في حفل زفافنا. حضوركم شرف لنا
                  وبهجة تكتمل بها فرحتنا.
                </p>
                <div className="grid grid-cols-2 gap-8 text-base md:text-lg text-[#6B5744] border-t border-b border-[#D4AF37]/20 py-7 custom-font-amiri">
                  <div>
                    <p className="text-sm text-[#8C7A6B] mb-1">والد العريس</p>
                    <p className="font-bold">{inv.groomFamily}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8C7A6B] mb-1">والد العروس</p>
                    <p className="font-bold">{inv.brideFamily}</p>
                  </div>
                </div>
              </div>

              {/* العداد التنازلي المكبر */}
              <div className="text-center w-full max-w-lg mb-16">
                <h4 className="text-2xl md:text-3xl font-bold text-[#4A3B2C] mb-10 custom-font-amiri">
                  باقي على فرحنا
                </h4>
                <div
                  className="flex justify-center items-center gap-4"
                  dir="ltr"
                >
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#8C7A6B] mt-1">ثانية</span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#8C7A6B] mt-1">دقيقة</span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#8C7A6B] mt-1">ساعة</span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[#D4AF37]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <span className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri">
                      {timeLeft.days}
                    </span>
                    <span className="text-sm text-[#8C7A6B] mt-1">يوم</span>
                  </div>
                </div>
              </div>
            </section>

            {/* برنامج الحفل والمكان — خلفية حمراء مع خط ذهبي فاصل */}
            <section className="py-20 px-6 flex flex-col items-center bg-[#4E1019] text-[#F5EBE0] border-t-2 border-[#D4AF37]">
              <div className="text-center max-w-lg w-full mb-24">
                <h3 className="text-3xl font-bold text-[#F1D989] mb-10 custom-font-amiri">
                  برنامج الحفل
                </h3>
                <div className="space-y-7 text-base md:text-lg text-[#F5EBE0]">
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

              <div className="text-center max-w-lg w-full mb-24">
                <h3 className="text-3xl font-bold text-[#F1D989] mb-7 custom-font-amiri">
                  مكان الحفل
                </h3>
                <h4 className="text-2xl font-bold text-[#F5EBE0] mb-3">
                  {inv.venue}
                </h4>
                <p className="text-base text-[#E8DCC4]/80 mb-7">{inv.city}</p>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-white bg-[#B8862F] hover:bg-[#9E7024] shadow-md"
                >
                  📍 الموقع على الخريطة
                </a>
              </div>
            </section>

            {/* قسم تأكيد الحضور — يرجع كريمي مع خط ذهبي فاصل */}
            <section className="py-20 px-6 flex flex-col items-center bg-[#FAF7F2] border-t-2 border-[#D4AF37]">
              <div className="max-w-md w-full bg-white border border-[#B8862F]/30 rounded-3xl p-10 shadow-lg">
                <div className="text-center mb-10">
                  <span className="text-lg">⚙️</span>
                  <h3 className="text-3xl font-bold text-[#4A3B2C] mt-2 custom-font-amiri">
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

                    <button
                      type="submit"
                      className="w-full py-4 bg-[#B8862F] hover:bg-[#9E7024] text-white font-bold rounded-2xl text-base transition shadow-md"
                    >
                      إرسال التأكيد
                    </button>
                  </form>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* طبقة الضغط لفتح الدعوة — بدون بطاقة أو زر ظاهر */}
      <div
        onClick={handleDoorTap}
        className={`absolute inset-0 z-50 flex items-center justify-center cursor-pointer transition-opacity duration-1000 bg-black/85 ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <video
          key={inv.introVideo || "default-intro-video"}
          ref={videoRef}
          src={inv.introVideo || "/videos/intro.mp4"}
          muted
          playsInline
          poster={inv.introPoster || "/videos/intro-poster.jpg"}
          onEnded={completeOpening}
          className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none"
        />
        <p className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-[#D4AF37] text-sm md:text-base tracking-widest custom-font-amiri animate-pulse">
          اضغط لفتح الدعوة
        </p>
      </div>
    </div>
  )
}

function InvitationFullView({
  inv,
  onClose,
}: {
  inv: Invitation
  onClose: () => void
}) {
  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-[#0D0706]">
      <div className="absolute top-6 left-6 z-[100]">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg bg-black/60 text-white backdrop-blur-md border border-white/20"
        >
          ← رجوع للرئيسية
        </button>
      </div>
      {inv.templateType === "wisal" ? (
        <WisalTemplateView inv={inv} />
      ) : (
        <div
          className="flex-1 w-full h-full overflow-y-auto p-12 text-center"
          style={{
            background: `linear-gradient(180deg, ${inv.gradient[0]}, ${inv.gradient[1]})`,
            color: inv.accentColor,
          }}
        >
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "Amiri, serif" }}
          >
            {inv.title}
          </h1>
          <p className="text-xl">{inv.subtitle}</p>
        </div>
      )}
    </div>
  )
}

function InvitationCard({
  inv,
  onPreview,
}: {
  inv: Invitation
  onPreview: (inv: Invitation) => void
}) {
  const [hovered, setHovered] = useState(false)
  const ac = inv.accentColor
  const bg = `linear-gradient(180deg, ${inv.gradient[0]} 0%, ${inv.gradient[1]} 100%)`

  return (
    <div
      className="group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative overflow-hidden rounded-lg cursor-pointer shadow-md transition-transform duration-300 group-hover:-translate-y-1"
        style={{ aspectRatio: "3/4" }}
        onClick={() => onPreview(inv)}
      >
        {inv.heroBg ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${inv.heroBg}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: bg }} />
        )}

        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-300"
          style={{
            background: "rgba(0,0,0,0.72)",
            opacity: hovered ? 1 : 0,
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold"
            style={{ background: ac, color: "#1a0a00" }}
          >
            👁 معاينة كاملة
          </div>
        </div>
      </div>

      <div className="mt-4 text-right" dir="rtl">
        <h4 className="text-base font-bold text-foreground">
          {inv.title.split("—")[0]?.trim()}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPreview(inv)
          }}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold border border-border"
        >
          👁 معاينة الدعوة
        </button>
      </div>
    </div>
  )
}

function WhatsAppContactButton({
  numberIraq,
  numberSaudi,
  message,
}: {
  numberIraq: string
  numberSaudi: string
  message: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-[#25D366] text-white"
      >
        <WhatsAppIcon size={16} />
        <span>تواصل</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 mt-2 z-50 w-48 rounded-xl border border-border bg-background shadow-lg overflow-hidden"
            dir="rtl"
          >
            <a
              href={`https://wa.me/${numberIraq}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-accent/10 transition"
            >
              <WhatsAppIcon size={16} />
              <span>واتساب — العراق</span>
            </a>
            <a
              href={`https://wa.me/${numberSaudi}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-bold border-t border-border hover:bg-accent/10 transition"
            >
              <WhatsAppIcon size={16} />
              <span>واتساب — السعودية</span>
            </a>
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState("all")
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

  // الدعوات الخاصة (isPrivate) ما تنعرض بشبكة الدعوات بالصفحة الرئيسية،
  // توصل بس لمن عنده رابط المعاينة المباشر (?preview=ID) أعلاه.
  const publiclyListedInvitations = allInvitations.filter(
    (inv) => !inv.isPrivate,
  )

  const filtered =
    activeCategory === "all"
      ? publiclyListedInvitations
      : publiclyListedInvitations.filter(
          (inv) => inv.category === activeCategory,
        )
  const generalMsg = encodeURIComponent(
    "السلام عليكم، أود الاستفسار عن الدعوات الإلكترونية",
  )

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
    <div
      className="min-h-screen bg-background"
      dir="rtl"
      style={{ fontFamily: "Tajawal, sans-serif" }}
    >
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-[#2C1810]">
              {siteSettings.logoIcon}
            </div>
            <div>
              <h1
                className="text-lg font-bold leading-none"
                style={{ fontFamily: "Amiri, serif" }}
              >
                {siteSettings.siteName}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {siteSettings.siteNameEn}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="?admin=1"
              title="لوحة التحكم"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border border-border text-[#2C1810] hover:bg-accent/10 transition"
            >
              <span aria-hidden>⚙️</span>
              <span className="hidden sm:inline">لوحة التحكم</span>
            </a>
            <WhatsAppContactButton
              numberIraq={siteSettings.whatsappNumberIraq}
              numberSaudi={siteSettings.whatsappNumberSaudi}
              message={generalMsg}
            />
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "Amiri, serif" }}
          >
            {siteSettings.heroTitle}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {filtered.map((inv) => (
            <InvitationCard key={inv.id} inv={inv} onPreview={handlePreview} />
          ))}
        </div>
      </section>
    </div>
  )
}
