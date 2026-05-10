# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

React 19 + TypeScript + Vite 기반의 **노트 앱 실습 프로젝트**.
간단한 노트 CRUD 기능을 제공하며, 백엔드는 `json-server`(`db.json`)로 모킹된 REST API를 사용한다.
인증·라우팅·배포 설정은 의도적으로 포함되어 있지 않은 학습용 구조.

## 개발 명령어

| 명령어 | 동작 |
|--------|------|
| `npm run dev` | Vite(5173) + JSON Server(3001)를 `concurrently`로 동시 실행 |
| `npm run server` | JSON Server만 단독 실행 |
| `npm run build` | `tsc && vite build` (타입 검사 후 번들) |
| `npm run lint` | `eslint . --fix` |
| `npm run format` | Prettier 일괄 포맷 |
| `npm test` | Vitest 1회 실행 |
| `npm run test:watch` | Vitest 감시 모드 |

- **단일 테스트 실행**: `npx vitest run <파일경로>` 또는 `npx vitest run -t "<테스트명>"`
- 앱: <http://localhost:5173> / API: <http://localhost:3001/notes>

## 아키텍처

데이터는 **3계층**으로 단방향 흐름을 갖는다.

```
components/  ──(useNotes 훅)──▶  context/NotesContext  ──▶  api/notes  ──▶  JSON Server
```

1. **`src/api/notes.ts`** — REST 호출 함수 (`fetchNotes`, `createNote`, `updateNote`, `deleteNote`).
   `API_URL = http://localhost:3001`. `createNote`/`updateNote`는 `createdAt`·`updatedAt`을 ISO 문자열로 채워 보낸다.
2. **`src/context/NotesContext.tsx`** — `NotesProvider`가 `notes` / `loading` / `error` 상태와
   `addNote` / `editNote` / `removeNote` 액션을 노출. 컴포넌트는 반드시 `useNotes()` 훅으로 접근하며,
   Provider 밖에서 호출하면 명시적 에러를 던진다.
3. **`src/components/*`** — UI는 Context만 구독한다. **컴포넌트에서 `api/`를 직접 import하지 말 것** —
   상태 동기화는 Context 액션을 통해서만 수행한다.

### 상태 관리 원칙
- 외부 상태 라이브러리 없음 (Redux/Zustand 등 도입 금지) — Context API 단일 소스.
- **서버 응답 기반 갱신**: API 호출 결과(`newNote`, `updated`)를 받아 `setNotes`로 반영. 낙관적 업데이트는 사용하지 않는다.
- `id`는 서버(JSON Server)가 생성하므로 클라이언트에서 임의 부여하지 않는다. `createdAt` / `updatedAt`은 `createNote` / `updateNote`에서 클라이언트가 `new Date().toISOString()`으로 채워 보낸다.

### 타입 정의 위치
- 도메인 타입: `src/types/note.ts` (`Note` 인터페이스)
- Context 타입: `NotesContext.tsx` 내부 (`NotesContextType`)

## 프로젝트 구조

```
src/
├── api/          # JSON Server REST 호출 (notes.ts)
├── components/   # NoteEditor, NoteList, NoteItem, Layout
├── context/      # NotesContext (전역 상태)
├── types/        # 도메인 타입 정의
├── App.tsx       # 루트, NotesProvider로 감싸 Layout 렌더
├── main.tsx      # 진입점
└── test-setup.ts # Vitest 셋업
```

`db.json`이 JSON Server의 데이터 저장소이며, 개발 중 직접 편집해 시드 데이터를 조정할 수 있다.

## 테스트 구성

- **Vitest + jsdom** 환경 (`vite.config.ts:7-11`).
- 셋업 파일: `src/test-setup.ts` (`@testing-library/jest-dom` matchers 등록 위치).
- 사용 가능 라이브러리: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- 테스트 파일은 아직 작성되어 있지 않다. 추가 시 대상 모듈 옆(`Foo.tsx` ↔ `Foo.test.tsx`) 또는 `__tests__/` 디렉토리에 배치.
- API를 호출하는 컴포넌트 테스트는 `fetch`를 모킹하거나 `NotesContext`를 감싼 테스트 Provider로 격리할 것.

## 코드 스타일 · 도구

- **Prettier** (`.prettierrc`): `semi: true`, `singleQuote: true`, `tabWidth: 2`, `printWidth: 100`.
- **ESLint** (`eslint.config.js`): `typescript-eslint` + `react-hooks` + `react-refresh`.
- **TypeScript** strict mode 활성 — 타입 우회(`any`, `as unknown as`)는 마지막 수단.

