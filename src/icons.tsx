// أيقونات SVG بسيطة تُستخدم عبر أكثر من مكون

export function OrnamentSVG(
  { color, scale = 1 }: { color: string, scale?: number }
) {
  return (
    <svg
      width={120 * scale}
      height={30 * scale}
      viewBox="0 0 120 30"
      fill="none"
    >
      <line x1="0" y1="15" x2="48" y2="15" stroke={color} strokeWidth="0.8" />
      <circle
        cx="60"
        cy="15"
        r="6"
        stroke={color}
        strokeWidth="0.8"
        fill="none"
      />
      <circle cx="60" cy="15" r="2" fill={color} />
      <circle cx="48" cy="15" r="2" fill={color} />
      <circle cx="72" cy="15" r="2" fill={color} />
      <line x1="72" y1="15" x2="120" y2="15" stroke={color} strokeWidth="0.8" />
      <path
        d="M54 15 Q60 8 66 15"
        stroke={color}
        strokeWidth="0.8"
        fill="none"
      />
    </svg>
  )
}

export function CornerOrnament(
  { color, flip }: { color: string, flip?: boolean }
) {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 50 50"
      fill="none"
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <path
        d="M5 5 L5 25 Q5 35 15 35 L45 35"
        stroke={color}
        strokeWidth="0.7"
        fill="none"
      />
      <path
        d="M5 5 L25 5 Q35 5 35 15 L35 45"
        stroke={color}
        strokeWidth="0.7"
        fill="none"
      />
      <circle cx="5" cy="5" r="2" fill={color} />
      <circle cx="22" cy="35" r="1.5" fill={color} />
      <circle cx="35" cy="22" r="1.5" fill={color} />
    </svg>
  )
}

export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
