"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Mail, Clock, Shield, MoreHorizontal, Loader2, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMembers, useInviteMember } from "@/lib/hooks";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn } from "@/lib/utils/cn";
import { relativeTime, shortDate, initials } from "@/lib/utils/format";
import type { UserRole } from "@/types";

const inviteSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["recruiter", "hiring_manager", "interviewer", "admin"]),
});
type InviteForm = z.infer<typeof inviteSchema>;

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  admin:          { label: "Admin",          color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  super_admin:    { label: "Super Admin",    color: "bg-destructive/10 text-red-400 border-destructive/20" },
  recruiter:      { label: "Recruiter",      color: "bg-primary/10 text-primary border-primary/20" },
  hiring_manager: { label: "Hiring Mgr.",    color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  interviewer:    { label: "Interviewer",    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  candidate:      { label: "Candidate",      color: "bg-muted/40 text-muted-foreground border-border/40" },
};

const statusConfig = {
  active:    { label: "Active",    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  invited:   { label: "Invited",   color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  suspended: { label: "Suspended", color: "bg-destructive/10 text-red-400 border-destructive/20" },
};

export default function MembersPage() {
  const { data: members = [] } = useMembers();
  const { mutateAsync: invite, isPending } = useInviteMember();
  const orgId = useAuthStore((s) => s.user?.orgId ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "recruiter" },
  });

  const onInvite = async (data: InviteForm) => {
    await invite({
      orgId,
      full_name: data.full_name,
      email: data.email,
      password: data.password,
      role_code: data.role,
    });
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setDialogOpen(false); reset(); }, 1500);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">Team Members</h1>
          <p className="text-sm text-muted-foreground">{members.length} members in TechCorp Egypt</p>
        </div>
        <Button size="sm" className="gap-1.5 h-9" onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" /> Invite Member
        </Button>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Jobs</th>
              <th className="px-4 py-3 text-left">Last Active</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {members.map((member, i) => {
              const roleConf = roleConfig[member.role];
              const statConf = statusConfig[member.status];
              return (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-[11px]">
                          {initials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", roleConf.color)}>
                      {roleConf.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", statConf.color)}>
                      {statConf.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-muted-foreground">{member.jobsAssigned}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{relativeTime(member.lastActive)}</td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{shortDate(member.joinedAt)}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invite dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) reset(); }}>
        <DialogContent className="glass border-border/60 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Invite Team Member
            </DialogTitle>
          </DialogHeader>
          {success ? (
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="font-semibold text-foreground">Invite sent!</p>
              <p className="text-xs text-muted-foreground">They'll receive an email with a join link.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onInvite)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Full name</Label>
                <Input
                  placeholder="Jane Smith"
                  {...register("full_name")}
                  className={cn("h-9", errors.full_name && "border-destructive")}
                />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Email address</Label>
                <Input
                  type="email"
                  placeholder="colleague@techcorp.io"
                  {...register("email")}
                  className={cn("h-9", errors.email && "border-destructive")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Temporary password</Label>
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  {...register("password")}
                  className={cn("h-9", errors.password && "border-destructive")}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Role</Label>
                <Select defaultValue="recruiter" onValueChange={(v) => setValue("role", v as InviteForm["role"])}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                    <SelectItem value="interviewer">Interviewer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
                  {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</> : <><Mail className="h-3.5 w-3.5" /> Send Invite</>}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
