import { useState } from "react"
import { supabase } from "./backend"

// تنظيف الملفات غير المستخدمة بمخزن Supabase. القائمة تُحسب على السيرفر
// (ملفات غير مذكورة بأي دعوة أو إعدادات)، والسيرفر نفسه
// يمنع حذف أي ملف خارج هذي القائمة.
export default function MediaCleanup() {
  const [list, setList] = useState<{ name: string; size: number }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  const scan = async () => {
    setBusy(true)
    setMsg("")
    const { data, error } = await supabase.rpc("orphan_media")
    setBusy(false)
    if (error) return setMsg("تعذّر الفحص: " + error.message)
    setList(data || [])
  }

  const mb = (n: number) => (n / 1048576).toFixed(0)
  const total = list?.reduce((a, b) => a + Number(b.size || 0), 0) || 0

  const clean = async () => {
    if (!list?.length) return
    if (!window.confirm(`حذف ${list.length} ملف (${mb(total)} ميجا) نهائياً؟ لا يمكن التراجع.`)) return
    setBusy(true)
    let done = 0
    for (let i = 0; i < list.length; i += 50) {
      const batch = list.slice(i, i + 50).map((f) => f.name)
      const { data, error } = await supabase.storage.from("invitation-media").remove(batch)
      if (error) {
        setMsg(`توقف الحذف بعد ${done} ملف: ${error.message}`)
        setBusy(false)
        return
      }
      done += data?.length || 0
    }
    setBusy(false)
    setList(null)
    setMsg(`تم حذف ${done} ملف غير مستخدم ✓`)
  }

  return (
    <div className="rounded-2xl border border-[#e5d9c3] bg-white p-5 sm:p-7">
      <h3 className="text-lg font-bold" style={{ fontFamily: "Amiri, serif" }}>
        تنظيف الملفات غير المستخدمة
      </h3>
      <p className="text-sm text-[#8a7561] mt-1">
        يفحص مخزن الصور والفيديوهات ويحذف الملفات اللي ما تستخدمها أي دعوة ولا إعدادات الموقع.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          disabled={busy}
          onClick={scan}
          className="px-4 py-2 rounded-full text-sm font-bold border border-[#D4AF37]"
        >
          {busy ? "...جارٍ" : "🔍 فحص"}
        </button>
        {list && list.length > 0 && (
          <button
            disabled={busy}
            onClick={clean}
            className="px-4 py-2 rounded-full text-sm font-bold bg-red-600 text-white"
          >
            🗑 حذف {list.length} ملف ({mb(total)} ميجا)
          </button>
        )}
        {list && list.length === 0 && <span className="text-sm">ما أكو ملفات زايدة ✓</span>}
      </div>
      {msg && <p className="mt-3 text-sm font-bold">{msg}</p>}
    </div>
  )
}
