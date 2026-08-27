# HR routes

`server/index.js` mounts this router at `/api/hr`. All responses use `{ success: true, data }` on success or `{ success: false, error }` on failure.

## Employees

| Method | Path | Description |
| --- | --- | --- |
| POST | `/employees/create` | Create an employee. Requires `firstName`, `lastName`, `email`, `role`, and `monthlySalary`; accepts `phone`, `profilePhoto`, `status`, and `departmentId`. |
| GET | `/employees/get` | List employees with department details. |
| PUT | `/employees/update/:id` | Partially update an employee. |
| DELETE | `/employees/delete/:id` | Delete an employee. |

## Departments and roles

| Method | Path | Description |
| --- | --- | --- |
| POST | `/departments/create` | Create a department with `name` and optional `description`. |
| GET | `/departments/get` | List departments, including employee counts. |
| PUT | `/departments/update/:id` | Update a department. |
| DELETE | `/departments/delete/:id` | Delete a department; employees become unassigned. |
| POST | `/roles/create` | Create a reusable role with `name`. |
| GET | `/roles/get` | List roles alphabetically. |
| PUT | `/roles/update/:id` | Rename a role. |
| DELETE | `/roles/delete/:id` | Delete an unused role. |

## Workforce

| Method | Path | Description |
| --- | --- | --- |
| POST | `/shifts` | Assign a daily shift. Requires `employeeId`, `shiftDate` (`YYYY-MM-DD`), `startTime`, and `endTime` (`HH:mm`); accepts `breakMinutes`, `notes`, and `status`. |
| GET | `/shifts` | List shifts. Optional query: `employeeId`, `startDate`, `endDate`. |
| PUT | `/shifts/:id` | Update shift date, time, break, notes, or status. |
| DELETE | `/shifts/:id` | Delete a shift. |
| POST | `/attendance` | Create or update one employee attendance record per day. Requires `employeeId` and `date`; accepts `shiftId`, `clockIn`, `clockOut`, `status`, and `notes`. |
| GET | `/attendance` | List attendance. Optional query: `employeeId`, `startDate`, `endDate`. |
| GET | `/reports/workforce` | Workforce coverage report. Optional query: `startDate`, `endDate`; returns counts, scheduled/worked hours, missing records, and completion rate. |

Example report request: `GET /api/hr/reports/workforce?startDate=2026-08-27&endDate=2026-08-31`.
