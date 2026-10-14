{/* قسم العداد التنازلي (باقي على فرحنا) — منفصل عن قسم الآية
                وبطاقة الدعوة، خلفية كريمية مستقلة قابلة للتلوين/الإخفاء
                لحالها من التصميم المباشر (معرّفها bg-countdown-section). */}
            <EditableBackground
              id="bg-countdown-section"
              className="pt-16 pb-8 px-6 flex flex-col items-center"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <Reveal className="text-center w-full max-w-lg mb-4">
                <h4 className="text-2xl md:text-3xl font-bold text-[#4A3B2C] mb-10 custom-font-amiri">
                  <EditableText id="countdown-title">باقي على فرحنا</EditableText>
                </h4>
                <div
                  className="flex justify-center items-center gap-4"
                  dir="ltr"
                >
                  <div className="flex flex-col items-center bg-white border border-[var(--gold)]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <EditableText
                      id="countdown-number-seconds"
                      className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri"
                    >
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </EditableText>
                    <span className="text-sm text-[#8C7A6B] mt-1">
                      <EditableText id="countdown-label-seconds">ثانية</EditableText>
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[var(--gold)]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <EditableText
                      id="countdown-number-minutes"
                      className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri"
                    >
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </EditableText>
                    <span className="text-sm text-[#8C7A6B] mt-1">
                      <EditableText id="countdown-label-minutes">دقيقة</EditableText>
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[var(--gold)]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <EditableText
                      id="countdown-number-hours"
                      className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri"
                    >
                      {String(timeLeft.hours).padStart(2, "0")}
                    </EditableText>
                    <span className="text-sm text-[#8C7A6B] mt-1">
                      <EditableText id="countdown-label-hours">ساعة</EditableText>
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white border border-[var(--gold)]/30 rounded-2xl px-5 py-4 shadow-sm min-w-[85px]">
                    <EditableText
                      id="countdown-number-days"
                      className="text-3xl font-bold text-[#4A3B2C] custom-font-amiri"
                    >
                      {timeLeft.days}
                    </EditableText>
                    <span className="text-sm text-[#8C7A6B] mt-1">
                      <EditableText id="countdown-label-days">يوم</EditableText>
                    </span>
                  </div>
                </div>
              </Reveal>
            </EditableBackground>
