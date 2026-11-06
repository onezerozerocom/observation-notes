// 체험 모드: Supabase 없이 브라우저(localStorage)에 저장합니다.
// api.js 의 Supabase 구현과 같은 함수 모양을 가집니다.

const KEY = 'obs-demo-v1'
const DEMO_USER = { id: 'demo', email: 'demo@example.com', displayName: '체험 교사' }

// crypto.randomUUID 는 https/localhost 에서만 동작하므로, 휴대폰으로 http 주소에 접속할 때를 위한 대체 방법
const uid = () => {
  if (crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
const now = () => new Date().toISOString()
const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const DEFAULT_TAGS = [
  ['문제해결', '#2563eb'],
  ['협업', '#16a34a'],
  ['발표', '#d97706'],
  ['질문', '#7c3aed'],
  ['창의성', '#db2777'],
  ['성실', '#0891b2'],
  ['성장', '#65a30d'],
  ['도움필요', '#dc2626'],
]

function seed() {
  const classId = uid()
  const students = Array.from({ length: 12 }, (_, i) => ({
    id: uid(),
    teacher_id: 'demo',
    class_id: classId,
    number: i + 1,
    alias: `학생${String.fromCharCode(65 + i)}`,
    note: '',
    created_at: now(),
  }))
  const samples = [
    [0, 1, ['문제해결'], '반복문 과제에서 중첩 반복 구조를 스스로 설계하고 디버깅 과정을 친구에게 설명함.'],
    [0, 8, ['발표', '창의성'], '조별 프로젝트 발표에서 사용자 시나리오를 예시로 들어 알고리즘을 쉽게 설명함.'],
    [1, 3, ['협업'], '모둠 활동에서 역할 분담표를 만들어 진행을 이끔.'],
    [2, 2, ['질문'], '리스트와 튜플의 차이를 메모리 관점에서 질문함.'],
    [2, 10, ['성장'], '초반에는 오류 메시지를 읽지 않았으나 최근에는 스스로 원인을 찾아 수정함.'],
    [4, 5, ['도움필요'], '함수의 매개변수 개념을 어려워함. 다음 시간 보충 설명 필요.'],
    [5, 4, ['성실', '문제해결'], '추가 과제를 모두 제출하고 다른 풀이 방법도 시도함.'],
  ]
  const observations = samples.map(([si, ago, tags, content]) => ({
    id: uid(),
    teacher_id: 'demo',
    class_id: classId,
    student_id: students[si].id,
    observed_on: daysAgo(ago),
    content,
    tags,
    created_at: now(),
    updated_at: now(),
  }))
  return {
    loggedIn: false,
    classes: [
      { id: classId, teacher_id: 'demo', name: '2학년 3반 (예시)', subject: '정보', year: new Date().getFullYear(), semester: 2, created_at: now() },
    ],
    students,
    tags: DEFAULT_TAGS.map(([name, color], i) => ({ id: uid(), teacher_id: 'demo', name, color, sort_order: i + 1, created_at: now() })),
    observations,
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* 저장소를 쓸 수 없으면 새로 시작 */
  }
  return seed()
}

export function createDemoBackend() {
  let db = load()
  const listeners = new Set()
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
    } catch {
      /* 무시: 메모리에만 유지 */
    }
  }
  const emit = () => listeners.forEach((cb) => cb(db.loggedIn ? DEMO_USER : null))
  const byObsOrder = (a, b) =>
    b.observed_on.localeCompare(a.observed_on) || b.created_at.localeCompare(a.created_at)

  return {
    auth: {
      async getUser() {
        return db.loggedIn ? DEMO_USER : null
      },
      onChange(cb) {
        listeners.add(cb)
        return () => listeners.delete(cb)
      },
      async signIn() {
        db.loggedIn = true
        save()
        emit()
      },
      async signUp() {
        db.loggedIn = true
        save()
        emit()
        return { needsConfirm: false }
      },
      async signOut() {
        db.loggedIn = false
        save()
        emit()
      },
      async resetDemo() {
        db = { ...seed(), loggedIn: true }
        save()
        emit()
      },
    },

    async listClasses() {
      return [...db.classes].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name))
    },
    async createClass(c) {
      const row = { id: uid(), teacher_id: 'demo', subject: '', year: new Date().getFullYear(), semester: 1, created_at: now(), ...c }
      db.classes.push(row)
      save()
      return row
    },
    async updateClass(id, patch) {
      db.classes = db.classes.map((c) => (c.id === id ? { ...c, ...patch } : c))
      save()
    },
    async deleteClass(id) {
      db.classes = db.classes.filter((c) => c.id !== id)
      db.students = db.students.filter((s) => s.class_id !== id)
      db.observations = db.observations.filter((o) => o.class_id !== id)
      save()
    },

    async listStudents(classId) {
      return db.students.filter((s) => s.class_id === classId).sort((a, b) => a.number - b.number)
    },
    async getStudent(id) {
      const s = db.students.find((x) => x.id === id)
      if (!s) throw new Error('학생을 찾을 수 없습니다.')
      return { ...s, classes: db.classes.find((c) => c.id === s.class_id) }
    },
    async addStudents(classId, rows) {
      const taken = new Set(db.students.filter((s) => s.class_id === classId).map((s) => s.number))
      for (const r of rows) {
        if (taken.has(r.number)) throw new Error(`${r.number}번 학생이 이미 있습니다.`)
        taken.add(r.number)
      }
      const added = rows.map((r) => ({ id: uid(), teacher_id: 'demo', class_id: classId, alias: '', note: '', created_at: now(), ...r }))
      db.students.push(...added)
      save()
      return added
    },
    async updateStudent(id, patch) {
      db.students = db.students.map((s) => (s.id === id ? { ...s, ...patch } : s))
      save()
    },
    async deleteStudent(id) {
      db.students = db.students.filter((s) => s.id !== id)
      db.observations = db.observations.filter((o) => o.student_id !== id)
      save()
    },

    async listTags() {
      return [...db.tags].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    },
    async createTag(t) {
      if (db.tags.some((x) => x.name === t.name)) throw new Error('같은 이름의 태그가 있습니다.')
      const row = { id: uid(), teacher_id: 'demo', color: '#64748b', sort_order: db.tags.length + 1, created_at: now(), ...t }
      db.tags.push(row)
      save()
      return row
    },
    async deleteTag(id) {
      db.tags = db.tags.filter((t) => t.id !== id)
      save()
    },

    async listObservations({ classId, studentId, from, to, limit } = {}) {
      let rows = db.observations.filter(
        (o) =>
          (!classId || o.class_id === classId) &&
          (!studentId || o.student_id === studentId) &&
          (!from || o.observed_on >= from) &&
          (!to || o.observed_on <= to),
      )
      rows.sort(byObsOrder)
      return limit ? rows.slice(0, limit) : rows
    },
    async createObservations(rows) {
      const added = rows.map((r) => ({ id: uid(), teacher_id: 'demo', tags: [], content: '', created_at: now(), updated_at: now(), ...r }))
      db.observations.push(...added)
      save()
      return added
    },
    async updateObservation(id, patch) {
      db.observations = db.observations.map((o) => (o.id === id ? { ...o, ...patch, updated_at: now() } : o))
      save()
    },
    async deleteObservation(id) {
      db.observations = db.observations.filter((o) => o.id !== id)
      save()
    },
  }
}
