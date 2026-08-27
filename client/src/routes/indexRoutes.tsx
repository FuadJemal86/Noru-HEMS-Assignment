import { Route } from "react-router-dom";
import IndexLayout from "@/Layouts/IndexLayout";
import AddEmployee from "@/Pages/HRmodules/Employees/AddEmployee";
import Departments from "@/Pages/HRmodules/Departments/Departments";


export const indexRoutes = (
  <Route path="/" element={<IndexLayout></IndexLayout>}>
    <Route path="hr/add-employee" element={<AddEmployee />} />
    <Route path="hr/departments" element={<Departments />} />
  </Route>
);
