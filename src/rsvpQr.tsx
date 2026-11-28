import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { supabase, getCurrentSession } from "./backend"
import type { Invitation } from "./types"

// نظام باركود تأكيد الحضور (اختياري لكل دعوة): textStyles["qr-checkin"].hidden === true
export const isQrEnabled = (inv: Invitation) =>
  !!inv.textStyles?.["qr-checkin"]?.hidden

export const siteBase = () =>
  /\.vercel\.app$/.test(window.location.hostname)
    ? "https://www.samainvite.com"
    : window.location.origin

export async function registerRsvpQr(
  inv: Invitation,
  name: string,
  attendance: string,
  companions: number,
  message: string,
): Promise<{ id?: string; full?: boolean }> {
  try {
    const { data, error } = await supabase.rpc("submit_rsvp", {
      p_invitation_id: inv.id,
      p_name: name.trim().slice(0, 80),
      p_attendance: attendance,
      p_companions: Math.max(0, Math.min(20, Number(companions) || 0)),
      p_message: (message || "").slice(0, 500),
    })
    if (error) {
      console.error("submit_rsvp", error.message)
      return { full: /limit_reached/.test(error.message) }
    }
    return { id: data as string }
  } catch (e) {
    console.error(e)
    return {}
  }
}

const GOLD = "#D4AF37"

