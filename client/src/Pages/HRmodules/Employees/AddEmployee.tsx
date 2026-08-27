import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Loader2, User, Mail, Phone, Briefcase, DollarSign, Edit2, Trash2, X, Save, ArrowRight, Building2 } from "lucide-react";
import api from "@/service/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import EmployeeTable from "./EmployeeTable";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,

  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhoneInput, getCountryByDialCode } from "@/components/ui/phone-input";

// Schema
const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional field
        // Remove spaces and validate phone format
        const cleaned = val.replace(/\s/g, "");

        if (!cleaned.startsWith("+")) {
          return false; // Must start with +
        }

        // Find matching country by dial code (sorted by length to match longest first)
        const country = getCountryByDialCode(cleaned);
        if (!country) {
          return false; // Invalid country code
        }

        // Extract number part (after country code)
        const numberPart = cleaned.replace(country.dialCode, "");

        // Validate length based on country
        if (numberPart.length < country.minLength || numberPart.length > country.maxLength) {
          return false;
        }

        // Should only contain digits after country code
        return /^\d+$/.test(numberPart);
      },
      { message: "Please enter a valid phone number with country code" }
    ),
  role: z.string().min(1, "Role is required"),
  hourlyRate: z
    .string()
    .min(1, "Hourly rate is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: "Hourly rate must be a positive number" }
    ),
  status: z.enum(["active", "inactive"]),
  departmentId: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface Role {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface Department { id: string; name: string; }

export default function AddEmployee() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [submittingRole, setSubmittingRole] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const hasRestoredForm = useRef(false);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
      hourlyRate: "",
      status: "active",
      departmentId: "",
    },
  });

  // Restore form data on component mount (only once)
  useEffect(() => {
    if (hasRestoredForm.current) return; // Prevent multiple restorations

    // Check if returning from DocumentUplode with saved data
    const savedData = sessionStorage.getItem("savedEmployeeFormData");
    if (savedData) {
      try {
        const employeeData = JSON.parse(savedData);

        // Preserve all fields exactly as they were, including role
        // The role value stays in form state - simple and straightforward
        form.reset({
          firstName: employeeData.firstName || "",
          lastName: employeeData.lastName || "",
          email: employeeData.email || "",
          phone: employeeData.phone || "",
          role: employeeData.role || "", // Preserve the role value - stays in form state
          hourlyRate: employeeData.hourlyRate?.toString() || "",
          status: employeeData.status || "active",
          departmentId: employeeData.departmentId || "",
        });

        sessionStorage.removeItem("savedEmployeeFormData");
        hasRestoredForm.current = true; // Mark as restored
      } catch (error) {
        console.error("Error restoring form data:", error);
        hasRestoredForm.current = true; // Mark as restored even on error to prevent retries
      }
    } else {
      hasRestoredForm.current = true; // Mark as restored if no saved data
    }
  }, [form]);

  useEffect(() => {
    api.get("/hr/departments/get")
      .then((response) => setDepartments(response.data.data || []))
      .catch((error) => console.error("Error loading departments:", error));
  }, []);

  // Set first role ONLY when roles are loaded AND there's no role selected (simple logic)
  useEffect(() => {
    if (roles.length > 0 && !loadingRoles && hasRestoredForm.current) {
      const currentRole = form.getValues("role");
      // Only set first role if no role is selected at all
      if (!currentRole || currentRole.trim() === "") {
        form.setValue("role", roles[0].name);
      }
      // If role already has a value, don't touch it - it stays as is
    }
  }, [roles, loadingRoles, form]);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await api.get("/hr/roles/get");
      if (response.data.success) {
        setRoles(response.data.data || []);
      }
    } catch (error: any) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoadingRoles(false);
    }
  };


  const handleAddRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleModalOpen(true);
    // Fetch roles if not already loaded
    if (roles.length === 0 && !loadingRoles) {
      fetchRoles();
    }
  };


  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleModalOpen(true);
  };

  const handleCancelRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleModalOpen(false);
  };


  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;

    setDeletingRole(true);
    try {
      await api.delete(`/hr/roles/delete/${roleToDelete.id}`);
      toast.success("Role deleted successfully");
      fetchRoles();
      // Clear role selection if deleted role was selected
      if (form.getValues("role") === roleToDelete.name) {
        form.setValue("role", "");
      }
      setRoleToDelete(null);
    } catch (error: any) {
      console.error("Error deleting role:", error);
      const errorMessage = error.response?.data?.error || "Failed to delete role";
      toast.error(errorMessage);
    } finally {
      setDeletingRole(false);
    }
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    setSubmittingRole(true);
    try {
      if (editingRole) {
        // Update role
        await api.put(`/hr/roles/update/${editingRole.id}`, {
          name: roleName.trim(),
        });
        toast.success("Role updated successfully");
        // Update form if the edited role was selected
        if (form.getValues("role") === editingRole.name) {
          form.setValue("role", roleName.trim());
        }
      } else {
        // Create role
        await api.post("/hr/roles/create", {
          name: roleName.trim(),
        });
        toast.success("Role added successfully");
        // Auto-select the newly created role
        form.setValue("role", roleName.trim());
      }
      setRoleModalOpen(false);
      setEditingRole(null);
      setRoleName("");
      fetchRoles();
    } catch (error: any) {
      console.error("Error saving role:", error);
      const errorMessage = error.response?.data?.error || "Failed to save role";
      toast.error(errorMessage);
    } finally {
      setSubmittingRole(false);
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    setSubmitting(true);
    try {
      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim().replace(/\s/g, "") || null, // Remove spaces from phone number
        role: data.role.trim(),
        hourlyRate: parseFloat(data.hourlyRate),
        status: data.status,
        departmentId: data.departmentId || null,
      };

      await api.post("/hr/employees/create", payload);
      toast.success("Employee added successfully");
      form.reset();
      // Trigger table refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (error: any) {
      console.error("Error creating employee:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to add employee";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async (data: EmployeeFormData) => {
    // Validate form first
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Store employee data in sessionStorage to pass to DocumentUplode
    const employeeData = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim().replace(/\s/g, "") || null,
      role: data.role.trim(),
      hourlyRate: parseFloat(data.hourlyRate),
      status: data.status,
      departmentId: data.departmentId || null,
    };

    // Also save form data for restoration if user cancels
    sessionStorage.setItem("savedEmployeeFormData", JSON.stringify(employeeData));
    sessionStorage.setItem("pendingEmployeeData", JSON.stringify(employeeData));
    navigate("/hr/documents-upload");
  };


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <User className="h-6 w-6" />
            Add New Employee
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Fill in the details to add a new employee to the system
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          {...field}
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          {...field}
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          {...field}
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone (Optional)
                      </FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value || ""}
                          onChange={field.onChange}
                          defaultCountry="AU"
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Role
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={handleAddRole}
                          disabled={submitting}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Manage Roles
                        </Button>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={submitting || loadingRoles}
                        onOpenChange={(open) => {
                          // Fetch roles when dropdown is opened for the first time
                          if (open && roles.length === 0 && !loadingRoles) {
                            fetchRoles();
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={loadingRoles ? "Loading roles..." : field.value || "Select a role"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingRoles ? (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                              Loading roles...
                            </div>
                          ) : roles.length > 0 ? (
                            <>
                              {/* If field.value exists but not in roles list, add it so SelectValue can display it */}
                              {field.value && !roles.some(r => r.name === field.value) && (
                                <SelectItem value={field.value} key="saved-role">
                                  {field.value}
                                </SelectItem>
                              )}
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.name}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </>
                          ) : field.value ? (
                            // If no roles loaded but we have a saved value, show it
                            <SelectItem value={field.value}>
                              {field.value}
                            </SelectItem>
                          ) : (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                              No roles available. Click "Manage Roles" to create one.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Hourly Rate
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="15.00"
                          {...field}
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Building2 className="h-4 w-4" />Department <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "unassigned" ? "" : value)} value={field.value || "unassigned"} disabled={submitting}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">No department</SelectItem>
                          {departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 flex gap-4">
                <Button type="submit" disabled={submitting} className="w-full md:w-auto min-w-[200px]">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Employee...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Employee
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  className="w-full md:w-auto min-w-[200px]"
                  onClick={form.handleSubmit(handleNext)}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Next (Add Document)
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <div className="mt-8">
        <EmployeeTable refreshTrigger={refreshTrigger} />
      </div>

      {/* Role Management Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              Add, edit, or delete employee roles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add/Edit Role Form */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter role name (e.g., Cashier, Manager)"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  disabled={submittingRole}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !submittingRole && roleName.trim()) {
                      e.preventDefault();
                      handleSaveRole();
                    }
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={handleSaveRole}
                  disabled={submittingRole || !roleName.trim()}
                >
                  {submittingRole ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelRole}
                  disabled={submittingRole}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {editingRole && (
                <p className="text-xs text-muted-foreground">
                  Editing: {editingRole.name}
                </p>
              )}
            </div>

            {/* Roles List */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              {loadingRoles ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Loading roles...
                </div>
              ) : roles.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No roles available. Add one above.
                </div>
              ) : (
                <div className="divide-y">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium">{role.name}</span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                          disabled={submittingRole}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(role)}
                          disabled={submittingRole}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={!!roleToDelete} onOpenChange={(open: boolean) => {
        if (!open) {
          setRoleToDelete(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role{" "}
              <strong>{roleToDelete?.name}</strong>? This action cannot be undone.
              {form.getValues("role") === roleToDelete?.name && (
                <span className="block mt-2 text-destructive text-sm">
                  This role is currently selected. It will be cleared from the form.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleToDelete(null)}
              disabled={deletingRole}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRole}
              disabled={deletingRole}
            >
              {deletingRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Role
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
