import { Route } from "react-router-dom";
import IndexLayout from "@/Layouts/IndexLayout";
import AddEmployee from "@/Pages/HRmodules/Employees/AddEmployee";
import Departments from "@/Pages/HRmodules/Departments/Departments";
import Workforce from "@/Pages/HRmodules/Workforce/Workforce";
import Roles from "@/Pages/HRmodules/Roles/Roles";


export const indexRoutes = (
  <Route path="/" element={<IndexLayout></IndexLayout>}>
    <Route path="hr/add-employee" element={<AddEmployee />} />
    <Route path="hr/departments" element={<Departments />} />
    <Route path="hr/workforce" element={<Workforce />} />
    <Route path="hr/roles" element={<Roles />} />
  </Route>
);
