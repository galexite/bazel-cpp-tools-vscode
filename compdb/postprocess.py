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
import re


class PostProcess:
    def __init__(self, rel_to_source_dir=False):
        self.rel_to_source_dir = rel_to_source_dir

    def fix_db_entry(self, entry, workspace_dir, local_exec_root):
        workspace_name = os.path.basename(workspace_dir)
        entry["directory"] = os.path.join(workspace_dir, "bazel-" + workspace_name)
        # TODO: research better if this is advantageous
        # if 'file' in entry and entry['file'].startswith(bazel_bin):
        #     entry['file'] = entry['file'][len(bazel_bin)+1:]
        if "command" in entry:
            command = entry["command"]
            if command:
                command = re.sub(r"\s+-isysroot __BAZEL_XCODE_SDKROOT__", "", command)
                command = re.sub(r"\s+-fno-canonical-system-headers", "", command)
                entry["command"] = command
        return entry

    def post_process(self, build_events_json_file):
        workspace_dir = ""
        local_exec_root = ""

        print(f"Gathering output files from {build_events_json_file}...")

        compile_command_json_db_files = []
        with open(build_events_json_file, "r", encoding="utf-8") as f:
            for line in f:
                event = json.loads(line)
                if "started" in event:
                    workspace_dir = event["started"]["workspaceDirectory"]
                    print("Workspace Directory:", workspace_dir)
                elif "workspaceInfo" in event:
                    local_exec_root = event["workspaceInfo"]["localExecRoot"]
                    print("Execution Root:", local_exec_root)
                elif "namedSetOfFiles" in event:
                    if "files" in event["namedSetOfFiles"]:
                        for named_file in event["namedSetOfFiles"]["files"]:
                            if "uri" in named_file:
                                uri = named_file["uri"]
                                if uri.endswith(".compile_commands.json"):
                                    assert uri.startswith("file://"), f"Invalid URI: {uri}"
                                    path = uri[7:]
                                    assert os.path.exists(path), f"{path} does not exist"
                                    compile_command_json_db_files.append(path)

        assert compile_command_json_db_files, "No .compile_commands.json files to merge"

        ##
        ## Collect/Fix/Merge Compilation Databases
        ##
        print("Preparing compilation database...")

        db_entries = []
        for db in compile_command_json_db_files:
            with open(db, "r") as f:
                db_entries.extend(json.load(f))

        db_entries_count = len(db_entries)
        assert db_entries_count > 0, "No database entries were loaded."
        print(f"Loaded {db_entries_count} entries.")

        db_entries = [
            self.fix_db_entry(entry, workspace_dir, local_exec_root)
            for entry in db_entries
        ]

        compdb_file = os.path.join(workspace_dir, "compile_commands.json")

        with open(compdb_file, "w") as outdb:
            json.dump(db_entries, outdb, indent=2)

        print("DONE", compdb_file)

    @staticmethod
    def run():
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "-s",
            "--rel-to-source-dir",
            default=False,
            action="store_true",
            help="use the original source directory instead of bazel execroot",
        )

        required_named = parser.add_argument_group("required named arguments")
        required_named.add_argument(
            "-b",
            "--build-events-json-file",
            help="build events json file from the compilation aspect",
            required=True,
        )
        args = parser.parse_args()

        PostProcess(args.rel_to_source_dir).post_process(args.build_events_json_file)


if __name__ == "__main__":
    PostProcess.run()
