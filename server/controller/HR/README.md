# HR Controller

Single controller module for all HR-related business logic. Implemented in `hr.component.js`. All handlers are wrapped with `wrapTenantHandlers` for multi-tenant Prisma access via `req.prisma`.

---

## Overview

- **File:** `hr.component.js`
- **Database:** Prisma (PostgreSQL). Models used: Employee, Schedule, Timesheet, Roles, LeaveType, LeaveRequest, EmployeeDocument, DocumentCategory, Goal, GoalMilestone, Payroll, Transaction.
- **Pattern:** Async route handlers; validation in controller; errors return `{ success: false, error: string }` with appropriate status codes.

---

## Employee handlers

### createEmployee
- **Purpose:** Create a new employee. Generates a unique `employeeId` (e.g. EMP001).
- **Validation:** firstName, lastName, email, role, hourlyRate required; email unique; hourlyRate ≥ 0.
- **Body:** firstName, lastName, email, phone?, role, hourlyRate, profilePhoto?, status? (default "active").
- **Returns:** 201 with created employee. 400 on validation or duplicate email; 500 on server error.

### getEmployees
- **Purpose:** List all employees, ordered by `createdAt` desc.
- **Returns:** 200 with `{ data: Employee[] }`.

### getEmployeeById
- **Purpose:** Fetch one employee by ID.
- **Params:** `id` (employee UUID).
- **Returns:** 200 with employee or 404 if not found.

### updateEmployee
- **Purpose:** Update an existing employee. Can update any of the create fields; email uniqueness checked if changed.
- **Params:** `id`.
- **Body:** Same as create (all optional for partial update).
- **Returns:** 200 with updated employee. 404 if not found; 400 on validation/duplicate.

### deleteEmployee
- **Purpose:** Delete an employee (cascades to related records per schema).
- **Params:** `id`.
- **Returns:** 200 with success message or 404.

---

## Schedule handlers

### createSchedule
- **Purpose:** Create a schedule for an employee (shift date, start/end time, break, position, notes).
- **Body:** employeeId, storeId?, shiftDate, startTime, endTime, breakTime?, position?, notes?.
- **Returns:** 201 with schedule. 400/404 on validation or missing employee.

### getSchedules
- **Purpose:** List schedules with optional filters and date range. Includes employee and can filter by employeeId, startDate, endDate, storeId.
- **Query:** employeeId?, startDate?, endDate?, storeId?.
- **Returns:** 200 with array of schedules.

### getScheduleById
- **Purpose:** Get a single schedule by ID with employee.
- **Params:** `id`.
- **Returns:** 200 or 404.

### updateSchedule
- **Purpose:** Update a schedule (same fields as create).
- **Params:** `id`.
- **Returns:** 200 with updated schedule or 404.

### deleteSchedule
- **Purpose:** Delete a schedule.
- **Params:** `id`.
- **Returns:** 200 or 404.

---

## Timesheet handlers

### createTimesheet
- **Purpose:** Create a timesheet (clock in/out and break data as JSON, optional link to schedule).
- **Body:** employeeId, scheduleId?, storeId?, date, clockInAndOutTime?, breakClockInAndOutTime?, totalHours?, notes?.
- **Returns:** 201 with timesheet. 400/404 on validation or missing employee/schedule.

### getTimesheets
- **Purpose:** List timesheets with optional filters (employee, date range, status, store).
- **Query:** employeeId?, startDate?, endDate?, status?, storeId?.
- **Returns:** 200 with timesheets (includes employee, schedule).

### getTimesheetById
- **Purpose:** Get one timesheet by ID with relations.
- **Params:** `id`.
- **Returns:** 200 or 404.

### updateTimesheet
- **Purpose:** Update a timesheet (e.g. clock data, totalHours, notes).
- **Params:** `id`.
- **Returns:** 200 with updated timesheet or 404.

### approveTimesheet
- **Purpose:** Set timesheet status to "approved" and set approvedBy/approvedAt.
- **Params:** `id`.
- **Body:** approvedBy?.
- **Returns:** 200 with updated timesheet or 404.

### deleteTimesheet
- **Purpose:** Delete a timesheet.
- **Params:** `id`.
- **Returns:** 200 or 404.

---

## Roles handlers

- **createRole:** Create role (name). Returns 201 or 400.
- **getRoles:** List all roles. Returns 200.
- **getRoleById:** Get role by id. Returns 200 or 404.
- **updateRole:** Update role name. Params: id. Returns 200 or 404.
- **deleteRole:** Delete role. Params: id. Returns 200 or 404.

---

## Leave Type handlers

- **createLeaveType:** Create leave type (name). Returns 201 or 400.
- **getLeaveTypes:** List all leave types. Returns 200.
- **getLeaveTypeById:** Get by id. Returns 200 or 404.
- **updateLeaveType:** Update name. Params: id. Returns 200 or 404.
- **deleteLeaveType:** Delete. Params: id. Returns 200 or 404.

---

## Leave Request handlers

### createLeaveRequest
- **Purpose:** Create a leave request (annual, sick, etc.; supports full-day or hourly leave).
- **Body:** employeeId, leaveType, startDate, endDate, totalDays, reason?, isHourlyLeave?, startTime?, endTime?.
- **Returns:** 201 with leave request. 400/404 on validation or missing employee.

### getLeaveRequests
- **Purpose:** List leave requests with optional filters.
- **Query:** employeeId?, status?, startDate?, endDate?.
- **Returns:** 200 with array (includes employee).

### getLeaveRequestById
- **Purpose:** Get one leave request by ID.
- **Params:** `id`.
- **Returns:** 200 or 404.

