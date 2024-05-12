import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as z from "zod";

import { welcomeMessage } from "../api/utils";

interface ExtensionWorkspaceConfig {
  files: string[];
  courseId: string;
  assignment: string;
}

const configSchema = z.object({
  files: z.array(z.string()),
  courseId: z.string(),
  assignment: z.string(),
});

function isValidConfigFile(configs: any): configs is ExtensionWorkspaceConfig {
  return configSchema.safeParse(configs).success;
}

export default class ConfigManager {
  private configs: ExtensionWorkspaceConfig | undefined;
  private cacheDir: string;
  private workspaceFolder: vscode.WorkspaceFolder;
  private static instance: ConfigManager | undefined;

  private constructor(workspaceFolder: vscode.WorkspaceFolder) {
    this.workspaceFolder = workspaceFolder;
    this.cacheDir = path.join(workspaceFolder.uri.fsPath, ".cache");
    this.configs = this.getConfigFile();
    this.initialize();
    welcomeMessage(() => {
      vscode.window.showWarningMessage("Authentication Failed Please Login!");
    });
  }

  public static getInstance(): ConfigManager | undefined {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!ConfigManager.instance && workspaceFolder) {
      ConfigManager.instance = new ConfigManager(workspaceFolder);
    }
    return ConfigManager.instance;
  }

  private createCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
  }

  private getPathDirs(filePath: string) {
    const fullPath = path.join(this.workspaceFolder.uri.fsPath, filePath);
    const directory = path.dirname(fullPath);
    const starIndex = directory.indexOf("*");
    return {
      fullPath,
      directory: starIndex === -1 ? directory : directory.slice(0, starIndex),
    };
  }

  private createFiles(files: string[]) {
    files.forEach((filePath) => {
      const { directory, fullPath } = this.getPathDirs(filePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      if (!fs.existsSync(fullPath) && !fullPath.includes("*")) {
        fs.closeSync(fs.openSync(fullPath, "w"));
      }
    });
  }

  private getConfigFilePath(): string | undefined {
    const configPath = path.join(
      this.workspaceFolder.uri.fsPath,
      ".aiedut.json"
    );
    return fs.existsSync(configPath) ? configPath : undefined;
  }

  private readConfigFile(filePath: string): ExtensionWorkspaceConfig {
    let configs;
    const text = fs.readFileSync(filePath);
    try {
      configs = JSON.parse(text.toString());
    } catch (error) {
      throw new Error("Error Parsing Config File!");
    }
    if (!isValidConfigFile(configs)) {
      throw new Error("The Config File is Not Valid!");
    }
    return configs;
  }

  private getConfigFile(): ExtensionWorkspaceConfig | undefined {
    const filePath = this.getConfigFilePath();
    let config;
    if (!filePath) {
      vscode.window.showWarningMessage(
        "the code recorder wont track this project"
      );
      return undefined;
    }
    try {
      config = this.readConfigFile(filePath);
      vscode.window.showInformationMessage("Config File Found!");
    } catch (err) {
      vscode.window.showErrorMessage("the config file is not valid");
    }
    return config;
  }

  private initialize() {
    if (!this.configs) {
      return;
    }
    this.createCacheDir();
    this.createFiles(this.configs.files);
  }

  public configsExists(): boolean {
    return !!this.configs;
  }

  public getConfigs(): ExtensionWorkspaceConfig | undefined {
    return this.configs;
  }

  public cacheIt(data: any) {
    fs.promises.writeFile(
      path.join(this.cacheDir, `${Date.now()}.json`),
      JSON.stringify(data)
    );
  }

  private matchFile(filename: string): boolean {
    return (
      this.configs?.files
        .map((x) =>
          x.includes("*")
            ? new RegExp(
                `^${x.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`
              ).test(filename)
            : filename === x
        )
        .reduce((a, b) => a || b, false) || false
    );
  }

  public isInProjectFolder(filename: string): boolean {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) {
      return false;
    }
    return folders
      .map((x) => filename.startsWith(x.uri.fsPath))
      .reduce((a, b) => a || b, false);
  }

  public getWdc(): string {
    return this.workspaceFolder.uri.fsPath;
  }

  public canTrace(filename: string): boolean {
    return this.matchFile(filename) && this.isInProjectFolder(filename);
  }

  public getCacheFolderPath(): string {
    return this.cacheDir;
  }
}
