// قسم "كيف نشتغل؟" — يوضح للزائر أربع خطوات توصله من اختيار القالب لحد
// وصول دعوته لمعازيمه

function StepIcon({ path, bg }: { path: string; bg: string }) {
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: bg }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
    </div>
  )
}

const steps = [
  {
    number: "1",
    title: "جهّز نفسك",
    desc: "اختر قالبك واكتب اسماءكم وموعدكم بثلاث خطوات.",
    bg: "linear-gradient(135deg, #ec4899, #db2777)",
    icon: "M11 4h4.5a2.5 2.5 0 0 1 0 5H10m0 0h6a2.5 2.5 0 0 1 0 5h-6m0-5v5m0-5V4M6 20l1.5-1.5M6 20V9l6-5",
  },
  {
    number: "2",
    title: "شاهدها بأسمائكم",
    desc: "نفتح دعوتك حيّة بأنميشنها الكامل قبل أي دفع.",
    bg: "linear-gradient(135deg, #34d399, #059669)",
    icon: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  },
  {
    number: "3",
    title: "ادفع",
    desc: "وحال الدفع يفتح رابط دعوتك وروابط التحكم فوراً.",
    bg: "linear-gradient(135deg, #60a5fa, #2563eb)",
    icon: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Z M2 10h20",
  },
  {
    number: "4",
    title: "شارك الرابط",
    desc: "رابط واحد لكل المعازيم، وكشف الحضور يتحدّث برابطك لحظياً.",
    bg: "linear-gradient(135deg, #a78bfa, #7c3aed)",
    icon: "M22 2 11 13 M22 2 15 22 11 13 2 9 22 2Z",
  },
]

export function HowItWorks() {
  return (
    <section className="max-w-7xl mx-auto px-6 pb-24">
      <div className="text-center mb-16">
        <h2
          className="text-3xl md:text-4xl font-bold mb-3"
          style={{ fontFamily: "'El Messiri', serif" }}
        >
          كيف نشتغل؟
        </h2>
        <p
          className="text-warm-700/70"
          style={{ fontFamily: "Cairo, sans-serif" }}
        >
          أربع خطوات وتوصلك دعوتك
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step) => (
          <div
            key={step.number}
            className="relative rounded-2xl border border-gold-100 bg-white p-6 card-hover"
          >
            <span
              className="absolute top-5 left-6 text-2xl font-bold text-gold-100"
              style={{ fontFamily: "'El Messiri', serif" }}
            >
              {step.number}
            </span>
            <StepIcon path={step.icon} bg={step.bg} />
            <h3
              className="mt-4 mb-2 text-base font-bold text-warm-900"
              style={{ fontFamily: "'El Messiri', serif" }}
            >
              {step.title}
            </h3>
            <p
              className="text-sm text-warm-700/70 leading-relaxed"
              style={{ fontFamily: "Cairo, sans-serif" }}
            >
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
