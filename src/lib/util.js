import { useEffect, useState } from 'react'

export const today = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

// 학기 기본 기간: 1학기 3/1~8/31, 2학기 9/1~다음해 2/말
export function semesterRange(year, semester) {
  return semester === 1
    ? { from: `${year}-03-01`, to: `${year}-08-31` }
    : { from: `${year}-09-01`, to: `${year + 1}-02-${new Date(year + 1, 2, 0).getDate()}` }
}

export function currentSemester() {
  const d = new Date()
  const m = d.getMonth() + 1
  if (m >= 3 && m <= 8) return { year: d.getFullYear(), semester: 1 }
  return { year: m <= 2 ? d.getFullYear() - 1 : d.getFullYear(), semester: 2 }
}

export const studentLabel = (s) => (s ? `${s.number}번${s.alias ? ' ' + s.alias : ''}` : '')

export function countTags(observations) {
  const m = new Map()
  for (const o of observations) for (const t of o.tags || []) m.set(t, (m.get(t) || 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

// 기록 목록을 세특 초안용 텍스트로
export function toDraftText(observations) {
  return [...observations]
    .sort((a, b) => a.observed_on.localeCompare(b.observed_on))
    .map((o) => `[${o.observed_on}]${o.tags?.length ? ' (' + o.tags.join(', ') + ')' : ''} ${o.content}`)
    .join('\n')
}

export async function copyText(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 아래 대체 방법으로 */
  }
  // 대체 방법: http 주소(휴대폰 시험 접속)에서는 clipboard API가 없음
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

export function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n') // BOM: 엑셀 한글 깨짐 방지
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// 간단한 비동기 로딩 훅
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { ...state, reload: () => setTick((t) => t + 1) }
}
