"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPost } from "@/lib/factory/api";
import { useSession, type Role } from "@/store/session";
import { ErrorBox } from "./Bits";
import { Lock, LogOut, ShieldCheck } from "lucide-react";

interface LoginGateProps {
  role: Role;
  title: string;
  description: string;
  endpoint: string;
  /** حقول النموذج بترتيبها — identifier يعني حقل identifier في العقد */
  mode: "identifier" | "username";
  placeholder: string;
  hint?: string;
  onLoggedIn?: (data: Record<string, unknown>) => void;
  children: (token: string) => React.ReactNode;
}

/**
 * بوابة دخول موحّدة لكل دور — تعرض أخطاء الباك حرفياً (403 «اسم المستخدم أو كلمة المرور غير صحيحة» إلخ)
 */
export function LoginGate({
  role,
  title,
  description,
  endpoint,
  mode,
  placeholder,
  hint,
  onLoggedIn,
  children,
}: LoginGateProps) {
  const token = useSession((s) => s.tokens[role]);
  const setToken = useSession((s) => s.setToken);
  const logoutRole = useSession((s) => s.logoutRole);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const body = mode === "identifier" ? { identifier, password } : { username: identifier, password };
    const r = await apiPost<Record<string, unknown>>(endpoint, body);
    setBusy(false);
    if (r.ok && (r.data as { access_token?: string }).access_token) {
      setToken(role, (r.data as { access_token: string }).access_token);
      onLoggedIn?.(r.data);
      setPassword("");
    } else if (r.ok) {
      setErr({ error: "لم يُرجع الخادم توكن — تحقق من بيانات الدخول" });
    } else {
      setErr({ error: r.error, errors: r.errors });
    }
  };

  if (token) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> جلسة {title} فعّالة — التوكن محفوظ محلياً
          </p>
          <Button variant="outline" size="sm" onClick={() => logoutRole(role)} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> خروج
          </Button>
        </div>
        {children(token)}
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> {title} — تسجيل الدخول
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`id-${role}`}>{mode === "username" ? "اسم المستخدم" : "البريد أو الجوال"}</Label>
            <Input
              id={`id-${role}`}
              dir="ltr"
              className="text-left"
              placeholder={placeholder}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pw-${role}`}>كلمة المرور</Label>
            <Input
              id={`pw-${role}`}
              type="password"
              dir="ltr"
              className="text-left"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {hint && <p className="text-xs text-stone-500">{hint}</p>}
          <ErrorBox error={err?.error} errors={err?.errors} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "جارٍ الدخول…" : "دخول"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
