using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;

namespace Trey.RealTakeover {
    public class Program {
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

        const uint DESKTOP_ALL = 0x01FF;
        const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        const uint MOUSEEVENTF_LEFTUP = 0x0004;
        const uint KEYEVENTF_KEYUP = 0x0002;

        const byte VK_RETURN = 0x0D;
        const byte VK_BACK = 0x08;

        static bool isRecording = true;
        static List<string> frameFiles = new List<string>();

        public static void Main(string[] args) {
            Console.WriteLine("=== Trey Real Desktop Takeover & Screen Recorder ===");
            string frameDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "reference", "recordings", "real_frames");
            frameDir = Path.GetFullPath(frameDir);
            if (Directory.Exists(frameDir)) {
                Directory.Delete(frameDir, true);
            }
            Directory.CreateDirectory(frameDir);

            IntPtr hDefault = OpenDesktop("Default", 0, false, DESKTOP_ALL);
            if (hDefault == IntPtr.Zero) {
                Console.WriteLine("Error: Unable to open Default desktop. Err=" + Marshal.GetLastWin32Error());
                return;
            }

            // Start Real Screen Capture Worker Thread on Default desktop
            Thread recordThread = new Thread(() => {
                if (!SetThreadDesktop(hDefault)) {
                    Console.WriteLine("Recorder failed to SetThreadDesktop. Err=" + Marshal.GetLastWin32Error());
                    return;
                }

                int w = GetSystemMetrics(0); // 1536
                int h = GetSystemMetrics(1); // 864
                int frameIndex = 0;
                Console.WriteLine("Started real screen recording (" + w + "x" + h + ") on WinSta0\\Default...");

                while (isRecording) {
                    try {
                        string framePath = Path.Combine(frameDir, string.Format("frame_{0:D5}.jpg", frameIndex++));
                        using (Bitmap bmp = new Bitmap(w, h)) {
                            using (Graphics g = Graphics.FromImage(bmp)) {
                                g.CopyFromScreen(0, 0, 0, 0, new Size(w, h));
                            }
                            // Save as high-quality JPEG for speed and small memory footprint
                            ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
                            EncoderParameters encParams = new EncoderParameters(1);
                            encParams.Param[0] = new EncoderParameter(Encoder.Quality, 85L);
                            bmp.Save(framePath, jpgEncoder, encParams);
                        }
                    } catch (Exception ex) {
                        Console.WriteLine("Capture frame error: " + ex.Message);
                    }
                    Thread.Sleep(33); // ~30 fps
                }
                Console.WriteLine("Recorder finished. Total real frames captured: " + frameIndex);
            });
            recordThread.SetApartmentState(ApartmentState.STA);
            recordThread.Start();

