using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class RealLauncher {
    [StructLayout(LayoutKind.Sequential)]
    public struct STARTUPINFO {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    public static void Main(string[] args) {
        if (args.Length < 1) {
            Console.WriteLine("Usage: RealLauncher.exe <exePath> [args...]");
            return;
        }

        string exePath = args[0];
        string cmdArgs = args.Length > 1 ? string.Join(" ", args, 1, args.Length - 1) : "";
        string fullCmd = "\"" + exePath + "\" " + cmdArgs;

        STARTUPINFO si = new STARTUPINFO();
        si.cb = Marshal.SizeOf(si);
        si.lpDesktop = @"WinSta0\Default";

        PROCESS_INFORMATION pi = new PROCESS_INFORMATION();
        bool ok = CreateProcess(null, fullCmd, IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, null, ref si, out pi);
        if (ok) {
            Console.WriteLine("Successfully launched on WinSta0\\Default! PID: " + pi.dwProcessId);
            WaitForSingleObject(pi.hProcess, 0xFFFFFFFF); // wait until finished
            Console.WriteLine("Process PID " + pi.dwProcessId + " exited.");
        } else {
            Console.WriteLine("CreateProcess failed with error: " + Marshal.GetLastWin32Error());
        }
    }
}
