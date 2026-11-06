# 수업 관찰 기록 (React + Supabase)

수업 중에 학생 관찰 내용을 짧게 기록해 두고, 학기 말에 학생별로 모아 세특 초안 작성에 활용하는 웹앱입니다.
여러 교사가 각자 계정으로 사용하며, **교사는 자기 학급·학생·기록만 볼 수 있습니다**(Supabase RLS).

## 주요 기능
| 화면 | 기능 |
|---|---|
| 기록하기 | 학생 선택(클릭 또는 번호 입력 후 Enter, 여러 명 선택 가능), 태그와 메모 입력, `Ctrl+Enter`로 저장, 기록이 없는 학생 표시 |
| 학기말 모아보기 | 기간을 정해 학생별 기록·태그 통계 보기, 학생별 복사, CSV 내보내기(엑셀용) |
| 학생 상세 | 태그 통계 막대그래프, 타임라인, 기록 수정·삭제, 전체 복사 |
| 학급·학생 | 학급 만들기, `번호,이름` 형식으로 학생 한꺼번에 추가(엑셀에서 붙여넣기 가능) |
| 태그 | 관찰 태그 추가·삭제 (가입 시 기본 태그 8개가 자동으로 만들어짐) |

## 1. 체험 모드로 실행하기 (Supabase 없이)
```bash
npm install
npm run dev
```
브라우저에서 http://localhost:5190 을 열고 **체험 시작하기**를 누르세요.
체험 모드에서는 데이터가 그 브라우저에만 저장됩니다.

## 2. Supabase 연결하기
1. https://supabase.com 에서 새 프로젝트를 만듭니다. Region은 `Northeast Asia (Seoul)`을 고르세요.
2. 왼쪽 메뉴 **SQL Editor**에서 [`supabase/schema.sql`](supabase/schema.sql)의 내용을 전부 붙여넣고 **Run**을 누릅니다.
3. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사합니다.
4. 이 폴더의 `.env.example` 파일을 복사해 `.env`로 저장하고, 복사한 두 값을 붙여넣습니다.
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. `npm run dev`를 다시 실행하면 로그인 화면이 나옵니다. **교사 계정 만들기**로 가입하세요.
   - 기본 설정에서는 가입 확인 메일이 발송됩니다. 교내에서 빠르게 시험해 보려면
     **Authentication → Sign In / Providers → Email**에서 "Confirm email"을 끌 수 있습니다.

> `anon` 키는 브라우저에 공개되어도 괜찮은 키입니다. 데이터는 RLS 정책이 보호합니다.
> 반대로 `service_role` 키는 절대 `.env`에 넣거나 공유하지 마세요.

## 3. 배포하기 (GitHub Pages)
이 저장소는 GitHub Pages로 배포됩니다. 코드를 고친 뒤 아래 한 줄이면 사이트가 갱신됩니다.
```bash
npm run deploy
```
- `.env`의 Supabase 값이 빌드에 들어가므로, `.env`가 있는 PC에서 실행하세요.
- 빌드 결과물(`dist`)이 `gh-pages` 브랜치로 올라가고, 1~2분 뒤 사이트에 반영됩니다.
- 코드 자체(`main` 브랜치)는 평소처럼 `git add` → `git commit` → `git push`로 올립니다.

주소를 해시 방식(`/#/summary`)으로 쓰기 때문에 별도의 라우팅 설정은 필요 없습니다.

## 개인정보 관련 주의
- 학생 이름은 **실명 대신 이니셜이나 가명**으로 입력하세요. 번호와 실명의 대응표는 학교 PC에 따로 보관하는 것을 권장합니다.
- 실제 운영 전에 학교의 개인정보 처리 지침과 담당자 의견을 확인하세요(해외 클라우드에 저장됨).

## 폴더 구조
```
supabase/schema.sql    DB 테이블, RLS 보안 정책, 가입 시 자동 생성 트리거
src/lib/api.js         데이터 계층 (Supabase 구현)
src/lib/demo.js        체험 모드 구현 (localStorage)
src/lib/util.js        날짜·학기 계산, 복사, CSV 등 도우미
src/components.jsx     공용 컴포넌트 (학급 선택, 태그 칩, 알림)
src/pages/             화면별 컴포넌트
```

## DB 구조
- `profiles`: 교사 프로필
- `classes`: 학급 (교사 소유)
- `students`: 학생 (학급 소속, 번호와 가명)
- `tags`: 교사별 관찰 태그
- `observations`: 관찰 기록 (날짜, 내용, 태그 배열)

모든 테이블에 `teacher_id = auth.uid()` 조건의 RLS가 걸려 있습니다.
학생과 기록은 "내 학급에 속한 경우에만" 추가할 수 있도록 한 번 더 검사합니다.
