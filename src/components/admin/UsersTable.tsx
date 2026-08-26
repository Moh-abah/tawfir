"use client";

import { useMemo, useState } from "react";
import {
  RefreshCcw,
  MoreHorizontal,
  ShieldCheck,
  UserIcon,
  Store,
  Search,
  Mail,
  UserCog,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Phone,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminUsers, useUpdateUserRole } from "@/hooks/useAdminUsers";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { User, UserRole } from "@/types/api.generated";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "\u0645\u0634\u0631\u0641",
  owner: "\u0645\u0627\u0644\u0643",
  customer: "\u0639\u0645\u064a\u0644",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-primary/15 text-primary border-primary/25 hover:bg-primary/15",
  owner: "bg-accent/15 text-accent border-accent/25 hover:bg-accent/15",
  customer: "bg-secondary/15 text-secondary border-secondary/25 hover:bg-secondary/15",
};

const DIALOG_ROLE_BADGE_COLORS: Record<UserRole, string> = {
  customer: "bg-secondary/10 text-secondary",
  owner: "bg-accent/10 text-accent",
  admin: "bg-primary/10 text-primary",
};

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  admin: <ShieldCheck className="h-3.5 w-3.5" />,
  owner: <Store className="h-3.5 w-3.5" />,
  customer: <UserIcon className="h-3.5 w-3.5" />,
};

const ROLES: UserRole[] = ["admin", "owner", "customer"];

/* ─── Sort types ──────────────────────────────── */
type SortField = "name" | "email" | "role" | "created_at";
type SortDirection = "asc" | "desc";

