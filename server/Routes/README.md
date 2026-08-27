# HR Routes

This document describes all HTTP routes defined in the HR module. The base path for these routes is typically `/hr` (or as mounted in the main app).

---

## Employee routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/employees/create` | `createEmployee` | Create a new employee. Body: firstName, lastName, email, phone, role, hourlyRate, profilePhoto?, status?. |
| `GET` | `/employees/get` | `getEmployees` | List all employees (ordered by createdAt desc). |
| `GET` | `/employees/getbyid/:id` | `getEmployeeById` | Get a single employee by ID. Params: `id`. |
| `PUT` | `/employees/update/:id` | `updateEmployee` | Update an employee. Params: `id`. Body: same fields as create. |
| `DELETE` | `/employees/delete/:id` | `deleteEmployee` | Delete an employee. Params: `id`. |

---

## Schedule routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/schedules/create` | `createSchedule` | Create a schedule. Body: employeeId, storeId?, shiftDate, startTime, endTime, breakTime?, position?, notes?. |
| `GET` | `/schedules/get` | `getSchedules` | List schedules. Query: employeeId?, startDate?, endDate?, storeId?. |
| `GET` | `/schedules/getbyid/:id` | `getScheduleById` | Get a schedule by ID. Params: `id`. |
| `PUT` | `/schedules/update/:id` | `updateSchedule` | Update a schedule. Params: `id`. |
| `DELETE` | `/schedules/delete/:id` | `deleteSchedule` | Delete a schedule. Params: `id`. |

---

## Timesheet routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/timesheets/create` | `createTimesheet` | Create a timesheet. Body: employeeId, scheduleId?, storeId?, date, clockInAndOutTime?, breakClockInAndOutTime?, totalHours?, notes?. |
| `GET` | `/timesheets/get` | `getTimesheets` | List timesheets. Query: employeeId?, startDate?, endDate?, status?, storeId?. |
| `GET` | `/timesheets/getbyid/:id` | `getTimesheetById` | Get a timesheet by ID. Params: `id`. |
| `PUT` | `/timesheets/update/:id` | `updateTimesheet` | Update a timesheet. Params: `id`. |
| `PUT` | `/timesheets/approve/:id` | `approveTimesheet` | Approve a timesheet. Params: `id`. |
| `DELETE` | `/timesheets/delete/:id` | `deleteTimesheet` | Delete a timesheet. Params: `id`. |

---

## Roles routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/roles/create` | `createRole` | Create a role. Body: name. |
| `GET` | `/roles/get` | `getRoles` | List all roles. |
| `GET` | `/roles/getbyid/:id` | `getRoleById` | Get a role by ID. Params: `id`. |
| `PUT` | `/roles/update/:id` | `updateRole` | Update a role. Params: `id`. Body: name. |
| `DELETE` | `/roles/delete/:id` | `deleteRole` | Delete a role. Params: `id`. |

---

## Leave Type routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/leave-types/create` | `createLeaveType` | Create a leave type. Body: name. |
| `GET` | `/leave-types/get` | `getLeaveTypes` | List all leave types. |
| `GET` | `/leave-types/getbyid/:id` | `getLeaveTypeById` | Get a leave type by ID. Params: `id`. |
| `PUT` | `/leave-types/update/:id` | `updateLeaveType` | Update a leave type. Params: `id`. |
| `DELETE` | `/leave-types/delete/:id` | `deleteLeaveType` | Delete a leave type. Params: `id`. |

---

## Leave Request routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/leave-requests/create` | `createLeaveRequest` | Create a leave request. Body: employeeId, leaveType, startDate, endDate, totalDays, reason?, isHourlyLeave?, startTime?, endTime?. |
| `GET` | `/leave-requests/get` | `getLeaveRequests` | List leave requests. Query: employeeId?, status?, startDate?, endDate?. |
| `GET` | `/leave-requests/getbyid/:id` | `getLeaveRequestById` | Get a leave request by ID. Params: `id`. |
| `PUT` | `/leave-requests/update-status/:id` | `updateLeaveRequestStatus` | Approve or reject a leave request. Params: `id`. Body: status, approvedBy?, rejectionReason?. |
| `DELETE` | `/leave-requests/delete/:id` | `deleteLeaveRequest` | Delete a leave request. Params: `id`. |

