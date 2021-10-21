import path = require("path");
import * as tmp from "tmp";
import * as vscode from "vscode";
import { Container } from "./container";

export class CompilationDatabase implements vscode.Disposable {
  disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      vscode.commands.registerCommand(
        "bazel-cpp-tools.compileCommands.generate",
        this.generate,
        this
      )
    );
  }

  async generate(): Promise<vscode.TaskExecution | void> {
    const compdbConfig = vscode.workspace.getConfiguration("bazel-cpp-tools.compileCommands");
    const targets = compdbConfig.get<string[] | undefined>(
      "targets",
      undefined
    );
    if (!targets || targets.length === 0) {
      vscode.window.showErrorMessage(
        "The list of bazel targets to index for the compilation database is not configured.  " +
          'Please configure the "bazel-cpp-tools.compileCommands.targets" workspace setting to include a list of cc_library, cc_binary labels'
      );
      return;
    }

    const bazelConfig = vscode.workspace.getConfiguration("bazel-cpp-tools");
    let bazelExecutable = bazelConfig.get<string | undefined>("bazelExecutable");
    if (!bazelExecutable) {
      bazelExecutable = "bazel";
    }
    const buildFlags = bazelConfig.get<string[]>("buildFlags", []);

    vscode.window.showInformationMessage(
      "Building clang compilation database for " + JSON.stringify(targets)
    );

    return vscode.tasks.executeTask(
      this.createGenerateTask(targets, bazelExecutable, buildFlags)
    );
  }

  createGenerateTask(
    targets: string[],
    bazelExecutable: string,
    buildArgs: string[]
  ): vscode.Task {
    const name = "bazel-compdb";
    const repositoryPath = Container.file("compdb/");
    const cwd = Container.workspaceFolderFsPath || ".";
    const buildEventsJsonTempFile = tmp.fileSync().name; // cleaned up on process exit
    const timeStamp = +new Date() / 1000;
    const args = createBazelBuildAspectCommand(
      repositoryPath.fsPath,
      buildEventsJsonTempFile,
      buildArgs,
      targets,
      timeStamp
    );
    const env = {};

    const task = new vscode.Task(
      { type: name },
      vscode.TaskScope.Workspace,
      name,
      name,
      new vscode.ShellExecution(bazelExecutable, args, {
        env: env,
        cwd: cwd,
      })
    );
    task.presentationOptions = {
      clear: true,
      echo: true,
      showReuseMessage: false,
      panel: vscode.TaskPanelKind.Shared,
    };

    return task;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}

export function createBazelBuildAspectCommand(
  repositoryPath: string,
  tmpFile: string,
  buildArgs: string[],
  targets: string[],
  timeStamp: number
): string[] {
  return [
    "build",
    "--override_repository=bazel_vscode_compdb=" + repositoryPath,
    "--aspects=@bazel_vscode_compdb//:aspects.bzl%compilation_database_aspect",
    "--color=no",
    "--noshow_progress",
    "--noshow_loading_progress",
    "--output_groups=compdb_files,header_files",
    "--build_event_json_file=" + tmpFile,
    `--action_env=BAZEL_CPP_TOOLS_TIMESTAMP=${timeStamp}`,
    ...buildArgs,
    ...targets,
    "&&",
    path.join(repositoryPath, "postprocess.py"),
    "-s",
    "-b",
    tmpFile,
    "&&",
    "rm",
    tmpFile,
  ];
}
