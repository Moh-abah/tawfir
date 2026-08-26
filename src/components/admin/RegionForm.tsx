"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useCreateRegion,
  useUpdateRegion,
} from "@/hooks/useAdminRegions";
import type { Region } from "@/types/api.generated";

const schema = z.object({
  name: z.string().min(2, "الاسم قصير جدًا"),
});
type FormValues = z.infer<typeof schema>;

interface RegionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Region;
}

export function RegionForm({ open, onOpenChange, initial }: RegionFormProps) {
  const createRegion = useCreateRegion();
  const updateRegion = useUpdateRegion();
  const isPending = createRegion.isPending || updateRegion.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? "" },
    values: { name: initial?.name ?? "" },
  });

  const { register, handleSubmit, reset, formState } = form;

  function handleClose(next: boolean) {
    if (!next) reset({ name: initial?.name ?? "" });
    onOpenChange(next);
  }

  async function onSubmit(values: FormValues) {
    if (initial) {
      await updateRegion.mutateAsync({ id: initial.id, data: { name: values.name } });
    } else {
      await createRegion.mutateAsync({ name: values.name });
    }
    reset({ name: "" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "تعديل منطقة" : "إضافة منطقة"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "عدّل اسم المنطقة ثم احفظ التغييرات."
              : "أدخل اسم المنطقة الجديدة."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="region-name">اسم المنطقة</Label>
            <Input
              id="region-name"
              placeholder="مثال: الرياض"
              autoFocus
              {...register("name")}
            />
            {formState.errors.name && (
              <p className="text-xs text-destructive">
                {formState.errors.name.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : initial ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
