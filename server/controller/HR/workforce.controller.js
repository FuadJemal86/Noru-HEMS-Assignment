const wrapTenantHandlers = require("../../Utils/wrapTenantHandlers");

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const ATTENDANCE_STATUSES = new Set(["PRESENT", "LATE", "ABSENT", "LEAVE"]);
const SHIFT_STATUSES = new Set(["SCHEDULED", "CANCELLED"]);

const day = (value) => (typeof value === "string" && DAY_PATTERN.test(value) ? new Date(`${value}T00:00:00.000Z`) : null);
const timeIsValid = (value) => typeof value === "string" && TIME_PATTERN.test(value);
const employeeSelect = { id: true, employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } };

const shiftInclude = { employee: { select: employeeSelect }, attendance: true };
const attendanceInclude = { employee: { select: employeeSelect }, shift: true };

const requireEmployee = async (prisma, employeeId) => {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  return employee;
};

const createShift = async (req, res) => {
  try {
    const { employeeId, shiftDate, startTime, endTime, breakMinutes = 0, notes, status = "SCHEDULED" } = req.body;
    const date = day(shiftDate);
    if (!employeeId || !date || !timeIsValid(startTime) || !timeIsValid(endTime)) {
      return res.status(400).json({ success: false, error: "Employee, date, and valid start/end times are required" });
    }
    if (startTime >= endTime) return res.status(400).json({ success: false, error: "End time must be after start time" });
    if (!Number.isInteger(Number(breakMinutes)) || Number(breakMinutes) < 0) return res.status(400).json({ success: false, error: "Break minutes must be a positive whole number" });
    if (!SHIFT_STATUSES.has(status)) return res.status(400).json({ success: false, error: "Invalid shift status" });
    if (!(await requireEmployee(req.prisma, employeeId))) return res.status(404).json({ success: false, error: "Employee not found" });

    const shift = await req.prisma.shift.create({ data: { employeeId, shiftDate: date, startTime, endTime, breakMinutes: Number(breakMinutes), notes: notes?.trim() || null, status }, include: shiftInclude });
    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    if (error.code === "P2002") return res.status(400).json({ success: false, error: "This employee already has a shift on that date" });
    console.error("Error creating shift:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const getShifts = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      const start = startDate ? day(startDate) : null;
      const end = endDate ? day(endDate) : null;
      if ((startDate && !start) || (endDate && !end)) return res.status(400).json({ success: false, error: "Dates must use YYYY-MM-DD" });
      where.shiftDate = { ...(start && { gte: start }), ...(end && { lte: end }) };
    }
    const shifts = await req.prisma.shift.findMany({ where, include: shiftInclude, orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }] });
    res.json({ success: true, data: shifts });
  } catch (error) {
    console.error("Error loading shifts:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const updateShift = async (req, res) => {
  try {
    const existing = await req.prisma.shift.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Shift not found" });
    const { shiftDate, startTime, endTime, breakMinutes, notes, status } = req.body;
    const data = {};
    if (shiftDate !== undefined) { const value = day(shiftDate); if (!value) return res.status(400).json({ success: false, error: "Date must use YYYY-MM-DD" }); data.shiftDate = value; }
    if (startTime !== undefined) { if (!timeIsValid(startTime)) return res.status(400).json({ success: false, error: "Start time must use HH:mm" }); data.startTime = startTime; }
    if (endTime !== undefined) { if (!timeIsValid(endTime)) return res.status(400).json({ success: false, error: "End time must use HH:mm" }); data.endTime = endTime; }
    if ((data.startTime || existing.startTime) >= (data.endTime || existing.endTime)) return res.status(400).json({ success: false, error: "End time must be after start time" });
    if (breakMinutes !== undefined) { if (!Number.isInteger(Number(breakMinutes)) || Number(breakMinutes) < 0) return res.status(400).json({ success: false, error: "Break minutes must be a positive whole number" }); data.breakMinutes = Number(breakMinutes); }
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (status !== undefined) { if (!SHIFT_STATUSES.has(status)) return res.status(400).json({ success: false, error: "Invalid shift status" }); data.status = status; }
    const shift = await req.prisma.shift.update({ where: { id: existing.id }, data, include: shiftInclude });
    res.json({ success: true, data: shift });
  } catch (error) {
    if (error.code === "P2002") return res.status(400).json({ success: false, error: "This employee already has a shift on that date" });
    console.error("Error updating shift:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const deleteShift = async (req, res) => {
  try {
    await req.prisma.shift.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Shift deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, error: "Shift not found" });
    console.error("Error deleting shift:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const recordAttendance = async (req, res) => {
  try {
    const { employeeId, shiftId, date: dateValue, clockIn, clockOut, status = "PRESENT", notes } = req.body;
    const date = day(dateValue);
    if (!employeeId || !date) return res.status(400).json({ success: false, error: "Employee and attendance date are required" });
    if (!ATTENDANCE_STATUSES.has(status)) return res.status(400).json({ success: false, error: "Invalid attendance status" });
    if (!(await requireEmployee(req.prisma, employeeId))) return res.status(404).json({ success: false, error: "Employee not found" });
    const inTime = clockIn ? new Date(clockIn) : null;
    const outTime = clockOut ? new Date(clockOut) : null;
    if ((clockIn && Number.isNaN(inTime.getTime())) || (clockOut && Number.isNaN(outTime.getTime())) || (inTime && outTime && outTime <= inTime)) return res.status(400).json({ success: false, error: "Clock-out must be after a valid clock-in" });
    if (shiftId) {
      const shift = await req.prisma.shift.findUnique({ where: { id: shiftId } });
      if (!shift || shift.employeeId !== employeeId) return res.status(400).json({ success: false, error: "Selected shift does not belong to this employee" });
    }
    const attendance = await req.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { employeeId, shiftId: shiftId || null, date, clockIn: inTime, clockOut: outTime, status, notes: notes?.trim() || null },
      update: { shiftId: shiftId || null, clockIn: inTime, clockOut: outTime, status, notes: notes?.trim() || null },
      include: attendanceInclude,
    });
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    console.error("Error recording attendance:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      const start = startDate ? day(startDate) : null; const end = endDate ? day(endDate) : null;
      if ((startDate && !start) || (endDate && !end)) return res.status(400).json({ success: false, error: "Dates must use YYYY-MM-DD" });
      where.date = { ...(start && { gte: start }), ...(end && { lte: end }) };
    }
    const attendance = await req.prisma.attendance.findMany({ where, include: attendanceInclude, orderBy: { date: "desc" } });
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("Error loading attendance:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const getWorkforceReport = async (req, res) => {
  try {
    const start = day(req.query.startDate) || new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    const end = day(req.query.endDate) || start;
    if (end < start) return res.status(400).json({ success: false, error: "End date must be on or after start date" });
    const range = { gte: start, lte: end };
    const [shifts, attendance] = await Promise.all([
      req.prisma.shift.findMany({ where: { shiftDate: range, status: "SCHEDULED" }, select: { employeeId: true, startTime: true, endTime: true, breakMinutes: true } }),
      req.prisma.attendance.findMany({ where: { date: range }, select: { employeeId: true, clockIn: true, clockOut: true, status: true } }),
    ]);
    const scheduledMinutes = shifts.reduce((total, shift) => { const [sh, sm] = shift.startTime.split(":").map(Number); const [eh, em] = shift.endTime.split(":").map(Number); return total + Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - shift.breakMinutes); }, 0);
    const workedMinutes = attendance.reduce((total, item) => total + (item.clockIn && item.clockOut ? Math.round((item.clockOut - item.clockIn) / 60000) : 0), 0);
    const recordedEmployeeDays = new Set(attendance.map((item) => item.employeeId)).size;
    res.json({ success: true, data: { startDate: start, endDate: end, scheduledShifts: shifts.length, attendanceRecords: attendance.length, present: attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length, late: attendance.filter((item) => item.status === "LATE").length, absent: attendance.filter((item) => item.status === "ABSENT").length, scheduledHours: Number((scheduledMinutes / 60).toFixed(2)), workedHours: Number((workedMinutes / 60).toFixed(2)), recordedEmployees: recordedEmployeeDays } });
  } catch (error) {
    console.error("Error building workforce report:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

module.exports = wrapTenantHandlers({ createShift, getShifts, updateShift, deleteShift, recordAttendance, getAttendance, getWorkforceReport });
