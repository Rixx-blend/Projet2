"use client"
import { useEffect, useState } from "react"
import { LiveOrb } from "@/components/ui/live-orb"

type Mood = "happy" | "curious" | "surprised" | "sleepy" | "focused"
const moods: Mood[] = ["happy", "curious", "surprised", "sleepy", "focused"]
const faces: Record<Mood, { mouth: string; left: string; right: string }> = {
  happy: { mouth: "M22 37 Q28 45 34 37", left: "M17 20 Q21 17 25 20", right: "M31 20 Q35 17 39 20" },
  curious: { mouth: "M25 39 Q29 36 33 39", left: "M17 18 Q21 16 25 18", right: "M31 17 Q35 14 39 17" },
  surprised: { mouth: "M29 35 C24 35 24 44 29 44 C34 44 34 35 29 35", left: "M17 16 Q21 12 25 16", right: "M31 16 Q35 12 39 16" },
  sleepy: { mouth: "M24 40 Q29 42 34 40", left: "M17 22 Q21 24 25 22", right: "M31 22 Q35 24 39 22" },
  focused: { mouth: "M24 41 L34 41", left: "M17 19 L25 22", right: "M31 22 L39 19" },
}
export function GreetingAvatar() {
  const [mood, setMood] = useState<Mood>("happy")
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let index = 0
    const timer = window.setInterval(() => { index = (index + 1) % moods.length; setMood(moods[index]) }, 4200)
    return () => window.clearInterval(timer)
  }, [])
  const face = faces[mood]
  return <span className="relative inline-flex size-[54px] shrink-0 items-center justify-center align-middle" aria-label={"Avatar : " + mood}>
    <LiveOrb size={54} variant="webgl" interactive blink />
    <svg viewBox="0 0 56 56" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
      <g fill="none" stroke="#17151f" strokeLinecap="round" strokeWidth="1.8" className="transition-all duration-500">
        <path d={face.left} /><path d={face.right} /><path d={face.mouth} />
      </g>
    </svg>
  </span>
}
