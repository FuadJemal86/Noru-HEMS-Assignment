import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { CalendarClock, ClipboardCheck, FileBarChart, Loader2, Plus, Users } from "lucide-react";
import api from "@/service/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Employee = { id: string; employeeId: string; firstName: string; lastName: string; role: string };
type Shift = { id: string; employeeId: string; shiftDate: string; startTime: string; endTime: string; breakMinutes: number; status: string; employee: Employee };
type Attendance = { id: string; employeeId: string; date: string; clockIn: string | null; clockOut: string | null; status: string; employee: Employee };
type Report = { scheduledShifts: number; attendanceRecords: number; present: number; late: number; absent: number; scheduledHours: number; workedHours: number; recordedEmployees: number };

const today = () => new Date().toISOString().slice(0, 10);
const dateText = (value: string) => new Date(value).toLocaleDateString();
const timeText = (value: string | null) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
const errorMessage = (error: unknown, fallback: string) => axios.isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || fallback : fallback;

export default function Workforce() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shiftForm, setShiftForm] = useState({ employeeId: "", shiftDate: today(), startTime: "09:00", endTime: "17:00", breakMinutes: "30", notes: "" });
  const [attendanceForm, setAttendanceForm] = useState({ employeeId: "", date: today(), clockIn: "09:00", clockOut: "17:00", status: "PRESENT", notes: "" });
  const [reportRange, setReportRange] = useState({ startDate: today(), endDate: today() });

  const load = async () => {
    setLoading(true);
    try {
      const [employeeResponse, shiftResponse, attendanceResponse] = await Promise.all([
        api.get("/hr/employees/get"),
        api.get("/hr/shifts", { params: { startDate: reportRange.startDate, endDate: reportRange.endDate } }),
        api.get("/hr/attendance", { params: { startDate: reportRange.startDate, endDate: reportRange.endDate } }),
      ]);
      setEmployees(employeeResponse.data.data || []);
      setShifts(shiftResponse.data.data || []);
      setAttendance(attendanceResponse.data.data || []);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to load workforce data"));
    } finally { setLoading(false); }
  };

  const loadReport = async () => {
    try {
      const response = await api.get("/hr/reports/workforce", { params: reportRange });
      setReport(response.data.data);
    } catch (error) { toast.error(errorMessage(error, "Failed to load report")); }
  };

  // Initial load intentionally runs once; range changes are applied explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); loadReport(); }, []);

  const refreshRange = () => { load(); loadReport(); };

  const submitShift = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/hr/shifts", { ...shiftForm, breakMinutes: Number(shiftForm.breakMinutes) });
      toast.success("Shift assigned");
      setShiftForm((form) => ({ ...form, notes: "" }));
      refreshRange();
    } catch (error) { toast.error(errorMessage(error, "Failed to assign shift")); }
    finally { setSaving(false); }
  };

  const submitAttendance = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { clockIn, clockOut, date, ...rest } = attendanceForm;
      await api.post("/hr/attendance", { ...rest, date, clockIn: `${date}T${clockIn}:00`, clockOut: `${date}T${clockOut}:00` });
      toast.success("Attendance recorded");
      setAttendanceForm((form) => ({ ...form, notes: "" }));
      refreshRange();
    } catch (error) { toast.error(errorMessage(error, "Failed to record attendance")); }
    finally { setSaving(false); }
  };

  return <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
    <Card className="shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-2xl"><Users className="h-6 w-6" />Workforce</CardTitle><CardDescription>Assign daily shifts, record attendance, and monitor workforce hours.</CardDescription></CardHeader></Card>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Assign shift</CardTitle><CardDescription>Each employee can have one shift per day.</CardDescription></CardHeader><CardContent><form className="grid gap-4 sm:grid-cols-2" onSubmit={submitShift}>
        <div className="space-y-2 sm:col-span-2"><Label>Employee</Label><Select value={shiftForm.employeeId} onValueChange={(employeeId) => setShiftForm({ ...shiftForm, employeeId })}><SelectTrigger className="w-full"><SelectValue placeholder="Select an employee" /></SelectTrigger><SelectContent>{employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeId}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Shift date</Label><Input type="date" value={shiftForm.shiftDate} onChange={(event) => setShiftForm({ ...shiftForm, shiftDate: event.target.value })} /></div><div className="space-y-2"><Label>Break minutes</Label><Input type="number" min="0" value={shiftForm.breakMinutes} onChange={(event) => setShiftForm({ ...shiftForm, breakMinutes: event.target.value })} /></div>
        <div className="space-y-2"><Label>Start time</Label><Input type="time" value={shiftForm.startTime} onChange={(event) => setShiftForm({ ...shiftForm, startTime: event.target.value })} /></div><div className="space-y-2"><Label>End time</Label><Input type="time" value={shiftForm.endTime} onChange={(event) => setShiftForm({ ...shiftForm, endTime: event.target.value })} /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Notes <span className="text-muted-foreground">(optional)</span></Label><Textarea value={shiftForm.notes} onChange={(event) => setShiftForm({ ...shiftForm, notes: event.target.value })} placeholder="Role, location, or shift notes" /></div><Button className="sm:col-span-2" disabled={saving || !shiftForm.employeeId}><Plus className="mr-2 h-4 w-4" />Assign shift</Button>
      </form></CardContent></Card>

      <Card className="shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Record attendance</CardTitle><CardDescription>Saving the same employee and date updates the existing entry.</CardDescription></CardHeader><CardContent><form className="grid gap-4 sm:grid-cols-2" onSubmit={submitAttendance}>
        <div className="space-y-2 sm:col-span-2"><Label>Employee</Label><Select value={attendanceForm.employeeId} onValueChange={(employeeId) => setAttendanceForm({ ...attendanceForm, employeeId })}><SelectTrigger className="w-full"><SelectValue placeholder="Select an employee" /></SelectTrigger><SelectContent>{employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeId}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Date</Label><Input type="date" value={attendanceForm.date} onChange={(event) => setAttendanceForm({ ...attendanceForm, date: event.target.value })} /></div><div className="space-y-2"><Label>Status</Label><Select value={attendanceForm.status} onValueChange={(status) => setAttendanceForm({ ...attendanceForm, status })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["PRESENT", "LATE", "ABSENT", "LEAVE"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Clock in</Label><Input type="time" value={attendanceForm.clockIn} onChange={(event) => setAttendanceForm({ ...attendanceForm, clockIn: event.target.value })} /></div><div className="space-y-2"><Label>Clock out</Label><Input type="time" value={attendanceForm.clockOut} onChange={(event) => setAttendanceForm({ ...attendanceForm, clockOut: event.target.value })} /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Notes <span className="text-muted-foreground">(optional)</span></Label><Textarea value={attendanceForm.notes} onChange={(event) => setAttendanceForm({ ...attendanceForm, notes: event.target.value })} placeholder="Reason for late arrival, leave, or adjustment" /></div><Button className="sm:col-span-2" disabled={saving || !attendanceForm.employeeId}><ClipboardCheck className="mr-2 h-4 w-4" />Save attendance</Button>
      </form></CardContent></Card>
    </div>

    <Card className="shadow-sm"><CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between"><div><CardTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5" />Workforce report</CardTitle><CardDescription>Scheduled coverage and recorded hours for the selected period.</CardDescription></div><div className="flex flex-wrap gap-2"><Input className="w-auto" type="date" value={reportRange.startDate} onChange={(event) => setReportRange({ ...reportRange, startDate: event.target.value })} /><Input className="w-auto" type="date" value={reportRange.endDate} onChange={(event) => setReportRange({ ...reportRange, endDate: event.target.value })} /><Button variant="outline" onClick={refreshRange}>Apply</Button></div></CardHeader><CardContent>
      {report && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{[["Shifts", report.scheduledShifts], ["Records", report.attendanceRecords], ["Present", report.present], ["Late", report.late], ["Absent", report.absent], ["Scheduled hrs", report.scheduledHours], ["Worked hrs", report.workedHours]].map(([label, value]) => <div key={String(label)} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div>}
    </CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-2"><Card className="shadow-sm"><CardHeader><CardTitle>Scheduled shifts</CardTitle></CardHeader><CardContent>{loading ? <Loader2 className="mx-auto animate-spin" /> : <div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Break</TableHead></TableRow></TableHeader><TableBody>{shifts.length ? shifts.map((shift) => <TableRow key={shift.id}><TableCell>{shift.employee.firstName} {shift.employee.lastName}</TableCell><TableCell>{dateText(shift.shiftDate)}</TableCell><TableCell>{shift.startTime}–{shift.endTime}</TableCell><TableCell>{shift.breakMinutes}m</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No shifts in this period.</TableCell></TableRow>}</TableBody></Table></div>}</CardContent></Card>
      <Card className="shadow-sm"><CardHeader><CardTitle>Attendance records</CardTitle></CardHeader><CardContent>{loading ? <Loader2 className="mx-auto animate-spin" /> : <div className="overflow-hidden rounded-md border"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Hours</TableHead></TableRow></TableHeader><TableBody>{attendance.length ? attendance.map((entry) => <TableRow key={entry.id}><TableCell>{entry.employee.firstName} {entry.employee.lastName}</TableCell><TableCell>{dateText(entry.date)}</TableCell><TableCell><Badge variant={entry.status === "ABSENT" ? "destructive" : entry.status === "LATE" ? "warning" : "secondary"}>{entry.status}</Badge></TableCell><TableCell>{timeText(entry.clockIn)}–{timeText(entry.clockOut)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No attendance records in this period.</TableCell></TableRow>}</TableBody></Table></div>}</CardContent></Card></div>
  </div>;
}