export function RsvpQrCard({
  inv,
  qrId,
  name,
}: {
  inv: Invitation
  qrId: string
  name: string
}) {
  const [img, setImg] = useState("")
  const url = `${siteBase()}/?scan=${qrId}`
  const title = [inv.groom, inv.bride].filter(Boolean).join(" & ") || inv.title || ""
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      const qr = await QRCode.toDataURL(url, { margin: 1, width: 560, errorCorrectionLevel: "M" })
      const image = new Image()
      image.src = qr
      await image.decode()
      const c = document.createElement("canvas")
      c.width = 720
      c.height = 980
      const g = c.getContext("2d")!
      g.fillStyle = "#fffdf8"
      g.fillRect(0, 0, 720, 980)
      g.strokeStyle = GOLD
      g.lineWidth = 6
      g.strokeRect(20, 20, 680, 940)
      g.textAlign = "center"
      g.fillStyle = "#2C1810"
      g.font = "bold 40px Tahoma, sans-serif"
      g.fillText(title, 360, 100, 620)
      g.font = "28px Tahoma, sans-serif"
      g.fillStyle = "#8a7561"
      g.fillText("بطاقة دخول", 360, 150)
      g.drawImage(image, 80, 190, 560, 560)
      g.fillStyle = "#2C1810"
      g.font = "bold 44px Tahoma, sans-serif"
      g.fillText(name, 360, 840, 620)
      g.font = "24px Tahoma, sans-serif"
      g.fillStyle = "#8a7561"
      g.fillText("يرجى إبراز الباركود عند الاستقبال", 360, 910)
      if (!dead) setImg(c.toDataURL("image/png"))
    })().catch(() => {})
    return () => {
      dead = true
    }
  }, [url, name, title])

  return (
    <div className="mt-4 flex flex-col items-center gap-3" dir="rtl">
      <p className="text-sm font-bold" style={{ color: GOLD }}>
        بطاقة دخولك — احتفظ بها وأبرزها عند الاستقبال
      </p>
      {img && (
        <img src={img} alt="باركود الدخول" className="w-56 rounded-xl shadow" />
      )}
      {img && (
        <a
          href={img}
          download={`دعوة-${name}.png`}
          className="px-5 py-2 rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: GOLD }}
        >
          حفظ الصورة
        </a>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

/* ---------- صفحة عرض الضيف (?scan=) ---------- */
type Guest = {
  name: string
  companions: number
  attendance: string
  title?: string
  groom?: string
  bride?: string
  disabled?: boolean
}

const shell = (children: React.ReactNode, color = "#fefcf8") => (
  <div
    className="min-h-screen flex items-center justify-center p-5"
    style={{ backgroundColor: color }}
    dir="rtl"
  >
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 text-center">
      {children}
    </div>
  </div>
)

export function ScanPage({ id }: { id: string }) {
  const [guest, setGuest] = useState<Guest | null | undefined>(undefined)
  const [admin, setAdmin] = useState(false)
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.rpc("get_rsvp", { p_id: id }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data
      setGuest(row || null)
    })
    getCurrentSession().then((s) => setAdmin(!!s)).catch(() => {})
  }, [id])

  const act = async (undo: boolean) => {
    setBusy(true)
    const { data, error } = await supabase.rpc("admin_checkin", { p_id: id, p_undo: undo })
    setBusy(false)
    if (error) return setMsg("تعذّر التنفيذ")
    const st = (data as any)?.status
    setMsg(
      st === "checked_in"
        ? "✅ تم تسجيل الوصول"
        : st === "already"
          ? "⚠️ هذا الباركود مستخدم من قبل"
          : st === "undone"
            ? "تم التراجع عن الوصول"
            : st === "disabled"
              ? "⛔ هذا الباركود معطّل"
              : "غير موجود",
    )
  }

  if (guest === undefined) return shell(<p className="text-[#8a7561]">...جارٍ التحقق</p>)
  if (guest === null)
    return shell(<p className="font-bold text-red-600">❌ باركود غير صالح</p>, "#fff5f5")

  const title = [guest.groom, guest.bride].filter(Boolean).join(" & ") || guest.title
  if (guest.disabled)
    return shell(
      <>
        <p className="text-sm text-[#8a7561]">{title}</p>
        <h1 className="text-xl font-bold my-3 text-[#2C1810]">{guest.name}</h1>
        <p className="font-bold text-red-600">⛔ هذا الباركود معطّل</p>
      </>,
      "#fff5f5",
    )
  return shell(
    <>
      <p className="text-sm text-[#8a7561]">{title}</p>
      <h1 className="text-2xl font-bold my-3 text-[#2C1810]">{guest.name}</h1>
      <p className="text-sm text-[#8a7561]">
        {guest.attendance === "نعم" ? "ضيف مسجّل" : guest.attendance}
        {guest.companions > 0 ? ` — مع ${guest.companions} مرافق` : ""}
      </p>
      {admin && (
        <div className="mt-5 flex flex-col gap-2">
          <button
            disabled={busy}
            onClick={() => act(false)}
            className="py-3 rounded-xl font-bold text-white bg-green-600"
          >
            وصل
          </button>
          <button
            disabled={busy}
            onClick={() => act(true)}
            className="py-2 rounded-xl text-sm border border-[#D4AF37] text-[#8a7561]"
          >
            تراجع عن الوصول
          </button>
        </div>
      )}
      {msg && <p className="mt-4 font-bold">{msg}</p>}
    </>,
  )
}

/* ---------- صفحة الاستقبال (?door=) ---------- */
type Row = {
  id: string
  name: string
  companions: number
  attendance: string
  checked_in_at: string | null
  disabled?: boolean
}

const fmt = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : ""

