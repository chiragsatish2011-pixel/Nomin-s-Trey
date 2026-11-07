using System;
using System.IO;
using System.Diagnostics;
using System.Threading;
using System.Runtime.InteropServices;

public class AutoUnlockTakeover {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern short VkKeyScan(char ch);

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

    const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    const uint MOUSEEVENTF_LEFTUP = 0x0004;
    const uint KEYEVENTF_KEYUP = 0x0002;
    const byte VK_RETURN = 0x0D;

    public static void Main(string[] args) {
        Console.WriteLine("=== Trey Real Desktop Takeover Engine Started ===");

        // Check if Windows is currently locked (LogonUI running)
        bool isLocked = IsLogonUIRunning();
        if (isLocked) {
            Console.WriteLine("NOTICE: Windows is currently LOCKED (LogonUI.exe active, 'Enter your PIN').");
            Console.WriteLine("Waiting for user to enter PIN on phone remote desktop...");
            while (IsLogonUIRunning()) {
                Thread.Sleep(500);
            }
            Console.WriteLine("PIN ENTERED! Desktop unlocked! Initiating takeover in 1.0s...");
            Thread.Sleep(1000);
        } else {
            Console.WriteLine("Desktop is unlocked! Proceeding with real takeover...");
        }

        IntPtr hDefault = OpenDesktop("Default", 0, false, 0x01FF);
        if (hDefault == IntPtr.Zero) {
            Console.WriteLine("Error opening Default desktop.");
            return;
        }

        Thread worker = new Thread(() => {
            if (!SetThreadDesktop(hDefault)) {
                Console.WriteLine("Worker SetThreadDesktop failed.");
                return;
            }

            int screenW = GetSystemMetrics(0);
            int screenH = GetSystemMetrics(1);

            // 1. Launch screen recorder in background
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string framesDir = Path.Combine(baseDir, "..", "reference", "recordings", "real_desktop_frames");
            framesDir = Path.GetFullPath(framesDir);
            string recorderExe = Path.Combine(baseDir, "RealScreenRecorder.exe");

            STARTUPINFO recSi = new STARTUPINFO();
            recSi.cb = Marshal.SizeOf(recSi);
            recSi.lpDesktop = @"WinSta0\Default";
            PROCESS_INFORMATION recPi = new PROCESS_INFORMATION();
            string recCmd = "\"" + recorderExe + "\" 18 \"" + framesDir + "\"";
            CreateProcess(null, recCmd, IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, null, ref recSi, out recPi);
            Console.WriteLine("Started real screen recording (18s @ 30fps)...");

            Thread.Sleep(1000);

            // 2. Launch Google Chrome
            Console.WriteLine("Step 1: Launching Google Chrome to YouTube on real desktop...");
            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (!File.Exists(chromePath)) {
                chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            }

            STARTUPINFO chrSi = new STARTUPINFO();
            chrSi.cb = Marshal.SizeOf(chrSi);
            chrSi.lpDesktop = @"WinSta0\Default";
            PROCESS_INFORMATION chrPi = new PROCESS_INFORMATION();
            string chrCmd = "\"" + chromePath + "\" --new-window \"https://www.youtube.com\"";
            CreateProcess(null, chrCmd, IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, null, ref chrSi, out chrPi);

            Console.WriteLine("Step 2: Waiting for Chrome to open (4.0s)...");
            Thread.Sleep(4000);

            // Maximize Chrome
            EnumDesktopWindows(hDefault, (hWnd, lParam) => {
                if (IsWindowVisible(hWnd)) {
                    System.Text.StringBuilder sb = new System.Text.StringBuilder(256);
                    GetWindowText(hWnd, sb, 256);
                    string t = sb.ToString();
                    if (t.Contains("YouTube") || t.Contains("Chrome")) {
                        ShowWindow(hWnd, 3); // Maximize
                        SetForegroundWindow(hWnd);
                        Console.WriteLine("Maximized Chrome: " + t);
                        return false;
                    }
                }
                return true;
            }, IntPtr.Zero);

            Thread.Sleep(1500);

            // 3. Move cursor to YouTube Search Box
            int targetX = screenW / 2;
            int targetY = 88;
            Console.WriteLine("Step 3: Moving cursor to YouTube search box (" + targetX + ", " + targetY + ")...");
            int startX = screenW - 100;
            int startY = screenH - 100;
            int steps = 35;
            for (int i = 0; i <= steps; i++) {
                double t = (double)i / steps;
                double ease = 1 - Math.Pow(1 - t, 3);
                int curX = (int)(startX + (targetX - startX) * ease);
                int curY = (int)(startY + (targetY - startY) * ease - Math.Sin(t * Math.PI) * 40);
                SetCursorPos(curX, curY);
                Thread.Sleep(25);
            }

            // 4. Click Search Box
            Console.WriteLine("Step 4: Clicking YouTube search box...");
            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
            Thread.Sleep(60);
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
            Thread.Sleep(300);

            // 5. Type "technoblade"
            Console.WriteLine("Step 5: Typing 'technoblade' into search box...");
            foreach (char c in "technoblade") {
                short vk = VkKeyScan(c);
                byte code = (byte)(vk & 0xff);
                keybd_event(code, 0, 0, UIntPtr.Zero);
                Thread.Sleep(20);
                keybd_event(code, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                Thread.Sleep(90);
            }

            Thread.Sleep(300);

            // 6. Press Enter
            Console.WriteLine("Step 6: Pressing ENTER...");
            keybd_event(VK_RETURN, 0, 0, UIntPtr.Zero);
            Thread.Sleep(50);
            keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

            // 7. Wait for Technoblade channel results
            Console.WriteLine("Step 7: Waiting for Technoblade official channel results (5.0s)...");
            Thread.Sleep(5000);

            // Hover over channel
            SetCursorPos(targetX, 240);
            Console.WriteLine("Step 8: Task complete! Real desktop takeover executed.");
        });

        worker.SetApartmentState(ApartmentState.STA);
        worker.Start();
        worker.Join();

        Thread.Sleep(2000);
        Console.WriteLine("=== FINISHED REAL TAKEOVER EXECUTION ===");
    }

    static bool IsLogonUIRunning() {
        Process[] procs = Process.GetProcessesByName("LogonUI");
        return procs.Length > 0;
    }
}
