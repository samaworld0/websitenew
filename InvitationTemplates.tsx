import { useState, useEffect, useRef } from 'react'

// ─── Shared invitation data ───────────────────────────────────────────────────
const INVITE = {
  groom: 'أحمد',
  bride: 'فاطمة',
  date: 'السبت ١٥ فبراير ٢٠٢٥',
  time: '٧:٠٠ مساءً',
  venue: 'قاعة الأفراح الملكية',
  city: 'بغداد',
  parents_groom: 'عائلة الحاج محمد الجبوري',
  parents_bride: 'عائلة الحاج كريم العبيدي',
}

// ─── Template 1: باب الفرح ────────────────────────────────────────────────────
function BabAlFarah({ playing }: { playing: boolean }) {
  const [phase, setPhase] = useState(0)
  // phase 0: door closed, 1: knocking, 2: door opening, 3: content revealed

  useEffect(() => {
    if (!playing) { setPhase(0); return }
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 1800)
    const t3 = setTimeout(() => setPhase(3), 3200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [playing])

  return (
    <div
      className="relative w-full h-full overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #1a0a00 0%, #2d1200 40%, #1a0a00 100%)' }}
    >
      {/* Stars background */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-amber-200"
          style={{
            width: Math.random() * 2 + 1 + 'px',
            height: Math.random() * 2 + 1 + 'px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            opacity: 0.3 + Math.random() * 0.4,
          }}
        />
      ))}

      {/* Gold ornament top */}
      <div className="absolute top-6 inset-x-0 flex justify-center">
        <div className="text-amber-400 text-3xl opacity-70">❋ ✦ ❋</div>
      </div>

      {/* Door scene */}
      <div className="relative flex items-center justify-center" style={{ perspective: '800px' }}>
        {/* Door frame */}
        <div
          className="relative"
          style={{
            width: '180px',
            height: '260px',
            border: '6px solid #c9a240',
            borderRadius: '90px 90px 4px 4px',
            boxShadow: '0 0 40px rgba(201,162,64,0.4), inset 0 0 20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Door panel - left half (opens) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '84px 0 0 0',
              background: 'linear-gradient(135deg, #5c3008 0%, #3d1e04 50%, #2a1302 100%)',
              transformOrigin: 'left center',
              transform: phase >= 2 ? 'rotateY(-85deg)' : 'rotateY(0deg)',
              transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
            }}
          >
            {/* Door details */}
            <div style={{
              position: 'absolute', inset: '12px',
              border: '2px solid rgba(201,162,64,0.4)',
              borderRadius: '72px 0 0 0',
            }} />
            {/* Knocker */}
            <div style={{
              position: 'absolute', right: '14px', top: '50%', translateY: '-50%',
              width: '16px', height: '20px',
              background: '#c9a240',
              borderRadius: '50% 50% 40% 40%',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              transform: phase === 1 ? 'rotate(-20deg)' : 'rotate(0deg)',
              transition: 'transform 0.1s ease',
              transformOrigin: 'top center',
            }} />
          </div>

          {/* Right half stays */}
          <div
            style={{
              position: 'absolute',
              top: 0, right: 0, bottom: 0,
              width: '50%',
              borderRadius: '0 84px 0 0',
              background: 'linear-gradient(135deg, #3d1e04 0%, #2a1302 100%)',
              borderRight: '3px solid rgba(201,162,64,0.3)',
            }}
          />

          {/* Light from inside when opening */}
          {phase >= 2 && (
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at center, rgba(255,220,100,0.3) 0%, transparent 70%)',
                animation: 'fadeIn 0.8s ease',
              }}
            />
          )}
        </div>
      </div>

      {/* Content revealed after door opens */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 0.8s ease',
          padding: '32px 24px',
        }}
      >
        <div style={{ color: '#e5c660', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '11px', letterSpacing: '3px', marginBottom: '8px' }}>
          ﷽
        </div>
        <div style={{ color: '#c9a240', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '11px', marginBottom: '16px', opacity: 0.8 }}>
          يسرّنا أن ندعوكم لحضور حفل زفاف
        </div>
        <div style={{ color: '#f0d897', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '32px', fontWeight: 700, lineHeight: 1.3, textAlign: 'center' }}>
          {INVITE.groom}
          <br />
          <span style={{ fontSize: '16px', color: '#c9a240' }}>♥</span>
          <br />
          {INVITE.bride}
        </div>
        <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to right, transparent, #c9a240, transparent)', margin: '16px auto' }} />
        <div style={{ color: '#e5c660', fontFamily: 'Noto Sans Arabic, sans-serif', fontSize: '12px', textAlign: 'center', lineHeight: 2, opacity: 0.9 }}>
          <div>{INVITE.date}</div>
          <div>{INVITE.time}</div>
          <div style={{ opacity: 0.7, fontSize: '11px' }}>{INVITE.venue}</div>
        </div>
        <div style={{ marginTop: '20px', padding: '8px 20px', border: '1px solid rgba(201,162,64,0.5)', borderRadius: '999px', color: '#c9a240', fontSize: '11px', fontFamily: 'Noto Sans Arabic, sans-serif' }}>
          تشريفكم شرف لنا 🌿
        </div>
      </div>

      {/* Knocking visual indicator */}
      {phase === 1 && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center">
          <div style={{ color: '#c9a240', fontSize: '11px', fontFamily: 'Noto Sans Arabic, sans-serif', opacity: 0.7, animation: 'pulse 0.5s ease infinite' }}>
            طق... طق... طق...
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Template 2: حُلم وردي ────────────────────────────────────────────────────
function HulumWardi({ playing }: { playing: boolean }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!playing) { setPhase(0); return }
    const t1 = setTimeout(() => setPhase(1), 500)
    const t2 = setTimeout(() => setPhase(2), 2000)
    const t3 = setTimeout(() => setPhase(3), 3500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [playing])

  return (
    <div
      className="relative w-full h-full overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #fff0f5 0%, #fce4ec 40%, #f8bbd0 100%)' }}
    >
      {/* Floating petals */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            fontSize: '12px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            opacity: 0.4,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite ${Math.random() * 3}s`,
          }}
        >
          🌸
        </div>
      ))}

      {/* Envelope */}
      <div style={{ position: 'relative', width: '200px' }}>
        {/* Envelope body */}
        <div
          style={{
            width: '200px',
            height: '140px',
            background: 'linear-gradient(135deg, #fff, #fce4ec)',
            borderRadius: '8px',
            border: '1px solid #f48fb1',
            boxShadow: '0 8px 40px rgba(244,143,177,0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Envelope lines */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', borderTop: '1px solid #f8bbd0' }} />
          {/* Diagonal fold left */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: 0, height: 0,
            borderBottom: '70px solid #fce4ec',
            borderRight: '100px solid transparent',
          }} />
          {/* Diagonal fold right */}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 0, height: 0,
            borderBottom: '70px solid #fce4ec',
            borderLeft: '100px solid transparent',
          }} />
        </div>

        {/* Envelope flap (opens) */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            transformOrigin: 'top center',
            transform: phase >= 1 ? 'rotateX(180deg)' : 'rotateX(0deg)',
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
            perspective: '600px',
          }}
        >
          <div style={{
            width: 0, height: 0,
            borderLeft: '100px solid transparent',
            borderRight: '100px solid transparent',
            borderTop: '70px solid #f48fb1',
          }} />
        </div>

        {/* Invitation card rising from envelope */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px', right: '10px',
            background: 'linear-gradient(160deg, #fff5f8, #fff)',
            borderRadius: '8px',
            border: '1px solid #f8bbd0',
            padding: '16px',
            textAlign: 'center',
            transform: phase >= 2 ? 'translateY(-160px)' : 'translateY(0)',
            transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 4px 20px rgba(244,143,177,0.2)',
          }}
        >
          <div style={{ color: '#e91e8c', fontSize: '18px', marginBottom: '4px' }}>💌</div>
          <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '10px', color: '#ad1457', marginBottom: '4px', opacity: 0.7 }}>
            دعوة زواج
          </div>
          <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '18px', fontWeight: 700, color: '#880e4f', lineHeight: 1.4 }}>
            {INVITE.groom} & {INVITE.bride}
          </div>
        </div>
      </div>

      {/* Full content */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #fff0f5 0%, #fce4ec 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px',
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>💌</div>
        <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '10px', color: '#ad1457', letterSpacing: '2px', marginBottom: '12px', opacity: 0.8 }}>
          دعوة زواج
        </div>
        <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '28px', fontWeight: 700, color: '#880e4f', lineHeight: 1.4, textAlign: 'center' }}>
          {INVITE.groom}
          <br />
          <span style={{ fontSize: '14px', color: '#f48fb1' }}>✿ والعروس ✿</span>
          <br />
          {INVITE.bride}
        </div>
        <div style={{ width: '80px', height: '1px', background: 'linear-gradient(to right, transparent, #f48fb1, transparent)', margin: '16px auto' }} />
        <div style={{ fontFamily: 'Noto Sans Arabic, sans-serif', fontSize: '12px', color: '#ad1457', textAlign: 'center', lineHeight: 2, opacity: 0.85 }}>
          <div>{INVITE.date}</div>
          <div>{INVITE.time}</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>{INVITE.venue} — {INVITE.city}</div>
        </div>
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button style={{ background: 'linear-gradient(135deg, #e91e8c, #f06292)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '999px', fontSize: '11px', fontFamily: 'Noto Sans Arabic, sans-serif', cursor: 'pointer' }}>
            سأحضر ✓
          </button>
          <button style={{ background: 'transparent', color: '#ad1457', border: '1px solid #f48fb1', padding: '8px 18px', borderRadius: '999px', fontSize: '11px', fontFamily: 'Noto Sans Arabic, sans-serif', cursor: 'pointer' }}>
            اعتذر
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Template 3: الملكي ───────────────────────────────────────────────────────
function Malaki({ playing }: { playing: boolean }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!playing) { setPhase(0); return }
    const t1 = setTimeout(() => setPhase(1), 200)
    const t2 = setTimeout(() => setPhase(2), 1200)
    const t3 = setTimeout(() => setPhase(3), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [playing])

  return (
    <div
      className="relative w-full h-full overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #0d0520 0%, #1a0a3a 50%, #0d0520 100%)' }}
    >
      {/* Stars */}
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: Math.random() * 2 + 'px',
            height: Math.random() * 2 + 'px',
            borderRadius: '50%',
            background: '#fff',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            opacity: phase >= 1 ? (0.2 + Math.random() * 0.5) : 0,
            transition: `opacity ${0.5 + Math.random()}s ease ${Math.random()}s`,
          }}
        />
      ))}

      {/* Crown animation */}
      <div
        style={{
          position: 'absolute', top: '60px',
          fontSize: '40px',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.5)',
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 0 12px rgba(201,162,64,0.8))',
        }}
      >
        👑
      </div>

      {/* Vertical divider lines */}
      <div
        style={{
          position: 'absolute', top: '120px', bottom: '60px',
          left: '20px', width: '1px',
          background: 'linear-gradient(to bottom, transparent, rgba(201,162,64,0.4), transparent)',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />
      <div
        style={{
          position: 'absolute', top: '120px', bottom: '60px',
          right: '20px', width: '1px',
          background: 'linear-gradient(to bottom, transparent, rgba(201,162,64,0.4), transparent)',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* Content */}
      <div
        style={{
          textAlign: 'center',
          padding: '0 32px',
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s ease',
        }}
      >
        <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '10px', color: '#c9a240', letterSpacing: '3px', marginBottom: '16px', opacity: 0.7 }}>
          ﷽
        </div>
        <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '11px', color: '#b8a080', marginBottom: '8px' }}>
          يسعدنا دعوتكم الكريمة
        </div>
        <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '34px', fontWeight: 700, color: '#f0d897', lineHeight: 1.3 }}>
          {INVITE.groom}
        </div>
        <div style={{ color: '#c9a240', fontSize: '20px', margin: '4px 0' }}>◆</div>
        <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '34px', fontWeight: 700, color: '#f0d897', lineHeight: 1.3 }}>
          {INVITE.bride}
        </div>

        <div style={{
          width: '100px', height: '1px',
          background: 'linear-gradient(to right, transparent, #c9a240, transparent)',
          margin: '20px auto',
        }} />

        <div
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.6s ease',
          }}
        >
          <div style={{ fontFamily: 'Noto Sans Arabic, sans-serif', fontSize: '12px', color: '#d4b483', lineHeight: 2 }}>
            <div>{INVITE.date}</div>
            <div>{INVITE.time}</div>
          </div>
          <div style={{
            marginTop: '12px',
            padding: '8px 16px',
            border: '1px solid rgba(201,162,64,0.4)',
            borderRadius: '4px',
            fontFamily: 'Noto Sans Arabic, sans-serif',
            fontSize: '11px',
            color: '#c9a240',
          }}>
            {INVITE.venue}
          </div>
          <div style={{ marginTop: '12px', fontFamily: 'Noto Sans Arabic, sans-serif', fontSize: '10px', color: '#6d5a3a' }}>
            {INVITE.parents_groom} — {INVITE.parents_bride}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Template 4: كلاسيك ──────────────────────────────────────────────────────