            // Main Takeover Logic Thread on Default desktop
            Thread takeoverThread = new Thread(() => {
                if (!SetThreadDesktop(hDefault)) {
                    Console.WriteLine("Takeover failed to SetThreadDesktop. Err=" + Marshal.GetLastWin32Error());
                    return;
                }

                Console.WriteLine("Stage 1: Launching Google Chrome on real desktop...");
                STARTUPINFO si = new STARTUPINFO();
                si.cb = Marshal.SizeOf(si);
                si.lpDesktop = @"WinSta0\Default";
                PROCESS_INFORMATION pi = new PROCESS_INFORMATION();

                string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
                if (!File.Exists(chromePath)) {
                    chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
                }

                // Launch Chrome to YouTube
                string url = "https://www.youtube.com";
                string cmd = "\"" + chromePath + "\" --new-window \"" + url + "\"";
                CreateProcess(null, cmd, IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, null, ref si, out pi);

                Console.WriteLine("Waiting for Chrome and YouTube to render on real desktop (4.5s)...");
                Thread.Sleep(4500);

                // Find Chrome window on Default desktop and bring to foreground
                EnumDesktopWindows(hDefault, (hWnd, lParam) => {
                    if (IsWindowVisible(hWnd)) {
                        System.Text.StringBuilder sb = new System.Text.StringBuilder(256);
                        GetWindowText(hWnd, sb, 256);
                        string title = sb.ToString();
                        if (title.Contains("YouTube") || title.Contains("Chrome")) {
                            ShowWindow(hWnd, 3); // SW_MAXIMIZE = 3
                            SetForegroundWindow(hWnd);
                            Console.WriteLine("Brought window to front: " + title);
                            return false;
                        }
                    }
                    return true;
                }, IntPtr.Zero);

                Thread.Sleep(1500);

                int screenW = GetSystemMetrics(0);
                int screenH = GetSystemMetrics(1);

                // Stage 2: Smooth Cursor Travel to YouTube Search Bar
                // YouTube search box on 1536x864 screen when maximized is typically centered at x: screenW / 2 (~768), y: 80..95
                int targetX = screenW / 2;
                int targetY = 88;
                Console.WriteLine("Stage 2: Moving real mouse cursor smoothly to YouTube search bar (" + targetX + ", " + targetY + ")...");

                int startX = screenW - 120;
                int startY = screenH - 120;

                int steps = 40;
                for (int i = 0; i <= steps; i++) {
                    double t = (double)i / steps;
                    // Ease out cubic
                    double ease = 1 - Math.Pow(1 - t, 3);
                    int curX = (int)(startX + (targetX - startX) * ease);
                    int curY = (int)(startY + (targetY - startY) * ease - Math.Sin(t * Math.PI) * 40);
                    SetCursorPos(curX, curY);
                    Thread.Sleep(25);
                }

                // Stage 3: Click to Focus Search Box
                Console.WriteLine("Stage 3: Clicking real YouTube search box...");
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                Thread.Sleep(60);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                Thread.Sleep(400);

                // Stage 4: Type "technoblade" into Search Box
                Console.WriteLine("Stage 4: Typing 'technoblade' into search box on real desktop...");
                string query = "technoblade";
                foreach (char c in query) {
                    SendChar(c);
                    Thread.Sleep(90); // realistic typing cadence
                }

                Thread.Sleep(400);

                // Stage 5: Press Enter Key to search
                Console.WriteLine("Stage 5: Pressing ENTER to execute search...");
                keybd_event(VK_RETURN, 0, 0, UIntPtr.Zero);
                Thread.Sleep(50);
                keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

                Console.WriteLine("Stage 6: Waiting for Technoblade YouTube channel and videos to load (5.0s)...");
                Thread.Sleep(5000);

                Console.WriteLine("Stage 7: Moving cursor to hover over Technoblade official channel...");
                int channelX = screenW / 2;
                int channelY = 240;
                for (int i = 0; i <= 25; i++) {
                    double t = (double)i / 25;
                    int curX = (int)(targetX + (channelX - targetX) * t);
                    int curY = (int)(targetY + (channelY - targetY) * t);
                    SetCursorPos(curX, curY);
                    Thread.Sleep(20);
                }

                Thread.Sleep(3000);
                Console.WriteLine("Takeover completed successfully on real desktop!");
            });
            takeoverThread.SetApartmentState(ApartmentState.STA);
            takeoverThread.Start();

            takeoverThread.Join();
            // Let recorder capture 2 more seconds of the final result
            Thread.Sleep(2000);
            isRecording = false;
            recordThread.Join();

            Console.WriteLine("ALL STAGES COMPLETED ON REAL DESKTOP!");
        }

        static void SendChar(char c) {
            short vk = VkKeyScan(c);
            byte vkCode = (byte)(vk & 0xff);
            bool shift = ((vk >> 8) & 1) != 0;

            if (shift) keybd_event(0x10, 0, 0, UIntPtr.Zero); // VK_SHIFT
            keybd_event(vkCode, 0, 0, UIntPtr.Zero);
            Thread.Sleep(20);
            keybd_event(vkCode, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
            if (shift) keybd_event(0x10, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        }

        [DllImport("user32.dll")]
        static extern short VkKeyScan(char ch);

        static ImageCodecInfo GetEncoder(ImageFormat format) {
            ImageCodecInfo[] codecs = ImageCodecInfo.GetImageEncoders();
            foreach (ImageCodecInfo codec in codecs) {
                if (codec.FormatID == format.Guid) {
                    return codec;
                }
            }
            return null;
        }
    }
}
