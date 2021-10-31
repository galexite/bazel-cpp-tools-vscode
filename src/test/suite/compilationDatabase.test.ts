import { createBazelBuildAspectCommand } from "../../compilationDatabase";
import * as assert from "assert";

suite("Compilation Database", function () {
  test("createBazelBuildAspectCommand", function () {
    const repoPath = "/path/to/this/extension/compdb";
    const tmpFile = "/tmp/build-events.json";
    const buildArgs: string[] = ["--config=foo"];
    const targets: string[] = ["//app/a", "//app/b"];
    const timeStamp: number = 1234;

    const cmd = createBazelBuildAspectCommand(
      repoPath,
      tmpFile,
      buildArgs,
      targets,
      timeStamp
    );

    assert.deepStrictEqual(
      [
        "build",
        "--override_repository=bazel_vscode_compdb=/path/to/this/extension/compdb",
        "--aspects=@bazel_vscode_compdb//:aspects.bzl%compilation_database_aspect",
        "--color=no",
        "--show_result=2147483647", // MAX_INT
        "--noshow_progress",
        "--noshow_loading_progress",
        "--output_groups=compdb_files,header_files",
        "--build_event_json_file=/tmp/build-events.json",
        "--action_env=BAZEL_CPP_TOOLS_TIMESTAMP=1234",
        "--config=foo",
        "//app/a",
        "//app/b",
        "&&",
        process.platform === "win32"
          ? "\\path\\to\\this\\extension\\compdb\\postprocess.py"
          : "/path/to/this/extension/compdb/postprocess.py",
        "-s",
        "-b",
        "/tmp/build-events.json",
        "&&",
        "rm",
        "/tmp/build-events.json",
      ],
      cmd
    );
  });
});
