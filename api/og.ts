// api/og.ts
//
// معاينة الروابط (Open Graph) لروبوتات واتساب/فيسبوك/تليجرام... بدالة سيرفر
// عادية (Node) بدل ميدلوير Edge: ردود الميدلوير على Vercel تنرسل بترميز
// "chunked" بدون Content-Length، وكروالر واتساب يفشل بصمت معها ويعرض اسم
// الدومين فقط. هنا نرسل الرد كامل مع Content-Length صريح.
//
// الروبوتات بس توصل هنا — عبر قاعدة rewrite بـ vercel.json حسب User-Agent.
// الزوار العاديين يوصلهم موقع React كالمعتاد.

const SUPABASE_URL = "https://yybdncbgradywuiomyik.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_ghQkvzBNAVphFa5PJMwoHQ_2zIoeBHD"
const DEFAULT_IMAGE = "https://samainvitation.vercel.app/images/hero-bg.jpg"
const SITE_NAME = "سما | للدعوات الألكترونية"

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// واتساب يرفض الصور الكبيرة (~300KB+) — نمرّرها بخدمة تصغير بجودة مناسبة.
function toWhatsappSafeImage(originalUrl: string): string {
  if (!originalUrl) return originalUrl
  const encoded = encodeURIComponent(originalUrl.replace(/^https?:\/\//, ""))
  return `https://wsrv.nl/?url=${encoded}&w=1200&h=630&fit=cover&output=jpg&q=60`
}

function buildHtml(p: { title: string; description: string; image: string; pageUrl: string }) {
  const title = escapeHtml(p.title)
  const description = escapeHtml(p.description)
  const image = escapeHtml(p.image)
  const pageUrl = escapeHtml(p.pageUrl)
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${pageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <p>${title}</p>
  </body>
</html>`
}

export default async function handler(req: any, res: any) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "www.samainvite.com"
  const rawUrl: string = req.url || "/"
  const query = new URL(rawUrl, `https://${host}`).searchParams
  const previewId = query.get("preview")
  // الرابط الأصلي اللي أرسله المستخدم (بدون مسار الدالة الداخلي)
  const pageUrl = `https://${host}/${previewId ? `?preview=${encodeURIComponent(previewId)}` : ""}`

  let title = SITE_NAME
  let description = "أنشئ دعوتك الإلكترونية الفاخرة بدقائق"
  let image = DEFAULT_IMAGE

  if (previewId && /^\d+$/.test(previewId)) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/invitations?id=eq.${previewId}&select=title,subtitle,groom,bride,dateGreg,time,venue,coverImage,heroBg,introPoster,textStyles`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
      )
      if (r.ok) {
        const rows: any = await r.json()
        const inv = Array.isArray(rows) ? rows[0] : null
        if (inv) {
          title = inv.groom && inv.bride ? `دعوة زفاف ${inv.groom} & ${inv.bride}` : inv.title || SITE_NAME
          description =
            [inv.dateGreg, inv.venue].filter(Boolean).join(" • ") || inv.subtitle || "أنت مدعو لحضور مناسبتنا"
          image =
            inv.textStyles?.["share-image"]?.imageUrl ||
            inv.introPoster ||
            inv.heroBg ||
            inv.coverImage ||
            DEFAULT_IMAGE
        }
      }
    } catch {
      /* نرجع معاينة عامة */
    }
  }

  const body = Buffer.from(buildHtml({ title, description, image: toWhatsappSafeImage(image), pageUrl }), "utf-8")
  res.statusCode = 200
  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.setHeader("Content-Length", String(body.length))
  // no-store: لازم ما ينخزّن رد الروبوت ويوصل زائر عادي على نفس الرابط.
  res.setHeader("Cache-Control", "no-store")
  res.end(body)
}
