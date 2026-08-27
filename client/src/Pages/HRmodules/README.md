# HR modules

The HR pages are grouped by resource. Their routes are registered in `src/routes/indexRoutes.tsx` and the navigation entries are in `src/Layouts/Components/app-sidebar.tsx`.

| Folder | Route | Components | API area |
| --- | --- | --- | --- |
| `Employees/` | `/hr/add-employee` | `AddEmployee.tsx`, `EmployeeTable.tsx` | `/hr/employees`, `/hr/roles`, `/hr/departments` |
| `Departments/` | `/hr/departments` | `Departments.tsx` | `/hr/departments` |
| `Roles/` | `/hr/roles` | `Roles.tsx` | `/hr/roles` |
| `Workforce/` | `/hr/workforce` | `Workforce.tsx` | `/hr/shifts`, `/hr/attendance`, `/hr/reports/workforce` |
| `clockIn/` | `/hr/clock-in` | `ClockIn.tsx` | Existing clock-in API integration |

## Data flow

Employee creation loads role and department options from their respective `GET` endpoints. Workforce loads employees, shifts, attendance, and the report independently, then refreshes those data after a shift or attendance entry is saved.

The workforce report compares each scheduled `employeeId + date` with attendance `employeeId + date`. This lets the UI identify scheduled shifts that have no attendance record, rather than treating a missing record as a normal count of zero.

All modules use `@/service/api` and show server feedback through Sonner toast notifications.
