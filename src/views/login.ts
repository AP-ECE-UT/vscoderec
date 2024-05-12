import * as vscode from "vscode";

import API from "../api";
import { setJwtTokens } from "../token";
import { welcomeMessage } from "../api/utils";

export class LoginDataProvider implements vscode.WebviewViewProvider {
	constructor(private readonly context: vscode.ExtensionContext) {}

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext<unknown>,
		token: vscode.CancellationToken
	): void | Thenable<void> {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this.context.extensionUri, "media"),
			],
		};
		webviewView.webview.html = this.getHTML(
			this.getWebUri(webviewView, "main.js"),
			this.getWebUri(webviewView, "reset.css"),
			this.getWebUri(webviewView, "vscode.css")
		);
		webviewView.webview.onDidReceiveMessage((message) => {
			this.handleLoginCommand(message.command, message.data);
		});
	}

	private getWebUri(
		webviewView: vscode.WebviewView,
		fileName: string
	): vscode.Uri {
		return webviewView.webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "media", fileName)
		);
	}

	private handleLoginCommand(command: string, data: any): Promise<void> {
		return new Promise((resolve, reject) => {
			const api = API.getInstance();
			if (command !== "aiedut.login") {
				return resolve();
			}
			api.post("token/", data)
				.then(({ status, data: tokens }) => {
					if (status !== 200) {
						vscode.window.showErrorMessage("Login Failed 😔");
						return reject();
					}
					const { refresh, access } = tokens;
					if (!refresh || !access) {
						return reject();
					}
					setJwtTokens(access, refresh);
					welcomeMessage();

					return resolve();
				})
				.catch((err) => {
					vscode.window.showErrorMessage("Login Failed 😔");
					reject(err);
				});
		});
	}

	private getHTML(
		scriptJS: vscode.Uri,
		resetCSS: vscode.Uri,
		vscodeCSS: vscode.Uri
	): string {
		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<link rel="stylesheet" href="${resetCSS}">
			<link rel="stylesheet" href="${vscodeCSS}">
			<title>AiEdUt Login</title>
		</head>
		<body>
		  <label for="username"> Student/Staff ID:</label>
		  <input type="text" id="username" placeholder="Enter Student/Staff ID"><br>
		  
		  <label for="password">Password:</label>
		  <input type="password" id="password" placeholder="Enter Password"><br>
		  
		  <button id="login"><h3>Login</h3></button>
		  <script src="${scriptJS}"></script>
		</body>
		</html>`;
	}
}
