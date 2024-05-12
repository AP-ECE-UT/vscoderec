// @ts-nocheck
(function () {
  const vscode = acquireVsCodeApi();
  document.getElementById("login").addEventListener("click", () => {
    vscode.postMessage({
      command: "aiedut.login",
      data: {
        password: document.getElementById("password").value,
        student_id: document.getElementById("username").value,
      },
    });
  });
})();
