import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { copyText, countTags, downloadCsv, semesterRange, studentLabel, toDraftText, useAsync } from '../lib/util.js'
import { ClassSelect, ErrorBox, TagChip, Toast, useSelectedClass, useTagColors } from '../components.jsx'

export default function SummaryPage() {
  const { classes, loading, classId, cls, setClassId } = useSelectedClass()
  const { colorOf } = useTagColors()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState('number')
  const [toast, setToast] = useState({ text: '', n: 0 })

  // 학급이 바뀌면 기간을 그 학급의 학기로 맞춤
  useEffect(() => {
    if (!cls) return
    const r = semesterRange(cls.year, cls.semester)
    setFrom(r.from)
    setTo(r.to)
  }, [cls?.id])

  const students = useAsync(() => (classId ? api.listStudents(classId) : Promise.resolve([])), [classId])
  const obs = useAsync(
    () => (classId && from ? api.listObservations({ classId, from, to }) : Promise.resolve([])),
    [classId, from, to],
  )

  const rows = useMemo(() => {
    const byStudent = {}
    for (const o of obs.data || []) (byStudent[o.student_id] ||= []).push(o)
    const list = (students.data || []).map((s) => ({ s, items: byStudent[s.id] || [] }))
    if (sort === 'few') list.sort((a, b) => a.items.length - b.items.length || a.s.number - b.s.number)
    return list
  }, [students.data, obs.data, sort])

  const notify = (text) => setToast((t) => ({ text, n: t.n + 1 }))

  async function copyOne(r) {
    notify((await copyText(toDraftText(r.items))) ? `${studentLabel(r.s)} 기록을 복사했습니다.` : '복사에 실패했습니다.')
  }

  function exportCsv() {
    const out = [['번호', '이름', '날짜', '태그', '관찰 내용']]
    for (const r of rows)
      for (const o of [...r.items].sort((a, b) => a.observed_on.localeCompare(b.observed_on)))
        out.push([r.s.number, r.s.alias, o.observed_on, o.tags.join(', '), o.content])
    downloadCsv(`관찰기록_${cls?.name || ''}_${from}_${to}.csv`, out)
  }

  if (loading) return <div className="muted">불러오는 중…</div>
  if (!classes.length)
    return (
      <div className="card empty">
        아직 학급이 없습니다. <Link to="/classes">학급·학생</Link>에서 학급을 먼저 만들어 주세요.
      </div>
    )

  const total = (obs.data || []).length
  const empty = rows.filter((r) => !r.items.length).length

  return (
    <div className="stack">
      <div className="toolbar summary-bar">
        <ClassSelect classes={classes} value={classId} onChange={setClassId} />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span>~</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="number">번호순</option>
          <option value="few">기록 적은 순</option>
        </select>
        <span className="muted">
          기록 {total}건 · 기록 없는 학생 <b className={empty ? 'warn' : ''}>{empty}명</b>
        </span>
        <span className="spacer" />
        <button onClick={exportCsv} disabled={!total}>CSV 내보내기</button>
      </div>
      <ErrorBox error={obs.error || students.error} />

      <div className="summary-grid">
        {rows.map((r) => {
          const stats = countTags(r.items).slice(0, 4)
          return (
            <section key={r.s.id} className={`card summary${r.items.length ? '' : ' none'}`}>
              <div className="section-head">
                <Link to={`/students/${r.s.id}`}><h2>{studentLabel(r.s)}</h2></Link>
                <span className="muted">{r.items.length}건</span>
              </div>
              <div className="chips">
                {stats.map(([t, n]) => <TagChip key={t} tag={`${t} ${n}`} color={colorOf(t)} small />)}
              </div>
              {r.items.length ? (
                <>
                  <textarea readOnly rows={Math.min(6, r.items.length + 1)} value={toDraftText(r.items)} />
                  <div className="row end">
                    <button onClick={() => copyOne(r)}>복사</button>
                  </div>
                </>
              ) : (
                <div className="muted">이 기간에 기록이 없습니다.</div>
              )}
            </section>
          )
        })}
      </div>
      <Toast key={toast.n} text={toast.text} />
    </div>
  )
}
