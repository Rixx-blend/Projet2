"use client"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export type LiveOrbVariant = "white" | "black" | "webgl" | "custom"
export type LiveOrbTheme = "light" | "dark" | "auto"
export type LiveOrbProps = { className?: string; size?: number; variant?: LiveOrbVariant; color?: string; eyeColor?: string; interactive?: boolean; blink?: boolean; theme?: LiveOrbTheme }

type Point = { x: number; y: number; z: number }

// Rotate the two eye positions over an imaginary sphere, rather than sliding them
// across a flat face. The change in depth also subtly changes their spacing/scale.
function projectEye(x: number, y: number, yaw: number, pitch: number) {
  const z = Math.sqrt(Math.max(0.01, 1 - x * x - y * y))
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const pitchedY = y * cp - z * sp
  const pitchedZ = y * sp + z * cp
  const point: Point = { x: x * cy + pitchedZ * sy, y: pitchedY, z: -x * sy + pitchedZ * cy }

  // Rotate the eye's vertical axis too, so the capsules lean with the sphere.
  const upY = cp
  const upZ = sp
  const upX = upZ * sy
  const finalUpY = upY
  const angle = Math.atan2(upX, finalUpY) * 180 / Math.PI
  const perspective = 1 / Math.max(0.62, 1 + point.z * 0.12)
  return {
    left: 50 + point.x * 39,
    top: 50 - point.y * 39,
    angle,
    scaleX: perspective,
    scaleY: Math.max(0.72, Math.min(1.12, perspective * (0.92 + point.z * 0.1))),
  }
}

export function LiveOrb({ className, size = 56, variant, color, eyeColor, interactive = true, blink = true, theme = "auto" }: LiveOrbProps) {
  const [look, setLook] = useState({ x: 0, y: 0 })
  const [dark, setDark] = useState(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const sync = () => {
      const root = document.documentElement
      const explicit = root.classList.contains("dark") || root.getAttribute("data-theme") === "dark"
      const light = root.classList.contains("light") || root.getAttribute("data-theme") === "light"
      setDark(theme === "dark" || (theme === "auto" && (explicit || (!light && window.matchMedia("(prefers-color-scheme: dark)").matches))))
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] })
    return () => observer.disconnect()
  }, [theme])

  useEffect(() => {
    if (!interactive) return
    let frame = 0
    let latest = { x: 0, y: 0 }
    const move = (event: PointerEvent) => {
      const node = document.querySelector("[data-live-orb]")
      const rect = node?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) return
      // Normalize cursor position against the orb, with a little dead-zone at center.
      latest = {
        x: Math.max(-1, Math.min(1, ((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)))),
        y: Math.max(-1, Math.min(1, ((rect.top + rect.height / 2 - event.clientY) / (rect.height / 2)))),
      }
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setLook(latest))
    }
    window.addEventListener("pointermove", move, { passive: true })
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(frame) }
  }, [interactive])

  useEffect(() => {
    if (!blink || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let closeTimer: ReturnType<typeof setTimeout>
    let openTimer: ReturnType<typeof setTimeout>
    const schedule = () => { closeTimer = setTimeout(() => { setClosed(true); openTimer = setTimeout(() => { setClosed(false); schedule() }, 130) }, 2200 + Math.random() * 3000) }
    schedule()
    return () => { clearTimeout(closeTimer); clearTimeout(openTimer) }
  }, [blink])

  const body = variant === "custom" ? (color || "#7C5CFF") : (variant === "black" || (!variant && !dark) ? "#18181B" : "#F4F4F5")
  const eyes = variant === "custom" ? (eyeColor || "#FAFAFA") : (variant === "black" || (!variant && !dark) ? "#F4F4F5" : "#09090B")
  const yaw = look.x * 0.72
  const pitch = -look.y * 0.62
  const leftEye = projectEye(-0.16, 0.055, yaw, pitch)
  const rightEye = projectEye(0.16, 0.055, yaw, pitch)
  const eyeStyle = (p: ReturnType<typeof projectEye>) => ({
    left: p.left + "%",
    top: p.top + "%",
    background: eyes,
    transform: "translate(-50%, -50%) rotate(" + p.angle + "deg) scale(" + p.scaleX + ", " + (closed ? 0.08 : p.scaleY) + ")",
  })

  return <div data-live-orb role="img" aria-label="Avatar animé" className={cn("relative shrink-0 overflow-hidden rounded-full shadow-[inset_-7px_-9px_16px_rgba(0,0,0,.16),inset_5px_5px_12px_rgba(255,255,255,.32),0_5px_18px_rgba(0,0,0,.18)]", className)} style={{ width: size, height: size, background: variant === "webgl" ? "linear-gradient(135deg,#7C6AF7,#7DD3C7,#E8B4D4)" : body }}>
    <span className="absolute h-[27%] w-[6.5%] rounded-full transition-[left,top,transform] duration-300 ease-out" style={eyeStyle(leftEye)} />
    <span className="absolute h-[27%] w-[6.5%] rounded-full transition-[left,top,transform] duration-300 ease-out" style={eyeStyle(rightEye)} />
    <span aria-hidden className="pointer-events-none absolute -inset-[12%] rounded-full transition-transform duration-300 ease-out" style={{ background: "radial-gradient(ellipse at " + (38 + look.x * 13) + "% " + (30 - look.y * 12) + "%, rgba(255,255,255,.32), transparent 48%)", transform: "rotate(" + (-look.x * 7) + "deg)" }} />
    <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/10" />
  </div>
}
