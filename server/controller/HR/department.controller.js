const wrapTenantHandlers = require("../../Utils/wrapTenantHandlers");
const normalizeDepartmentName = (name) => name?.trim();

const createDepartment = async (req, res) => {
  try {
    const name = normalizeDepartmentName(req.body.name);
    const description = req.body.description?.trim() || null;

    if (!name) {
      return res.status(400).json({ success: false, error: "Department name is required" });
    }

    const department = await req.prisma.department.create({ data: { name, description } });
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ success: false, error: "A department with this name already exists" });
    }
    console.error("Error creating department:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const getDepartments = async (req, res) => {
  try {
    const departments = await req.prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    console.error("Error getting departments:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const existing = await req.prisma.department.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Department not found" });

    const data = {};
    if (req.body.name !== undefined) {
      const name = normalizeDepartmentName(req.body.name);
      if (!name) return res.status(400).json({ success: false, error: "Department name is required" });
      data.name = name;
    }
    if (req.body.description !== undefined) data.description = req.body.description?.trim() || null;

    const department = await req.prisma.department.update({ where: { id: req.params.id }, data });
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ success: false, error: "A department with this name already exists" });
    }
    console.error("Error updating department:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const department = await req.prisma.department.findUnique({ where: { id: req.params.id } });
    if (!department) return res.status(404).json({ success: false, error: "Department not found" });
    await req.prisma.department.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// ==================== SCHEDULE FUNCTIONS ====================

// Create a new schedule

module.exports = wrapTenantHandlers({
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
});
