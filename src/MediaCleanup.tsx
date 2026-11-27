import { useState } from "react"
import { supabase } from "./backend"

type F = { name: string; size: number }
const BUCKET = "invitation-media"
const TRASH = "_trash/"

// تنظيف الملفات غير المستخدمة بمخزن Supabase — بخطوتين آمنتين:
// 1) نقل للسلة (_trash/): الملفات تختفي من الموقع بس تبقى محفوظة وتقدرين
//    ترجعينها بضغطة. 2) إفراغ السلة: حذف نهائي.
// قائمة "غير المستخدم" تُحسب على السيرفر (ملفات ما تذكرها أي دعوة أو إعدادات).
export default function MediaCleanup() {
  const [orphans, setOrphans] = useState<F[] | null>(null)
  const [trash, setTrash] = useState<F[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  const mb = (n: number) => (n / 1048576).toFixed(0)
  const total = (l: F[] | null) => l?.reduce((a, b) => a + Number(b.size || 0), 0) || 0

  const scan = async () => {
    setBusy(true)
    setMsg("")
    const [o, t] = await Promise.all([supabase.rpc("orphan_media"), supabase.rpc("trash_media")])
    setBusy(false)
    if (o.error) return setMsg("تعذّر الفحص: " + o.error.message)
    setOrphans(o.data || [])
    setTrash(t.data || [])
  }

  // ينفّذ عملية على قائمة ملفات بدفعات متوازية صغيرة
  const runAll = async (list: F[], fn: (f: F) => Promise<boolean>) => {
    let ok = 0
    let fail = 0
    for (let i = 0; i < list.length; i += 6) {
      const res = await Promise.all(list.slice(i, i + 6).map(fn))
      res.forEach((r) => (r ? ok++ : fail++))
      setMsg(`جارٍ التنفيذ... ${ok + fail} / ${list.length}`)
    }
    return { ok, fail }
  }

  const moveToTrash = async () => {
    if (!orphans?.length) return
    if (!window.confirm(`نقل ${orphans.length} ملف (${mb(total(orphans))} ميجا) للسلة؟ تقدرين ترجعينها بعدين.`)) return
    setBusy(true)
    const { ok, fail } = await runAll(orphans, async (f) => {
      const { error } = await supabase.storage.from(BUCKET).move(f.name, TRASH + f.name)
      return !error
    })
    setBusy(false)
    setMsg(`تم نقل ${ok} ملف للسلة${fail ? ` (فشل ${fail})` : ""} ✓ — افحصي موقعك، وإذا كل شي تمام أفرغي السلة.`)
    await scan2()
  }

  const restoreAll = async () => {
    if (!trash?.length) return
    if (!window.confirm(`استرجاع ${trash.length} ملف لأماكنها الأصلية؟`)) return
    setBusy(true)
    const { ok, fail } = await runAll(trash, async (f) => {
      const { error } = await supabase.storage.from(BUCKET).move(f.name, f.name.slice(TRASH.length))
      return !error
    })
    setBusy(false)
    setMsg(`تم استرجاع ${ok} ملف${fail ? ` (فشل ${fail})` : ""} ✓`)
    await scan2()
  }

  const emptyTrash = async () => {
    if (!trash?.length) return
    if (!window.confirm(`حذف ${trash.length} ملف (${mb(total(trash))} ميجا) من السلة نهائياً؟ لا يمكن التراجع.`)) return
    setBusy(true)
    let done = 0
    for (let i = 0; i < trash.length; i += 50) {
      const { data, error } = await supabase.storage.from(BUCKET).remove(trash.slice(i, i + 50).map((f) => f.name))
      if (error) {
        setMsg(`توقف الحذف بعد ${done} ملف: ${error.message}`)
        setBusy(false)
        return
      }
      done += data?.length || 0
    }
    setBusy(false)
    setMsg(`تم حذف ${done} ملف نهائياً ✓`)
    await scan2()
  }

  const scan2 = async () => {
    const [o, t] = await Promise.all([supabase.rpc("orphan_media"), supabase.rpc("trash_media")])
    setOrphans(o.data || [])
    setTrash(t.data || [])
  }

  const btn = "px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50"
  return (
    <div className="rounded-2xl border border-[#e5d9c3] bg-white p-5 sm:p-7">
      <h3 className="text-lg font-bold" style={{ fontFamily: "Amiri, serif" }}>
        تنظيف الملفات غير المستخدمة
      </h3>
      <p className="text-sm text-[#8a7561] mt-1">
        يفحص مخزن الصور والفيديوهات. الملفات اللي ما تستخدمها أي دعوة ولا إعدادات الموقع تنتقل أولاً لـ «السلة» (قابلة للاسترجاع)، وبعدها تقدرين تفرّغينها نهائياً.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={scan} className={`${btn} border border-[#D4AF37]`}>
          {busy ? "...جارٍ" : "🔍 فحص"}
        </button>
        {orphans && orphans.length > 0 && (
          <button disabled={busy} onClick={moveToTrash} className={`${btn} bg-[#B8862F] text-white`}>
            📦 نقل {orphans.length} ملف ({mb(total(orphans))} ميجا) للسلة
          </button>
        )}
        {orphans && orphans.length === 0 && <span className="text-sm">ما أكو ملفات زايدة ✓</span>}
      </div>
      {trash && trash.length > 0 && (
        <div className="mt-4 rounded-xl bg-[#fbf6ea] border border-[#e5d9c3] p-4">
          <p className="text-sm font-bold">🗂 السلة: {trash.length} ملف ({mb(total(trash))} ميجا)</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button disabled={busy} onClick={restoreAll} className={`${btn} border border-[#16a34a] text-[#16a34a]`}>
              ↩ استرجاع الكل
            </button>
            <button disabled={busy} onClick={emptyTrash} className={`${btn} bg-red-600 text-white`}>
              🗑 إفراغ السلة نهائياً
            </button>
          </div>
        </div>
      )}
      {msg && <p className="mt-3 text-sm font-bold">{msg}</p>}
    </div>
  )
}
