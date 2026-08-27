# Client routes

This document describes the React Router configuration used in the app. All routes are defined in `indexRoutes.tsx` and rendered under a root layout.

---

## Layout

- **Root layout:** `IndexLayout` (`@/Layouts/IndexLayout`) wraps all HR routes. It typically provides the sidebar, header, and main content area.
- **Path prefix:** All current routes live under `/` (e.g. `/hr/payroll`). The layout is the parent `<Route path="/" element={<IndexLayout />}>`.

---

## Route table

| Path | Component | Description |
|------|-----------|-------------|
| `hr/add-employee` | `AddEmployee` | Add new employee form. |
| `hr/schedule` | `Schedule` | Schedule management (desktop/default view). |
| `hr/schedule-ios` | `ScheduleIOS` | Schedule view optimized for iOS / alternate UI. |
| `hr/timesheets` | `Timesheets` | Timesheet list and management. |
| `hr/clock-in` | `ClockIn` | Clock in / out for employees. |
| `hr/leave-request` | `LeaveRequest` | Create and submit leave requests. |
| `hr/view-requests` | `ViewRequests` | View and manage leave/time requests. |
| `hr/documents-upload` | `DocumentUplode` | Upload and manage employee documents. |
| `hr/assign-goals` | `AssignGoal` | Assign goals to employees. |
| `hr/goals-progress` | `GoalProgress` | Track goal progress. |
| `hr/my-goals` | `MyGoals` | Employee view of assigned goals. |
| `hr/payroll` | `Payroll` | Payroll management: timesheets, payments, transactions. |

---

## File

- **Definition:** `client/src/routes/indexRoutes.tsx`
- **Exports:** `indexRoutes` (JSX element tree).
- **Usage:** Rendered inside the main router (e.g. in `App.tsx` or main router setup) so that `IndexLayout` and its child routes are active.

---

## Imports (components)

| Route path | Import source |
|------------|----------------|
| AddEmployee | `@/Pages/HRmodules/Employees/AddEmployee` |
| Schedule | `@/Pages/HRmodules/Schedule/Schedule` |
| ScheduleIOS | `@/Pages/HRmodules/Schedule/ScheduleIOS` |
| Timesheets | `@/Pages/HRmodules/Timesheets/Timesheets` |
| ClockIn | `@/Pages/HRmodules/clockIn/ClockIn` |
| LeaveRequest | `@/Pages/HRmodules/LeaveRequest/LeaveRequest` |
| ViewRequests | `@/Pages/HRmodules/ViewRequests/ViewRequests` |
| DocumentUplode | `@/Pages/HRmodules/DocumentUplode/DocumentUplode` |
| AssignGoal | `@/Pages/HRmodules/Goal/AssignGoal` |
| GoalProgress | `@/Pages/HRmodules/Goal/GoalProgress` |
| MyGoals | `@/Pages/HRmodules/Goal/MyGoals` |
| Payroll | `@/Pages/HRmodules/payroll/Payroll` |

---

## Sidebar / navigation

The sidebar (e.g. in `Layouts/Components/app-sidebar.tsx`) usually links to these paths so users can navigate to each HR module. Paths above match the sidebar URLs for HR sections.