const SORTABLE_COLUMNS: { field: SortField; label: string }[] = [
  { field: "name", label: "\u0627\u0644\u0627\u0633\u0645" },
  { field: "email", label: "\u0627\u0644\u0628\u0631\u064a\u062f" },
  { field: "role", label: "\u0627\u0644\u062f\u0648\u0631" },
  { field: "created_at", label: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0633\u062c\u064a\u0644" },
];

function SortIcon({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: SortDirection }) {
  if (field !== sortField) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
  return sortDirection === "asc"
    ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
    : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
}

function TableSkeleton() {
  return (
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

type RoleFilter = UserRole | "all";

interface UsersTableProps {
  search?: string;
  roleFilter?: RoleFilter;
}

export function UsersTable({ search, roleFilter = "all" }: UsersTableProps) {
  const { data, isLoading, error, refetch } = useAdminUsers(search);
  const updateRole = useUpdateUserRole();
  const allItems = data?.items ?? [];

  const [roleDialogUser, setRoleDialogUser] = useState<User | undefined>(undefined);
  const [pendingRole, setPendingRole] = useState<UserRole>("customer");
  const [detailUser, setDetailUser] = useState<User | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  /* Filter by role first */
  const roleFiltered = useMemo(() => {
    if (roleFilter === "all") return allItems;
    return allItems.filter((u) => u.role === roleFilter);
  }, [allItems, roleFilter]);

  /* Sort the filtered items */
  const items = useMemo(() => {
    const sorted = [...roleFiltered];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.full_name.localeCompare(b.full_name, "ar");
          break;
        case "email":
          cmp = a.email.localeCompare(b.email);
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
          break;
        case "created_at":
          cmp = a.created_at.localeCompare(b.created_at);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [roleFiltered, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function handleChangeRole(user: User, newRole: UserRole) {
    if (user.role === newRole) return;
    setRoleDialogUser(user);
    setPendingRole(newRole);
  }

  function confirmRoleChange() {
    if (!roleDialogUser) return;
    updateRole.mutate({ userId: roleDialogUser.id, role: pendingRole });
    setRoleDialogUser(undefined);
  }

  const hasActiveFilter = roleFilter !== "all";
  const showEmptyForFilter = !isLoading && !error && allItems.length > 0 && items.length === 0;

  /* Column header lookup for sort */
  const sortableFields = new Set<SortField>(["name", "email", "role", "created_at"]);

  function renderSortableHeader(field: SortField, label: string) {
    return (
      <button
        type="button"
        role="button"
        aria-label={`ترتيب حسب ${label}`}
        onClick={() => handleSort(field)}
        onKeyDown={(e) => e.key === 'Enter' && handleSort(field)}
        className="inline-flex items-center gap-1.5 min-h-[44px] cursor-pointer select-none hover:text-foreground transition-colors"
      >
        {label}
        <SortIcon field={field} sortField={sortField} sortDirection={sortDirection} />
      </button>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead>{renderSortableHeader("name", "\u0627\u0644\u0627\u0633\u0645")}</TableHead>
            <TableHead>{renderSortableHeader("email", "\u0627\u0644\u0628\u0631\u064a\u062f")}</TableHead>
            <TableHead>\u0627\u0644\u062c\u0648\u0627\u0644</TableHead>
            <TableHead>{renderSortableHeader("role", "\u0627\u0644\u062f\u0648\u0631")}</TableHead>
            <TableHead>{renderSortableHeader("created_at", "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0633\u062c\u064a\u0644")}</TableHead>
            <TableHead className="w-10"> </TableHead>
            <TableHead className="w-10"> </TableHead>
          </TableRow>
        </TableHeader>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-destructive">
                    تعذّر تحميل المستخدمين.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    إعادة المحاولة
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        ) : showEmptyForFilter ? (
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Search className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    لا يوجد مستخدمون بهذا الفلتر.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        ) : items.length === 0 ? (
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-16 text-center text-sm text-muted-foreground"
              >
                لا يوجد مستخدمون.
              </TableCell>
            </TableRow>
          </TableBody>
        ) : (
          <TableBody>
            {items.map((user) => (
              <TableRow key={user.id} className="even:bg-muted/20 hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">
                  {user.full_name}
                </TableCell>
                <TableCell className="text-muted-foreground" dir="ltr">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {user.email}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground" dir="ltr">
                  {user.phone || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={ROLE_COLORS[user.role]}
                  >
                    <span className="flex items-center gap-1">
                      {ROLE_ICONS[user.role]}
                      {ROLE_LABELS[user.role]}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.created_at)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDetailUser(user)}
                    aria-label={`عرض تفاصيل ${user.full_name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">تغيير الدور</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>تغيير الدور</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setRoleDialogUser(user);
                          setPendingRole(user.role);
                        }}
                        className="gap-2"
                      >
                        <UserCog className="h-4 w-4" />
                        تغيير الدور
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {ROLES.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => handleChangeRole(user, role)}
                          disabled={user.role === role || updateRole.isPending}
                          className="gap-2"
                        >
                          {ROLE_ICONS[role]}
                          {ROLE_LABELS[role]}
                          {user.role === role && (
                            <span className="mr-auto text-xs text-muted-foreground">
                              الحالي
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </Table>

      {/* User Detail Dialog */}
      <Dialog open={detailUser !== undefined} onOpenChange={(o) => !o && setDetailUser(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تفاصيل المستخدم</DialogTitle>
            <DialogDescription>معلومات حساب المستخدم</DialogDescription>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-5">
              {/* Avatar and name */}
              <div className="flex flex-col items-center gap-3">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {detailUser.full_name.charAt(0)}
                </span>
                <div className="text-center">
                  <p className="text-lg font-semibold">{detailUser.full_name}</p>
                  <Badge className={cn("mt-1", DIALOG_ROLE_BADGE_COLORS[detailUser.role])}>
                    <span className="flex items-center gap-1">
                      {ROLE_ICONS[detailUser.role]}
                      {ROLE_LABELS[detailUser.role]}
                    </span>
                  </Badge>
                </div>
              </div>

              {/* Info grid */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">البريد الإلكتروني</span>
                  <span className="mr-auto text-sm font-medium" dir="ltr">{detailUser.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">الجوال</span>
                  <span className="mr-auto text-sm font-medium" dir="ltr">{detailUser.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">تاريخ التسجيل</span>
                  <span className="mr-auto text-sm font-medium">
                    {new Date(detailUser.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Quick action: change role */}
              <Button
                variant="outline"
                className="w-full min-h-[44px] gap-2"
                onClick={() => {
                  setRoleDialogUser(detailUser);
                  setPendingRole(detailUser.role);
                  setDetailUser(undefined);
                }}
              >
                <UserCog className="h-4 w-4" />
                تغيير الدور
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogUser !== undefined} onOpenChange={(o) => !o && setRoleDialogUser(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير دور المستخدم</DialogTitle>
            <DialogDescription>
              اختر الدور الجديد لـ {roleDialogUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <Select value={pendingRole} onValueChange={(v) => setPendingRole(v as UserRole)} dir="rtl">
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="اختر الدور" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRoleDialogUser(undefined)}>
              إلغاء
            </Button>
            <Button
              onClick={confirmRoleChange}
              disabled={roleDialogUser?.role === pendingRole}
            >
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}