export function DoorPage({ doorKey }: { doorKey: string }) {
  const [list, setList] = useState<{ status: string; invitation?: any; guests?: Row[] } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [camErr, setCamErr] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastRef = useRef("")

  const reload = async () => {
    const { data, error } = await supabase.rpc("door_list", { p_key: doorKey })
    setList(error || !data ? { status: "invalid_key" } : (data as any))
  }
  useEffect(() => {
    reload()
  }, [doorKey])

  const lookup = async (id: string) => {
    const { data } = await supabase.rpc("door_lookup", { p_key: doorKey, p_id: id })
    setResult({ ...(data as any), id })
  }

  const checkin = async () => {
    const { data } = await supabase.rpc("door_checkin", { p_key: doorKey, p_id: result.id })
    await lookup(result.id)
    if ((data as any)?.status === "already") setResult((r: any) => ({ ...r, status: "already" }))
    reload()
  }

  useEffect(() => {
    if (!scanning) return
    let stop = false
    let stream: MediaStream | null = null
    ;(async () => {
      try {
        const jsQR = (await import("jsqr")).default
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
        const v = videoRef.current!
        v.srcObject = stream
        await v.play()
        const c = document.createElement("canvas")
        const g = c.getContext("2d", { willReadFrequently: true })!
        const tick = () => {
          if (stop) return
          if (v.videoWidth) {
            c.width = v.videoWidth
            c.height = v.videoHeight
            g.drawImage(v, 0, 0)
            const code = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height)
            const m = code?.data.match(/scan=([0-9a-f-]{36})/i)
            if (m && m[1] !== lastRef.current) {
              lastRef.current = m[1]
              setScanning(false)
              lookup(m[1])
              return
            }
          }
          requestAnimationFrame(tick)
        }
        tick()
      } catch {
        setCamErr("تعذّر فتح الكاميرا — اسمح للمتصفح باستخدامها")
        setScanning(false)
      }
    })()
    return () => {
      stop = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [scanning])

  if (!list) return shell(<p className="text-[#8a7561]">...جارٍ التحميل</p>)
  if (list.status !== "ok")
    return shell(
      <p className="font-bold text-red-600">
        {list.status === "invalid_key" ? "الرابط غير صالح أو منتهي" : "خطأ"}
      </p>,
      "#fff5f5",
    )

  const guests = list.guests || []
  const arrived = guests.filter((g) => g.checked_in_at)
  const title = [list.invitation?.groom, list.invitation?.bride].filter(Boolean).join(" & ") || list.invitation?.title

  if (result) {
    const ok = result.status === "ok"
    const used = result.status === "already"
    const off = result.status === "disabled"
    const bg = ok ? "#f0fdf4" : "#fff5f5"
    return shell(
      <>
        {ok || used || off ? (
          <>
            <h1 className="text-2xl font-bold text-[#2C1810]">{result.name}</h1>
            <p className="text-sm text-[#8a7561] mt-1">
              {result.companions > 0 ? `مع ${result.companions} مرافق` : "بدون مرافقين"}
            </p>
          </>
        ) : (
          <p className="font-bold text-red-600">
            {result.status === "wrong_invitation" ? "❌ هذا الباركود لدعوة ثانية" : "❌ باركود غير صالح"}
          </p>
        )}
        {off && <p className="mt-3 font-bold text-red-600">⛔ هذا الباركود معطّل</p>}
        {used && (
          <p className="mt-3 font-bold text-red-600">
            ⛔ مستخدم من قبل {result.checked_in_at ? `(${fmt(result.checked_in_at)})` : ""}
          </p>
        )}
        {ok && (
          <button onClick={checkin} className="mt-5 w-full py-4 rounded-xl font-bold text-white bg-green-600 text-lg">
            وصل
          </button>
        )}
        <button
          onClick={() => {
            setResult(null)
            lastRef.current = ""
            setScanning(true)
          }}
          className="mt-3 w-full py-3 rounded-xl border border-[#D4AF37] text-[#8a7561]"
        >
          مسح التالي
        </button>
      </>,
      bg,
    )
  }

  return shell(
    <>
      <p className="text-sm text-[#8a7561]">الاستقبال</p>
      <h1 className="text-xl font-bold text-[#2C1810] mb-3">{title}</h1>
      <p className="text-sm mb-3">
        وصل <b>{arrived.length}</b> من <b>{guests.length}</b>
      </p>
      {scanning ? (
        <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black" />
      ) : (
        <button
          onClick={() => {
            setCamErr("")
            lastRef.current = ""
            setScanning(true)
          }}
          className="w-full py-3 rounded-xl font-bold text-white"
          style={{ backgroundColor: GOLD }}
        >
          📷 فتح الكاميرا للمسح
        </button>
      )}
      {camErr && <p className="text-red-600 text-sm mt-2">{camErr}</p>}
      <ul className="mt-4 text-right divide-y max-h-72 overflow-auto">
        {guests.map((g) => (
          <li key={g.id}>
            <button className="w-full flex justify-between py-2 text-sm" onClick={() => lookup(g.id)}>
              <span>{g.name}</span>
              <span className={g.checked_in_at ? "text-green-600" : "text-[#8a7561]"}>
                {g.disabled ? "معطّل" : g.checked_in_at ? `✓ ${fmt(g.checked_in_at)}` : "—"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>,
  )
}

/* ---------- أدوات لوحة التحكم ---------- */
function randomKey() {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
}

// ينشئ/يجدد مفتاح الاستقبال (ينتهي بعد يوم من تاريخ الحدث، أو 30 يوم) ويرجع الرابط
export async function createDoorLink(inv: Invitation): Promise<string> {
  const ev = new Date(inv.eventDateTime || inv.date || "")
  const base =
    !isNaN(ev.getTime()) && ev.getTime() > Date.now()
      ? ev.getTime() + 36 * 3600 * 1000
      : Date.now() + 30 * 24 * 3600 * 1000
  const key = randomKey()
  const { error } = await supabase.from("door_keys").upsert({
    invitation_id: inv.id,
    key,
    expires_at: new Date(base).toISOString(),
  })
  if (error) throw new Error(error.message)
  return `${siteBase()}/?door=${key}`
}

export async function revokeDoorLink(inv: Invitation) {
  await supabase.from("door_keys").delete().eq("invitation_id", inv.id)
}

export function AttendancePanel({ inv, onClose }: { inv: Invitation; onClose: () => void }) {
  const [rows, setRows] = useState<(Row & { message?: string; disabled_at?: string | null })[] | null>(null)
  const load = async () => {
    const { data } = await supabase
      .from("rsvps")
      .select("id,name,companions,attendance,checked_in_at,message,disabled_at")
      .eq("invitation_id", inv.id)
      .order("created_at", { ascending: false })
    setRows((data as any) || [])
  }
  useEffect(() => {
    load()
  }, [inv.id])
  const act = async (id: string, undo: boolean) => {
    await supabase.rpc("admin_checkin", { p_id: id, p_undo: undo })
    load()
  }
  const toggleOff = async (id: string, off: boolean) => {
    await supabase.rpc("admin_set_disabled", { p_id: id, p_disabled: off })
    load()
  }
  const arrived = rows?.filter((r) => r.checked_in_at).length ?? 0
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <b>
            الحضور — وصل {arrived} من {rows?.length ?? 0}
            {inv.textStyles?.["qr-checkin"]?.max !== undefined &&
              ` · الباركودات: ${rows?.filter((r: any) => !r.disabled_at).length ?? 0} من ${inv.textStyles["qr-checkin"].max}`}
          </b>
          <button onClick={onClose}>✕</button>
        </div>
        <ul className="overflow-auto divide-y">
          {rows?.map((r) => (
            <li key={r.id} className="p-3 flex justify-between items-center gap-2 text-sm">
              <span>
                {r.name}
                {r.companions > 0 ? ` (+${r.companions})` : ""}
                {r.disabled_at && <span className="text-red-600"> ⛔ معطّل</span>}
                {r.checked_in_at && <span className="text-green-600"> ✓ {fmt(r.checked_in_at)}</span>}
              </span>
              <span className="flex gap-1">
                {!r.disabled_at && (
                  <button
                    className="px-3 py-1 rounded-full border text-xs"
                    onClick={() => act(r.id, !!r.checked_in_at)}
                  >
                    {r.checked_in_at ? "تراجع" : "وصل"}
                  </button>
                )}
                <button
                  className={`px-3 py-1 rounded-full border text-xs ${r.disabled_at ? "text-green-700" : "text-red-600"}`}
                  onClick={() => toggleOff(r.id, !r.disabled_at)}
                >
                  {r.disabled_at ? "تفعيل" : "تعطيل"}
                </button>
              </span>
            </li>
          ))}
          {rows?.length === 0 && <li className="p-4 text-center text-[#8a7561]">ما أكو تسجيلات بعد</li>}
        </ul>
      </div>
    </div>
  )
}
