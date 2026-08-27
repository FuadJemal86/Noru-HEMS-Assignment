# HR controllers

The HR API uses small resource controllers and one shared Prisma client (`main` from `server/prisma/prisma.js`). Controllers do not use tenant wrapper middleware: every handler accesses Prisma directly and returns JSON in the shape `{ success, data? | error? }`.

| Controller | Responsibility |
| --- | --- |
| `employee.controller.js` | Create, list, update, and delete employees; generates sequential `EMP###` IDs and validates departments. |
| `department.controller.js` | Manage department names and descriptions; lists the number of assigned employees. |
| `role.controller.js` | Manage reusable role names; prevents deletion while a role is assigned to an employee. |
| `workforce.controller.js` | Assign shifts, record daily attendance, and produce workforce coverage reports. |
| `hr.component.js` | Backward-compatible export that combines the controllers above. |

## Employee controller

- `createEmployee` validates the required name, email, role, and monthly salary fields, checks email/department validity, creates an `EMP###` identifier, and stores an optional department.
- `getEmployees` returns employees with their department relation.
- `updateEmployee` supports partial edits and revalidates changed email or department values.
- `deleteEmployee` removes an employee; related shifts and attendance cascade according to the Prisma schema.

## Department and role controllers

Departments require a unique name and accept an optional description. Department listings include `_count.employees` for the frontend table.

Roles require a non-empty unique name. A role cannot be deleted while any employee has the same role name.

## Workforce controller

### Shifts

`createShift`, `getShifts`, `updateShift`, and `deleteShift` manage one daily shift per employee. Create/update validates a `YYYY-MM-DD` date, `HH:mm` start/end times, non-negative whole break minutes, a valid status (`SCHEDULED` or `CANCELLED`), and an existing employee. Shift lists can filter by `employeeId`, `startDate`, and `endDate`.

### Attendance

`recordAttendance` creates or updates the one attendance record for an employee/date. It validates the employee, status (`PRESENT`, `LATE`, `ABSENT`, `LEAVE`), optional linked shift, and clock-in/out ordering. `getAttendance` supports employee and date-range filters.

### Workforce report

`getWorkforceReport` queries scheduled shifts and attendance records for a date range in parallel. It calculates scheduled/worked hours, present/late/absent totals, shifts without a matching attendance record, and an attendance completion rate. Matching uses an employee-and-date key, so missing attendance is reported even when no explicit absence was entered.
