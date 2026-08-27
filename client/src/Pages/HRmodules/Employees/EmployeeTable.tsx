import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Edit2,
  Trash2,
  Loader2,
  Search,
  User,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Calendar,
  Image as ImageIcon,
  FileIcon,
  Settings,
  Building2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api, { nPoint } from "@/service/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

// Employee type
type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  hourlyRate: number;
  profilePhoto?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
};

interface Department { id: string; name: string; }

// Role type
interface Role {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeTableProps {
  refreshTrigger?: number;
}

// Helper function to get initials
const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export default function EmployeeTable({
  refreshTrigger = 0,
}: EmployeeTableProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [employeeDocuments, setEmployeeDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [submittingRole, setSubmittingRole] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

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

  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
    api.get("/hr/departments/get")
      .then((response) => setDepartments(response.data.data || []))
      .catch((error) => console.error("Error loading departments:", error));
  }, []);

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

  // Role management handlers
  const handleAddRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
  };

  const handleCancelRole = () => {
    setEditingRole(null);
    setRoleName("");
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

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const response = await api.get("/hr/employees/get");
        const data = response.data.data || [];
        setEmployees(data);
        setFilteredEmployees(data);
      } catch (error) {
        console.error("Error fetching employees:", error);
        toast.error("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [refreshTrigger]);

  // Filter employees based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = employees.filter(
      (emp) =>
        emp.firstName.toLowerCase().includes(query) ||
        emp.lastName.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.employeeId.toLowerCase().includes(query) ||
        emp.role.toLowerCase().includes(query) ||
        (emp.phone && emp.phone.toLowerCase().includes(query))
    );
    setFilteredEmployees(filtered);
  }, [searchQuery, employees]);

  // Handle edit
  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    form.reset({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || "",
      role: employee.role,
      hourlyRate: employee.hourlyRate.toString(),
      status: employee.status as "active" | "inactive",
      departmentId: employee.departmentId || "",
    });
  };

  // Handle update
  const handleUpdate = async (data: EmployeeFormData) => {
    if (!editingEmployee) return;

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

      await api.put(`/hr/employees/update/${editingEmployee.id}`, payload);
      toast.success("Employee updated successfully");
      setEditingEmployee(null);
      form.reset();

      // Refresh employees list
      const response = await api.get("/hr/employees/get");
      const updatedData = response.data.data || [];
      setEmployees(updatedData);
      setFilteredEmployees(updatedData);
    } catch (error: any) {
      console.error("Error updating employee:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to update employee";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteEmployee) return;

    setDeleting(true);
    try {
      await api.delete(`/hr/employees/delete/${deleteEmployee.id}`);
      toast.success("Employee deleted successfully");
      setDeleteEmployee(null);

      // Refresh employees list
      const response = await api.get("/hr/employees/get");
      const updatedData = response.data.data || [];
      setEmployees(updatedData);
      setFilteredEmployees(updatedData);
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to delete employee";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const toggleRow = (employeeId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const handleViewDetail = async (employee: Employee) => {
    setDetailEmployee(employee);
    setLoadingDocuments(true);
    try {
      const response = await api.get(`/hr/documents/get?employeeId=${employee.id}`);
      if (response.data.success) {
        setEmployeeDocuments(response.data.data || []);
      }
    } catch (error: any) {
      console.error("Error fetching employee documents:", error);
      toast.error("Failed to load employee documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isImage = (mimeType: string | null) => {
    return mimeType?.startsWith("image/") || false;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      Identity: "bg-blue-500",
      Contract: "bg-green-500",
      Certification: "bg-purple-500",
      Educational: "bg-orange-500",
      Other: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  };

  // Helper function to construct correct file URL
  const getFileUrl = (fileUrl: string) => {
    if (!fileUrl) return "";
    // If already a full URL, return as is
    if (fileUrl.startsWith("http")) return fileUrl;

    // Use the fileUrl from database directly (e.g., /api/images/uploads/documents/filename.jpg)
    // Just prepend the domain from nPoint
    // Remove leading slash from fileUrl to avoid double slashes since nPoint ends with /
    const path = fileUrl.startsWith("/") ? fileUrl.substring(1) : fileUrl;
    return `${nPoint}${path}`;
  };

  // Helper function to construct correct profile photo URL
  const getProfilePhotoUrl = (profilePhoto: string | null | undefined) => {
    if (!profilePhoto) return undefined;
    // If already a full URL, return as is
    if (profilePhoto.startsWith("http")) return profilePhoto;

    // Use the profilePhoto from database directly (e.g., /api/images/uploads/documents/filename.jpg)
    // Just prepend the domain from nPoint
    // Remove leading slash from profilePhoto to avoid double slashes since nPoint ends with /
    const path = profilePhoto.startsWith("/") ? profilePhoto.substring(1) : profilePhoto;
    return `${nPoint}${path}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Card className="shadow-sm mb-10">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <User className="h-6 w-6" />
          Employees List
        </CardTitle>
        <CardDescription className="text-base mt-2">
          View and manage all employees in the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees by name, email, ID, role, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3 w-12">#</TableHead>
                <TableHead className="px-4 py-3">Name</TableHead>
                <TableHead className="px-4 py-3 hidden lg:table-cell">Email</TableHead>
                <TableHead className="px-4 py-3 hidden lg:table-cell">Phone</TableHead>
                <TableHead className="px-4 py-3 hidden md:table-cell">Role</TableHead>
                <TableHead className="px-4 py-3 hidden lg:table-cell">Hourly Rate</TableHead>
                <TableHead className="px-4 py-3 hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right px-4 py-3 hidden md:table-cell">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 px-4">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? "No employees found matching your search"
                          : "No employees found. Add your first employee above."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee, idx) => {
                  const isExpanded = expandedRows.has(employee.id);
                  return (
                    <Collapsible key={employee.id} asChild>
                      <>
                        <TableRow className="hover:bg-muted/50">
                          {/* Number column */}
                          <TableCell className="px-4 py-3 w-12 font-medium text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          {/* Mobile: Collapsible Trigger Row */}
                          <TableCell className="md:hidden px-4 py-3">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full justify-between p-0 h-auto font-normal"
                                onClick={() => toggleRow(employee.id)}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <Avatar className="h-10 w-10 border-2 border-primary/20 flex-shrink-0">
                                    <AvatarImage
                                      src={getProfilePhotoUrl(employee.profilePhoto)}
                                      alt={`${employee.firstName} ${employee.lastName}`}
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                      {getInitials(employee.firstName, employee.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="font-medium truncate">
                                      {employee.firstName} {employee.lastName}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {employee.role}
                                    </div>
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 flex-shrink-0 ml-2" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>

                          {/* Desktop: Regular Table Cells */}
                          <TableCell className="hidden md:table-cell px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-primary/20">
                                <AvatarImage
                                  src={getProfilePhotoUrl(employee.profilePhoto)}
                                  alt={`${employee.firstName} ${employee.lastName}`}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                  {getInitials(employee.firstName, employee.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {employee.firstName} {employee.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{employee.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell px-4 py-3">
                            {employee.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{employee.phone}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell px-4 py-3">
                            <Badge variant="outline" className="text-xs">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {employee.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell px-4 py-3">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">${employee.hourlyRate.toFixed(2)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell px-4 py-3">
                            <Badge
                              variant={
                                employee.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-4 py-3 hidden md:table-cell">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetail(employee)}
                                className="h-8 w-8 p-0"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(employee)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteEmployee(employee)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Mobile: Expanded Content */}
                        <CollapsibleContent asChild>
                          <TableRow className="md:hidden">
                            <TableCell colSpan={2} className="px-4 py-3 bg-muted/30">
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span>Email</span>
                                  </div>
                                  <span className="text-sm font-medium truncate ml-4">
                                    {employee.email}
                                  </span>
                                </div>
                                {employee.phone && (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Phone className="h-4 w-4" />
                                      <span>Phone</span>
                                    </div>
                                    <span className="text-sm font-medium">{employee.phone}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Briefcase className="h-4 w-4" />
                                    <span>Role</span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {employee.role}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <DollarSign className="h-4 w-4" />
                                    <span>Hourly Rate</span>
                                  </div>
                                  <span className="text-sm font-medium">
                                    ${employee.hourlyRate.toFixed(2)}/hr
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Status</span>
                                  </div>
                                  <Badge
                                    variant={
                                      employee.status === "active"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {employee.status}
                                  </Badge>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleViewDetail(employee)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Details
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleEdit(employee)}
                                  >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteEmployee(employee)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingEmployee}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setEditingEmployee(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Employee</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Update employee information below
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdate)}
              className="space-y-3 sm:space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Role
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs w-full sm:w-auto"
                          onClick={handleAddRole}
                          disabled={submitting}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Manage Roles
                        </Button>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={submitting || loadingRoles}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select a role"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.length > 0 ? (
                            roles.map((role) => (
                              <SelectItem key={role.id} value={role.name}>
                                {role.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              {loadingRoles ? "Loading roles..." : "No roles available"}
                            </SelectItem>
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
                        <SelectContent><SelectItem value="unassigned">No department</SelectItem>{departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingEmployee(null);
                    form.reset();
                  }}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Employee
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteEmployee}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeleteEmployee(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Delete Employee</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Are you sure you want to delete{" "}
              <strong>
                {deleteEmployee?.firstName} {deleteEmployee?.lastName}
              </strong>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteEmployee(null)}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Detail Modal */}
      <Dialog
        open={!!detailEmployee}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDetailEmployee(null);
            setEmployeeDocuments([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Employee Details</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              View employee information and documents
            </DialogDescription>
          </DialogHeader>
          {detailEmployee && (
            <div className="space-y-4 sm:space-y-6">
              {/* Employee Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-primary/20 shrink-0">
                  <AvatarImage
                    src={getProfilePhotoUrl(detailEmployee.profilePhoto)}
                    alt={`${detailEmployee.firstName} ${detailEmployee.lastName}`}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm sm:text-base">
                    {getInitials(detailEmployee.firstName, detailEmployee.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base sm:text-lg">
                    {detailEmployee.firstName} {detailEmployee.lastName}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {detailEmployee.employeeId} • {detailEmployee.role}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{detailEmployee.email}</span>
                  </p>
                  {detailEmployee.phone && (
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{detailEmployee.phone}</span>
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    detailEmployee.status === "active"
                      ? "default"
                      : "secondary"
                  }
                  className="shrink-0"
                >
                  {detailEmployee.status}
                </Badge>
              </div>

              {/* Employee Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    Role
                  </p>
                  <p className="font-semibold text-sm sm:text-base">{detailEmployee.role}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Hourly Rate
                  </p>
                  <p className="font-semibold text-sm sm:text-base">${detailEmployee.hourlyRate.toFixed(2)}/hr</p>
                </div>
              </div>

              {/* Documents Section */}
              <div className="border-t pt-4 sm:pt-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    Documents
                  </h3>
                </div>
                {loadingDocuments ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading documents...</p>
                  </div>
                ) : employeeDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No documents found for this employee</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {employeeDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-0">
                          <div className="flex-1 min-w-0 w-full sm:w-auto">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={getCategoryBadge(document.category)}>
                                {document.category}
                              </Badge>
                              <h4 className="font-semibold text-sm sm:text-base truncate">{document.documentName}</h4>
                            </div>
                            {document.documentType && (
                              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                                Type: {document.documentType}
                              </p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <FileIcon className="h-3 w-3 shrink-0" />
                                {formatFileSize(document.fileSize)}
                              </div>
                              {document.issueDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  Issue: {formatDate(document.issueDate)}
                                </div>
                              )}
                              {document.expiryDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  Expiry:{" "}
                                  <span
                                    className={
                                      new Date(document.expiryDate) < new Date()
                                        ? "text-red-500 font-medium"
                                        : ""
                                    }
                                  >
                                    {formatDate(document.expiryDate)}
                                  </span>
                                </div>
                              )}
                            </div>
                            {document.description && (
                              <p className="text-xs sm:text-sm mt-2 text-muted-foreground line-clamp-2">
                                {document.description}
                              </p>
                            )}
                          </div>
                          <div className="ml-0 sm:ml-4 shrink-0">
                            <a
                              href={getFileUrl(document.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-primary hover:underline text-xs sm:text-sm"
                            >
                              {isImage(document.mimeType) ? (
                                <>
                                  <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  View Image
                                </>
                              ) : (
                                <>
                                  <FileIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  Download
                                </>
                              )}
                            </a>
                          </div>
                        </div>
                        {isImage(document.mimeType) && (
                          <div className="mt-3 border rounded-md overflow-hidden">
                            <img
                              src={getFileUrl(document.fileUrl)}
                              alt={document.documentName}
                              className="w-full max-h-48 object-contain bg-muted/30"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setDetailEmployee(null);
                setEmployeeDocuments([]);
              }}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Manage Roles</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Add, edit, or delete employee roles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            {/* Add/Edit Role Form */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
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
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveRole}
                    disabled={submittingRole || !roleName.trim()}
                    className="flex-1 sm:flex-initial"
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
                    className="flex-1 sm:flex-initial"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {editingRole && (
                <p className="text-xs text-muted-foreground">
                  Editing: {editingRole.name}
                </p>
              )}
            </div>

            {/* Roles List */}
            <div className="border rounded-lg max-h-[300px] sm:max-h-[400px] overflow-y-auto">
              {loadingRoles ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  <span className="text-xs sm:text-sm">Loading roles...</span>
                </div>
              ) : roles.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <span className="text-xs sm:text-sm">No roles available. Add one above.</span>
                </div>
              ) : (
                <div className="divide-y">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-2 sm:p-3 hover:bg-muted/50 transition-colors gap-2"
                    >
                      <span className="font-medium text-sm sm:text-base truncate flex-1">{role.name}</span>
                      <div className="flex gap-1 sm:gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                          disabled={submittingRole}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(role)}
                          disabled={submittingRole}
                          className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setRoleModalOpen(false);
                setEditingRole(null);
                setRoleName("");
              }}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <Dialog
        open={!!roleToDelete}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setRoleToDelete(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Delete Role</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Are you sure you want to delete the role{" "}
              <strong>{roleToDelete?.name}</strong>? This action cannot be undone.
              {roleToDelete && employees.some(emp => emp.role === roleToDelete.name) && (
                <span className="block mt-2 text-destructive text-xs sm:text-sm">
                  Warning: This role is currently assigned to one or more employees.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRoleToDelete(null)}
              disabled={deletingRole}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRole}
              disabled={deletingRole}
              className="w-full sm:w-auto"
            >
              {deletingRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