function Classic({ playing }: { playing: boolean }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!playing) { setPhase(0); return }
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 2000)
    const t3 = setTimeout(() => setPhase(3), 3200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [playing])

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #fdfaf4 0%, #fef9ee 100%)' }}
    >
      {/* Top ornament border */}
      <div style={{
        position: 'absolute', top: 0, inset: 'auto',
        left: 0, right: 0, height: '6px',
        background: 'linear-gradient(to right, #c9a240, #e5c660, #c9a240)',
      }} />

      {/* Corner ornaments */}
      {['top-4 right-4', 'top-4 left-4', 'bottom-4 right-4', 'bottom-4 left-4'].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} text-amber-400`}
          style={{
            fontSize: '20px',
            opacity: phase >= 1 ? 0.6 : 0,
            transition: 'opacity 0.5s ease',
            transform: i === 0 ? '' : i === 1 ? 'scaleX(-1)' : i === 2 ? 'scaleY(-1)' : 'scale(-1)',
          }}
        >
          ❧
        </div>
      ))}

      {/* Birds flying in */}
      {phase >= 1 && (
        <div style={{ position: 'absolute', top: '16px', inset: 'auto', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {['🕊️', '🕊️', '🕊️'].map((b, i) => (
            <div
              key={i}
              style={{
                fontSize: '14px',
                animation: `float ${2 + i * 0.5}s ease-in-out infinite ${i * 0.3}s`,
                opacity: 0.7,
              }}
            >
              {b}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 28px',
        textAlign: 'center',
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 0.8s ease',
      }}>
        <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '10px', color: '#6b4226', letterSpacing: '2px', marginBottom: '6px', opacity: 0.6 }}>
          بسم الله الرحمن الرحيم
        </div>
        <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '11px', color: '#9a6b1f', marginBottom: '16px' }}>
          يسرّ {INVITE.parents_groom}
        </div>

        {/* Names */}
        <div style={{
          padding: '20px 28px',
          border: '1px solid rgba(201,162,64,0.3)',
          borderRadius: '8px',
          marginBottom: '16px',
          background: 'rgba(255,255,255,0.6)',
        }}>
          <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '30px', fontWeight: 700, color: '#4a2e18', lineHeight: 1.3 }}>
            {INVITE.groom}
          </div>
          <div style={{ color: '#c9a240', fontSize: '16px', margin: '4px 0' }}>﹠</div>
          <div style={{ fontFamily: 'Noto Naskh Arabic, serif', fontSize: '30px', fontWeight: 700, color: '#4a2e18', lineHeight: 1.3 }}>
            {INVITE.bride}
          </div>
        </div>

        <div style={{ fontFamily: 'Noto Sans Arabic, sans-serif', fontSize: '12px', color: '#7c5318', lineHeight: 2.2 }}>
          <div style={{ fontWeight: 600 }}>{INVITE.date}</div>
          <div>{INVITE.time}</div>
        </div>

        <div style={{
          width: '100%', height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(201,162,64,0.5), transparent)',
          margin: '14px 0',
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }} />

        <div style={{
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 0.5s ease',
          fontFamily: 'Noto Sans Arabic, sans-serif',
          fontSize: '11px',
          color: '#9a6b1f',
          lineHeight: 2,
        }}>
          <div style={{ fontWeight: 600 }}>{INVITE.venue}</div>
          <div style={{ opacity: 0.7, fontSize: '10px' }}>{INVITE.city}</div>
        </div>

        <div style={{
          marginTop: '16px',
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 0.5s ease 0.3s',
          display: 'flex', gap: '8px',
        }}>
          <button style={{
            background: 'linear-gradient(135deg, #c9a240, #e5c660)',
            color: 'white', border: 'none',
            padding: '7px 16px', borderRadius: '999px',
            fontSize: '11px', fontFamily: 'Noto Sans Arabic, sans-serif',
            cursor: 'pointer', fontWeight: 600,
            boxShadow: '0 2px 12px rgba(201,162,64,0.4)',
          }}>
            سأحضر ✓
          </button>
          <button style={{
            background: 'transparent',
            color: '#9a6b1f', border: '1px solid rgba(201,162,64,0.5)',
            padding: '7px 16px', borderRadius: '999px',
            fontSize: '11px', fontFamily: 'Noto Sans Arabic, sans-serif',
            cursor: 'pointer',
          }}>
            اعتذر
          </button>
        </div>
      </div>

      {/* Bottom border */}
      <div style={{
        position: 'absolute', bottom: 0,
        left: 0, right: 0, height: '6px',
        background: 'linear-gradient(to right, #c9a240, #e5c660, #c9a240)',
      }} />
    </div>
  )
}

// ─── Main templates showcase ──────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'bab', name: 'باب الفرح', icon: '🚪', desc: 'باب يُطرق ثم ينفتح على المفاجأة', Component: BabAlFarah, color: '#2d1200' },
  { id: 'hulm', name: 'حُلم وردي', icon: '💌', desc: 'ظرف وردي ينفتح بأناقة', Component: HulumWardi, color: '#fce4ec' },
  { id: 'malaki', name: 'الملكي', icon: '👑', desc: 'فخامة ليلية مع نجوم ذهبية', Component: Malaki, color: '#1a0a3a' },
  { id: 'classic', name: 'كلاسيك', icon: '🕊️', desc: 'أناقة كلاسيكية مع طيور السلام', Component: Classic, color: '#fdfaf4' },
]

export default function InvitationTemplates() {
  const [active, setActive] = useState('bab')
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentTemplate = TEMPLATES.find(t => t.id === active)!
  const ActiveComponent = currentTemplate.Component

  const handlePlay = () => {
    setPlaying(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPlaying(true), 80)
  }

  // Auto-play when switching template
  useEffect(() => {
    handlePlay()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <section className="py-20" style={{ background: 'linear-gradient(160deg, #1c0f07 0%, #2d1a0d 100%)' }}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest text-amber-500 uppercase mb-3">
            قوالب الدعوة
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-amber-100 mb-3">
            شاهد دعوتك قبل الشراء
          </h2>
          <p className="text-amber-400/60 text-sm">
            اضغط على أي قالب لمشاهدة الأنيميشن — جرّب قبل ما تدفع
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Template selector */}
          <div className="flex lg:flex-col gap-3 flex-wrap justify-center">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-right ${
                  active === t.id
                    ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-900/30'
                    : 'border-amber-900/40 bg-amber-950/30 hover:border-amber-700/60'
                }`}
                style={{ minWidth: '180px' }}
              >
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <div className="font-display font-bold text-amber-200 text-sm">{t.name}</div>
                  <div className="text-amber-500/60 text-xs leading-tight">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Phone mockup */}
          <div className="flex-none flex flex-col items-center gap-5">
            {/* Phone frame */}
            <div
              style={{
                width: '280px',
                height: '560px',
                borderRadius: '40px',
                border: '8px solid #1a1a1a',
                background: '#000',
                boxShadow: '0 0 0 2px #333, 0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(201,162,64,0.1)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Notch */}
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: '80px', height: '24px',
                background: '#1a1a1a', borderRadius: '0 0 16px 16px',
                zIndex: 10,
              }} />

              {/* Screen content */}
              <div style={{ position: 'absolute', inset: 0 }}>
                <ActiveComponent playing={playing} />
              </div>
            </div>

            {/* Replay button */}
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 text-amber-400 border border-amber-700/60 hover:border-amber-500 hover:bg-amber-900/30 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
            >
              ▶ أعد تشغيل الأنيميشن
            </button>
          </div>

          {/* Template details */}
          <div className="flex-1 max-w-xs">
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-2xl p-6">
              <div className="text-3xl mb-3">{currentTemplate.icon}</div>
              <h3 className="font-display font-bold text-amber-200 text-2xl mb-2">{currentTemplate.name}</h3>
              <p className="text-amber-400/70 text-sm mb-6 leading-relaxed">{currentTemplate.desc}</p>

              <div className="space-y-3 mb-6">
                {['أنيميشن فريد عند الفتح', 'يعمل على جميع الأجهزة', 'رابط مشاركة واحد', 'تتبع ردود الضيوف'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-amber-300/80">
                    <span className="w-4 h-4 rounded-full bg-amber-700/50 text-amber-400 flex items-center justify-center text-[10px] flex-none">✓</span>
                    {f}
                  </div>
                ))}
              </div>

              <button className="w-full btn-gold text-white font-bold py-3 rounded-xl text-sm">
                جهّز دعوتك بهذا القالب
              </button>
              <p className="text-center text-amber-500/50 text-xs mt-3">جرّب مجاناً — ادفع عند الرضا</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
