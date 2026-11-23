import { useEffect, useRef, useState, type ReactNode } from "react"
import { useEditMode } from "./LiveEditor"

// مكوّن أنميشن عام: يغلّف أي عنصر ويطبّق عليه دخول لطيف (تلاشي + صعود خفيف
// + ضبابية بسيطة تنجلي) لحظة ما يوصل العنصر لمجال رؤية الشاشة أثناء التمرير.
// يعتمد على IntersectionObserver بدل مكتبة خارجية حتى يضل المشروع خفيف.
//
// خيار write: يضيف "كتابة" للنصوص داخل العنصر (العناوين h1-h5 والفقرات p):
// كل نص يُكشف كأنه يُكتب (من اليمين لليسار)، والفقرات الطويلة تظهر سطراً
// سطراً. يتعطّل بوضع التصميم المباشر، وعند تفعيل "تقليل الحركة" بالجهاز.
//
// الاستخدام:
//   <Reveal><h1>عنوان</h1></Reveal>
//   <Reveal write delay={150}><p>نص يُكتب بعد تأخير بسيط</p></Reveal>
export default function Reveal({
  children,
  delay = 0,
  duration = 1000,
  className = "",
  as = "div",
  distance = 24,
  once = true,
  write = false,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
  as?: "div" | "section" | "span" | "li" | "article" | "header" | "footer"
  distance?: number
  once?: boolean
  write?: boolean
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)
  const targetsRef = useRef<HTMLElement[]>([])
  const { editable } = useEditMode()

  const reduced =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  const writeOn = write && !editable && !reduced

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // لو المتصفح ما يدعم IntersectionObserver (نادر جداً)، نعرض العنصر
    // مباشرة بدون أنميشن بدل ما يضل مخفي للأبد.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            if (once) observer.unobserve(el)
          } else if (!once) {
            setVisible(false)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once])

  // تجهيز النصوص: نخفيها (clip-path) قبل ما يظهر العنصر حتى ما تلمع كاملة
  // للحظة قبل بداية الكتابة.
  useEffect(() => {
    const el = ref.current
    if (!el || !writeOn) return
    const found = Array.from(
      el.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,p"),
    ).filter(
      (t) =>
        (t.textContent || "").trim().length > 0 &&
        !t.querySelector("input,textarea,button,select,form") &&
        !t.closest("form"),
    )
    targetsRef.current = found
    found.forEach((t) => {
      t.style.clipPath = "inset(0 0 0 100%)"
    })
    return () => {
      found.forEach((t) => {
        t.style.clipPath = ""
      })
    }
  }, [writeOn])

  useEffect(() => {
    if (!visible || !writeOn) return
    const anims: Animation[] = []
    targetsRef.current.forEach((t, i) => {
      if (!t.isConnected || typeof t.animate !== "function") {
        t.style.clipPath = ""
        return
      }
      const len = (t.textContent || "").trim().length
      const cs = getComputedStyle(t)
      const fontSize = parseFloat(cs.fontSize) || 16
      const lineH = parseFloat(cs.lineHeight) || fontSize * 1.6
      const lines = Math.max(1, Math.round(t.getBoundingClientRect().height / lineH))
      const multi = lines > 1
      const dur = multi
        ? Math.min(2800, 700 * lines)
        : Math.min(2400, Math.max(650, len * 55))
      // نبدأ الكتابة بعد ما يطلع العنصر شوي، وكل نص بعد اللي قبله
      const startDelay = delay + 350 + i * 380
      const from = multi ? "inset(0 0 100% 0)" : "inset(0 0 0 100%)"
      const steps = multi ? lines : Math.min(Math.max(len, 8), 36)
      const anim = t.animate(
        [{ clipPath: from }, { clipPath: "inset(0 0 0 0)" }],
        {
          duration: dur,
          delay: startDelay,
          easing: `steps(${steps}, end)`,
          fill: "backwards",
        },
      )
      // تحت الحركة: نترك العنصر مقصوصاً لحد ما تبدأ (fill backwards)، وبعد
      // ما تخلص نشيل القص نهائياً حتى ما يتقص الظل/النزول بالحروف.
      t.style.clipPath = from
      anim.onfinish = () => {
        t.style.clipPath = ""
      }
      anim.oncancel = () => {
        t.style.clipPath = ""
      }
      anims.push(anim)
    })
    return () => anims.forEach((a) => a.cancel())
  }, [visible, writeOn, delay])

  const Tag = as as any

  return (
    <Tag
      ref={ref}
      className={`transition-all will-change-transform ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${distance}px)`,
        filter: visible ? "none" : "blur(5px)",
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(.22,.7,.25,1)",
      }}
    >
      {children}
    </Tag>
  )
}
