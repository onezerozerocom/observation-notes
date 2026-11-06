// 데이터 계층: 화면 코드는 이 파일의 함수만 사용합니다.
// .env 에 Supabase 값이 있으면 Supabase, 없으면 체험 모드(localStorage)로 동작합니다.
import { createClient } from '@supabase/supabase-js'
import { createDemoBackend } from './demo.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isDemo = !url || !key

function check({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

function createSupabaseBackend() {
  const sb = createClient(url, key)

  const toUser = (u) =>
    u ? { id: u.id, email: u.email, displayName: u.user_metadata?.display_name || u.email } : null

  return {
    auth: {
      async getUser() {
        const { data } = await sb.auth.getSession()
        return toUser(data.session?.user)
      },
      onChange(cb) {
        const { data } = sb.auth.onAuthStateChange((_e, session) => cb(toUser(session?.user)))
        return () => data.subscription.unsubscribe()
      },
      async signIn(email, password) {
        check(await sb.auth.signInWithPassword({ email, password }))
      },
      async signUp(email, password, displayName) {
        const data = check(
          await sb.auth.signUp({ email, password, options: { data: { display_name: displayName } } }),
        )
        // 이메일 인증이 켜져 있으면 session 이 없습니다.
        return { needsConfirm: !data.session }
      },
      async signOut() {
        await sb.auth.signOut()
      },
    },

    // 학급
    async listClasses() {
      return check(
        await sb.from('classes').select('*').order('year', { ascending: false }).order('name'),
      )
    },
    async createClass(c) {
      return check(await sb.from('classes').insert(c).select().single())
    },
    async updateClass(id, patch) {
      check(await sb.from('classes').update(patch).eq('id', id))
    },
    async deleteClass(id) {
      check(await sb.from('classes').delete().eq('id', id))
    },

    // 학생
    async listStudents(classId) {
      return check(await sb.from('students').select('*').eq('class_id', classId).order('number'))
    },
    async getStudent(id) {
      return check(await sb.from('students').select('*, classes(*)').eq('id', id).single())
    },
    async addStudents(classId, rows) {
      return check(
        await sb
          .from('students')
          .insert(rows.map((r) => ({ ...r, class_id: classId })))
          .select(),
      )
    },
    async updateStudent(id, patch) {
      check(await sb.from('students').update(patch).eq('id', id))
    },
    async deleteStudent(id) {
      check(await sb.from('students').delete().eq('id', id))
    },

    // 태그
    async listTags() {
      return check(await sb.from('tags').select('*').order('sort_order').order('name'))
    },
    async createTag(t) {
      return check(await sb.from('tags').insert(t).select().single())
    },
    async deleteTag(id) {
      check(await sb.from('tags').delete().eq('id', id))
    },

    // 관찰 기록
    async listObservations({ classId, studentId, from, to, limit } = {}) {
      let q = sb
        .from('observations')
        .select('*')
        .order('observed_on', { ascending: false })
        .order('created_at', { ascending: false })
      if (classId) q = q.eq('class_id', classId)
      if (studentId) q = q.eq('student_id', studentId)
      if (from) q = q.gte('observed_on', from)
      if (to) q = q.lte('observed_on', to)
      if (limit) q = q.limit(limit)
      return check(await q)
    },
    async createObservations(rows) {
      return check(await sb.from('observations').insert(rows).select())
    },
    async updateObservation(id, patch) {
      check(await sb.from('observations').update(patch).eq('id', id))
    },
    async deleteObservation(id) {
      check(await sb.from('observations').delete().eq('id', id))
    },
  }
}

export const api = isDemo ? createDemoBackend() : createSupabaseBackend()
