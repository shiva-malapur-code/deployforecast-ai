import { Braces, Circle } from 'lucide-react';

interface CodeEditorPlaceholderProps {
  code: string;
  onChange: (code: string) => void;
}

export function CodeEditorPlaceholder({ code, onChange }: CodeEditorPlaceholderProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#08100f] shadow-glow">
      <div className="flex h-11 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Circle className="size-2 fill-red-400 text-red-400" />
          <Circle className="size-2 fill-amber-300 text-amber-300" />
          <Circle className="size-2 fill-primary text-primary" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">UserSearch.tsx</span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Braces className="size-3.5" /> Monaco-ready
        </span>
      </div>
      <label className="sr-only" htmlFor="source-code">
        React source code
      </label>
      <textarea
        id="source-code"
        value={code}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-h-[430px] w-full resize-none bg-transparent p-5 font-mono text-[13px] leading-6 text-[#c8d8d3] outline-none"
      />
    </div>
  );
}
