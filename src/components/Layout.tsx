import { ReactNode } from 'react';

interface LayoutProps {
  onNewNote: () => void;
  sidebar: ReactNode;
  main: ReactNode;
}

export function Layout({ onNewNote, sidebar, main }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: 'Boogaloo, sans-serif' }}
        >
          📝 Notes
        </h1>
        <button
          onClick={onNewNote}
          className="bg-foreground text-card px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-75 transition-opacity cursor-pointer"
        >
          + 새 노트
        </button>
      </header>

      {/* 바디 */}
      <div className="flex" style={{ height: 'calc(100vh - 65px)' }}>
        {/* 사이드바 */}
        <div className="w-72 border-r border-border overflow-y-auto bg-muted/50 p-3 space-y-2 shrink-0">
          {sidebar}
        </div>

        {/* 메인 */}
        <div className="flex-1 overflow-y-auto p-8">{main}</div>
      </div>
    </div>
  );
}
