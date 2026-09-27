"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  StickyNote,
  Plus,
  Trash2,
  Home,
  Check,
  X,
  NotebookPen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

/**
 * «ملاحظاتي السريعة» — وجهة note_taking في الـmanifest
 * ═══════════════════════════════════════════════════════════════
 * note_taking.new_note_url = /notes/new: زر «ملاحظة جديدة» في
 * أنظمة التشغيل المدعومة (كروم OS / سطح المكتب) يفتح هذه الصفحة
 * جاهزة للكتابة الفورية.
 *
 * الاستخدام الحقيقي في توفير: قوائم طلبات «قائمة مشترياتي من
 * المطعم»، ملاحظات عنوان التوصيل، أرقام الاحتفاظ… تُحفظ محلياً
 * على الجهاز (localStorage) بلا حساب ولا إنترنت.
 */

interface QuickNote {
  id: string;
  text: string;
  createdAt: number;
}

const STORAGE_KEY = "tawfir-quick-notes";
const MAX_NOTES = 50;

function loadNotes(): QuickNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuickNote[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_NOTES) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: QuickNote[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.slice(0, MAX_NOTES)));
  } catch {
    /* التخزين ممتلئ/محجوب — تجاهل بهدوء */
  }
}

function formatWhen(ts: number): string {
  try {
    return new Intl.DateTimeFormat("ar", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export function QuickNotesContent() {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [draft, setDraft] = useState("");
  const [mounted, setMounted] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    /* قراءة التخزين المحلي خارج مسار التأثير المتزامن (قاعدة set-state-in-effect)
       — وبعدها التركيز الفوري على الكتابة (صفحة «ملاحظة جديدة» في note_taking) */
    const timer = window.setTimeout(() => {
      setNotes(loadNotes());
      setMounted(true);
      draftRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    const note: QuickNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      createdAt: Date.now(),
    };
    const next = [note, ...notes].slice(0, MAX_NOTES);
    setNotes(next);
    saveNotes(next);
    setDraft("");
    draftRef.current?.focus();
  };

  const removeNote = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    saveNotes(next);
  };

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.createdAt - a.createdAt),
    [notes]
  );

  return (
    <div className="login-navy-bg relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div
        className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      />

      <div
        className="relative z-10 mx-auto w-full max-w-lg px-4 py-8"
        style={{
          paddingTop: "max(2rem, env(safe-area-inset-top, 0px), var(--cap-safe-top, 0px))",
          paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px), var(--cap-safe-bottom, 0px))",
        }}
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <TawfirLogo variant="mark" className="h-14 w-auto" />
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm">
            <StickyNote className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="text-xs font-bold text-white/90">
              ملاحظاتي السريعة
            </span>
          </div>
          <p className="max-w-sm text-sm leading-7 text-white/60">
            قائمة مشترياتك من المطعم، ملاحظات عنوان التوصيل، أو أي شيء
            تريد تذكّره — تُحفظ على جهازك فوراً وتعمل بلا إنترنت.
          </p>
        </div>

        {/* محرر الملاحظة الجديدة */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <label htmlFor="quick-note-draft" className="sr-only">
            اكتب ملاحظة جديدة
          </label>
          <Textarea
            id="quick-note-draft"
            ref={draftRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              /* Ctrl/Cmd+Enter للحفظ السريع */
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                addNote();
              }
            }}
            placeholder="مثال: مندي لحم + خبز تنور من مطعم النصر…"
            rows={3}
            className="min-h-24 resize-none border-white/15 bg-white/5 text-sm text-white placeholder:text-white/35 focus-visible:ring-accent"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-white/40">
              محفوظة على جهازك فقط • Ctrl+Enter للحفظ
            </p>
            <Button
              onClick={addNote}
              disabled={!draft.trim()}
              className="h-11 gap-2 rounded-full px-5 text-xs font-bold"
              aria-label="حفظ الملاحظة"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              حفظ الملاحظة
            </Button>
          </div>
        </div>

        {/* قائمة الملاحظات */}
        <div className="mt-6">
          {mounted && sorted.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
              <NotebookPen className="mx-auto mb-3 h-7 w-7 text-white/40" aria-hidden="true" />
              <p className="text-sm text-white/60">
                لا توجد ملاحظات بعد — اكتب أول ملاحظة أعلاه.
              </p>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="ملاحظاتي المحفوظة">
              {sorted.map((note) => (
                <li
                  key={note.id}
                  className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-white/90">
                      {note.text}
                    </p>
                    <p className="mt-1 text-[11px] text-white/40">
                      {formatWhen(note.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNote(note.id)}
                    aria-label="حذف الملاحظة"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-red-500/15 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            asChild
            variant="ghost"
            className="h-11 rounded-full text-xs text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Link href="/" className="gap-2">
              <X className="h-4 w-4" aria-hidden="true" />
              إغلاق الملاحظات
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
