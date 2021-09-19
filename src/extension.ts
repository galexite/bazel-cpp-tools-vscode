import * as vscode from "vscode";
import { CompilationDatabase } from "./compilationDatabase";
import { Container } from "./container";

export function activate(context: vscode.ExtensionContext) {
  Container.initialize(context);
  context.subscriptions.push(new CompilationDatabase());
}

export function deactivate() {}
