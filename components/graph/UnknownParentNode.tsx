'use client'

import { Handle, Position } from '@xyflow/react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'

// UI-only placeholder father that anchors a parentless sibling group so it
// renders as a family bracket instead of floating. Not a real person — never
// editable, never sent to the backend (see lib/graph/unknownParents.ts).

const hiddenHandle = { opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1 }

export default function UnknownParentNode() {
  const isDark = useGraphStore(s => s.isDark)
  const t = getTheme(isDark)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: 128, opacity: 0.85, cursor: 'default',
    }}>
      <Handle id="top" type="target" position={Position.Top} style={hiddenHandle} />

      <div style={{
        width: 84, height: 84, borderRadius: '50%',
        border: `2px dashed ${isDark ? '#4A3F35' : '#C4A882'}`,
        background: t.cardBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isDark ? '#8A7660' : '#B89968',
        fontSize: '34px', fontWeight: 600, lineHeight: 1,
      }}>
        ?
      </div>

      <div style={{
        marginTop: '7px', fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.16em',
        textTransform: 'uppercase' as const,
        color: isDark ? '#8A7660' : 'var(--c-text-muted)',
      }}>
        Unknown
      </div>

      <Handle id="bottom" type="source" position={Position.Bottom} style={hiddenHandle} />
    </div>
  )
}

export const unknownParentNodeType = { unknownParent: UnknownParentNode }
