---
name: mermaid-diagram
description: React + TypeScript 프로젝트의 src/ 디렉토리를 정적 분석해 (1) 모듈 import 의존성 그래프와 (2) 사용자 액션 → Context → API → 서버로 이어지는 상태 흐름 다이어그램을 Mermaid로 그린 뒤, 단일 HTML(`docs/architecture/index.html`)로 렌더해 macOS 기본 브라우저로 띄운다. 호출 예 — "프로젝트 구조를 시각화해줘", "/mermaid-diagram", "아키텍처 다이어그램 갱신해줘".
---

# mermaid-diagram

## 사용 시점

- 사용자가 프로젝트의 컴포넌트 의존성, 상태 흐름, 모듈 구조를 **시각적으로** 보고 싶다고 요청할 때.
- 코드 구조가 크게 바뀐 뒤 다이어그램을 갱신할 때.
- 대상은 React + TypeScript 기반이며 `src/` 아래에 `.ts`/`.tsx` 파일들이 있는 프로젝트.

## 산출물

- `docs/architecture/index.html` — 한 페이지에 두 다이어그램(의존성 + 상태 흐름) 포함. CDN 기반이라 외부 빌드/의존성 설치 불필요.

## 절차

### 1. src/ 정적 분석

작업 디렉토리에서 다음을 수행한다(추측하지 말고 직접 파일을 읽는다).

1. `src/` 아래의 모든 `.ts`/`.tsx` 파일 목록을 얻는다.
   ```bash
   find src -type f \( -name '*.tsx' -o -name '*.ts' \) | sort
   ```
2. 각 파일에서 **상대경로 import만** 추출한다(외부 패키지 제외).
   ```bash
   grep -REn "from ['\"]\\.\\.?/" src
   ```
   `react`, `react-dom`, 기타 npm 패키지는 그래프에서 제외 — 사내 모듈 관계만 본다.
3. 파일을 **레이어**로 분류한다 (휴리스틱):
   - `src/components/**` → `components`
   - `src/context/**` 또는 `*Provider`·`*Context` 접미사 파일 → `context`
   - `src/api/**` 또는 `src/services/**` → `api`
   - `src/types/**` 또는 `src/models/**` → `types`
   - `src/hooks/**` → `hooks`
   - `App.tsx`, `main.tsx`, `index.tsx` → `entry`
   - 그 외 → `misc`
4. 상태 흐름을 그릴 수 있는지 판단한다. 다음 신호가 있으면 가능:
   - Context 또는 store 파일에 `setState`/`dispatch`/`setX` 호출.
   - API 모듈에 `fetch`/`axios`/`http` 호출.
   - 컴포넌트가 Context 훅(`useXxx`)으로 액션을 부르는 패턴.

### 2. Mermaid 다이어그램 작성

분석 결과 상태 흐름 신호가 없으면 의존성 그래프만 그리고, HTML 상단 메타 영역에 그 사실을 한 줄로 명시한다.

#### 2-1. 컴포넌트 의존성 그래프 (필수)

- 형식: `flowchart LR`
- 노드 = 파일 1개. 노드 ID는 충돌 방지를 위해 경로 기반 슬러그(`/` → `_`, 확장자 제거).
- 노드 라벨은 파일 이름만 (`NoteEditor.tsx`).
- 엣지 = `import`. `A --> B`는 *A가 B를 import한다*는 뜻.
- 외부 시스템(JSON Server, 외부 REST API 등)이 있으면 점선 엣지(`-.->`)로 별도 노드 추가.
- 레이어별 `subgraph` + `classDef`로 색을 구분한다:
  ```
  classDef entry      fill:#fee2e2,stroke:#991b1b;
  classDef components fill:#dbeafe,stroke:#1e40af;
  classDef context    fill:#fef3c7,stroke:#92400e;
  classDef api        fill:#dcfce7,stroke:#166534;
  classDef types      fill:#f3e8ff,stroke:#6b21a8;
  classDef external   fill:#f1f5f9,stroke:#475569,stroke-dasharray: 4 2;
  ```
- subgraph ID와 classDef 이름이 충돌하지 않도록 subgraph는 `entryGroup`, `componentsGroup`처럼 접미사 `Group`을 붙인다.

#### 2-2. 상태 흐름 다이어그램 (가능 시)

- 형식: `sequenceDiagram` 우선(시간 순서가 자연). 단순한 단방향 토폴로지면 `flowchart TD`도 허용.
- 참여자: `User`(actor), 핵심 컴포넌트, Context/Provider, API 모듈, 외부 서비스.
- **한 시나리오만** 끝까지 따라간다 — 보통 "가장 대표적인 mutation 액션"(예: 노트 저장).
- `activate`/`deactivate`로 비동기 대기 구간을 강조한다.

#### 2-3. 상태 소유 구조 다이어그램 (필수)