## 구현 패턴

### 컴포넌트 구현

- **선언·내보내기**: 모든 컴포넌트는 `export function ComponentName(...) { }` 형태(named export, function 선언). 단 루트 `App.tsx`만 `export default App` 사용.
- **Props 타입**: 파일 내부에 `interface ComponentNameProps`로 정의(파일 외부로 export하지 않음). 예: `NoteEditor.tsx:4-8`, `NoteList.tsx:4-7`, `NoteItem.tsx:3-8`, `Layout.tsx:3-7`.
- **컴포지션 슬롯**: `Layout`은 `sidebar`/`main`을 `ReactNode`로 받아 합성한다(`Layout.tsx:5-6`). 자식 위치를 props로 명시할 때 동일 패턴 사용.
- **폼**: 모두 controlled component (`value` + `onChange={(e) => setX(e.target.value)}`). 예: `NoteEditor.tsx:73-91`.
- **조건부 렌더링**: 화면 단위 분기는 **early return** 우선 (`NoteList.tsx:12-28`, `NoteEditor.tsx:52-63`). className 분기는 삼항(`NoteItem.tsx:14-18`). `&&` 단축 렌더링은 사용하지 않는다.
- **Fragment**: 단일 root가 아니면 `<>...</>` 사용 (`NoteList.tsx:31-44`).
- **스타일**: TailwindCSS utility class만 사용. CSS 모듈/CSS-in-JS/`style` 인라인은 디자인 토큰(`bg-card`, `text-muted-foreground`, `text-destructive` 등)으로 흡수.
- **컴포넌트 → Context 구독**: 함수 본문 최상단에서 `useNotes()` 호출 후 **필요한 키만 구조분해**한다 (`NoteEditor.tsx:11`, `NoteList.tsx:10`).

### 상태 관리

(위 "아키텍처 > 상태 관리 원칙" 섹션을 보완하는 세부 규칙이다.)

- **Context 생성**: `createContext<T | null>(null)` + 커스텀 훅(`useNotes`)에서 `if (!ctx) throw` 가드 (`NotesContext.tsx:14, 51-55`). 기본 객체로 초기화하지 않는다.
- **상태 업데이트**: 항상 함수형 업데이트 — `setNotes((prev) => [...prev, newNote])` / `prev.map(...)` / `prev.filter(...)` (`NotesContext.tsx:31, 36, 41`). 직접 값 전달 금지(stale closure 방지).
- **로딩/에러 상태 이름**: prefix 없는 단순명사 — `loading`, `error`(메시지 string), `saving`(컴포넌트 지역). `isLoading`/`errorMessage` 같은 변형은 쓰지 않는다.
- **초기 데이터 로드**: `NotesProvider`의 `useEffect(() => { ... }, [])`에서 promise chain(`.then().catch().finally()`)으로 처리 (`NotesContext.tsx:21-27`). try/catch 아님.
- **액션 함수 시그니처**: `addNote(title, content)` / `editNote(id, updates)` / `removeNote(id)` 형태로, **API 응답을 await한 뒤 `setNotes`로 반영**한다(낙관적 업데이트 금지).
- **에러 처리 책임**: 액션 자체는 try/catch를 걸지 않고 호출자(컴포넌트)가 처리한다 (`NoteEditor.tsx:33-44` 참고). **에러 보고는 `console.error`로만 한다 — `alert` 사용 금지.** 입력 유효성 가드도 `alert` 대신 silent return을 쓴다(`NoteEditor.tsx:30`). 이 부분은 일관성 주의 — 아래 "일관성 주의 사항" 섹션 참조.

### API 호출

- **위치**: `src/api/notes.ts`만 `fetch`를 호출한다. **컴포넌트·Context 외 어떤 곳에서도 `fetch`를 직접 쓰지 않는다.**
- **Base URL**: 파일 상단 `const API_URL = 'http://localhost:3001'` 상수로 고정 (`notes.ts:3`). URL 조립은 템플릿 리터럴.
- **요청 옵션 형태**:
  ```ts
  fetch(`${API_URL}/notes`, {
    method: 'POST' | 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  ```
  GET·DELETE는 헤더/바디 생략.
- **응답 검증**: 모든 함수가 `if (!res.ok) throw new Error('Failed to ... note')` 후 `return res.json()` (`notes.ts:7, 20, 30, 36`). DELETE는 반환값 없는 `Promise<void>`.
- **입력 타입**:
  - `createNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>` — 서버/클라이언트 자동생성 필드를 제외.
  - `updateNote(id, updates: Partial<Note>)` — id를 별도 인자로 받고 변경분만 전달.
