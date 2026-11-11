"use client"

import { LiveOrb } from "@/components/ui/live-orb"

export function GreetingAvatar() {
  return (
    <span className="inline-flex size-[54px] shrink-0 items-center justify-center align-middle">
      <LiveOrb size={54} variant="webgl" interactive blink />
    </span>
  )
}
