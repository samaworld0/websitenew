import React from 'react'

interface FooterProps {
  title?: string
  subtitle?: string
  badge?: string
  btnText?: string
  secureText?: string
  bgColor?: string
  btnColor?: string
  btnTextColor?: string
}

export default function Footer({
  title = "خلّوا فرحتكم تنفتح بأسمائكم.",
  subtitle = "اختاروا القالب، اكتبوا الأسماء، وشوفوا دعوتكم الحقيقية قبل ما تطلبوها — تجربة سريعة ومجانية.",
  badge = "أول خطوة علينا ✨",
  btnText = "جرّبوا دعوتكم الآن",
  secureText = "ادفع بأمان من أي مكان في العالم",
  bgColor = "#e11d48",
  btnColor = "#ffffff",
  btnTextColor = "#e11d48",
}: FooterProps) {
  return (
    <footer className="relative bg-[#1A0E10] pt-20 pb-12 overflow-hidden text-white" dir="rtl">
      {/* البانر الملون القابل للتعديل */}
      <div className="max-w-5xl mx-auto px-6 mb-16">
        <div
          className="relative rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden text-center transition-all"
          style={{ backgroundColor: bgColor }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white mb-6 backdrop-blur-sm">
            {badge}
          </div>

          <h2
            className="text-3xl md:text-5xl font-bold mb-4 leading-tight"
            style={{ fontFamily: "'El Messiri', serif" }}
          >
            {title}
          </h2>

          <p className="text-white/90 text-sm md:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            {subtitle}
          </p>

          <a
            href="#try"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base shadow-lg transition-all hover:opacity-95"
            style={{ backgroundColor: btnColor, color: btnTextColor }}
          >
            <span>{btnText}</span>
            <span>←</span>
          </a>
        </div>
      </div>

      {/* أسفل الفوتر (شعار ومواقع التواصل) */}
      <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
        <div className="inline-block px-5 py-2 rounded-full bg-white/10 text-white font-bold text-lg" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
          سما
        </div>

        <div className="flex items-center justify-center gap-4 text-gray-400 text-sm">
          <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
            🌐
          </a>
          <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
            📷
          </a>
        </div>

        <p className="text-xs text-gray-400">{secureText}</p>

        <div className="flex items-center justify-center gap-3 flex-wrap pt-2 opacity-80">
          <span className="px-3 py-1 bg-white/10 rounded text-[10px]">VISA</span>
          <span className="px-3 py-1 bg-white/10 rounded text-[10px]">Mastercard</span>
          <span className="px-3 py-1 bg-white/10 rounded text-[10px]">زين كاش</span>
          <span className="px-3 py-1 bg-white/10 rounded text-[10px]">كي كارد</span>
        </div>

        <p className="text-[11px] text-gray-500 pt-6 border-t border-white/5">
          جميع الحقوق محفوظة © 2026 سما للدعوات الإلكترونية
        </p>
      </div>
    </footer>
  )
}
