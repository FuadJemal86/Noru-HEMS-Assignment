const wrapTenantHandlers = require("../../Utils/wrapTenantHandlers");

const generateEmployeeId = async (prisma, store_id) => {
  const prefix = "EMP";
  let counter = 1;
  let employeeId = `${prefix}${String(counter).padStart(3, "0")}`;

  // Find the highest existing employee ID
  const existingEmployees = await prisma.employee.findMany({
    // where: { store_id },
    select: { employeeId: true },
    orderBy: { employeeId: "desc" },
  });

  if (existingEmployees.length > 0) {
    const lastEmployeeId = existingEmployees[0].employeeId;
    const lastNumber = parseInt(lastEmployeeId.replace(prefix, "")) || 0;
    counter = lastNumber + 1;
    employeeId = `${prefix}${String(counter).padStart(3, "0")}`;
  }

  // Ensure uniqueness
  let isUnique = false;
  while (!isUnique) {
    const exists = await prisma.employee.findUnique({
      where: { employeeId },
    });
    if (!exists) {
      isUnique = true;
    } else {
      counter++;
      employeeId = `${prefix}${String(counter).padStart(3, "0")}`;
    }
  }

  return employeeId;
};

// Create a new employee

const createEmployee = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      hourlyRate,
      profilePhoto,
      status,
      departmentId,
    } = req.body;

    // const store_id = req.user?.store_id;

    // Validation
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: "First name and last name are required",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        error: "Role is required",
      });
    }

    if (!hourlyRate || isNaN(parseFloat(hourlyRate)) || parseFloat(hourlyRate) < 0) {
      return res.status(400).json({
        success: false,
        error: "Valid hourly rate is required",
      });
    }

    // Check if email already exists
    const existingEmployee = await req.prisma.employee.findUnique({
      where: { email },
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        error: "Email already exists",
      });
    }

    // Generate unique employee ID
    const employeeId = await generateEmployeeId(req.prisma, null); // store_id commented out

    if (departmentId) {
      const department = await req.prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) {
        return res.status(400).json({ success: false, error: "Selected department does not exist" });
      }
    }

    // Create employee
    const employee = await req.prisma.employee.create({
      data: {
        employeeId,
        // store_id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        role: role.trim(),
        hourlyRate: parseFloat(hourlyRate),
        profilePhoto: profilePhoto || null,
        status: status || "active",
        departmentId: departmentId || null,
      },
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    console.error("Error creating employee:", error);

    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0] || "field";
      return res.status(400).json({
        success: false,
        error: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Get all employees

const getEmployees = async (req, res) => {
  try {
    // const store_id = req.user?.store_id;

    const employees = await req.prisma.employee.findMany({
      // where: { store_id },
      orderBy: { createdAt: "desc" },
      include: { department: true },
    });

    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    console.error("Error getting employees:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Get employee by ID

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      hourlyRate,
      profilePhoto,
      status,
      departmentId,
    } = req.body;

    // const store_id = req.user?.store_id;

    // Check if employee exists
    const existingEmployee = await req.prisma.employee.findFirst({
      where: {
        id,
        // store_id,
      },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingEmployee.email) {
      const emailExists = await req.prisma.employee.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (emailExists && emailExists.id !== id) {
        return res.status(400).json({
          success: false,
          error: "Email already exists",
        });
      }
    }

    // Prepare update data
    const updateData = {};

    if (firstName !== undefined) {
      updateData.firstName = firstName.trim();
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName.trim();
    }
    if (email !== undefined) {
      updateData.email = email.trim().toLowerCase();
    }
    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null;
    }
    if (role !== undefined) {
      updateData.role = role.trim();
    }
    if (hourlyRate !== undefined) {
      if (isNaN(parseFloat(hourlyRate)) || parseFloat(hourlyRate) < 0) {
        return res.status(400).json({
          success: false,
          error: "Valid hourly rate is required",
        });
      }
      updateData.hourlyRate = parseFloat(hourlyRate);
    }
    if (profilePhoto !== undefined) {
      updateData.profilePhoto = profilePhoto || null;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (departmentId !== undefined) {
      if (departmentId) {
        const department = await req.prisma.department.findUnique({ where: { id: departmentId } });
        if (!department) {
          return res.status(400).json({ success: false, error: "Selected department does not exist" });
        }
      }
      updateData.departmentId = departmentId || null;
    }

    const employee = await req.prisma.employee.update({
      where: { id },
      data: updateData,
      include: { department: true },
    });

    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    console.error("Error updating employee:", error);

    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0] || "field";
      return res.status(400).json({
        success: false,
        error: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Delete employee

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    // const store_id = req.user?.store_id;

    // Check if employee exists
    const employee = await req.prisma.employee.findFirst({
      where: {
        id,
        // store_id,
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    // Delete employee (cascade will handle related records)
    await req.prisma.employee.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

module.exports = wrapTenantHandlers({
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
});
