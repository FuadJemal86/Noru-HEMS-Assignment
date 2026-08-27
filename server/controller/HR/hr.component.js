// Backwards-compatible HR controller entry point.
// New controllers are organized by resource in this directory.
module.exports = {
  ...require("./employee.controller"),
  ...require("./department.controller"),
  ...require("./role.controller"),
  ...require("./workforce.controller"),
};