---

## Employee Document routes

Uses `multer` for file upload (single file). Allowed types: images, PDF, Word, Excel. Max size: 10MB.

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/documents/create` | `createEmployeeDocument` | Upload and create document. Params: employeeId, documentName, category, documentType?, file (multipart), fileName, fileSize?, mimeType?, issueDate?, expiryDate?, description?, visibility?, uploadedBy. |
| `GET` | `/documents/get` | `getEmployeeDocuments` | List documents. Query: employeeId?, category?. |
| `GET` | `/documents/getbyid/:id` | `getEmployeeDocumentById` | Get a document by ID. Params: `id`. |
| `PUT` | `/documents/update/:id` | `updateEmployeeDocument` | Update document metadata or replace file. Params: `id`. Optional file upload. |
| `DELETE` | `/documents/delete/:id` | `deleteEmployeeDocument` | Delete a document. Params: `id`. |

---

## Goal routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/goals/create` | `createGoal` | Create a goal. Body: employeeId, title, description?, category?, type?, startDate, endDate, priority, status?, createdBy, reportingTo?, reviewId?, targetValue?, currentValue?, unit?, progressPercent?, progressType?. |
| `GET` | `/goals/get` | `getGoals` | List goals. Query: employeeId?, status?, startDate?, endDate?, createdBy?. |
| `GET` | `/goals/my-goals` | `getMyGoals` | List goals for the current user (employee). |
| `GET` | `/goals/getbyid/:id` | `getGoalById` | Get a goal by ID. Params: `id`. |
| `PUT` | `/goals/update/:id` | `updateGoal` | Update a goal. Params: `id`. |
| `DELETE` | `/goals/delete/:id` | `deleteGoal` | Delete a goal. Params: `id`. |

---

## Milestone routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/milestones/create` | `createMilestone` | Create a goal milestone. Body: goalId, title, dueDate, isCompleted?, completedAt?, notes?. |
| `PUT` | `/milestones/update/:id` | `updateMilestone` | Update a milestone. Params: `id`. |
| `DELETE` | `/milestones/delete/:id` | `deleteMilestone` | Delete a milestone. Params: `id`. |

---

## Document Category routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `POST` | `/categories/create` | `createDocumentCategory` | Create a document category. Body: name. |
| `GET` | `/categories/get` | `getDocumentCategories` | List document categories. |
| `GET` | `/categories/getbyid/:id` | `getDocumentCategoryById` | Get a category by ID. Params: `id`. |
| `PUT` | `/categories/update/:id` | `updateDocumentCategory` | Update a category. Params: `id`. |
| `DELETE` | `/categories/delete/:id` | `deleteDocumentCategory` | Delete a category. Params: `id`. |

---

## Payroll routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `GET` | `/payroll/timesheets` | `getPayrollTimesheets` | List approved timesheets for payroll, with optional payrollSummary (totalAmount, netAmount, payedAmount) per timesheet. Query: employeeId?, startDate?, endDate?, payroll?. |
| `PUT` | `/payroll/update/:id` | `updatePayrollStatus` | Set timesheet payroll flag. Params: `id`. Body: `payroll` (boolean). |
| `GET` | `/payroll/by-timesheet/:timesheetId` | `getPayrollByTimesheet` | Get or create payroll for a timesheet (match by employeeId + date). Returns payroll with transactions and employee. Params: `timesheetId`. |
| `PUT` | `/payroll/init/:timesheetId` | `initPayrollForTimesheet` | Create or update payroll for a timesheet (set totalAmount, netAmount). Params: `timesheetId`. Body: netAmount?, totalAmount?. |
| `POST` | `/payroll/generate-transaction/:payrollId` | `generateTransaction` | Record a payment: create Transaction, update payedAmount, optionally mark timesheet paid when full. Params: `payrollId`. Body: amount, timesheetId? (optional, to mark timesheet when fully paid). |

---

## File

- **Routes definition:** `hr.routes.js`
- **Multer:** Used only for document routes; uploads go to `../uploads/documents/`.
