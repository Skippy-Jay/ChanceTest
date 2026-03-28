'use client'
/**
 * ChanceButton
 * Circular dark glassmorphic Chance button — extracted from feed page.tsx (v40.7).
 * Accepts all interactive state as props so page.tsx remains the single source of truth.
 */

var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)'

interface ChanceButtonProps {
  size?: number
  disabled?: boolean
  pressed?: boolean
  active?: boolean
  hovered?: boolean
  onClick?: () => void
  onPointerEnter?: (e: React.PointerEvent) => void
  onPointerLeave?: () => void
  className?: string
  'aria-label'?: string
}

export default function ChanceButton({
  size = 52,
  disabled = false,
  pressed = false,
  active = false,
  hovered = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
  className = '',
  'aria-label': ariaLabel = 'Chance',
}: ChanceButtonProps) {
  var transform = pressed ? 'scale(0.92)' : active ? 'scale(1.1)' : 'scale(1)'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      aria-label={ariaLabel}
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        padding: 0,
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
        transform,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Platinum ring — visible when active/hovered */}
      <div style={{
        position: 'absolute',
        inset: '-1.5px',
        borderRadius: '50%',
        background: PLATINUM_RING,
        opacity: active ? 1 : 0,
        transition: 'opacity 0.4s ease',
        zIndex: 0,
        animation: hovered ? 'navRingRotate 3s linear infinite' : 'none',
        filter: pressed ? 'brightness(1.3)' : 'none',
      }} />

      {/* Dark inner fill */}
      <div style={{
        position: 'absolute',
        inset: '1px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))',
        zIndex: 1,
      }} />

      {/* Resting border — fades out when active */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: '1px solid rgba(130,141,152,0.22)',
        opacity: active ? 0 : 1,
        transition: 'opacity 0.3s ease',
        zIndex: 2,
        pointerEvents: 'none',
      }} />

      {/* Chance logo */}
      <img
        src="/logo-c.png"
        alt="Chance"
        style={{
          position: 'relative',
          zIndex: 3,
          width: Math.round(size * 0.577),
          height: Math.round(size * 0.577),
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
    </button>
  )
}
