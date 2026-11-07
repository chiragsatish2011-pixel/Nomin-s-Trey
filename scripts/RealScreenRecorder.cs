using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Runtime.InteropServices;

public class RealScreenRecorder {
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    public static void Main(string[] args) {
        int durationSec = args.Length > 0 ? int.Parse(args[0]) : 15;
        string outDir = args.Length > 1 ? args[1] : "real_recorded_frames";
        int targetFps = 30;

        if (Directory.Exists(outDir)) {
            Directory.Delete(outDir, true);
        }
        Directory.CreateDirectory(outDir);

        int w = GetSystemMetrics(0);
        int h = GetSystemMetrics(1);
        Console.WriteLine("Recording real screen (" + w + "x" + h + ") for " + durationSec + "s at " + targetFps + " FPS to " + outDir);

        ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
        EncoderParameters encParams = new EncoderParameters(1);
        encParams.Param[0] = new EncoderParameter(Encoder.Quality, 80L);

        int totalFrames = durationSec * targetFps;
        long frameDurationMs = 1000 / targetFps;

        using (Bitmap bmp = new Bitmap(w, h)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                for (int i = 0; i < totalFrames; i++) {
                    DateTime start = DateTime.UtcNow;
                    try {
                        g.CopyFromScreen(0, 0, 0, 0, new Size(w, h));
                        string framePath = Path.Combine(outDir, string.Format("f_{0:D5}.jpg", i));
                        bmp.Save(framePath, jpgEncoder, encParams);
                    } catch (Exception ex) {
                        Console.WriteLine("Frame error: " + ex.Message);
                    }

                    int elapsed = (int)(DateTime.UtcNow - start).TotalMilliseconds;
                    int sleepTime = (int)frameDurationMs - elapsed;
                    if (sleepTime > 0) {
                        Thread.Sleep(sleepTime);
                    }
                }
            }
        }
        Console.WriteLine("Screen recording complete. Frames saved: " + totalFrames);
    }

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
