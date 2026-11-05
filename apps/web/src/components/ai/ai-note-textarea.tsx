"use client";

interface AiNoteTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  rows?: number;
}

const DEFAULT_MAX_LENGTH = 500;

export function AiNoteTextarea({
  value,
  onChange,
  placeholder,
  maxLength = DEFAULT_MAX_LENGTH,
  rows = 2,
}: AiNoteTextareaProps) {
  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
      />
      <p className="text-[10px] text-muted-foreground text-right">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
