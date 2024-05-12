import * as vscode from "vscode";

import API from "../api";
import ConfigManager from "../configs";

export interface TraceEvent {
  content: string;
  filename: string;
  identifier: string;
  languageId: string;
  version: number;
  lineCount: number;
}

export function getFilename(filename: string): string {
  return filename.substring(ConfigManager.getInstance()!.getWdc().length + 1);
}

export function onWillSaveTextDocument(
  document: vscode.TextDocument
): TraceEvent {
  const { version, lineCount, languageId } = document;
  const content = document.getText();
  const filename = document.fileName;
  const identifier = "Save Document";
  return {
    content,
    filename,
    identifier,
    languageId,
    version,
    lineCount,
  };
}

export function onDidChangeTextDocument(
  event: vscode.TextDocumentChangeEvent
): TraceEvent {
  const content = event.document.getText();
  const filename = event.document.fileName;
  const identifier = "Text Change";
  const { version, lineCount, languageId } = event.document;
  return {
    version,
    content,
    filename,
    identifier,
    lineCount,
    languageId,
  };
}

export async function postTraceData(
  trace: TraceEvent,
  date: Date,
  configs: ConfigManager,
  cacheIt: boolean = true
): Promise<boolean> {
  let failed = false;
  const { courseId, assignment } = configs.getConfigs()!;
  const data = {
    date,
    courseId,
    assignment,
    ...trace,
    filename: getFilename(trace.filename),
  };
  try {
    await API.getInstance().post("trace/code/", data);
  } catch (err) {
    console.error("postTraceData", err);
    failed = true;
  }
  cacheIt && configs.cacheIt({ date, courseId, assignment, trace, failed });
  return failed;
}

export function makeEvent<T>(arg: T, fn: (x: T) => TraceEvent): void {
  const configs = ConfigManager.getInstance();
  if (!configs || !configs.configsExists()) {
    return;
  }
  const trace = fn(arg);
  configs.canTrace(trace.filename) && postTraceData(trace, new Date(), configs);
}
