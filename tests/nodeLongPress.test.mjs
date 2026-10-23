import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bindNodeLongPress } from '../lib/graph/nodeLongPress.ts'

class Canvas extends EventTarget {
  nodeId = 'person-1'
  interactive = false
  options = new Map()
  closest(selector) {
    if (selector.includes('.react-flow__node')) return this.nodeId ? { getAttribute: () => this.nodeId } : null
    return this.interactive ? this : null
  }
  addEventListener(type, callback, options) {
    this.options.set(type, options)
    super.addEventListener(type, callback, options)
  }
}
const touch = (x = 50, y = 60, identifier = 1) => ({ clientX: x, clientY: y, identifier })
function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
  const root = new Canvas(), opened = []
  const dispose = bindNodeLongPress(root, value => opened.push(value))
  t.after(dispose)
  const send = (type, touches = []) => {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'touches', { value: touches })
    root.dispatchEvent(event)
    return event
  }
  return { root, opened, dispose, send, tick: ms => t.mock.timers.tick(ms) }
}

test('short taps remain normal clicks and touchend is explicitly non-passive', t => {
  const { root, opened, send, tick } = setup(t)
  send('touchstart', [touch()]); tick(100)
  assert.equal(send('touchend').defaultPrevented, false)
  tick(600)
  assert.equal(opened.length, 0)
  assert.equal(send('click').defaultPrevented, false)
  assert.deepEqual(root.options.get('touchend'), { capture: true, passive: false })
})

test('hold opens once; drift, release and generated mouse events cannot dismiss it', t => {
  const { opened, send, tick } = setup(t)
  send('touchstart', [touch()]); tick(550)
  assert.deepEqual(opened, [{ nodeId: 'person-1', clientX: 50, clientY: 60 }])
  assert.equal(send('touchmove', [touch(65)]).defaultPrevented, true)
  tick(2000) // Holding longer must not defeat click suppression after release.
  assert.equal(send('touchend').defaultPrevented, true)
  assert.equal(send('mousedown').defaultPrevented, true)
  assert.equal(send('mouseup').defaultPrevented, true)
  assert.equal(send('click').defaultPrevented, true)
  assert.equal(opened.length, 1)
})

test('movement cancels a pending hold, while small finger jitter is tolerated', t => {
  const { opened, send, tick } = setup(t)
  send('touchstart', [touch()]); send('touchmove', [touch(64)]); tick(600)
  assert.equal(opened.length, 0)
  assert.equal(send('touchend').defaultPrevented, false)
  send('touchstart', [touch()]); send('touchmove', [touch(57)]); tick(550)
  assert.equal(opened.length, 1)
})

test('pinching and touchcancel never open a pending menu', t => {
  const { opened, send, tick } = setup(t)
  send('touchstart', [touch()]); send('touchstart', [touch(), touch(80, 60, 2)]); tick(600)
  assert.equal(opened.length, 0)
  send('touchstart', [touch()]); send('touchcancel'); tick(600)
  assert.equal(opened.length, 0)
})

test('native mobile contextmenu opens only once; desktop contextmenu is untouched', t => {
  const { opened, send, tick } = setup(t)
  assert.equal(send('contextmenu').defaultPrevented, false)
  send('touchstart', [touch()]); tick(400)
  assert.equal(send('contextmenu').defaultPrevented, true)
  tick(600)
  assert.equal(opened.length, 1)
})

test('a fresh intentional tap works immediately, including action buttons', t => {
  const { root, opened, send, tick } = setup(t)
  send('touchstart', [touch()]); tick(550); send('touchend')
  root.interactive = true
  send('touchstart', [touch()]); tick(600)
  assert.equal(send('touchend').defaultPrevented, false)
  assert.equal(send('click').defaultPrevented, false)
  assert.equal(opened.length, 1)
})

test('unmount cleans pending timers and all handlers', t => {
  const { opened, dispose, send, tick } = setup(t)
  send('touchstart', [touch()]); dispose(); tick(600)
  send('touchstart', [touch()]); tick(600)
  assert.equal(opened.length, 0)
})
