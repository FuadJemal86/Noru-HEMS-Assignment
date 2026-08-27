import { useEffect, useState } from "react";
import { Briefcase, Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import api from "@/service/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Role = { id: string; name: string };

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]); const [name, setName] = useState(""); const [editing, setEditing] = useState<Role | null>(null); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false);
  const load = async () => { try { setRoles((await api.get("/hr/roles/get")).data.data || []); } catch { toast.error("Failed to load roles"); } };
  useEffect(() => { load(); }, []);
  const save = async () => { if (!name.trim()) return toast.error("Role name is required"); setSaving(true); try { editing ? await api.put(`/hr/roles/update/${editing.id}`, { name }) : await api.post("/hr/roles/create", { name }); toast.success("Role saved"); setOpen(false); load(); } catch (error: any) { toast.error(error.response?.data?.error || "Failed to save role"); } finally { setSaving(false); } };
  const remove = async (role: Role) => { if (!confirm(`Delete ${role.name}?`)) return; try { await api.delete(`/hr/roles/delete/${role.id}`); toast.success("Role deleted"); load(); } catch (error: any) { toast.error(error.response?.data?.error || "Failed to delete role"); } };
  return <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8"><Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle className="flex items-center gap-2 text-2xl"><Briefcase className="h-6 w-6" />Roles</CardTitle><CardDescription className="mt-2 text-base">Create and manage employee roles.</CardDescription></div><Button onClick={() => { setEditing(null); setName(""); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Role</Button></CardHeader><CardContent><div className="space-y-2">{roles.length ? roles.map((role) => <div key={role.id} className="flex items-center justify-between rounded-md border p-3"><span className="font-medium">{role.name}</span><div><Button variant="ghost" size="icon" onClick={() => { setEditing(role); setName(role.name); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(role)}><Trash2 className="h-4 w-4" /></Button></div></div>) : <p className="py-10 text-center text-muted-foreground">No roles yet.</p>}</div></CardContent></Card><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit Role" : "Add Role"}</DialogTitle><DialogDescription>Role names must be unique.</DialogDescription></DialogHeader><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Manager" /><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter></DialogContent></Dialog></div>;
}
