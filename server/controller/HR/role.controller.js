const { main: prisma } = require("../../prisma/prisma");

const createRole = async (req, res) => {
  try {
    const { name } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Role name is required",
      });
    }

    // Check if role already exists
    const existingRole = await prisma.roles.findFirst({
      where: {
        name: name.trim(),
      },
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        error: "Role already exists",
      });
    }

    // Create role
    const role = await prisma.roles.create({
      data: {
        name: name.trim(),
      },
    });

    res.status(201).json({ success: true, data: role });
  } catch (error) {
    console.error("Error creating role:", error);

    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        error: "Role already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Get all roles

const getRoles = async (req, res) => {
  try {
    const roles = await prisma.roles.findMany({
      orderBy: { name: "asc" },
    });

    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    console.error("Error getting roles:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Get role by ID

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Check if role exists
    const existingRole = await prisma.roles.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        error: "Role not found",
      });
    }

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Role name is required",
      });
    }

    // Check if new name already exists (excluding current role)
    const nameExists = await prisma.roles.findFirst({
      where: {
        name: name.trim(),
        NOT: { id },
      },
    });

    if (nameExists) {
      return res.status(400).json({
        success: false,
        error: "Role name already exists",
      });
    }

    // Update role
    const role = await prisma.roles.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });

    res.status(200).json({ success: true, data: role });
  } catch (error) {
    console.error("Error updating role:", error);

    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        error: "Role name already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Delete role

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const role = await prisma.roles.findUnique({
      where: { id },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: "Role not found",
      });
    }

    // Check if any employees are using this role
    const employeesWithRole = await prisma.employee.findFirst({
      where: {
        role: role.name,
      },
    });

    if (employeesWithRole) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete role. Employees are currently assigned to this role.",
      });
    }

    // Delete role
    await prisma.roles.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// ==================== LEAVE TYPE FUNCTIONS ====================

// Create a new leave type

module.exports = {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
};
