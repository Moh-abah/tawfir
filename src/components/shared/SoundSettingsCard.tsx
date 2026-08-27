"use client";

/**
 * SoundSettingsCard — قسم «الأصوات» في الإعدادات (الجولة 8).
 * ==========================================================
 * يُستخدم في البوابات الثلاث (إعدادات المشرف/المالك + حساب العميل):
 *  - سويتش تشغيل/إيقاف أصوات الإشعارات (tawfir_sound_enabled)
 *  - منزلق مستوى الصوت 0-100% (tawfir_sound_volume)
 *  - زر «تجربة» لكل صوت من الأصوات الـ18 — يشغّل ملفه مباشرة.
 *    ⚠️ هذا الزر هو أداة المشرف لتسمّع كل صوت قبل استبداله بملف نهائي:
 *    الاستبدال = وضع ملف جديد بنفس الاسم في public/sounds/ — بلا كود.
 */
import { useState } from "react";
import { Volume2, VolumeX, Play, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SoundService,
  NOTIFICATION_SOUND_TYPES,
  SYSTEM_SOUND_TYPES,
  SOUND_LABELS,
  type SoundType,
} from "@/lib/sound-service";

/** صف واحد: تسمية الصوت + زر التجربة (44px للمس). */
function SoundRow({ type }: { type: SoundType }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="min-w-0 truncate text-sm text-foreground">
        {SOUND_LABELS[type]}
      </span>
      <span
        dir="ltr"
        className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline"
      >
        {type}.mp3
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 rounded-full"
        aria-label={`تجربة صوت ${SOUND_LABELS[type]}`}
        title={`تجربة صوت ${SOUND_LABELS[type]}`}
        data-sound-test={type}
        onClick={() => SoundService.play(type, { force: true })}
      >
        <Play className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export function SoundSettingsCard() {
  // حالة محلية تُهيَّأ من إعدادات الخدمة وتُكتب عبرها فوراً
  const [enabled, setEnabled] = useState(() => SoundService.isEnabled());
  const [volume, setVolume] = useState(() => SoundService.getVolume());

  const handleEnabledChange = (checked: boolean) => {
    SoundService.setEnabled(checked);
    setEnabled(checked);
  };

  const handleVolumeChange = (value: number[]) => {
    const v = value[0] ?? volume;
    SoundService.setVolume(v);
    setVolume(v);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {enabled ? (
            <Volume2 className="h-5 w-5 text-secondary" aria-hidden="true" />
          ) : (
            <VolumeX className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
          الأصوات
        </CardTitle>
        <CardDescription>
          أصوات الإشعارات والإجراءات — تُسمع فقط والتطبيق في المقدمة، وصوت
          واحد في كل مرة.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* سويتش التشغيل/الإيقاف */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">تشغيل الأصوات</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? "مفعّلة" : "موقوفة — الإشعارات تظهر بلا صوت"}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleEnabledChange}
            aria-label="تشغيل أصوات الإشعارات وإيقافها"
          />
        </div>

        {/* منزلق المستوى */}
        <div className={enabled ? "space-y-3" : "space-y-3 opacity-50"}>
          <div className="flex items-center justify-between">
            <label htmlFor="sound-volume" className="text-sm font-medium">
              مستوى الصوت
            </label>
            <span
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tabular-nums"
              aria-live="polite"
            >
              {Math.round(volume * 100)}%
            </span>
          </div>
          <Slider
            id="sound-volume"
            min={0}
            max={1}
            step={0.05}
            value={[volume]}
            onValueChange={handleVolumeChange}
            disabled={!enabled}
            aria-label="مستوى الصوت"
          />
        </div>

        <Separator />

        {/* قائمة الأصوات الـ18 مع أزرار التجربة — أداة المشرف للتسمّع قبل الاستبدال */}
        <div>
          <p className="mb-1 text-sm font-medium">
            تجربة الأصوات{" "}
            <span className="font-normal text-muted-foreground">
              (اضغط زر التشغيل لتسمّع أي صوت)
            </span>
          </p>
          <div className="max-h-72 overflow-y-auto scroll-area-thin rounded-xl border border-border/50 bg-muted/20 px-3 py-1">
            <p className="sticky top-0 bg-muted/20 py-1 text-[11px] font-semibold text-muted-foreground">
              أصوات الإشعارات ({NOTIFICATION_SOUND_TYPES.length})
            </p>
            {NOTIFICATION_SOUND_TYPES.map((type) => (
              <SoundRow key={type} type={type} />
            ))}
            <Separator className="my-1" />
            <p className="sticky top-0 bg-muted/20 py-1 text-[11px] font-semibold text-muted-foreground">
              أصوات النظام ({SYSTEM_SOUND_TYPES.length})
            </p>
            {SYSTEM_SOUND_TYPES.map((type) => (
              <SoundRow key={type} type={type} />
            ))}
          </div>
        </div>

        {/* تلميح الاستبدال بلا كود */}
        <p className="flex items-start gap-2 rounded-xl bg-secondary/10 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
          <span className="min-w-0 break-words">
            لاستبدال أي صوت: ضع ملف MP3 جديداً باسم النوع نفسه (مثل{" "}
            <span dir="ltr" className="font-semibold">
              order_new.mp3
            </span>
            ) في مجلد{" "}
            <span dir="ltr" className="font-semibold">
              public/sounds/
            </span>{" "}
            ثم حدّث الصفحة — بلا أي كود.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
