"use client";

/**
 * FoodicsSyncButton.tsx — زر «مزامنة المنيو الآن» (فودكس — أدمن)
 * يُستخدم في بطاقة الاتصال وتبويب المنيو.
 * النجاح: Toast بعدادات الرد {remote_items, created, updated} كما وردت.
 * الفشل: Toast أحمر بنص detail الخادم حرفياً (مثل «لا يوجد اتصال فودكس مفعّل»).
 */
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFoodicsSyncMenu } from "@/hooks/useIntegrations";
import { integrationErrorText } from "@/services/integrations.service";

export function FoodicsSyncButton({
  facilityId,
  variant = "outline",
  size = "sm",
  className,
}: {
  facilityId: number | null;
  variant?: "outline" | "default" | "secondary";
  size?: "sm" | "default";
  className?: string;
}) {
  const { toast } = useToast();
  const sync = useFoodicsSyncMenu();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={sync.isPending}
      onClick={() =>
        sync.mutate(
          { facilityId },
          {
            onSuccess: (data) => {
              const parts: string[] = [];
              if (data?.remote_items != null) parts.push(`عناصر بعيدة: ${data.remote_items}`);
              if (data?.created != null) parts.push(`أُنشئ: ${data.created}`);
              if (data?.updated != null) parts.push(`حُدّث: ${data.updated}`);
              toast({
                title: "تمت مزامنة المنيو",
                description: parts.length ? parts.join(" · ") : undefined,
              });
            },
            onError: (e) =>
              toast({ title: integrationErrorText(e), variant: "destructive" }),
          }
        )
      }
    >
      {sync.isPending ? (
        <Loader2 className="ml-1 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw className="ml-1 h-4 w-4" aria-hidden="true" />
      )}
      مزامنة المنيو الآن
    </Button>
  );
}
