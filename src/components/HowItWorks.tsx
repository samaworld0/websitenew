import { DEFAULT_SITE_SETTINGS } from '../siteSettings';

const STEP_STYLES = [
  { color: '#ff477e', icon: 'fa-pen' },
  { color: '#2bcbba', icon: 'fa-eye' },
  { color: '#4facfe', icon: 'fa-credit-card' },
  { color: '#9b59b6', icon: 'fa-paper-plane' },
];

interface HowItWorksProps {
  settings?: typeof DEFAULT_SITE_SETTINGS.howItWorks
}

const HowItWorks = ({ settings = DEFAULT_SITE_SETTINGS.howItWorks }: HowItWorksProps) => {
  return (
    <section className="py-28 px-5 bg-background text-center" dir="rtl" style={{ fontFamily: "Cairo, sans-serif" }}>
      {/* تم تصغير العرض هنا إلى max-w-4xl ليكون بنفس مستوى كروت الدعوات */}
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-warm-900" style={{ fontFamily: "'El Messiri', serif" }}>
            {settings.title}
          </h2>
          <p className="text-warm-700/80 text-base md:text-lg">{settings.subtitle}</p>
        </div>

        {/* تم تقليل المسافة بين البطاقات إلى gap-4 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {settings.steps.map((step, i) => {
            const style = STEP_STYLES[i] ?? STEP_STYLES[0]
            return (
              <div key={i} className="bg-white border border-border rounded-2xl p-6 relative transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                <span className="absolute top-4 right-5 text-xl font-bold text-gray-100">{i + 1}</span>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl text-white" style={{ backgroundColor: style.color }}>
                  <i className={`fas ${style.icon}`}></i>
                </div>
                <h3 className="text-warm-900 text-lg font-bold mb-3" style={{ fontFamily: "'El Messiri', serif" }}>{step.title}</h3>
                <p className="text-warm-700/80 text-xs leading-relaxed m-0">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
