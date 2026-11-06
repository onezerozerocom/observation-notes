// 명렬표(학생 목록) 해석
// 한 줄에 한 명. 쉼표·탭(엑셀 복사)·세미콜론·공백으로 칸을 나눕니다.
// 숫자 칸 하나와 이름 칸 하나를 찾아 씁니다(순서는 상관없음: "20315,김OO" / "김OO,20315").
//
// 숫자 칸 해석
//   1~2자리  → 번호            예) 15        → 15번
//   4자리    → 학년·반·번호     예) 2315      → 2학년 3반 15번
//   5자리    → 학년·반(2)·번호  예) 20315     → 2학년 3반 15번
//
// 첫 줄이 "학번,이름" 같은 제목 줄이면 건너뜁니다.

function splitLine(line) {
  const byDelim = line.split(/[,\t;]/)
  const cells = byDelim.length > 1 ? byDelim : line.split(/\s+/)
  return cells.map((c) => c.trim().replace(/^"(.*)"$/, '$1').trim()).filter(Boolean)
}

function parseCode(code) {
  if (code.length <= 2) return { number: Number(code) }
  if (code.length === 4) return { grade: +code[0], cls: +code[1], number: +code.slice(2) }
  if (code.length === 5) return { grade: +code[0], cls: +code.slice(1, 3), number: +code.slice(3) }
  return null
}

export function parseRoster(text) {
  const rows = []
  const bad = []
  let seenData = false
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const cells = splitLine(line)
    const codeCell = cells.find((c) => /^\d+$/.test(c))
    if (!codeCell) {
      if (!seenData) continue // 제목 줄
      bad.push(line)
      continue
    }
    seenData = true
    const parsed = parseCode(codeCell)
    if (!parsed || parsed.number < 1 || (parsed.cls !== undefined && parsed.cls < 1)) {
      bad.push(line)
      continue
    }
    const alias = cells.find((c) => c !== codeCell && !/^\d+$/.test(c)) || ''
    rows.push({ code: codeCell, alias, ...parsed })
  }
  return { rows, bad, hasStudentId: rows.some((r) => r.grade !== undefined) }
}

// 학년·반별로 묶기 (같은 학번이 두 번 나오면 첫 번째만)
export function groupByClass(rows) {
  const groups = new Map()
  for (const r of rows) {
    if (r.grade === undefined) continue
    const key = `${r.grade}-${r.cls}`
    if (!groups.has(key)) groups.set(key, { grade: r.grade, cls: r.cls, name: `${r.grade}학년 ${r.cls}반`, students: [] })
    const g = groups.get(key)
    if (!g.students.some((s) => s.number === r.number)) g.students.push({ number: r.number, alias: r.alias })
  }
  return [...groups.values()]
    .sort((a, b) => a.grade - b.grade || a.cls - b.cls)
    .map((g) => ({ ...g, students: g.students.sort((a, b) => a.number - b.number) }))
}

// CSV 파일 읽기: 엑셀의 "CSV(쉼표로 분리)" 저장은 한글이 EUC-KR 이라 UTF-8 실패 시 EUC-KR 로 다시 읽음
export async function readTextFile(file) {
  const buf = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('euc-kr').decode(buf)
  }
}
