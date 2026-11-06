import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { useAsync } from '../lib/util.js'
import { ErrorBox, TagChip } from '../components.jsx'

// 기본 색 예시 3개 (파스텔 하늘·노랑·분홍). 더 필요하면 + 버튼으로 추가
const PALETTE = ['#8ecdf0', '#f5d76e', '#f5a3bf']

// + 버튼으로 추가한 색은 이 브라우저에 기억해 둠
const CUSTOM_KEY = 'obs-custom-colors'
function loadCustom() {
  try {
    const v = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]')
    return Array.isArray(v) ? v.filter((c) => /^#[0-9a-f]{6}$/i.test(c)) : []
  } catch {
    return []
  }
}

export default function TagsPage() {
  const tags = useAsync(() => api.listTags(), [])
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [custom, setCustom] = useState(loadCustom)
  const [error, setError] = useState(null)

  function addColor(c) {
    c = c.toLowerCase()
    setColor(c)
    if (PALETTE.includes(c) || custom.includes(c)) return
    const next = [...custom, c]
    setCustom(next)
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(next))
    } catch {
      /* 저장 못 해도 이번 화면에서는 사용 가능 */
    }
  }
  // 색 고르는 창을 닫을 때(최종 선택) 한 번만 추가 — React onChange는 드래그 중에도 계속 불려서 직접 연결
  const pickerRef = useRef(null)
  const addColorRef = useRef(addColor)
  addColorRef.current = addColor
  useEffect(() => {
    const el = pickerRef.current
    if (!el) return
    const onPick = () => addColorRef.current(el.value)
    el.addEventListener('change', onPick)
    return () => el.removeEventListener('change', onPick)
  }, [])

  function removeColor(c) {
    const next = custom.filter((x) => x !== c)
    setCustom(next)
    if (color === c) setColor(PALETTE[0])
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(next))
    } catch {
      /* 무시 */
    }
  }

  async function add(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.createTag({ name: name.trim(), color, sort_order: (tags.data?.length || 0) + 1 })
      setName('')
      tags.reload()
    } catch (err) {
      setError(err)
    }
  }
  async function remove(t) {
    if (!confirm(`'${t.name}' 태그를 삭제할까요? 이미 저장된 기록의 태그는 그대로 남습니다.`)) return
    await api.deleteTag(t.id)
    tags.reload()
  }

  return (
    <section className="card stack narrow">
      <h2>관찰 태그</h2>
      <p className="hint">기록할 때 누르는 태그입니다. 학기 말 통계와 세특 키워드로 활용됩니다.</p>
      <ul className="tag-list">
        {(tags.data || []).map((t) => (
          <li key={t.id}>
            <TagChip tag={t.name} color={t.color} />
            <button className="link danger" onClick={() => remove(t)}>삭제</button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 태그 이름" required maxLength={12} />
        <div className="swatches">
          {[...PALETTE, ...custom].map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch${c === color ? ' on' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              onDoubleClick={() => custom.includes(c) && confirm('이 색을 목록에서 뺄까요?') && removeColor(c)}
              aria-label={c}
              title={custom.includes(c) ? '두 번 누르면 목록에서 뺄 수 있어요' : c}
            />
          ))}
          {/* 새 색 더하기: 누르면 색 고르는 창이 열림 */}
          <label className="swatch add" title="새 색 추가" aria-label="새 색 추가">
            +
            <input ref={pickerRef} type="color" defaultValue="#a99ee8" />
          </label>
        </div>
        {!PALETTE.includes(color) && <span className="hint">선택한 색: {color}</span>}
        <button className="primary">추가</button>
      </form>
      <ErrorBox error={error} />
    </section>
  )
}
