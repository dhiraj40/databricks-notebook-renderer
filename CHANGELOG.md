## 2.0.0

### Added

- Added Databricks workspace connection support from VS Code.
- Added secure credential storage using VS Code Secret Storage.
- Added Databricks compute selection and persisted selected compute.
- Added notebook cell execution on selected Databricks compute.
- Added per-notebook Databricks execution sessions.
- Added support for `.dbnb` notebooks.
- Added support for Databricks source `.py` notebooks.
- Added support for using Databricks Runtime with `.ipynb` notebooks through the notebook kernel picker.
- Added notebook output rendering for text, errors, HTML, and table results.
- Added Databricks sidebar with connection, compute, and active notebook session status.

### Changed

- Improved extension startup architecture with service registration.
- Improved separation between Databricks services, notebook execution, storage, state, and UI layers.
- Improved disconnect cleanup to clear credentials, compute selection, and active notebook sessions.

### Fixed

- Fixed notebook execution error rendering.
- Fixed Databricks table results rendering as plain text.
- Fixed selected compute restore after extension reload.
