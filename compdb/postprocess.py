#!/usr/bin/python3

# Copyright 2021 GRAIL, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Generates a compile_commands.json file at $(bazel info workspace) for
libclang based tools.

Derived from
https://github.com/grailbio/bazel-compilation-database/blob/08d706d3cf7daf3d529a26ca76d75da1a3eae6c0/generate.py
"""

import argparse
import json
import os
import tempfile
import re


class PostProcess:
    def __init__(self, rel_to_source_dir=False):
        self.rel_to_source_dir = rel_to_source_dir

    def fix_db_entry(self, entry, workspace_dir, local_exec_root):
        if "directory" in entry and entry["directory"] == "__EXEC_ROOT__":
            entry["directory"] = (
                workspace_dir if self.rel_to_source_dir else local_exec_root
            )
        # TODO: research better if this is advantageous
        # if 'file' in entry and entry['file'].startswith(bazel_bin):
        #     entry['file'] = entry['file'][len(bazel_bin)+1:]
        if "command" in entry:
            command = entry["command"]
            if command:
                command = command.replace("-isysroot __BAZEL_XCODE_SDKROOT__", "")
                if self.rel_to_source_dir:
                    command = re.sub(
                        r"\s+external",
                        " " + os.path.join(local_exec_root, "external"),
                        command,
                    )
                entry["command"] = command
        return entry

    def post_process(self, build_events_json_file=None):
        workspace_dir = ""
        local_exec_root = ""

        if build_events_json_file is None:
            build_events_json_file = tempfile.mkstemp(".json", "build_events")

        print("Gathering output files...")
        bazel_stderr = []
        with open(build_events_json_file, "r") as f:
            for line in f:
                event = json.loads(line)
                if "started" in event:
                    workspace_dir = event["started"]["workspaceDirectory"]
                    print("Workspace Directory:", workspace_dir)
                elif "progress" in event:
                    if "stderr" in event["progress"]:
                        bazel_stderr.extend(event["progress"]["stderr"].splitlines())
                elif "workspaceInfo" in event:
                    local_exec_root = event["workspaceInfo"]["localExecRoot"]
                    print("Execution Root:", local_exec_root)

        compile_command_json_db_files = []
        for line in bazel_stderr:
            if line.endswith(".compile_commands.json"):
                compile_command_json_db_files.append(line.strip())

        ##
        ## Collect/Fix/Merge Compilation Databases
        ##
        print("Preparing compilation database...")

        db_entries = []
        for db in compile_command_json_db_files:
            with open(db, "r") as f:
                db_entries.extend(json.load(f))

        db_entries = [
            self.fix_db_entry(entry, workspace_dir, local_exec_root)
            for entry in db_entries
        ]
        compdb_file = os.path.join(workspace_dir, "compile_commands.json")

        with open(compdb_file, "w") as outdb:
            json.dump(db_entries, outdb, indent=2)

        print("DONE", compdb_file)

    @classmethod
    def run(cls):
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "-s",
            "--rel-to-source-dir",
            default=False,
            action="store_true",
            help="use the original source directory instead of bazel execroot",
        )
        parser.add_argument(
            "-b",
            "--build-events-json-file",
            help="build events json file from the compilation aspect",
        )
        args = parser.parse_args()

        PostProcess(args.rel_to_source_dir).post_process(args.build_events_json_file)


if __name__ == "__main__":
    PostProcess.run()
