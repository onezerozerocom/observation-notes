import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { api, isDemo } from './lib/api.js'
import LoginPage from './pages/LoginPage.jsx'
import RecordPage from './pages/RecordPage.jsx'
import ClassesPage from './pages/ClassesPage.jsx'
import StudentPage from './pages/StudentPage.jsx'
import SummaryPage from './pages/SummaryPage.jsx'
import TagsPage from './pages/TagsPage.jsx'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = 확인 중

  useEffect(() => {
    api.auth.getUser().then(setUser)
    return api.auth.onChange(setUser)
  }, [])

  // 화면을 옮기면 맨 위부터 보이도록
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  if (user === undefined) return <div className="center muted">불러오는 중…</div>
  if (!user) return <LoginPage />

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">수업 관찰 기록</div>
        {/* 휴대폰에서는 화면 아래 탭 바, PC에서는 상단 메뉴로 보입니다 */}
        <nav className="tabbar">
          <NavLink to="/" end><span className="ico">✏️</span><span>기록하기</span></NavLink>
          <NavLink to="/summary"><span className="ico">📋</span><span>모아보기</span></NavLink>
          <NavLink to="/classes"><span className="ico">👥</span><span>학급·학생</span></NavLink>
          <NavLink to="/tags"><span className="ico">🏷️</span><span>태그</span></NavLink>
        </nav>
        <div className="user">
          {isDemo && (
            <button className="link" onClick={() => confirm('체험 데이터를 처음 상태로 되돌릴까요?') && api.auth.resetDemo()}>
              초기화
            </button>
          )}
          <span className="muted desktop-only">{user.displayName}</span>
          <button className="ghost" onClick={() => api.auth.signOut()}>로그아웃</button>
        </div>
      </header>
      {isDemo && (
        <div className="demo-banner">
          체험 모드: 기록은 이 브라우저에만 저장됩니다.
        </div>
      )}
      <main>
        <Routes>
          <Route path="/" element={<RecordPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/students/:id" element={<StudentPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}
