import { useEffect, useRef, useState, type ReactNode } from "react"

// مكوّن أنميشن عام: يغلّف أي عنصر ويطبّق عليه تأثير "تلاشي وصعود" (fade + rise)
// لحظة ما يوصل العنصر لمجال رؤية الشاشة أثناء التمرير (Scroll). يعتمد على
// IntersectionObserver بدل مكتبة خارجية حتى يضل المشروع خفيف بدون
// اعتماديات إضافية.
//
// الاستخدام:
//   <Reveal><h1>عنوان</h1></Reveal>
//   <Reveal delay={150}><p>نص يظهر بعد تأخير بسيط</p></Reveal>
//   <Reveal as="section" className="w-full">...</Reveal>
export default function Reveal({
  children,
  delay = 0,
  duration = 800,
  className = "",
  as = "div",
  distance = 32,
  once = true,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
  as?: "div" | "section" | "span" | "li" | "article" | "header" | "footer"
  distance?: number
  once?: boolean
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

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

  const Tag = as as any

  return (
    <Tag
      ref={ref}
      className={`transition-all ease-out will-change-transform ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${distance}px)`,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  )
}