### updateLeaveRequestStatus
- **Purpose:** Approve or reject a leave request. Sets status, approvedBy, approvedAt, and optionally rejectionReason.
- **Params:** `id`.
- **Body:** status ("approved" | "rejected"), approvedBy?, rejectionReason?.
- **Returns:** 200 with updated request or 404.

### deleteLeaveRequest
- **Purpose:** Delete a leave request.
- **Params:** `id`.
- **Returns:** 200 or 404.

---

## Employee Document handlers

All document handlers work with file storage (multer) and store metadata in DB. File types: images, PDF, Word, Excel. Max file size: 10MB.

### createEmployeeDocument
- **Purpose:** Upload a file and create an employee document record (category, type, visibility, uploadedBy, etc.).
- **Body:** employeeId, documentName, category, documentType?, file (multipart), fileName, fileSize?, mimeType?, issueDate?, expiryDate?, description?, visibility?, uploadedBy.
- **Returns:** 201 with document record. 400/404 on validation or missing employee.

### getEmployeeDocuments
- **Purpose:** List documents for an employee, optionally by category.
- **Query:** employeeId?, category?.
- **Returns:** 200 with array.

### getEmployeeDocumentById
- **Purpose:** Get one document by ID.
- **Params:** `id`.
- **Returns:** 200 or 404.

### updateEmployeeDocument
- **Purpose:** Update document metadata; optionally replace file (multipart).
- **Params:** `id`.
- **Returns:** 200 with updated document or 404.

### deleteEmployeeDocument
- **Purpose:** Delete document record (and typically file from disk if implemented).
- **Params:** `id`.
- **Returns:** 200 or 404.

---

## Document Category handlers

- **createDocumentCategory:** Create category (name). Returns 201 or 400.
- **getDocumentCategories:** List categories. Returns 200.
- **getDocumentCategoryById:** Get by id. Returns 200 or 404.
- **updateDocumentCategory:** Update name. Params: id. Returns 200 or 404.
- **deleteDocumentCategory:** Delete. Params: id. Returns 200 or 404.

---

## Goal handlers

### createGoal
- **Purpose:** Create a goal for an employee (performance/development, with dates, priority, optional metrics).
- **Body:** employeeId, title, description?, category?, type?, startDate, endDate, priority, status?, createdBy, reportingTo?, reviewId?, targetValue?, currentValue?, unit?, progressPercent?, progressType?.
- **Returns:** 201 with goal. 400/404 on validation or missing employee.

### getGoals
- **Purpose:** List goals with optional filters (employee, status, date range, createdBy).
- **Query:** employeeId?, status?, startDate?, endDate?, createdBy?.
- **Returns:** 200 with array (includes employee, milestones).

### getMyGoals
- **Purpose:** List goals for the current user (employee). Uses req.user or similar to filter by employee.
- **Returns:** 200 with array.

### getGoalById
- **Purpose:** Get one goal by ID with relations.
- **Params:** `id`.
- **Returns:** 200 or 404.

### updateGoal
- **Purpose:** Update goal fields (including progress).
- **Params:** `id`.
- **Returns:** 200 with updated goal or 404.

### deleteGoal
- **Purpose:** Delete a goal (cascades to milestones).
- **Params:** `id`.
- **Returns:** 200 or 404.

---

## Milestone handlers

- **createMilestone:** Create a milestone for a goal (goalId, title, dueDate, etc.). Returns 201 or 400/404.
- **updateMilestone:** Update milestone (e.g. isCompleted, completedAt, notes). Params: id. Returns 200 or 404.
- **deleteMilestone:** Delete a milestone. Params: id. Returns 200 or 404.

---

## Payroll handlers

### getPayrollTimesheets
- **Purpose:** List approved timesheets for payroll. Optionally attaches `payrollSummary` (totalAmount, netAmount, payedAmount) per timesheet by matching Payroll on employeeId + date.
- **Query:** employeeId?, startDate?, endDate?, payroll? (boolean to filter paid/unpaid).
- **Returns:** 200 with array of timesheets (with employee, schedule, payrollSummary).

### updatePayrollStatus
- **Purpose:** Set a timesheet’s `payroll` boolean (e.g. mark as paid/unpaid).
- **Params:** `id` (timesheet id).
- **Body:** `payroll` (boolean).
- **Returns:** 200 with updated timesheet or 404.

### getPayrollByTimesheet
- **Purpose:** Get or create a Payroll for the given timesheet. Payroll is matched by employeeId + same calendar day as timesheet.date. If none exists, creates one with totalAmount from timesheet (totalHours * hourlyRate), netAmount = totalAmount, payedAmount = 0.
- **Params:** `timesheetId`.
- **Returns:** 200 with payroll (includes transactions, employee). 404 if timesheet not found or not approved.

### generateTransaction
- **Purpose:** Record a payment: create a Transaction for the payroll, add amount to payedAmount, set payroll status to "paid" when payedAmount >= netAmount. Optionally mark the linked timesheet as paid when fully paid (pass timesheetId in body).
- **Params:** `payrollId`.
- **Body:** amount (required), timesheetId? (optional).
- **Validation:** amount > 0 and amount ≤ remaining (netAmount - payedAmount).
- **Returns:** 201 with updated payroll (includes transactions). 400 if amount invalid or exceeds remaining; 404 if payroll not found.

### initPayrollForTimesheet
- **Purpose:** Create or update Payroll for a timesheet (match by employeeId + date). Sets totalAmount and netAmount (from body or computed from timesheet). Used to initialize or adjust net before payments.
- **Params:** `timesheetId`.
- **Body:** netAmount?, totalAmount?.
- **Returns:** 200 with payroll (includes transactions, employee). 404 if timesheet not found or not approved.

---

## Helper (internal)

- **generateEmployeeId(prisma, store_id):** Returns next available employee ID (e.g. EMP001, EMP002). Not exported; used by createEmployee.
