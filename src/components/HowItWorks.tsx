import React from 'react';
import './HowItWorks.css';

const HowItWorks = () => {
  return (
    <section className="how-it-works-section" dir="rtl">
      <div className="container">
        <div className="section-header">
          <h2>كيف نشتغل؟</h2>
          <p>أربع خطوات وتوصلك دعوتك</p>
        </div>

        <div className="steps-grid">
          {/* الخطوة 1 */}
          <div className="step-card">
            <span className="step-number">1</span>
            <div className="icon-container icon-pink">
              <i className="fas fa-pen"></i>
            </div>
            <h3>جهّز بنفسك</h3>
            <p>اختر قالبك واكتب أسماءكم وموعدكم بثلاث خطوات.</p>
          </div>

          {/* الخطوة 2 */}
          <div className="step-card">
            <span className="step-number">2</span>
            <div className="icon-container icon-teal">
              <i className="fas fa-eye"></i>
            </div>
            <h3>شاهدها بأسماءكم</h3>
            <p>تفتح دعوتك حيّة بأنميشنها الكامل قبل أي دفع.</p>
          </div>

          {/* الخطوة 3 */}
          <div className="step-card">
            <span className="step-number">3</span>
            <div className="icon-container icon-blue">
              <i className="fas fa-credit-card"></i>
            </div>
            <h3>ادفع</h3>
            <p>وحال الدفع يفتح رابط دعوتك ورابط التحكم فوراً.</p>
          </div>

          {/* الخطوة 4 */}
          <div className="step-card">
            <span className="step-number">4</span>
            <div className="icon-container icon-purple">
              <i className="fas fa-paper-plane"></i>
            </div>
            <h3>شارك الرابط</h3>
            <p>رابط واحد لكل المعازيم، وكشف الحضور يتحدّث برابطك لحظياً.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
