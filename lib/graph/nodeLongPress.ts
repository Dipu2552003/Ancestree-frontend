export interface NodeHold {
  nodeId: string
  clientX: number
  clientY: number
}

// Native capture listeners run before React/Framer/React Flow handlers. In
// particular, touchend must be non-passive so Safari's generated click can be
// cancelled without disabling normal taps or the canvas's pan/pinch gestures.
export function bindNodeLongPress(root: HTMLElement, open: (hold: NodeHold) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let hold: (NodeHold & { identifier: number; fired: boolean }) | undefined
  let suppress: { nodeId: string; until: number } | undefined

  // The held node's wrapper carries data-holding for the duration of the press,
  // so globals.css can dim it as visible "keep holding" feedback.
  // Purely cosmetic, so it must never break the gesture: anything without the
  // DOM attribute API is ignored.
  let heldEl: Element | null = null
  const setHeld = (el: Element | null) => {
    if (typeof heldEl?.removeAttribute === 'function') heldEl.removeAttribute('data-holding')
    heldEl = el && typeof el.setAttribute === 'function' ? el : null
    heldEl?.setAttribute('data-holding', '')
  }

  const clearTimer = () => { clearTimeout(timer); timer = undefined }
  const cancel = () => { clearTimer(); setHeld(null); hold = undefined }
  const nodeIdFor = (target: EventTarget | null) => {
    const el = target as Element | null
    return el?.closest?.('.react-flow__node[data-id]')?.getAttribute('data-id')
  }
  const fire = () => {
    clearTimer()
    if (!hold || hold.fired) return
    hold.fired = true
    setHeld(null)
    // Haptic tick where supported (Android); iOS Safari has no Vibration API,
    // so there the dim-then-menu sequence is the confirmation.
    try { navigator.vibrate?.(12) } catch { /* unsupported */ }
    suppress = { nodeId: hold.nodeId, until: Date.now() + 1000 }
    open({ nodeId: hold.nodeId, clientX: hold.clientX, clientY: hold.clientY })
  }
  const start = (event: TouchEvent) => {
    cancel()
    suppress = undefined // A fresh intentional tap must always work.
    if (event.touches.length !== 1) return
    const el = event.target as Element | null
    if (el?.closest?.('button, a, input, select, textarea, [role="button"]')) return
    const nodeId = nodeIdFor(event.target)
    if (!nodeId || nodeId.startsWith('__') || nodeId.startsWith('couple_')) return
    const touch = event.touches[0]
    hold = { nodeId, clientX: touch.clientX, clientY: touch.clientY, identifier: touch.identifier, fired: false }
    setHeld(el?.closest?.('.react-flow__node[data-id]') ?? null)
    timer = setTimeout(fire, 550)
  }
  const move = (event: TouchEvent) => {
    if (!hold) return
    if (event.touches.length !== 1) { cancel(); return }
    const touch = event.touches[0]
    if (touch.identifier !== hold.identifier) { cancel(); return }
    if (hold.fired) {
      // A little finger drift after opening must not start a pan and dismiss it.
      if (event.cancelable) event.preventDefault()
      event.stopPropagation()
    } else if (Math.hypot(touch.clientX - hold.clientX, touch.clientY - hold.clientY) > 12) cancel()
  }
  const end = (event: TouchEvent) => {
    if (hold?.fired) {
      suppress = { nodeId: hold.nodeId, until: Date.now() + 1000 }
      if (event.cancelable) event.preventDefault()
      event.stopPropagation()
    }
    cancel()
  }
  const click = (event: MouseEvent) => {
    if (suppress && Date.now() < suppress.until && nodeIdFor(event.target) === suppress.nodeId) {
      event.preventDefault()
      event.stopPropagation()
      if (event.type === 'click') suppress = undefined
    }
  }
  const context = (event: MouseEvent) => {
    if (!hold || nodeIdFor(event.target) !== hold.nodeId) return
    event.preventDefault()
    event.stopPropagation()
    fire() // Some mobile browsers emit contextmenu before our timer.
  }
  root.addEventListener('touchstart', start, { capture: true, passive: true })
  root.addEventListener('touchmove', move, { capture: true, passive: false })
  root.addEventListener('touchend', end, { capture: true, passive: false })
  root.addEventListener('touchcancel', cancel, true)
  root.addEventListener('click', click, true)
  root.addEventListener('mousedown', click, true)
  root.addEventListener('mouseup', click, true)
  root.addEventListener('contextmenu', context, true)
  return () => {
    cancel()
    root.removeEventListener('touchstart', start, { capture: true })
    root.removeEventListener('touchmove', move, { capture: true })
    root.removeEventListener('touchend', end, { capture: true })
    root.removeEventListener('touchcancel', cancel, { capture: true })
    root.removeEventListener('click', click, { capture: true })
    root.removeEventListener('mousedown', click, { capture: true })
    root.removeEventListener('mouseup', click, { capture: true })
    root.removeEventListener('contextmenu', context, { capture: true })
  }
}
