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
  createShift,
  getShifts,
  updateShift,
  deleteShift,
  recordAttendance,
  getAttendance,
  getWorkforceReport,
} = require("../controller/HR/workforce.controller");

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

router.post("/shifts", createShift);
router.get("/shifts", getShifts);
router.put("/shifts/:id", updateShift);
router.delete("/shifts/:id", deleteShift);

router.post("/attendance", recordAttendance);
router.get("/attendance", getAttendance);
router.get("/reports/workforce", getWorkforceReport);

module.exports = router;
