import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full flex flex-col mt-10" dir="rtl" style={{ fontFamily: "Cairo, sans-serif" }}>
      
      <div className="bg-background px-5 pb-12">
        <div
          {/* العرض الموحد هنا */}
          className="max-w-5xl mx-auto rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between text-white shadow-xl relative overflow-hidden"
          style={{ background: 'linear-gradient(to left, #e11d48, #fb7185)' }} 
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full blur-xl translate-y-1/3 -translate-x-1/3"></div>

          <div className="text-right mb-8 md:mb-0 relative z-10 w-full md:w-auto">
            <p className="text-sm mb-2 opacity-90">✨ أول خطوة علينا</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3" style={{ fontFamily: "'El Messiri', serif" }}>
              خلّوا فرحتكم تنفتح بأسمائكم.
            </h2>
            <p className="text-sm opacity-90 max-w-lg leading-relaxed">
              اختاروا القالب، اكتبوا الأسماء، وشوفوا دعوتكم الحقيقية قبل ما تطلبوها — تجربة سريعة ومجانية.
            </p>
          </div>

          <div className="relative z-10 w-full md:w-auto flex-shrink-0">
            <a
              href="#try"
              className="bg-white text-rose-600 px-8 py-3.5 rounded-full font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform w-full md:w-auto shadow-lg"
            >
              <i className="fas fa-arrow-left text-sm"></i>
              جرّبوا دعوتكم الآن
            </a>
          </div>
        </div>
      </div>

      <div className="bg-[#2a2438] pt-12 pb-10 text-center flex flex-col items-center justify-center">
        <div className="bg-rose-500 text-white px-8 py-2.5 rounded-2xl text-3xl font-bold mb-8 relative shadow-lg" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
          سما
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-rose-500"></div>
        </div>

        <div className="flex gap-4 mb-8">
          <a href="https://instagram.com/samaworld_sa" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-gray-500 flex items-center justify-center text-xl text-white hover:bg-rose-500 hover:border-rose-500 transition-all shadow-sm">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://tiktok.com/@isama.est" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-gray-500 flex items-center justify-center text-xl text-white hover:bg-rose-500 hover:border-rose-500 transition-all shadow-sm">
            <i className="fab fa-tiktok"></i>
          </a>
        </div>

        <div className="text-gray-400 text-xs mb-3 font-medium">ادفع بأمان من أي مكان في العالم</div>
        <div className="flex flex-wrap justify-center gap-2.5 mb-6">
          <div className="bg-white text-[#1a1f71] px-3 py-1.5 rounded font-black text-xs flex items-center">VISA</div>
          <div className="bg-white text-gray-800 px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5">
            mastercard
            <div className="flex">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-90"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-90 -mr-1"></div>
            </div>
          </div>
          <div className="bg-white text-gray-800 px-3 py-1.5 rounded font-bold text-xs flex items-center">زين كاش</div>
          <div className="bg-white text-gray-800 px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-yellow-400 rounded-sm"></div>
            كي كارد
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
