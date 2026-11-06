import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { semesterRange, studentLabel, today, useAsync } from '../lib/util.js'
import { ClassSelect, ErrorBox, TagChip, Toast, useSelectedClass, useTagColors } from '../components.jsx'

export default function RecordPage() {
  const { classes, loading, classId, cls, setClassId } = useSelectedClass()
  const { tags, colorOf } = useTagColors()
  const students = useAsync(() => (classId ? api.listStudents(classId) : Promise.resolve([])), [classId])
  const range = cls ? semesterRange(cls.year, cls.semester) : {}
  const obs = useAsync(
    () => (classId ? api.listObservations({ classId, ...range }) : Promise.resolve([])),
    [classId, range.from],
  )

  const [selected, setSelected] = useState([])
  const [activeTags, setActiveTags] = useState([])
  const [content, setContent] = useState('')
  const [date, setDate] = useState(today())
  const [jump, setJump] = useState('')
  const [toast, setToast] = useState({ text: '', n: 0 })
  const [error, setError] = useState(null)
  const memoRef = useRef(null)
  const memoCardRef = useRef(null)
  const [memoVisible, setMemoVisible] = useState(false)

  // 학생 상세의 '기록하러 가기'로 왔으면: 그 학급을 고르고 그 학생을 선택해 둠
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const st = location.state
    if (!st?.classId || !st?.studentId) return
    setClassId(st.classId)
    setSelected([st.studentId])
    navigate('.', { replace: true, state: null }) // 새로고침 때 다시 적용되지 않도록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // 휴대폰: 관찰 내용 칸이 화면에 안 보일 때만 '기록 쓰기' 버튼을 띄움
  useEffect(() => {
    const el = memoCardRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setMemoVisible(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  })

  const studentList = students.data || []
  const obsList = obs.data || []
  const byId = useMemo(() => Object.fromEntries(studentList.map((s) => [s.id, s])), [studentList])
  const counts = useMemo(() => {
    const m = {}
    for (const o of obsList) m[o.student_id] = (m[o.student_id] || 0) + 1
    return m
  }, [obsList])
  const unrecorded = studentList.filter((s) => !counts[s.id]).length

  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const toggleTag = (n) => setActiveTags((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]))

  function onJump(e) {
    e.preventDefault()
    const s = studentList.find((x) => x.number === Number(jump))
    if (s) {
      toggle(s.id)
      setJump('')
    } else if (jump) {
      setToast((t) => ({ text: `${jump}번 학생이 없습니다.`, n: t.n + 1 }))
    }
  }

  async function save() {
    if (!selected.length || (!content.trim() && !activeTags.length)) return
    setError(null)
    try {
      await api.createObservations(
        selected.map((sid) => ({ class_id: classId, student_id: sid, observed_on: date, content: content.trim(), tags: activeTags })),
      )
      setToast((t) => ({ text: `${selected.length}명에게 기록을 저장했습니다.`, n: t.n + 1 }))
      setSelected([])
      setActiveTags([])
      setContent('')
      obs.reload()
    } catch (err) {
      setError(err)
    }
  }

  async function remove(id) {
    if (!confirm('이 기록을 삭제할까요?')) return
    await api.deleteObservation(id)
    obs.reload()
  }

  if (loading) return <div className="muted">불러오는 중…</div>
  if (!classes.length)
    return (
      <div className="card empty">
        아직 학급이 없습니다. <Link to="/classes">학급·학생</Link>에서 학급을 먼저 만들어 주세요.
      </div>
    )

  const canSave = selected.length > 0 && (content.trim() || activeTags.length)

  return (
    <div className="record">
      <div className="toolbar">
        <ClassSelect classes={classes} value={classId} onChange={(id) => { setClassId(id); setSelected([]) }} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <form onSubmit={onJump} className="jump">
          <input inputMode="numeric" enterKeyHint="go" value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))} placeholder="번호" aria-label="학생 번호" />
          {/* 휴대폰 숫자 키패드에는 Enter 키가 없어서 버튼으로도 선택 */}
          <button type="submit" disabled={!jump}>선택</button>
        </form>
        <span className="muted record-stat">
          이번 학기 기록 {obsList.length}건 · 기록 없는 학생 <b className={unrecorded ? 'warn' : ''}>{unrecorded}명</b>
        </span>
      </div>

      <div className="record-grid">
        <section className="card">
          <div className="section-head">
            <h2>학생 선택</h2>
            {selected.length > 0 && <button className="link" onClick={() => setSelected([])}>선택 해제 ({selected.length})</button>}
          </div>
          {studentList.length === 0 ? (
            <div className="muted">
              이 학급에 학생이 없습니다. <Link to="/classes">학생 추가하기</Link>
            </div>
          ) : (
            <div className="student-grid">
              {studentList.map((s) => (
                <button
                  key={s.id}
                  className={`student${selected.includes(s.id) ? ' on' : ''}${counts[s.id] ? '' : ' none'}`}
                  onClick={() => toggle(s.id)}
                  title={counts[s.id] ? `이번 학기 ${counts[s.id]}건` : '이번 학기 기록 없음'}
                >
                  <span className="num">{s.number}</span>
                  <span className="alias">{s.alias || '-'}</span>
                  <span className="count">{counts[s.id] || 0}</span>
                </button>
              ))}
            </div>
          )}
          <p className="hint">여러 명을 고르면 같은 기록이 각자에게 저장됩니다(모둠 활동 등). 실선은 기록이 있는 학생, 점선은 아직 기록이 없는 학생, 민트색은 지금 선택한 학생입니다.</p>
        </section>

        <section className="card" ref={memoCardRef}>
          <h2>관찰 내용</h2>
          <div className="selected-line">
            {selected.length ? selected.map((id) => <span key={id} className="pill">{studentLabel(byId[id])}</span>) : <span className="muted">먼저 학생을 선택하세요</span>}
          </div>
          <div className="chips">
            {tags.map((t) => (
              <TagChip key={t.id} tag={t.name} color={t.color} active={activeTags.includes(t.name)} onClick={() => toggleTag(t.name)} />
            ))}
          </div>
          <textarea
            ref={memoRef}
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save()
            }}
            placeholder="예: 반복문 과제에서 오류 원인을 스스로 찾아 수정하고 친구에게 설명함."
          />
          <div className="row end">
            <span className="hint desktop-only">Ctrl + Enter 로 저장</span>
            <button className="primary save-btn" disabled={!canSave} onClick={save}>
              {selected.length > 1 ? `${selected.length}명에게 저장` : '저장'}
            </button>
          </div>
          <ErrorBox error={error} />
        </section>
      </div>

      <section className="card">
        <h2>최근 기록</h2>
        <ErrorBox error={obs.error} />
        {obsList.length === 0 ? (
          <div className="muted">이번 학기 기록이 아직 없습니다.</div>
        ) : (
          <ul className="obs-list">
            {obsList.slice(0, 15).map((o) => (
              <li key={o.id}>
                <span className="date">{o.observed_on}</span>
                <Link to={`/students/${o.student_id}`} className="who">{studentLabel(byId[o.student_id])}</Link>
                <span className="tags">{o.tags.map((t) => <TagChip key={t} tag={t} color={colorOf(t)} small />)}</span>
                <span className="content">{o.content}</span>
                <button className="link danger" onClick={() => remove(o.id)}>삭제</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {selected.length > 0 && !memoVisible && (
        <button
          className="fab mobile-only"
          onClick={() => {
            memoCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          ✏️ {selected.length}명 기록 쓰기
        </button>
      )}
      <Toast key={toast.n} text={toast.text} />
    </div>
  )
}
