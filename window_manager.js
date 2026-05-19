// window_manager.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const { events } = require('./events.js');
const { appState } = require('./state.js');

class WindowManager {
  constructor() {
    this.activeWindow = null;
    this.lastUpdate = 0;
  }

  /**
   * Get the currently focused window title and process name (Windows).
   * Uses PowerShell Get-Process + Get-ForegroundWindow.
   * @returns {Promise<object>} { processName, windowTitle, pid }
   */
  async getActiveWindow() {
    try {
      const psScript = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class WinApi {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll")]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
            [DllImport("user32.dll")]
            public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
          }
"@
        $hwnd = [WinApi]::GetForegroundWindow();
        $pid = 0;
        [WinApi]::GetWindowThreadProcessId($hwnd, [ref]$pid);
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue;
        $titleBuilder = New-Object System.Text.StringBuilder 256;
        [WinApi]::GetWindowText($hwnd, $titleBuilder, $titleBuilder.Capacity);
        $windowTitle = $titleBuilder.ToString();
        if ($process) {
          Write-Output "$($process.ProcessName)|$windowTitle|$pid"
        } else {
          Write-Output "unknown|$windowTitle|$pid"
        }
      `;
      const { stdout } = await execPromise(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
      const trimmed = stdout.trim();
      if (!trimmed) return null;
      const [processName, windowTitle, pid] = trimmed.split('|');
      const result = { processName, windowTitle, pid: parseInt(pid, 10) };
      this.activeWindow = result;
      this.lastUpdate = Date.now();
      events.emit('window:active-changed', result);
      return result;
    } catch (err) {
      events.emit('window:error', err.message);
      return null;
    }
  }

  /**
   * Bring a specific window to foreground by process name (first match).
   * @param {string} processName - e.g., "chrome", "code"
   * @returns {Promise<boolean>}
   */
  async focusProcess(processName) {
    try {
      const script = `
        $process = Get-Process -Name "${processName}" -ErrorAction SilentlyContinue | Select-Object -First 1;
        if ($process) {
          Add-Type -AssemblyName System.Windows.Forms;
          $sig = @'
            [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
            [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
'@
          $type = Add-Type -MemberDefinition $sig -Name "WinAPI" -Namespace Win32 -PassThru;
          $hwnd = $process.MainWindowHandle;
          if ($hwnd -ne 0) {
            $type::ShowWindow($hwnd, 9);  // restore if minimized
            $type::SetForegroundWindow($hwnd);
            Write-Output "true";
          } else { Write-Output "false"; }
        } else { Write-Output "false"; }
      `;
      const { stdout } = await execPromise(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      return stdout.trim() === 'true';
    } catch (err) {
      events.emit('window:focus-error', err.message);
      return false;
    }
  }
}

const windowManager = new WindowManager();
module.exports = { windowManager };
