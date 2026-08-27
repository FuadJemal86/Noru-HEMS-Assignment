# Hotel management system (Workforce Management)

 is a small HR workforce-management application for maintaining employees, departments and roles, assigning daily shifts, recording attendance, and reviewing workforce coverage.

**Live app:** https://noru-hems-assignment.vercel.app/

---

## Architecture

- `client/` — React + TypeScript + Vite single-page application. Uses Axios for the REST API, and the Workforce page (`/hr/workforce`) provides the scheduling, attendance, and reporting interface.
- `server/` — Express API. Controllers are organized by HR resource (`employee`, `department`, `role`, and `workforce`) and use a single Prisma client directly.
- PostgreSQL is accessed through Prisma. The API is mounted under `/api/hr`.

### Deployment

| Layer | Platform |
| --- | --- |
| Frontend | Vercel |
| Backend | Render |
| Database | Neon (PostgreSQL) |

---

## Database design

`Employee` is the central entity and can belong to one optional `Department`.

- **Department** — has many employees; stores a name and optional description.
- **Roles** — stores reusable role names; employees store the selected role name.
- **Shift** — belongs to an employee; stores the shift date, start/end time, break minutes, status, and notes. The unique `(employeeId, shiftDate)` constraint intentionally permits one planned daily shift per employee, which keeps rostering and attendance uncomplicated.
- **Attendance** — belongs to an employee and can link to its shift. Stores one daily clock-in/out record, a status (`PRESENT`, `LATE`, `ABSENT`, or `LEAVE`), and optional notes. Its unique `(employeeId, date)` constraint prevents duplicate daily attendance records.

Both workforce tables index their date and status fields for date-range reporting. Deleting an employee cascades to their shifts and attendance; deleting a department simply unassigns its employees.

---

## Useful report

`GET /api/hr/reports/workforce?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` provides a date-range workforce coverage report. It runs two filtered queries in parallel — scheduled shifts and attendance records — and combines employee/date keys to calculate:

- scheduled shifts and attendance records
- present, late, and explicitly absent entries
- scheduled versus worked hours
- scheduled shifts with no attendance record
- attendance completion rate

This identifies gaps that a simple attendance count misses — for example, an employee can be scheduled but have no attendance entry at all. The same report is displayed on the Workforce page.

---

## API summary

| Resource | Endpoints |
| --- | --- |
| Employees | `POST /api/hr/employees/create`, `GET /api/hr/employees/get`, `PUT /api/hr/employees/update/:id`, `DELETE /api/hr/employees/delete/:id` |
| Departments | `POST /api/hr/departments/create`, `GET /api/hr/departments/get`, `PUT /api/hr/departments/update/:id`, `DELETE /api/hr/departments/delete/:id` |
| Roles | `POST /api/hr/roles/create`, `GET /api/hr/roles/get`, `PUT /api/hr/roles/update/:id`, `DELETE /api/hr/roles/delete/:id` |
| Shifts | `POST /api/hr/shifts`, `GET /api/hr/shifts`, `PUT /api/hr/shifts/:id`, `DELETE /api/hr/shifts/:id` |
| Attendance | `POST /api/hr/attendance`, `GET /api/hr/attendance` |
| Report | `GET /api/hr/reports/workforce` |

---

## Run locally

**Requirements:** Node.js 20+ and PostgreSQL.

### 1. Configure environment

In `server/`, create `.env` with `DATABASE_URL` pointing to PostgreSQL. Optionally set `PORT` (defaults to `4000`).

### 2. Install packages

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Set up the database

```bash
cd server
npx prisma generate
npx prisma db push
```

### 4. Start the API and the UI

```bash
# terminal 1
cd server && npx nodemon index

# terminal 2
cd client && npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The client expects the API at `http://localhost:4000/api` in development.