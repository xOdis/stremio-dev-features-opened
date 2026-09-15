using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

class StremioDev
{
    const int Port = 8082;
    const string WebUiArgs = "--webui-url=http://127.0.0.1:8082/#/?streamingServerUrl=http%3A%2F%2F127.0.0.1%3A8082 --no-splash";

    static void Fail(string title, string message)
    {
        MessageBox.Show(message, title, MessageBoxButtons.OK, MessageBoxIcon.Error);
        Environment.Exit(1);
    }

    // Close any already-running Stremio shell (stock or a previous dev
    // instance) so the --webui-url launch below always wins. Without
    // this, a running stock Stremio just gets focused and the custom
    // dev UI never appears (single-instance shell ignores new args).
    static void KillExistingShell()
    {
        string[] names = new string[] { "stremio-shell-ng", "stremio-runtime" };
        foreach (string name in names)
        {
            try
            {
                foreach (Process p in Process.GetProcessesByName(name))
                {
                    try { p.Kill(); } catch { }
                    try { p.Dispose(); } catch { }
                }
            }
            catch { }
        }
        // Give the processes a moment to exit and release the port.
        for (int i = 0; i < 20; i++)
        {
            bool anyLeft = false;
            try
            {
                foreach (string name in names)
                {
                    if (Process.GetProcessesByName(name).Length > 0)
                    {
                        anyLeft = true;
                        break;
                    }
                }
            }
            catch { break; }
            if (!anyLeft) break;
            Thread.Sleep(250);
        }
    }

    static bool Listening()
    {
        try
        {
            new TcpClient("127.0.0.1", Port).Close();
            return true;
        }
        catch
        {
            return false;
        }
    }

    [STAThread]
    static void Main()
    {
        KillExistingShell();

        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string webDir = Path.Combine(baseDir, "stremio-web");
        string serverJs = Path.Combine(webDir, "http_server.js");
        if (!File.Exists(serverJs))
        {
            Fail("StremioDev",
                "The \"stremio-web\" folder was not found next to StremioDev.exe.\n\n" +
                "Keep StremioDev.exe in the same folder as the stremio-web folder.");
        }

        string stremioExe = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs", "Stremio", "stremio-shell-ng.exe");
        if (!File.Exists(stremioExe))
        {
            Fail("StremioDev",
                "Stremio desktop app was not found at:\n" + stremioExe + "\n\n" +
                "Install the Stremio desktop app (default install location),\n" +
                "or edit STREMIO_EXE inside StremioDev.cs and recompile.");
        }

        if (!Listening())
        {
            try
            {
                Process.Start(new ProcessStartInfo("node", "http_server.js")
                {
                    WorkingDirectory = webDir,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    UseShellExecute = true
                });
            }
            catch
            {
                Fail("StremioDev",
                    "Node.js could not be started.\n\n" +
                    "Install Node.js LTS from https://nodejs.org");
            }

            for (int i = 0; i < 40 && !Listening(); i++)
            {
                Thread.Sleep(250);
            }
            // Give the HTTP listener a moment to accept requests reliably.
            Thread.Sleep(500);

            if (!Listening())
            {
                Fail("StremioDev",
                    "The local server did not start within 10 seconds.\n\n" +
                    "Is Node.js installed? Check the log:\n" + Path.Combine(webDir, "server.log"));
            }
        }

        try
        {
            Process.Start(new ProcessStartInfo(stremioExe, WebUiArgs)
            {
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            Fail("StremioDev", "Failed to launch Stremio:\n" + ex.Message);
        }
    }
}
