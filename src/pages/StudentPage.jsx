import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { copyText, countTags, studentLabel, toDraftText, useAsync } from '../lib/util.js'
import { ErrorBox, TagChip, Toast, useTagColors } from '../components.jsx'

export default function StudentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // 뒤로 가기: 앱 안에서 이동해 왔으면 이전 화면으로, 주소로 바로 들어왔으면 학급·학생 화면으로
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/classes'))
  const student = useAsync(() => api.getStudent(id), [id])
  const obs = useAsync(() => api.listObservations({ studentId: id }), [id])
  const { tags, colorOf } = useTagColors()
  const [editing, setEditing] = useState(null) // { id, content, tags, observed_on }
  const [toast, setToast] = useState({ text: '', n: 0 })

  const list = obs.data || []
  const stats = countTags(list)
  const max = stats[0]?.[1] || 1

  async function saveEdit() {
    await api.updateObservation(editing.id, { content: editing.content, tags: editing.tags, observed_on: editing.observed_on })
    setEditing(null)
    obs.reload()
  }
  async function remove(oid) {
    if (!confirm('이 기록을 삭제할까요?')) return
    await api.deleteObservation(oid)
    obs.reload()
  }
  async function copyAll() {
    const ok = await copyText(toDraftText(list))
    setToast({ text: ok ? '전체 기록을 복사했습니다.' : '복사에 실패했습니다.', n: toast.n + 1 })
  }

  if (student.error) return <ErrorBox error={student.error} />
  if (!student.data) return <div className="muted">불러오는 중…</div>
  const s = student.data

  return (
    <div className="stack">
      {/* 맨 위: 작은 뒤로 → 이름·학급 → 두 버튼 나란히 */}
      <div className="student-head">
        <button className="link back-link" onClick={goBack} aria-label="뒤로 가기">← 뒤로</button>
        <div className="who-line">
          <h1 className="title">{studentLabel(s)}</h1>
          <span className="muted">{s.classes?.name}</span>
        </div>
        <div className="head-actions">
          {/* 이 학생이 선택된 상태로 기록하기 화면으로 */}
          <button className="primary" onClick={() => navigate('/', { state: { classId: s.class_id, studentId: s.id } })}>
            ✏️ 기록하러 가기
          </button>
          <button onClick={copyAll} disabled={!list.length}>📋 전체 기록 복사</button>
        </div>
      </div>

      <div className="two-col">
        <section className="card">
          <h2>태그 통계</h2>
          <p className="muted">전체 기록 {list.length}건</p>
          {stats.length === 0 ? (
            <div className="muted">태그가 달린 기록이 없습니다.</div>
          ) : (
            <div className="bars">
              {stats.map(([name, n]) => (
                <div key={name} className="bar-row">
                  <span className="bar-label">{name}</span>
                  <span className="bar-track">
                    <span className="bar" style={{ width: `${(n / max) * 100}%`, background: colorOf(name) }} />
                  </span>
                  <span className="bar-n">{n}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>관찰 타임라인</h2>
          <ErrorBox error={obs.error} />
          {list.length === 0 && <div className="muted">아직 기록이 없습니다.</div>}
          <ul className="timeline">
            {list.map((o) =>
              editing?.id === o.id ? (
                <li key={o.id} className="editing">
                  <input type="date" value={editing.observed_on} onChange={(e) => setEditing({ ...editing, observed_on: e.target.value })} />
                  <div className="chips">
                    {tags.map((t) => (
                      <TagChip
                        key={t.id}
                        tag={t.name}
                        color={t.color}
                        active={editing.tags.includes(t.name)}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            tags: editing.tags.includes(t.name) ? editing.tags.filter((x) => x !== t.name) : [...editing.tags, t.name],
                          })
                        }
                      />
                    ))}
                  </div>
                  <textarea rows={3} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                  <div className="row end">
                    <button className="ghost" onClick={() => setEditing(null)}>취소</button>
                    <button className="primary" onClick={saveEdit}>수정 저장</button>
                  </div>
                </li>
              ) : (
                <li key={o.id}>
                  <div className="row">
                    <span className="date">{o.observed_on}</span>
                    {o.tags.map((t) => <TagChip key={t} tag={t} color={colorOf(t)} small />)}
                    <span className="spacer" />
                    <button className="link" onClick={() => setEditing({ id: o.id, content: o.content, tags: [...o.tags], observed_on: o.observed_on })}>수정</button>
                    <button className="link danger" onClick={() => remove(o.id)}>삭제</button>
                  </div>
                  <p>{o.content}</p>
                </li>
              ),
            )}
          </ul>
        </section>
      </div>
      <Toast key={toast.n} text={toast.text} />
    </div>
  )
}