- **타임스탬프**: `createNote`/`updateNote`는 클라이언트가 `new Date().toISOString()`으로 `createdAt`·`updatedAt`을 채워 보낸다 (`notes.ts:14, 18, 28`). `id`만 JSON Server가 생성.

### 네이밍 컨벤션

- **파일명**:
  - 컴포넌트·Provider: `PascalCase.tsx` (`NoteEditor.tsx`, `NotesContext.tsx`)
  - 모듈·타입: `camelCase.ts` (`notes.ts`, `note.ts`)
- **함수명 — 레이어별로 다른 동사를 의도적으로 사용**한다:
  - API 레이어(REST 동사): `fetchNotes` / `createNote` / `updateNote` / `deleteNote`
  - Context 레이어(사용자 행동 동사): `addNote` / `editNote` / `removeNote`
  - 새 도메인 추가 시 동일하게 두 짝을 맞추는 것이 본 프로젝트의 규칙.
- **이벤트 핸들러**:
  - 컴포넌트 내부에서 정의한 핸들러: `handle*` (`handleSave`, `handleSelectNote`, `handleNewNote`, `handleDone`)
  - Props 콜백 타입: `on*` (`onSelect`, `onDone`, `onNewNote`, `onDelete`)
- **변수명**: API 응답 저장은 `newNote`(POST 결과) / `updated`(PATCH 결과). 선택 상태는 `selectedNoteId`(ID만) 또는 `selectedNote`(객체). 플래그는 `isCreating` 등 `is*` prefix.
- **타입명**:
  - 도메인 엔티티: 단순명 (`Note`)
  - 컴포넌트 Props: `*Props` (`NoteEditorProps`)
  - Context 값: `*Type` (`NotesContextType`)
- **상수명**: `UPPER_SNAKE_CASE` (`API_URL`).

## 일관성 주의 사항 (발견된 불일치)

아래는 코드 정독 중 발견한 **의도치 않거나 부분적인 불일치**다. 새 코드를 작성할 때는 위에서 정의한 규칙을 우선 따르고, 기존 코드를 만질 때 자연스럽게 정리되는 정도로만 다루면 된다(이번 패턴화 작업에서 코드 수정은 하지 않았음).

1. **에러 처리 위치 비대칭**
   - 초기 로드(`fetchNotes`)는 `NotesContext`가 `.catch((e) => setError(e.message))`로 받아 `error` 상태에 반영 (`NotesContext.tsx:25`).
   - 반면 `addNote`/`editNote`/`removeNote`는 try/catch가 없어 호출자가 처리해야 한다.
   - `NoteEditor.handleSave`는 try/catch로 감싸 `console.error`로 로그하지만 (`NoteEditor.tsx:33-44`), **`NoteList`에서 `removeNote`는 `onDelete`로 그대로 넘겨 호출되며 catch조차 없다** (`NoteList.tsx:41`, `NoteItem.tsx:24-32`). 두 경우 모두 사용자 화면에는 실패가 반영되지 않는다.

2. **NoteList에서 콜백 출처가 섞임**
   `NoteList`는 `onSelect`는 props로 받지만 `removeNote`는 Context에서 직접 가져와 `NoteItem`의 `onDelete`로 넘긴다 (`NoteList.tsx:9-10, 41`). 둘 다 자식에게 전달하는 콜백인데 출처가 다르다.

3. **`handle*` ↔ `on*` ↔ context 액션의 prefix 혼용**
   같은 "삭제" 동작이 위치에 따라 세 가지 이름으로 등장한다: Context의 `removeNote` / Props 타입의 `onDelete` / (만약 컴포넌트 내부 래퍼가 있었다면) `handleDelete`. 위 "네이밍 컨벤션 § 이벤트 핸들러" 규칙대로 위치별 prefix를 분리해 사용하면 일관성이 유지된다.

4. **`useEffect` 의존성 배열에 `eslint-disable` 사용**
   `NoteEditor.tsx:27`은 `selectedNote` 객체 참조를 피하려고 `[selectedNoteId, isCreating]`만 두고 lint 규칙을 비활성화한다. 동작상 문제는 없지만 사유 주석이 없으므로, 유사 패턴을 추가할 때는 *왜* disable했는지 한 줄 주석을 남기는 것이 안전하다.

## 언어 규칙

- 응답·코드 주석·커밋 메시지·문서: **한국어**.
- 변수명·함수명·식별자: **영어** (코드 표준 유지).