- 형식: `flowchart TB`
- **분석 방법**:
  - `useState(...)` 호출 → 호출 컴포넌트가 owner.
  - `useReducer(...)` 호출 → 마찬가지.
  - Context Provider의 `value={{ ... }}` 키 → Provider가 owner이며 키 목록이 곧 전역 상태.
  - 외부 store(Redux/Zustand 등)가 있으면 별도 owner.
- 각 owner를 subgraph로 묶고, 노드 = `state키 : 타입` 한 줄 텍스트.
- 색은 `2-1`의 레이어 색을 재사용해 의존성 그래프와 시각적 일관성을 유지한다.

#### 2-4. 상태 전이 다이어그램 (가능 시)

- 형식: `stateDiagram-v2`
- **분석 방법**: 모드를 결정하는 *조합*을 찾는다 — 특히 `boolean` + `nullable id` 같은 두세 변수 조합이 모드를 정의하는 패턴.
  - 예) `selectedXId: string | null` × `isCreating: boolean` → `Idle` / `Creating` / `Editing` 3모드.
  - `loading`, `saving` 같은 비동기 플래그는 sub-state로 표현하거나 본 머신에서 생략(가독성 우선).
- 전이 라벨 = 그 전환을 일으키는 핸들러/액션 이름.
- 각 모드에 `note right of Mode ... end note`로 상태 변수 값을 적어 둔다.
- 신호가 약하면(모드를 가르는 변수가 명확치 않으면) 이 다이어그램은 생략하고 HTML 메타에 사유 한 줄을 남긴다.

### 3. HTML 작성

`docs/architecture/index.html`을 다음 템플릿으로 생성한다(파일이 있으면 덮어쓰기). `docs/architecture/`가 없으면 만든다.

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>아키텍처 다이어그램</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; color: #1f2937; }
      h1 { margin-bottom: 0.25rem; }
      h2 { margin-top: 2.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
      .meta { color: #6b7280; font-size: 0.9rem; margin-bottom: 2rem; }
      .mermaid { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; overflow-x: auto; }
    </style>
  </head>
  <body>
    <h1>📐 아키텍처 다이어그램</h1>
    <p class="meta">생성: <!-- ISO 타임스탬프 --> · 소스: <code>src/</code></p>

    <h2>1. 컴포넌트 의존성</h2>
    <pre class="mermaid">
<!-- 2-1에서 만든 flowchart 코드를 첫 컬럼부터 그대로 -->
    </pre>

    <h2>2. 상태 흐름</h2>
    <pre class="mermaid">
<!-- 2-2에서 만든 sequenceDiagram 코드. 없으면 <p>상태 흐름을 그릴 시그널이 없습니다.</p> -->
    </pre>

    <h2>3. 상태 소유 구조</h2>
    <pre class="mermaid">
<!-- 2-3에서 만든 flowchart 코드 -->
    </pre>

    <h2>4. 상태 전이</h2>
    <pre class="mermaid">
<!-- 2-4에서 만든 stateDiagram-v2 코드. 신호 부족이면 <p>안내 메시지</p> -->
    </pre>

    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });
    </script>
  </body>
</html>
```

주의사항:
- `<pre class="mermaid">` 안의 mermaid 코드는 **첫 컬럼부터** 적는다(앞 공백이 들어가면 일부 다이어그램이 깨진다).
- ESM 임포트 방식이므로 `<script type="module">` 필수.
- HTML 내부에서 mermaid 코드의 `<` `>`는 그대로 둔다(별도 escape 불필요).

### 4. 브라우저 띄우기 (macOS)

```bash
open docs/architecture/index.html
```

기본 브라우저에서 새 탭이 열린다. 사용자가 다른 브라우저를 명시했다면 `-a`로 지정 — 예: `open -a "Google Chrome" docs/architecture/index.html`.

타 OS 환경에서 호출되었다면 각각 다음으로 대체한다(본 스킬은 macOS 가정):
- Linux: `xdg-open docs/architecture/index.html`
- Windows: `start docs\architecture\index.html`

## 검증

1. `docs/architecture/index.html` 파일이 존재한다.
2. 브라우저에서 페이지 로드 후 두 다이어그램이 정상 렌더된다(Mermaid 파싱 에러 시 `pre`에 빨간 메시지가 그대로 보인다).
3. 의존성 그래프의 노드 수가 `find src -name '*.ts*' | wc -l`과 일치한다.
4. 무작위 1~2개 파일을 골라 import 라인과 그래프 엣지를 대조한다.

## 한계

- TypeScript path alias(`@/components/...`)는 자동 해석하지 않는다. 만나면 alias를 그대로 노드 라벨로 두거나 `tsconfig.json`의 `paths`를 사용자에게 안내한다.
- 동적 `import()`는 잡지 못한다.
- 상태 흐름은 자동 추출이 본질적으로 불완전하므로 한 가지 대표 시나리오만 그린다(여러 시나리오 동시 표현 시 가독성 폭락).
