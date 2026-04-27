Set shell = CreateObject("WScript.Shell")
scriptPath = Chr(34) & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\scripts\launch-portable-safe.ps1" & Chr(34)
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File " & scriptPath, 0, False
