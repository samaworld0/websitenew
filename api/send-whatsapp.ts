// api/send-whatsapp.ts
//
// دالة سيرفر على Vercel تُرسل الدعوة للمدعوين عبر واتساب (WhatsApp Business
// Cloud API) — رسالة فيها ملف PDF + زر (Call to Action) يفتح رابط الدعوة.
// تُستدعى من لوحة الإدارة فقط (تتحقق من جلسة المشرف عبر Supabase).
//
// لازم تضيف هذي المتغيرات بـ Vercel → Settings → Environment Variables:
//   WHATSAPP_TOKEN            التوكن الدائم (System User) من Meta
//   WHATSAPP_PHONE_NUMBER_ID  معرّف رقم واتساب بزنس
//   WHATSAPP_DEFAULT_COUNTRY  (اختياري) مفتاح الدولة للأرقام اللي تبدأ بـ 0 — الافتراضي 964
// التوكن ما ينحط أبداً بالواجهة (الكود اللي يوصله الزوار).

const SUPABASE_URL = "https://yybdncbgradywuiomyik.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_ghQkvzBNAVphFa5PJMwoHQ_2zIoeBHD"
const GRAPH_VERSION = "v21.0"
const MAX_RECIPIENTS = 100

type Recipient = { name?: string; phone: string }

type Payload = {
  mode: "template" | "session"
  recipients: Recipient[]
  pdfUrl: string
  pdfFilename?: string
  linkUrl: string
  // وضع القالب (Template) — يرسل لأي رقم، لازم القالب معتمد من Meta
  templateName?: string
  language?: string
  nameInBody?: boolean // {{1}} بنص القالب = اسم المدعو
  buttonSuffix?: string // لو زر القالب فيه رابط متغيّر ({{1}} بآخر الرابط)
  // وضع الجلسة — يشتغل بس لأرقام راسلتك آخر 24 ساعة
  bodyText?: string
  buttonLabel?: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}

function normalizePhone(raw: string, defaultCountry: string): string {
  let p = String(raw || "").replace(/[^\d+]/g, "")
  if (p.startsWith("+")) return p.slice(1).replace(/\D/g, "")
  p = p.replace(/\D/g, "")
  if (p.startsWith("00")) return p.slice(2)
  if (p.startsWith("0")) return defaultCountry + p.slice(1)
  return p
}

async function verifyAdmin(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization") || ""
  const token = auth.replace(/^Bearer\s+/i, "")
  if (!token) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}

async function graphSend(phoneId: string, token: string, body: unknown) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...(body as object) }),
  })
  const data: any = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return data
}

export async function POST(request: Request) {
  if (!(await verifyAdmin(request))) return json({ error: "غير مصرّح — سجّلي دخول للوحة الإدارة أول." }, 401)

  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) {
    return json(
      { error: "واتساب غير مربوط: أضيفي WHATSAPP_TOKEN و WHATSAPP_PHONE_NUMBER_ID بإعدادات Vercel ثم أعيدي النشر." },
      500,
    )
  }

  let p: Payload
  try {
    p = await request.json()
  } catch {
    return json({ error: "طلب غير صالح" }, 400)
  }

  if (!p.pdfUrl || !/^https:\/\//.test(p.pdfUrl)) return json({ error: "ارفعي ملف PDF أول." }, 400)
  if (!p.linkUrl || !/^https:\/\//.test(p.linkUrl)) return json({ error: "رابط الدعوة لازم يبدأ بـ https://" }, 400)
  if (!Array.isArray(p.recipients) || p.recipients.length === 0) return json({ error: "ما فيه أرقام للإرسال." }, 400)
  if (p.recipients.length > MAX_RECIPIENTS) return json({ error: `الحد الأقصى ${MAX_RECIPIENTS} رقم بالمرة الوحدة.` }, 400)
  if (p.mode === "template" && !p.templateName) return json({ error: "اكتبي اسم القالب المعتمد." }, 400)
  if (p.mode === "session" && (!p.bodyText || !p.buttonLabel)) return json({ error: "اكتبي نص الرسالة واسم الزر." }, 400)

  const country = (process.env.WHATSAPP_DEFAULT_COUNTRY || "964").replace(/\D/g, "")
  const filename = (p.pdfFilename || "invitation.pdf").slice(0, 100)
  const results: { phone: string; name?: string; ok: boolean; error?: string }[] = []

  for (const r of p.recipients) {
    const to = normalizePhone(r.phone, country)
    if (to.length < 8) {
      results.push({ phone: r.phone, name: r.name, ok: false, error: "رقم غير صالح" })
      continue
    }
    try {
      if (p.mode === "template") {
        const components: any[] = [
          { type: "header", parameters: [{ type: "document", document: { link: p.pdfUrl, filename } }] },
        ]
        if (p.nameInBody) {
          components.push({ type: "body", parameters: [{ type: "text", text: (r.name || "").trim() || "الضيف الكريم" }] })
        }
        if (p.buttonSuffix) {
          components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: p.buttonSuffix }] })
        }
        await graphSend(phoneId, token, {
          to,
          type: "template",
          template: { name: p.templateName, language: { code: p.language || "ar" }, components },
        })
      } else {
        await graphSend(phoneId, token, { to, type: "document", document: { link: p.pdfUrl, filename } })
        await graphSend(phoneId, token, {
          to,
          type: "interactive",
          interactive: {
            type: "cta_url",
            body: { text: (p.bodyText || "").replace(/\{name\}/g, (r.name || "").trim() || "الضيف الكريم") },
            action: { name: "cta_url", parameters: { display_text: (p.buttonLabel || "").slice(0, 20), url: p.linkUrl } },
          },
        })
      }
      results.push({ phone: to, name: r.name, ok: true })
    } catch (e: any) {
      results.push({ phone: to, name: r.name, ok: false, error: e?.message || "فشل الإرسال" })
    }
    await new Promise((res) => setTimeout(res, 250))
  }

  return json({ results, sent: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length })
}
