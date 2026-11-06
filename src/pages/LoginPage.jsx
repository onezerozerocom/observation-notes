import { useState } from 'react'
import { api, isDemo } from '../lib/api.js'

export default function LoginPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      if (mode === 'signin') await api.auth.signIn(email, password)
      else {
        const { needsConfirm } = await api.auth.signUp(email, password, name)
        if (needsConfirm) {
          setMsg('가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인하세요.')
          setMode('signin')
        }
      }
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login">
        <h1>수업 관찰 기록</h1>
        <p className="muted">수업 중 관찰을 쌓아 두고, 학기 말 세특 작성에 활용하세요.</p>

        {isDemo ? (
          <>
            <div className="notice">
              Supabase가 아직 연결되지 않아 <b>체험 모드</b>로 실행 중입니다. 예시 학급과 기록이 들어 있습니다.
            </div>
            <button className="primary wide" onClick={() => api.auth.signIn()}>체험 시작하기</button>
          </>
        ) : (
          <form onSubmit={submit} className="stack">
            {mode === 'signup' && (
              <label>
                이름 (표시용)
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="홍길동 선생님" />
              </label>
            )}
            <label>
              이메일
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label>
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>
            <button className="primary wide" disabled={busy}>
              {mode === 'signin' ? '로그인' : '가입하기'}
            </button>
            <button type="button" className="link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? '처음이신가요? 교사 계정 만들기' : '이미 계정이 있어요'}
            </button>
          </form>
        )}
        {msg && <div className="notice">{msg}</div>}
      </div>
    </div>
  )
}
