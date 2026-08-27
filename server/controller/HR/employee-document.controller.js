const wrapTenantHandlers = require("../../Utils/wrapTenantHandlers");

const getEmployeeDocuments = async (req, res) => {
  try {
    const { employeeId, category, status } = req.query;

    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (category) where.category = category;

    const documents = await req.prisma.employeeDocument.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group documents by employee
    const employeesWithDocuments = {};
    documents.forEach((doc) => {
      const empId = doc.employeeId;
      if (!employeesWithDocuments[empId]) {
        employeesWithDocuments[empId] = {
          employee: doc.employee,
          documents: [],
        };
      }
      employeesWithDocuments[empId].documents.push(doc);
    });

    res.status(200).json({
      success: true,
      data: documents,
      grouped: Object.values(employeesWithDocuments),
    });
  } catch (error) {
    console.error("Error fetching employee documents:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Get employee document by ID

module.exports = wrapTenantHandlers({
  getEmployeeDocuments,
});
