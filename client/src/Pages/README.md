# Pages (client components)

This folder contains all page-level React components. HR modules live under `Pages/HRmodules/`. Each subfolder usually has one or more components that are used by the app routes.

---

## Route → Page mapping

| Route path | Page folder | Main component | Description |
|------------|-------------|----------------|-------------|
| `/hr/add-employee` | `HRmodules/Employees/` | `AddEmployee.tsx` | Form to add a new employee. |
| `/hr/schedule` | `HRmodules/Schedule/` | `Schedule.tsx` | Schedule management (default/desktop). |
| `/hr/schedule-ios` | `HRmodules/Schedule/` | `ScheduleIOS.tsx` | Schedule UI variant (e.g. iOS-friendly). |
| `/hr/timesheets` | `HRmodules/Timesheets/` | `Timesheets.tsx` | List and manage timesheets. |
| `/hr/clock-in` | `HRmodules/clockIn/` | `ClockIn.tsx` | Clock in / clock out. |
| `/hr/leave-request` | `HRmodules/LeaveRequest/` | `LeaveRequest.tsx` | Create leave request. |
| `/hr/view-requests` | `HRmodules/ViewRequests/` | `ViewRequests.tsx` | View and act on requests. |
| `/hr/documents-upload` | `HRmodules/DocumentUplode/` | `DocumentUplode.tsx` | Upload employee documents. |
| `/hr/assign-goals` | `HRmodules/Goal/` | `AssignGoal.tsx` | Assign goals to employees. |
| `/hr/goals-progress` | `HRmodules/Goal/` | `GoalProgress.tsx` | View goal progress. |
| `/hr/my-goals` | `HRmodules/Goal/` | `MyGoals.tsx` | Employee’s own goals. |
| `/hr/payroll` | `HRmodules/payroll/` | `Payroll.tsx` | Payroll: timesheets, pay modal, transactions. |

---

## HRmodules folder structure

```
Pages/
└── HRmodules/
    ├── clockIn/          → ClockIn.tsx
    ├── DocumentUplode/   → DocumentUplode.tsx
    ├── Employees/        → AddEmployee.tsx, EmployeeTable.tsx
    ├── Goal/             → AssignGoal.tsx, GoalProgress.tsx, MyGoals.tsx
    ├── LeaveRequest/     → LeaveRequest.tsx
    ├── payroll/          → Payroll.tsx
    ├── Schedule/         → Schedule.tsx, ScheduleIOS.tsx
    ├── Timesheets/       → Timesheets.tsx
    └── ViewRequests/     → ViewRequests.tsx
```

---

## Component overview (by folder)

### HRmodules/clockIn/
- **ClockIn.tsx** – Clock in/out UI. Uses HR API for timesheet/attendance. Route: `/hr/clock-in`.

### HRmodules/DocumentUplode/
- **DocumentUplode.tsx** – Upload and manage employee documents (categories, file types). Route: `/hr/documents-upload`.

### HRmodules/Employees/
- **AddEmployee.tsx** – Form to create a new employee (name, email, role, hourly rate, etc.). Route: `/hr/add-employee`.
- **EmployeeTable.tsx** – Table/list of employees with expandable rows (mobile dropdown), edit, delete, documents, goals. Used from AddEmployee or similar context.

### HRmodules/Goal/
- **AssignGoal.tsx** – Assign goals to employees. Route: `/hr/assign-goals`.
- **GoalProgress.tsx** – Track progress of goals. Route: `/hr/goals-progress`.
- **MyGoals.tsx** – Employee view of assigned goals. Route: `/hr/my-goals`.

### HRmodules/LeaveRequest/
- **LeaveRequest.tsx** – Create and submit leave requests (leave type, dates, reason). Route: `/hr/leave-request`.

### HRmodules/payroll/
- **Payroll.tsx** – Payroll management: list approved timesheets with Total, Remaining, Status (Completed/Pending); open payment modal per row; payment summary (collapsible on mobile), transactions list (collapsible rows on mobile), pay form, generate transaction, view transaction modal with print. Route: `/hr/payroll`. API: `/hr/payroll/*` (timesheets, by-timesheet, generate-transaction, etc.).

### HRmodules/Schedule/
- **Schedule.tsx** – Schedule list/calendar, create/edit schedules. Route: `/hr/schedule`.
- **ScheduleIOS.tsx** – Alternate schedule UI (e.g. iOS). Route: `/hr/schedule-ios`.

### HRmodules/Timesheets/
- **Timesheets.tsx** – List timesheets, approve, edit. Route: `/hr/timesheets`.

### HRmodules/ViewRequests/
- **ViewRequests.tsx** – View and approve/reject leave (and possibly other) requests. Route: `/hr/view-requests`.

---

## Shared patterns

- **API:** Pages use `@/service/api` (axios) to call the backend. Base URL and tenant/auth are configured there.
- **UI:** Shared components from `@/components/ui/` (Button, Card, Table, Dialog, etc.) and layout from `IndexLayout` / sidebar.
- **Mobile:** Many tables use `Collapsible` for mobile: one column with a trigger row, expanded content below (e.g. Payroll modal, Employee table).
- **Forms:** React Hook Form + Zod where used; toast notifications (e.g. sonner) for success/error.

---

## Related files

- **Routes definition:** `src/routes/indexRoutes.tsx` (see `src/routes/README.md`).
- **Layout/sidebar:** `src/Layouts/IndexLayout.tsx`, `src/Layouts/Components/app-sidebar.tsx`.
- **API client:** `src/service/api.ts`.
