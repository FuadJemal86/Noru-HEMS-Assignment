import { useEffect, useState } from "react";
import axios from "axios";
import { Building2, Edit2, Loader2, Plus, Trash2, Users } from "lucide-react";
import api from "@/service/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Department = {
  id: string;
  name: string;
  description: string | null;
  _count?: { employees: number };
};

const getErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || fallback : fallback;

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await api.get("/hr/departments/get");
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error("Error loading departments:", error);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const openCreate = () => {
    setEditingDepartment(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const openEdit = (department: Department) => {
    setEditingDepartment(department);
    setName(department.name);
    setDescription(department.description || "");
    setDialogOpen(true);
  };

  const saveDepartment = async () => {
    if (!name.trim()) {
      toast.error("Department name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || null };
      if (editingDepartment) {
        await api.put(`/hr/departments/update/${editingDepartment.id}`, payload);
        toast.success("Department updated successfully");
      } else {
        await api.post("/hr/departments/create", payload);
        toast.success("Department added successfully");
      }
      setDialogOpen(false);
      fetchDepartments();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to save department"));
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async () => {
    if (!departmentToDelete) return;
    setSaving(true);
    try {
      await api.delete(`/hr/departments/delete/${departmentToDelete.id}`);
      toast.success("Department deleted successfully");
      setDepartmentToDelete(null);
      fetchDepartments();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete department"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <Card className="shadow-sm">
        <CardHeader className="flex-row items-start justify-between gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl"><Building2 className="h-6 w-6" />Departments</CardTitle>
            <CardDescription className="mt-2 text-base">Create and manage departments for your employees.</CardDescription>
          </div>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Department</Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 px-4 py-3">#</TableHead>
                    <TableHead className="px-4 py-3">Department</TableHead>
                    <TableHead className="px-4 py-3">Description</TableHead>
                    <TableHead className="px-4 py-3">Employees</TableHead>
                    <TableHead className="px-4 py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No departments yet. Add your first department.</TableCell></TableRow> : departments.map((department, index) => (
                    <TableRow key={department.id} className="hover:bg-muted/50">
                      <TableCell className="w-12 px-4 py-3 font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="px-4 py-3 font-medium">{department.name}</TableCell>
                      <TableCell className="max-w-md whitespace-normal px-4 py-3 text-muted-foreground">{department.description || "—"}</TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {department._count?.employees ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right"><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(department)} aria-label={`Edit ${department.name}`}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDepartmentToDelete(department)} aria-label={`Delete ${department.name}`}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingDepartment ? "Edit Department" : "Add Department"}</DialogTitle><DialogDescription>Department names must be unique.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="department-name">Department Name</Label><Input id="department-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Human Resources" disabled={saving} /></div><div className="space-y-2"><Label htmlFor="department-description">Description <span className="text-muted-foreground">(optional)</span></Label><Textarea id="department-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this department is responsible for" disabled={saving} aria-describedby="department-description-help" /><p id="department-description-help" className="text-sm text-muted-foreground">Briefly describe this department's responsibilities.</p></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button onClick={saveDepartment} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingDepartment ? "Save Changes" : "Add Department"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!departmentToDelete} onOpenChange={(open) => !open && setDepartmentToDelete(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete department?</DialogTitle><DialogDescription>Employees in this department will remain, but will no longer have a department assigned.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDepartmentToDelete(null)} disabled={saving}>Cancel</Button><Button variant="destructive" onClick={deleteDepartment} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
