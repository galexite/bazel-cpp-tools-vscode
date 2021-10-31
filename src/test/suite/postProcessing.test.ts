import * as assert from "assert";
import * as fs from "fs";
import * as tmp from "tmp";
import path = require("path");
import { ExecException, execFile } from "child_process";

const extensionDevelopmentPath = path.resolve(__dirname, "../../..");
const postprocessPy = path.join(
  extensionDevelopmentPath,
  "compdb/postprocess.py"
);

suite("Post-Processing Script", function () {
  test("postprocess.py exists", function () {
    assert.ok(fs.existsSync(postprocessPy));
  });

  test("postprocess.py creates compile_commands.json", function (done) {
    // prep temp files
    const tmpDir = tmp.dirSync().name;
    const buildEventsJsonTempFile = path.join(tmpDir, "build-events.json");
    const fooCommandsFile = path.join(tmpDir, "foo.compile_commands.json");
    const barCommandsFile = path.join(tmpDir, "bar.compile_commands.json");
    const compileCommandsFile = path.join(tmpDir, "compile_commands.json");

    fs.writeFileSync(
      fooCommandsFile,
      JSON.stringify([
        {
          command:
            "external/local_config_cc/cc_wrapper.sh -iquote . app/a/foo.cpp",
          directory: "__EXEC_ROOT__",
          file: "app/a/foo.cpp",
        },
      ])
    );
    fs.writeFileSync(
      barCommandsFile,
      JSON.stringify([
        {
          command:
            "external/local_config_cc/cc_wrapper.sh -iquote . app/a/bar.cpp",
          directory: "__EXEC_ROOT__",
          file: "app/a/bar.cpp",
        },
      ])
    );

    // write fake build events as a file where every line is a JSON object
    const events = [
      JSON.stringify({
        started: {
          workspaceDirectory: tmpDir,
        },
      }),
      JSON.stringify({
        workspaceInfo: {
          localExecRoot: tmpDir,
        },
      }),
      JSON.stringify({
        namedSetOfFiles: {
          files: [fooCommandsFile, barCommandsFile].map((f) => {
            return { uri: "file://" + f };
          }),
        },
      }),
    ];

    fs.writeFileSync(buildEventsJsonTempFile, events.join("\n"));
    const postprocessArgs = [
      "--build-events-json-file",
      buildEventsJsonTempFile,
    ];

    execFile(
      postprocessPy,
      postprocessArgs,
      {},
      (
        err: ExecException | null,
        stdout: string | Buffer,
        stderr: string | Buffer
      ) => {
        if (err) {
          done(err);
          return;
        }
        console.log("OUT", stdout);
        console.log("ERR", stderr);
        assert.ok(fs.existsSync(compileCommandsFile));

        const jsonContent = fs
          .readFileSync(compileCommandsFile)
          .toString()
          .split(tmpDir)
          .join("__TMPDIR__");
        const compileCommands = JSON.parse(jsonContent);

        assert.deepStrictEqual(compileCommands, [
          {
            command:
              "external/local_config_cc/cc_wrapper.sh -iquote . app/a/foo.cpp",
            directory: path.join(
              "__TMPDIR__",
              "bazel-" + path.basename(tmpDir)
            ),
            file: "app/a/foo.cpp",
          },
          {
            command:
              "external/local_config_cc/cc_wrapper.sh -iquote . app/a/bar.cpp",
            directory: path.join(
              "__TMPDIR__",
              "bazel-" + path.basename(tmpDir)
            ),
            file: "app/a/bar.cpp",
          },
        ]);

        done();
      }
    );
  });
});
