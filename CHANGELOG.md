# 1.0.5

- Added support for multiple build targets.
- Hack: Use the workspace directory name for identifying the local exec root.

# 1.0.4

- Add a timestamp to `--action_env` to make Bazel re-compile the entire
  codebase each time `compile_commands.json` is generated (thanks @caandewiel
  for the idea). This ensures we capture the whole build each time we generate
  the database.

# 1.0.3

- Re-write paths starting with `external` under the local_exec_dir.

# 1.0.2

- Re-work pre-process script, fix pylint errors

# 1.0.1

- Fixed Bazel version check

# 1.0.0

- First release
- Added `bazel-cpp-tools.bazelExecutable` configuration
