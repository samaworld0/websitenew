import { Invitation } from "./types"

export function TemplatePicker({
  templates,
  onSelect,
  onCancel,
}: {
  templates: Invitation[]
  onSelect: (inv: Invitation) => void
  onCancel: () => void
}) {
  return (
    <div className="bg-[#FFF8E8] border border-[#D4AF37]/40 rounded-3xl p-6 mt-4">
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold">١) اختر تصميم الدعوة</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            الدعوة الخاصة راح تطلع بنفس تصميم وخلفيات وصور الدعوة اللي تختارها
            هنا — بس تفاصيلها (الأسماء، التاريخ، القاعة...) هي اللي تتغيّر
            بالخطوة الجاية. ما تحتاج ترفع أي صور أو فيديوهات جديدة.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-full text-xs font-bold border border-border shrink-0"
        >
          إلغاء
        </button>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          ما فيه دعوات حالياً تقدر تستخدمها كتصميم أساسي
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className="text-right rounded-2xl overflow-hidden border border-border hover:border-[#B8862F] transition bg-white"
            >
              <div
                className="relative"
                style={{
                  aspectRatio: "3/4",
                  background: `linear-gradient(180deg, ${t.gradient[0]}, ${t.gradient[1]})`,
                }}
              >
                {t.coverImage && (
                  <img
                    src={t.coverImage}
                    alt={t.subtitle}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display =
                        "none"
                    }}
                  />
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="text-xs font-bold truncate">{t.subtitle}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {t.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
