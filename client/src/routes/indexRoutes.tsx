import { Route } from "react-router-dom";
import IndexLayout from "@/Layouts/IndexLayout";
import ClockIn from "@/Pages/HRmodules/clockIn/ClockIn";
import AddEmployee from "@/Pages/HRmodules/Employees/AddEmployee";
import Departments from "@/Pages/HRmodules/Departments/Departments";
import Roles from "@/Pages/HRmodules/Roles/Roles";
import Workforce from "@/Pages/HRmodules/Workforce/Workforce";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JSX component without type declarations


// Lazy load regular store pages

export const indexRoutes = (
  <Route path="/" element={<IndexLayout></IndexLayout>}>
    <Route path="hr/add-employee" element={<AddEmployee />} />
    <Route path="hr/clock-in" element={<ClockIn />} />
    <Route path="hr/departments" element={<Departments />} />
    <Route path="hr/roles" element={<Roles />} />
    <Route path="hr/workforce" element={<Workforce />} />

  </Route>
);
