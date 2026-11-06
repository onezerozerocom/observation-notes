import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { currentSemester, useAsync } from '../lib/util.js'
import { groupByClass, parseRoster, readTextFile } from '../lib/roster.js'
import { ErrorBox, useSelectedClass } from '../components.jsx'

// CSV 파일을 골라 텍스트 칸에 채워 주는 버튼
function CsvButton({ onText }) {
  return (
    <label className="file-btn">
      📄 CSV 파일 불러오기
      <input
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) onText(await readTextFile(f))
          e.target.value = ''
        }}
      />
    </label>
  )
}

export default function ClassesPage() {
  const { classes, classId, cls, setClassId, reloadClasses } = useSelectedClass()
  const cur = currentSemester()
  const [form, setForm] = useState({ name: '', subject: '정보', year: cur.year, semester: cur.semester })
  const [bulk, setBulk] = useState('')
  const [roster, setRoster] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState(null)
  const students = useAsync(() => (classId ? api.listStudents(classId) : Promise.resolve([])), [classId])

  const run = async (fn) => {
    setError(null)
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const meta = { subject: form.subject, year: Number(form.year), semester: Number(form.semester) }

  const createClass = (e) => {
    e.preventDefault()
    run(async () => {
      const c = await api.createClass({ ...meta, name: form.name })
      setForm({ ...form, name: '' })
      setClassId(c.id)
      reloadClasses()
    })
  }

  const deleteClass = () =>
    confirm(`'${cls.name}' 학급과 학생·기록을 모두 삭제할까요? 되돌릴 수 없습니다.`) &&
    run(async () => {
      await api.deleteClass(cls.id)
      reloadClasses()
    })

  // ── 학번 명렬표 → 학급 자동 생성 ──
  const rosterParsed = parseRoster(roster)
  const groups = groupByClass(rosterParsed.rows)
  const noId = rosterParsed.rows.filter((r) => r.grade === undefined).length
  const findClass = (name) =>
    classes.find((c) => c.name === name && c.year === meta.year && c.semester === meta.semester)

  const importRoster = () =>
    run(async () => {
      const lines = []
      let firstId = ''
      for (const g of groups) {
        let target = findClass(g.name)
        let rows = g.students
        let skipped = 0
        if (target) {
          const existing = new Set((await api.listStudents(target.id)).map((s) => s.number))
          rows = g.students.filter((s) => !existing.has(s.number))
          skipped = g.students.length - rows.length
        } else {
          target = await api.createClass({ ...meta, name: g.name })
        }
        if (rows.length) await api.addStudents(target.id, rows)
        firstId ||= target.id
        lines.push(`${g.name}: ${rows.length}명 추가${skipped ? ` (이미 있는 ${skipped}명 건너뜀)` : ''}`)
      }
      setResult(lines.join('\n'))
      setRoster('')
      reloadClasses()
      if (firstId) setClassId(firstId)
      students.reload()
    })

  // ── 선택한 학급에 학생 추가 (번호 또는 학번 모두 가능: 학번이면 뒤 두 자리가 번호) ──
  const bulkParsed = parseRoster(bulk)
  const bulkRows = []
  for (const r of bulkParsed.rows)
    if (!bulkRows.some((x) => x.number === r.number)) bulkRows.push({ number: r.number, alias: r.alias })
  const existingNumbers = new Set((students.data || []).map((s) => s.number))
  const dupes = bulkRows.filter((r) => existingNumbers.has(r.number))
  const addBulk = () =>
    run(async () => {
      await api.addStudents(classId, bulkRows.filter((r) => !existingNumbers.has(r.number)))
      setBulk('')
      students.reload()
    })

  const rename = (s, alias) => alias !== s.alias && run(async () => { await api.updateStudent(s.id, { alias }); students.reload() })
  const removeStudent = (s) =>
    confirm(`${s.number}번 학생과 그 학생의 기록을 삭제할까요?`) &&
    run(async () => {
      await api.deleteStudent(s.id)
      students.reload()
    })

  return (
    <div className="two-col wide-right">
      <div className="stack">
        {/* 1. 새 학급 */}
        <section className="card">
          <form onSubmit={createClass} className="stack">
            <h2>새 학급</h2>
            {/* 순서: 연도·학기 → 학급 이름 → 과목 */}
            <div className="pair">
              <input
                type="number"
                inputMode="numeric"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                aria-label="연도"
              />
              <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} aria-label="학기">
                <option value={1}>1학기</option>
                <option value={2}>2학기</option>
              </select>
            </div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="학급 (예: 2학년 3반)" required />
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="과목 (예: 정보)" />
            <button className="primary">학급 만들기</button>
          </form>
        </section>

        {/* 2. 학급 목록 (별도 상자) */}
        <section className="card stack">
          <h2>학급 목록</h2>
          <ul className="class-list">
            {classes.map((c) => (
              <li key={c.id}>
                <button className={`class-item${c.id === classId ? ' on' : ''}`} onClick={() => setClassId(c.id)}>
                  <b>{c.name}</b>
                  <span className="muted">{c.year} {c.semester}학기 {c.subject}</span>
                </button>
              </li>
            ))}
            {!classes.length && <li className="muted">아직 학급이 없습니다.</li>}
          </ul>
        </section>
      </div>

      <section className="card stack">
        {!cls ? (
          <div className="muted">학급을 만들거나 선택하세요.</div>
        ) : (
          <>
            <div className="section-head">
              <h2>{cls.name} 학생 ({(students.data || []).length}명)</h2>
              <button className="link danger" onClick={deleteClass}>학급 삭제</button>
            </div>
            <div className="notice privacy">
              개인정보 보호를 위해 <b>실명 대신 이니셜이나 가명</b>을 권장합니다. 번호와 실명의 대응표는 학교 PC에 따로 보관하세요.
            </div>
            <ErrorBox error={error || students.error} />

            <table className="table">
              <thead>
                <tr><th style={{ width: 56 }}>번호</th><th>이름(가명)</th><th style={{ width: 150 }}></th></tr>
              </thead>
              <tbody>
                {(students.data || []).map((s) => (
                  <tr key={s.id}>
                    <td>{s.number}</td>
                    <td>
                      <input defaultValue={s.alias} onBlur={(e) => rename(s, e.target.value.trim())} className="inline" />
                    </td>
                    <td className="right">
                      {/* 기록 보기와 삭제 사이를 넓혀 잘못 누르지 않도록 */}
                      <span className="row-actions">
                        <Link to={`/students/${s.id}`}>기록 보기</Link>
                        <button className="link danger" onClick={() => removeStudent(s)}>삭제</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="gap-top">이 학급에 학생 추가</h2>
            <p className="hint">
              한 줄에 한 명씩 <code>번호,이름</code> 또는 <code>학번,이름</code>(뒤 두 자리가 번호)으로 입력하세요. 엑셀에서 복사해 붙여넣어도 됩니다.
            </p>
            <div className="above-input">
              <CsvButton onText={setBulk} />
            </div>
            <textarea rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'1,김OO\n2,이OO\n3,박OO'} />
            <div className="row end">
              {bulkParsed.bad.length > 0 && <span className="warn">해석할 수 없는 줄 {bulkParsed.bad.length}개: {bulkParsed.bad[0]}</span>}
              {dupes.length > 0 && <span className="muted">이미 있는 번호 {dupes.length}명은 건너뜀</span>}
              <button
                className="primary"
                disabled={busy || bulkRows.length === dupes.length || bulkParsed.bad.length > 0}
                onClick={addBulk}
              >
                {bulkRows.length - dupes.length}명 추가
              </button>
            </div>
          </>
        )}
      </section>
      {/* 3. 학번 명렬표 (맨 아래) */}
      <section className="card stack">
        <h2>학번 명렬표로 한 번에 만들기</h2>
        <p className="hint">
          <code>학번,이름</code> 형식이면 학년·반을 읽어 <b>학급을 자동으로 만들고</b> 번호와 이름을 넣습니다.
          여러 반이 섞여 있어도 됩니다.
          <br />
          예) <code>20315</code> → 2학년 3반 15번, <code>2315</code>도 가능
        </p>
        <div className="above-input">
          <CsvButton onText={(t) => { setRoster(t); setResult('') }} />
        </div>
        <textarea rows={5} value={roster} onChange={(e) => { setRoster(e.target.value); setResult('') }} placeholder={'20301,김OO\n20302,이OO\n20401,박OO'} />

        {groups.length > 0 && (
          <div className="preview">
            <div className="muted">
              과목·연도·학기는 위 '새 학급' 칸의 값(<b>{meta.subject || '과목 없음'} · {meta.year} {meta.semester}학기</b>)을 씁니다.
            </div>
            <ul>
              {groups.map((g) => (
                <li key={g.name}>
                  <b>{g.name}</b> {g.students.length}명
                  <span className={`badge${findClass(g.name) ? ' mint' : ''}`}>{findClass(g.name) ? '기존 학급에 추가' : '새로 만듦'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(rosterParsed.bad.length > 0 || noId > 0) && (
          <div className="warn">
            {rosterParsed.bad.length > 0 && <>해석할 수 없는 줄 {rosterParsed.bad.length}개: {rosterParsed.bad[0]}<br /></>}
            {noId > 0 && <>학번이 아닌 번호만 있는 줄 {noId}개는 건너뜁니다(4~5자리 학번 필요).</>}
          </div>
        )}
        <button className="primary" disabled={busy || !groups.length || rosterParsed.bad.length > 0} onClick={importRoster}>
          {groups.length ? `${groups.length}개 반 · ${groups.reduce((n, g) => n + g.students.length, 0)}명 등록` : '등록'}
        </button>
        {result && <div className="notice pre">{result}</div>}
      </section>
    </div>
  )
}
