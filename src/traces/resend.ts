import ConfigManager from "../configs";
import fs from "fs";
import path from "path";
import { postTraceData, TraceEvent } from ".";

interface TraceEventFile {
  date: Date;
  courseId: string;
  assignment: string;
  trace: TraceEvent;
  failed: boolean;
}

export function resendCaches() {
  const configs = ConfigManager.getInstance();
  if (!configs || !configs.configsExists()) {
    return;
  }

  function readJson(filename: string): TraceEventFile | undefined {
    try {
      return JSON.parse(fs.readFileSync(filename, "utf-8")) as TraceEventFile;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  fs.readdirSync(configs.getCacheFolderPath())
    .filter((f) => path.extname(f).toLowerCase() === ".json")
    .map((filename) => ({
      filename,
      data: readJson(filename),
    }))
    .filter(({ data }) => data && data.failed === true)
    .map(({ filename, data }) =>
      postTraceData(data!.trace, data!.date, configs)
        .then((failed) => {
          if (!failed) {
            fs.promises.writeFile(
              filename,
              JSON.stringify({ ...data, failed })
            );
          }
        })
        .catch(console.error)
    );
}
