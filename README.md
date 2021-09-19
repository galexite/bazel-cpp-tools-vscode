# bazel-cpp-tools

Generate `compile_commands.json` databases for C/C++ projects built using
[Bazel](https://bazel.build/) to support IDE-like features, such as
IntelliSense, debugging, and code browsing, within Visual Studio Code when using
either the
[official Visual Studio Code C/C++ extension](https://github.com/Microsoft/vscode-cpptools)
or [clangd extension](https://github.com/clangd/vscode-clangd).

This project is a fork of
[bazel-stack-vscode-cc](https://github.com/stackb/bazel-stack-vscode-cc),
removing a dependency on
[bazel-stack-vscode](https://github.com/stackb/bazel-stack-vscode)
whilst adding several features to make it easier to use.

## Features

### Bazel C/C++ Tools: Generate compile_commands.json

This command (`bazel-cpp-tools.compileCommands.generate`) generates a `clangd` compile
commands database, called `compile_commands.json` that allows a C/C++ code 
completion extension to provide IntelliSense for your Bazel C/C++ projects.

To setup, edit your workspace settings (search for
`bazel-cpp-tools.compileCommands.targets` in `Preferences: Open Settings (UI)`) and
configure a list of Bazel labels for the `cc_binary` or `cc_library` targets
you'd like to be indexed. The tool will then produce a command set for the
transitive closure of those top-level targets.

These can be added to your workspace's `.vscode/settings.json` and (optionally)
checked-in to VCS as follows:

```json
{
  "bazel-cpp-tools.compileCommands.targets": [
    "//app/foo:foo_binary",
    "//app/bar:bar_binary",
    "//app/baz:baz_binary",
  ]
}
```

You can get a list of public labels from your project by running `bazel query`
in a terminal window:

```bash
bazel query 'attr(visibility, "//visibility:public", //app/foo:*)'
```

Replacing `//app/foo` as appropriate.

This feature was derived from <https://github.com/grailbio/bazel-compilation-database>.

## Building and Installing

This is a standard Visual Studio Code extension and so you will need Node.js
installed along with a new enough version of `npm`, probably `8.x`.

```bash
npm install
npm run install-vsix
```

The `install-vsix` script will build and install the extension in to the
current Visual Studio Code editor.