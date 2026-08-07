import React from 'react';

const HowItWorks = () => {
  return (
    <section className="py-16 px-5 bg-background text-center" dir="rtl" style={{ fontFamily: "Cairo, sans-serif" }}>
      {/* العرض الموحد هنا */}
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-warm-900" style={{ fontFamily: "'El Messiri', serif" }}>
            كيف نشتغل؟
          </h2>
          <p className="text-warm-700/80 text-base md:text-lg">أربع خطوات وتوصلك دعوتك</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* الخطوة 1 */}
          <div className="bg-white border border-border rounded-2xl p-6 relative transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <span className="absolute top-4 right-5 text-xl font-bold text-gray-100">1</span>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl text-white" style={{ backgroundColor: '#ff477e' }}>
              <i className="fas fa-pen"></i>
            </div>
            <h3 className="text-warm-900 text-lg font-bold mb-3" style={{ fontFamily: "'El Messiri', serif" }}>جهّز بنفسك</h3>
            <p className="text-warm-700/80 text-xs leading-relaxed m-0">اختر قالبك واكتب أسماءكم وموعدكم بثلاث خطوات.</p>
          </div>

          {/* الخطوة 2 */}
          <div className="bg-white border border-border rounded-2xl p-6 relative transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <span className="absolute top-4 right-5 text-xl font-bold text-gray-100">2</span>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl text-white" style={{ backgroundColor: '#2bcbba' }}>
              <i className="fas fa-eye"></i>
            </div>
            <h3 className="text-warm-900 text-lg font-bold mb-3" style={{ fontFamily: "'El Messiri', serif" }}>شاهدها بأسماءكم</h3>
            <p className="text-warm-700/80 text-xs leading-relaxed m-0">تفتح دعوتك حيّة بأنميشنها الكامل قبل أي دفع.</p>
          </div>

          {/* الخطوة 3 */}
          <div className="bg-white border border-border rounded-2xl p-6 relative transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <span className="absolute top-4 right-5 text-xl font-bold text-gray-100">3</span>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl text-white" style={{ backgroundColor: '#4facfe' }}>
              <i className="fas fa-credit-card"></i>
            </div>
            <h3 className="text-warm-900 text-lg font-bold mb-3" style={{ fontFamily: "'El Messiri', serif" }}>ادفع</h3>
            <p className="text-warm-700/80 text-xs leading-relaxed m-0">وحال الدفع يفتح رابط دعوتك ورابط التحكم فوراً.</p>
          </div>

          {/* الخطوة 4 */}
          <div className="bg-white border border-border rounded-2xl p-6 relative transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <span className="absolute top-4 right-5 text-xl font-bold text-gray-100">4</span>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl text-white" style={{ backgroundColor: '#9b59b6' }}>
              <i className="fas fa-paper-plane"></i>
            </div>
            <h3 className="text-warm-900 text-lg font-bold mb-3" style={{ fontFamily: "'El Messiri', serif" }}>شارك الرابط</h3>
            <p className="text-warm-700/80 text-xs leading-relaxed m-0">رابط واحد لكل المعازيم، وكشف الحضور يتحدّث برابطك لحظياً.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
