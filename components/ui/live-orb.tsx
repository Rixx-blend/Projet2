"use client"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export type LiveOrbVariant = "white" | "black" | "webgl" | "custom"
export type LiveOrbTheme = "light" | "dark" | "auto"
export type LiveOrbProps = { className?: string; size?: number; variant?: LiveOrbVariant; color?: string; eyeColor?: string; interactive?: boolean; blink?: boolean; theme?: LiveOrbTheme }

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
    const move = (event: PointerEvent) => {
      const node = document.querySelector("[data-live-orb]")
      const rect = node?.getBoundingClientRect()
      if (!rect) return
      setLook({ x: Math.max(-3, Math.min(3, ((event.clientX - (rect.left + rect.width / 2)) / rect.width) * 3)), y: Math.max(-2, Math.min(2, ((rect.top + rect.height / 2 - event.clientY) / rect.height) * 2)) })
    }
    window.addEventListener("pointermove", move, { passive: true })
    return () => window.removeEventListener("pointermove", move)
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
  return <div data-live-orb role="img" aria-label="Avatar animé" className={cn("relative shrink-0 rounded-full shadow-[inset_-7px_-9px_16px_rgba(0,0,0,.16),inset_5px_5px_12px_rgba(255,255,255,.32),0_5px_18px_rgba(0,0,0,.18)]", className)} style={{ width: size, height: size, background: variant === "webgl" ? "linear-gradient(135deg,#7C6AF7,#7DD3C7,#E8B4D4)" : body }}>
    <span className="absolute left-[29%] top-[35%] h-[27%] w-[13%] rounded-full transition-transform duration-150" style={{ background: eyes, transform: closed ? "scaleY(.08)" : "translate(" + look.x + "px," + look.y + "px)" }} />
    <span className="absolute left-[56%] top-[35%] h-[27%] w-[13%] rounded-full transition-transform duration-150" style={{ background: eyes, transform: closed ? "scaleY(.08)" : "translate(" + look.x + "px," + look.y + "px)" }} />
    <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-black/10" />
  </div>
}
