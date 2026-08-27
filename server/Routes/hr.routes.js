const express = require("express");
const router = express.Router();
const {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
} = require("../controller/HR/employee.controller");
const {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
} = require("../controller/HR/department.controller");
const {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
} = require("../controller/HR/role.controller");
const {
  getEmployeeDocuments,
} = require("../controller/HR/employee-document.controller");

router.post("/employees/create", createEmployee);
router.get("/employees/get", getEmployees);
router.put("/employees/update/:id", updateEmployee);
router.delete("/employees/delete/:id", deleteEmployee);

router.post("/departments/create", createDepartment);
router.get("/departments/get", getDepartments);
router.put("/departments/update/:id", updateDepartment);
router.delete("/departments/delete/:id", deleteDepartment);

router.post("/roles/create", createRole);
router.get("/roles/get", getRoles);
router.put("/roles/update/:id", updateRole);
router.delete("/roles/delete/:id", deleteRole);

router.get("/documents/get", getEmployeeDocuments);

module.exports = router;
