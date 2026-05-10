import { useState, useEffect } from 'react';
import { useNotes } from '../context/NotesContext';

interface NoteEditorProps {
  selectedNoteId: string | null;
  isCreating: boolean;
  onDone: () => void;
}

export function NoteEditor({ selectedNoteId, isCreating, onDone }: NoteEditorProps) {
  const { notes, addNote, editNote } = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  // 선택된 노트가 바뀔 때 폼 동기화
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      setTags(selectedNote.tags ?? []);
    } else if (isCreating) {
      setTitle('');
      setContent('');
      setTags([]);
    }
    setTagInput('');
  }, [selectedNoteId, isCreating]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (tags.includes(value)) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, value]);
    setTagInput('');
  };

  const handleRemoveTag = (value: string) => {
    setTags((prev) => prev.filter((t) => t !== value));
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);
    try {
      if (isCreating) {
        await addNote(title, content, tags);
      } else if (selectedNoteId) {
        await editNote(selectedNoteId, { title, content, tags });
      }
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // 아무것도 선택 안 된 상태
  if (!isCreating && !selectedNoteId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <p className="text-5xl">📝</p>
          <p className="text-muted-foreground text-sm">노트를 선택하거나 새 노트를 만드세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl px-8 sm:px-12 py-8 shadow-[0_2px_12px_rgba(0,0,0,0.07)] border border-border max-w-2xl">
      {/* 섹션 라벨 */}
      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">
        {isCreating ? '새 노트' : '노트 편집'}
      </p>

      {/* 제목 입력 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="w-full text-xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-4"
      />

      {/* 구분선 */}
      <div className="h-px bg-border mb-4" />

      {/* 내용 입력 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요..."
        rows={14}
        className="w-full text-base text-foreground/70 bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed"
      />

      {/* 태그 영역 */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          태그
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 bg-muted text-muted-foreground rounded-full pl-3 pr-1 py-1 text-xs"
              >
                {t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  aria-label={`${t} 태그 삭제`}
                  className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-border text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            // IME(한글 등) 조합 중 Enter는 확정 신호이므로 무시한다
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleAddTag();
            }
          }}
          placeholder="태그 입력 후 Enter"
          className="w-full text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-foreground text-card px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-75 transition-opacity disabled:opacity-40 cursor-pointer"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button
          onClick={onDone}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-muted-foreground bg-muted hover:bg-border transition-colors cursor-pointer"
        >
          취소
        </button>
      </div>
    </div>
  );
}
