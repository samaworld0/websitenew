import React from 'react'

interface HowItWorksProps {
  title?: string
  subtitle?: string
}

export default function HowItWorks({
  title = "كيف نشتغل؟",
  subtitle = "أربع خطوات وتوصلك دعوتك"
}: HowItWorksProps) {
  return (
    <section className="max-w-7xl mx-auto px-6 pb-24" dir="rtl">
      <div className="text-center mb-16">
        <h2
          className="text-3xl md:text-4xl font-bold mb-3"
          style={{ fontFamily: "'El Messiri', serif" }}
        >
          {title}
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          {subtitle}
        </p>
      </div>

      {/* تفاصيل الخطوات الأربع */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* الخطوة 1 */}
        <div className="border border-border rounded-3xl p-6 bg-white shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 text-xl font-bold">
            ✏️
          </div>
          <h3 className="font-bold text-base mb-2">جهّز بنفسك</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            اختار قالبك واكتب أسماءكم وموعدكم بثلاث خطوات.
          </p>
        </div>

        {/* الخطوة 2 */}
        <div className="border border-border rounded-3xl p-6 bg-white shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mb-4 text-xl font-bold">
            👁️
          </div>
          <h3 className="font-bold text-base mb-2">شاهدها بأسمائكم</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            تفتح دعوتك حتة بأنميشنها الكامل قبل أي دفع.
          </p>
        </div>

        {/* الخطوة 3 */}
        <div className="border border-border rounded-3xl p-6 bg-white shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 text-xl font-bold">
            💳
          </div>
          <h3 className="font-bold text-base mb-2">ادفع</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            وحال الدفع يفتح رابط دعوتك ورابط التحكم فوراً.
          </p>
        </div>

        {/* الخطوة 4 */}
        <div className="border border-border rounded-3xl p-6 bg-white shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 text-xl font-bold">
            🔗
          </div>
          <h3 className="font-bold text-base mb-2">شارك الرابط</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            رابط واحد لكل المعازيم، وكشف الحضور يتحدث برابطك لحظياً.
          </p>
        </div>
      </div>
    </section>
  )
}
