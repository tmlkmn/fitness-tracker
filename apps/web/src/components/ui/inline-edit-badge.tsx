"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface InlineEditBadgeProps {
  value: string;
  onSave: (value: string) => void;
  type?: "number" | "text";
  suffix?: string;
  className?: string;
}

export function InlineEditBadge({
  value,
  onSave,
  type = "text",
  suffix,
  className,
}: InlineEditBadgeProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditValue(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-5 w-16 px-1 text-xs text-center"
      />
    );
  }

  return (
    <Badge
      variant="secondary"
      className={`text-xs cursor-pointer hover:bg-muted ${className ?? ""}`}
      onClick={() => {
        setEditValue(value);
        setEditing(true);
      }}
    >
      {value}{suffix}
    </Badge>
  );
}
