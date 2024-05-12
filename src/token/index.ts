import * as vscode from "vscode";

interface JwtTokens {
	access: string;
	refresh: string;
}

export function getJwtTokens(): JwtTokens {
	const config = vscode.workspace.getConfiguration("codeRecorder");
	return config.get<JwtTokens>("jwtTokens") || { access: "", refresh: "" };
}

export function setJwtTokens(access: string, refresh: string): void {
	const config = vscode.workspace.getConfiguration("codeRecorder");
	config.update(
		"jwtTokens",
		{ access, refresh },
		vscode.ConfigurationTarget.Global
	);
}
