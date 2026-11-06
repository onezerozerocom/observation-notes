import { useEffect, useState } from 'react'
import { api } from './lib/api.js'
import { useAsync } from './lib/util.js'

// 마지막으로 고른 학급을 페이지 간에 공유
const CLASS_KEY = 'obs-selected-class'
export function useSelectedClass() {
  const classes = useAsync(() => api.listClasses(), [])
  const [classId, setClassIdState] = useState(() => {
    try {
      return localStorage.getItem(CLASS_KEY) || ''
    } catch {
      return ''
    }
  })
  const list = classes.data || []
  const valid = list.some((c) => c.id === classId)
  const effectiveId = valid ? classId : list[0]?.id || ''

  const setClassId = (id) => {
    setClassIdState(id)
    try {
      localStorage.setItem(CLASS_KEY, id)
    } catch {
      /* 무시 */
    }
  }
  return {
    classes: list,
    loading: classes.loading,
    classId: effectiveId,
    cls: list.find((c) => c.id === effectiveId),
    setClassId,
    reloadClasses: classes.reload,
  }
}

export function ClassSelect({ classes, value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.year} {c.semester}학기 · {c.name}
          {c.subject ? ` (${c.subject})` : ''}
        </option>
      ))}
    </select>
  )
}

export function TagChip({ tag, color, active, onClick, small }) {
  // 파스텔: 바탕은 태그 색을 연하게, 글자는 태그 색을 어둡게 섞어 읽기 쉽게 (#rrggbb + 투명도)
  const text = `color-mix(in srgb, ${color} 42%, #1f1d2b)`
  const style = !onClick
    ? { background: `${color}40`, borderColor: 'transparent', color: text }
    : active
      ? { background: `${color}66`, borderColor: color, color: text, fontWeight: 700 }
      : { background: '#fff', borderColor: color, color: text }
  return (
    <button type="button" className={`chip${small ? ' small' : ''}`} style={style} onClick={onClick} disabled={!onClick}>
      {tag}
    </button>
  )
}

export function useTagColors() {
  const tags = useAsync(() => api.listTags(), [])
  const map = Object.fromEntries((tags.data || []).map((t) => [t.name, t.color]))
  return { tags: tags.data || [], colorOf: (n) => map[n] || '#64748b' }
}

export function Toast({ text }) {
  const [shown, setShown] = useState(text)
  useEffect(() => {
    setShown(text)
    if (!text) return
    const t = setTimeout(() => setShown(''), 1800)
    return () => clearTimeout(t)
  }, [text])
  return shown ? <div className="toast">{shown}</div> : null
}

export function ErrorBox({ error }) {
  return error ? <div className="error">{error.message || String(error)}</div> : null
}
