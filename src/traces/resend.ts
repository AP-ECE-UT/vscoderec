import fs from "fs";
import path from "path";
import ConfigManager from "../configs";
import { postTraceData, TraceEvent } from ".";

interface TraceEventFile {
  date: Date;
  trace: TraceEvent;
  failed: boolean;
  courseId: string;
  assignment: string;
}

export function resendCaches() {
  const configs = ConfigManager.getInstance();
  if (!configs || !configs.configsExists()) {
    return;
  }

  function readJson(filename: string): TraceEventFile | undefined {
    const fullPath = path.join(configs!.getCacheFolderPath(), filename);
    try {
      return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as TraceEventFile;
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
