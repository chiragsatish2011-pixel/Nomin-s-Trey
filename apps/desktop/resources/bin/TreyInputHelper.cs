/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Win32 high-precision input simulation helper for Trey PC Takeover.
 */

using System;
using System.IO;
using System.Threading;
using System.Runtime.InteropServices;

namespace Trey.Input {
    public class Program {
        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        public static extern short VkKeyScan(char ch);

        [StructLayout(LayoutKind.Sequential)]
        public struct INPUT {
            public uint type;
            public InputUnion u;
        }

        [StructLayout(LayoutKind.Explicit)]
        public struct InputUnion {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
            [FieldOffset(0)] public HARDWAREINPUT hi;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct MOUSEINPUT {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public UIntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct KEYBDINPUT {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public UIntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct HARDWAREINPUT {
            public uint uMsg;
            public ushort wParamL;
            public ushort wParamH;
        }

        const uint INPUT_MOUSE = 0;
        const uint INPUT_KEYBOARD = 1;

        const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        const uint MOUSEEVENTF_LEFTUP = 0x0004;
        const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
        const uint MOUSEEVENTF_WHEEL = 0x0800;
        const uint MOUSEEVENTF_HWHEEL = 0x1000;

        const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
        const uint KEYEVENTF_KEYUP = 0x0002;
        const uint KEYEVENTF_UNICODE = 0x0004;

        const ushort VK_LCONTROL = 0xA2;
        const ushort VK_LMENU = 0xA4; // Alt
        const ushort VK_LSHIFT = 0xA0;
        const ushort VK_LWIN = 0x5B;
        const ushort VK_RETURN = 0x0D;
        const ushort VK_TAB = 0x09;
        const ushort VK_ESCAPE = 0x1B;
        const ushort VK_BACK = 0x08;
        const ushort VK_DELETE = 0x2E;
        const ushort VK_SPACE = 0x20;
        const ushort VK_UP = 0x26;
        const ushort VK_DOWN = 0x28;
        const ushort VK_LEFT = 0x25;
        const ushort VK_RIGHT = 0x27;

        public static void Main(string[] args) {
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            Console.WriteLine("READY");

            string line;
            while ((line = Console.ReadLine()) != null) {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;
                if (line == "exit" || line == "quit") break;

                try {
                    ExecuteCommand(line);
                    Console.WriteLine("OK");
                } catch (Exception ex) {
                    Console.WriteLine("ERROR: " + ex.Message);
                }
            }
        }

        static void ExecuteCommand(string cmd) {
            var parts = cmd.Split(new[] { ' ' }, 2);
            string action = parts[0].ToLowerInvariant();
            string rest = parts.Length > 1 ? parts[1] : "";

            switch (action) {
                case "click": {
                    var tokens = rest.Split(' ');
                    int x = int.Parse(tokens[0]);
                    int y = int.Parse(tokens[1]);
                    string btn = tokens.Length > 2 ? tokens[2].ToLowerInvariant() : "left";
                    Click(x, y, btn);
                    break;
                }
                case "double_click": {
                    var tokens = rest.Split(' ');
                    int x = int.Parse(tokens[0]);
                    int y = int.Parse(tokens[1]);
                    DoubleClick(x, y);
                    break;
                }
                case "right_click": {
                    var tokens = rest.Split(' ');
                    int x = int.Parse(tokens[0]);
                    int y = int.Parse(tokens[1]);
                    Click(x, y, "right");
                    break;
                }
                case "move": {
                    var tokens = rest.Split(' ');
                    int x = int.Parse(tokens[0]);
                    int y = int.Parse(tokens[1]);
                    SetCursorPos(x, y);
                    break;
                }
                case "type": {
                    TypeText(rest);
                    break;
                }
                case "key": {
                    var tokens = rest.Split(' ');
                    string keyName = tokens[0];
                    string[] mods = tokens.Length > 1 ? tokens[1].Split(',') : new string[0];
                    PressKeyWithModifiers(keyName, mods);
                    break;
                }
                case "scroll": {
                    var tokens = rest.Split(' ');
                    int deltaY = int.Parse(tokens[0]);
                    int deltaX = tokens.Length > 1 ? int.Parse(tokens[1]) : 0;
                    if (tokens.Length >= 4) {
                        int x = int.Parse(tokens[2]);
                        int y = int.Parse(tokens[3]);
                        SetCursorPos(x, y);
                        Thread.Sleep(20);
                    }
                    Scroll(deltaY, deltaX);
                    break;
                }
                case "drag": {
                    var tokens = rest.Split(' ');
                    int x1 = int.Parse(tokens[0]);
                    int y1 = int.Parse(tokens[1]);
                    int x2 = int.Parse(tokens[2]);
                    int y2 = int.Parse(tokens[3]);
                    Drag(x1, y1, x2, y2);
                    break;
                }
                default:
                    throw new ArgumentException("Unknown command: " + action);
            }
        }

        static void Click(int x, int y, string button) {
            SetCursorPos(x, y);
            Thread.Sleep(30);

            uint downFlag = MOUSEEVENTF_LEFTDOWN;
            uint upFlag = MOUSEEVENTF_LEFTUP;

            if (button == "right") {
                downFlag = MOUSEEVENTF_RIGHTDOWN;
                upFlag = MOUSEEVENTF_RIGHTUP;
            } else if (button == "middle") {
                downFlag = MOUSEEVENTF_MIDDLEDOWN;
                upFlag = MOUSEEVENTF_MIDDLEUP;
            }

            mouse_event(downFlag, 0, 0, 0, UIntPtr.Zero);
            Thread.Sleep(45); // Human-like click dwell
            mouse_event(upFlag, 0, 0, 0, UIntPtr.Zero);
        }

        static void DoubleClick(int x, int y) {
            Click(x, y, "left");
            Thread.Sleep(80);
            Click(x, y, "left");
        }

        static void TypeText(string text) {
            var rng = new Random();
            foreach (char ch in text) {
                if (ch == '\r') continue;
                if (ch == '\n') {
                    PressKey(VK_RETURN);
                    Thread.Sleep(rng.Next(25, 45));
                    continue;
                }

                // Send Unicode char directly
                var inputs = new INPUT[2];
                inputs[0].type = INPUT_KEYBOARD;
                inputs[0].u.ki.wScan = (ushort)ch;
                inputs[0].u.ki.dwFlags = KEYEVENTF_UNICODE;

                inputs[1].type = INPUT_KEYBOARD;
                inputs[1].u.ki.wScan = (ushort)ch;
                inputs[1].u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;

                SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
                Thread.Sleep(rng.Next(15, 35)); // Natural human typing variance
            }
        }

        static void PressKey(ushort vk) {
            var inputs = new INPUT[2];
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wVk = vk;

            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].u.ki.wVk = vk;
            inputs[1].u.ki.dwFlags = KEYEVENTF_KEYUP;

            SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        static void PressKeyWithModifiers(string keyName, string[] modifiers) {
            var modVks = new System.Collections.Generic.List<ushort>();
            foreach (var mod in modifiers) {
                var m = mod.Trim().ToLowerInvariant();
                if (m == "ctrl" || m == "control") modVks.Add(VK_LCONTROL);
                else if (m == "alt") modVks.Add(VK_LMENU);
                else if (m == "shift") modVks.Add(VK_LSHIFT);
                else if (m == "win" || m == "meta") modVks.Add(VK_LWIN);
            }

            // Down modifiers
            foreach (var m in modVks) {
                var inp = new INPUT[1];
                inp[0].type = INPUT_KEYBOARD;
                inp[0].u.ki.wVk = m;
                SendInput(1, inp, Marshal.SizeOf(typeof(INPUT)));
            }
            Thread.Sleep(20);

            // Press key
            ushort keyVk = ResolveKey(keyName);
            if (keyVk != 0) {
                PressKey(keyVk);
            } else if (keyName.Length == 1) {
                TypeText(keyName);
            }

            Thread.Sleep(20);

            // Up modifiers in reverse order
            for (int i = modVks.Count - 1; i >= 0; i--) {
                var inp = new INPUT[1];
                inp[0].type = INPUT_KEYBOARD;
                inp[0].u.ki.wVk = modVks[i];
                inp[0].u.ki.dwFlags = KEYEVENTF_KEYUP;
                SendInput(1, inp, Marshal.SizeOf(typeof(INPUT)));
            }
        }

        static ushort ResolveKey(string key) {
            string k = key.ToLowerInvariant();
            switch (k) {
                case "enter": case "return": return VK_RETURN;
                case "tab": return VK_TAB;
                case "escape": case "esc": return VK_ESCAPE;
                case "backspace": return VK_BACK;
                case "delete": case "del": return VK_DELETE;
                case "space": return VK_SPACE;
                case "up": case "arrowup": return VK_UP;
                case "down": case "arrowdown": return VK_DOWN;
                case "left": case "arrowleft": return VK_LEFT;
                case "right": case "arrowright": return VK_RIGHT;
                case "ctrl": case "control": return VK_LCONTROL;
                case "alt": return VK_LMENU;
                case "shift": return VK_LSHIFT;
                case "win": case "meta": return VK_LWIN;
                default:
                    if (k.Length == 1) {
                        char c = k[0];
                        if (c >= 'a' && c <= 'z') return (ushort)(c - 'a' + 0x41);
                        if (c >= '0' && c <= '9') return (ushort)(c - '0' + 0x30);
                    }
                    return 0;
            }
        }

        static void Scroll(int deltaY, int deltaX) {
            if (deltaY != 0) {
                mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)(deltaY * 120), UIntPtr.Zero);
            }
            if (deltaX != 0) {
                mouse_event(MOUSEEVENTF_HWHEEL, 0, 0, (uint)(deltaX * 120), UIntPtr.Zero);
            }
        }

        static void Drag(int x1, int y1, int x2, int y2) {
            SetCursorPos(x1, y1);
            Thread.Sleep(50);
            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
            Thread.Sleep(50);

            // Smooth interpolation
            int steps = 25;
            for (int i = 1; i <= steps; i++) {
                double t = (double)i / steps;
                int curX = (int)(x1 + (x2 - x1) * t);
                int curY = (int)(y1 + (y2 - y1) * t);
                SetCursorPos(curX, curY);
                Thread.Sleep(10);
            }

            Thread.Sleep(40);
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
        }
    }
}
