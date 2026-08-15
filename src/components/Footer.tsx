import { DEFAULT_SITE_SETTINGS } from '../siteSettings';

interface FooterProps {
  ctaBanner?: typeof DEFAULT_SITE_SETTINGS.ctaBanner
  footer?: typeof DEFAULT_SITE_SETTINGS.footer
}

const Footer = ({
  ctaBanner = DEFAULT_SITE_SETTINGS.ctaBanner,
  footer = DEFAULT_SITE_SETTINGS.footer,
}: FooterProps) => {
  return (
    <>
      {/* ============ نافذة: خلوا فرحتكم تنفتح بأسماءكم ============ */}
      <section className="px-5 pt-16 pb-28 bg-background" dir="rtl" style={{ fontFamily: "Cairo, sans-serif" }}>
        <div
          className="max-w-5xl mx-auto rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between text-white shadow-2xl relative overflow-hidden"
          /* الألوان تُقرأ من متغيرات CSS اللي تتحدث من لوحة تحكم إعدادات الواجهة */
          style={{ background: 'linear-gradient(to left, var(--cta-grad-from, #e11d48), var(--cta-grad-to, #fb7185))' }}
        >
          {/* دوائر تجميلية خفيفة في الخلفية */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3"></div>

          <div className="text-right mb-8 md:mb-0 relative z-10">
            <p className="text-sm md:text-base mb-2 font-medium opacity-90">{ctaBanner.eyebrow}</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-snug" style={{ fontFamily: "'El Messiri', serif" }}>
              {ctaBanner.title}
            </h2>
            <p className="text-sm md:text-base opacity-90 max-w-xl leading-relaxed">
              {ctaBanner.description}
            </p>
          </div>

          <div className="relative z-10 w-full md:w-auto">
            <a
              href="#try"
              className="bg-white text-rose-600 px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-lg w-full md:w-auto"
            >
              <i className="fas fa-arrow-left text-sm"></i>
              {ctaBanner.buttonText}
            </a>
          </div>
        </div>
      </section>

      {/* ============ الفوتر (القسم السفلي) ============ */}
      <footer
        className="pt-16 pb-16 text-center text-white"
        dir="rtl"
        style={{ fontFamily: "Cairo, sans-serif", backgroundColor: 'var(--footer-bg, #241b2e)' }}
      >
        <div className="max-w-4xl mx-auto px-5 flex flex-col items-center">

          {/* الشعار */}
          <div className="bg-rose-500 text-white px-8 py-2.5 rounded-[20px] text-3xl font-bold mb-10 shadow-lg" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
            {footer.logoText}
          </div>

          {/* أيقونات التواصل الاجتماعي فقط (بدون نصوص) */}
          <div className="flex gap-5 mb-12">
            <a href={footer.instagramUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center text-2xl hover:bg-rose-500 hover:border-rose-500 transition-all" title="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href={footer.tiktokUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center text-2xl hover:bg-rose-500 hover:border-rose-500 transition-all" title="TikTok">
              <i className="fab fa-tiktok"></i>
            </a>
          </div>

          {/* طرق الدفع */}
          <div className="mb-4 text-sm text-gray-400 font-medium">{footer.paymentLabel}</div>
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {/* بطاقات الدفع */}
            <div className="bg-white text-[#1a1f71] px-4 py-2 rounded-md font-black text-sm flex items-center shadow-sm">
              VISA
            </div>
            <div className="bg-white text-gray-800 px-4 py-2 rounded-md font-bold text-sm flex items-center shadow-sm">
              mastercard
              <div className="mr-2 flex">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500 opacity-90"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-500 opacity-90 -mr-1.5"></div>
              </div>
            </div>
            <div className="bg-white text-gray-800 px-4 py-2 rounded-md font-bold text-sm flex items-center shadow-sm">
              زين كاش
            </div>
            <div className="bg-white text-gray-800 px-4 py-2 rounded-md font-bold text-sm flex items-center shadow-sm">
              <div className="ml-2 w-4 h-4 bg-yellow-400 rounded-sm"></div>
              كي كارد
            </div>
          </div>

        </div>
      </footer>
    </>
  );
};

export default Footer;
