// GitHub Pages 배포: 빌드된 dist 폴더를 gh-pages 브랜치에 올립니다.
// 사용법: npm run deploy   (빌드 + 이 스크립트 실행)
import { execSync } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })
const out = (cmd) => execSync(cmd).toString().trim()

const dist = join(process.cwd(), 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html 이 없습니다. 먼저 npm run build 가 성공해야 합니다.')
  process.exit(1)
}
if (!existsSync(join(process.cwd(), '.env'))) {
  console.warn('⚠️  .env 가 없어 Supabase 연결 없이(체험 모드로) 배포됩니다.')
}

const remote = out('git remote get-url origin')
writeFileSync(join(dist, '.nojekyll'), '') // GitHub Pages가 파일을 가공하지 않도록

// dist 안에 임시 저장소를 만들어 gh-pages 브랜치로 강제 푸시 (배포 결과물만 올라감)
rmSync(join(dist, '.git'), { recursive: true, force: true })
const git = (args) => run(`git ${args}`, { cwd: dist })
git('init -q -b gh-pages')
git('add -A')
git(`-c user.name="deploy" -c user.email="deploy@localhost" commit -q -m "deploy ${new Date().toISOString()}"`)
git(`push -q -f "${remote}" gh-pages`)
rmSync(join(dist, '.git'), { recursive: true, force: true })

console.log('\n✅ 배포 완료! 1~2분 뒤 GitHub Pages 주소에서 확인하세요.')
