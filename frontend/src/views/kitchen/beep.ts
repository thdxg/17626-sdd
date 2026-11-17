// One short Web Audio beep: no audio file, no network (Constitution IV). REQ-21 (SHOULD)
import { createContext, createElement, useContext } from 'react'
import type { ReactNode } from 'react'

type AudioCtor = typeof AudioContext
let ctx: AudioContext | null = null

export function playBeep(): void {
  try {
    const Ctor: AudioCtor | undefined =
      typeof window === 'undefined'
        ? undefined
        : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext)
    if (!Ctor) return
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // Audio may be blocked or unavailable; the label remains the primary signal.
  }
}

const BeepContext = createContext<() => void>(playBeep)

export function BeepProvider(props: { playBeep: () => void; children?: ReactNode }) {
  return createElement(BeepContext.Provider, { value: props.playBeep }, props.children)
}

export function useBeep(): () => void {
  return useContext(BeepContext)
}
