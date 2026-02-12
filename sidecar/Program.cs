using AudioSidecar.Protocol;
using AudioSidecar.Services;

/// <summary>
/// C# Sidecar entry point.
/// Reads JSON commands from stdin, writes JSON events to stdout.
/// Captures system audio via WasapiLoopbackCapture and emits base64 PCM chunks.
/// </summary>

Console.Error.WriteLine("[Sidecar] Audio sidecar starting...");

var captureService = new AudioCaptureService();
var cts = new CancellationTokenSource();

// Wire up audio chunk events -> stdout
captureService.AudioChunkReady += (base64Data) =>
{
    var msg = OutboundMessage.Audio(base64Data);
    WriteMessage(msg);
};

captureService.ErrorOccurred += (errorMsg) =>
{
    Console.Error.WriteLine($"[Sidecar] Error: {errorMsg}");
    var msg = OutboundMessage.Error(errorMsg);
    WriteMessage(msg);
};

// Handle process exit gracefully
AppDomain.CurrentDomain.ProcessExit += (_, _) =>
{
    captureService.StopCapture();
    captureService.Dispose();
};

Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    cts.Cancel();
};

// Read stdin command loop
try
{
    while (!cts.Token.IsCancellationRequested)
    {
        string? line = await Task.Run(() => Console.ReadLine(), cts.Token);

        if (line == null)
        {
            // stdin closed (parent process exited)
            Console.Error.WriteLine("[Sidecar] stdin closed, exiting.");
            break;
        }

        if (string.IsNullOrWhiteSpace(line)) continue;

        try
        {
            var command = MessageSerializer.Deserialize(line);
            if (command == null) continue;

            switch (command.Type)
            {
                case "start":
                    Console.Error.WriteLine("[Sidecar] Start command received.");
                    captureService.StartCapture();
                    WriteMessage(OutboundMessage.StatusMsg("capturing"));
                    break;

                case "stop":
                    Console.Error.WriteLine("[Sidecar] Stop command received.");
                    captureService.StopCapture();
                    WriteMessage(OutboundMessage.StatusMsg("stopped"));
                    break;

                default:
                    Console.Error.WriteLine($"[Sidecar] Unknown command: {command.Type}");
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Sidecar] Error parsing command: {ex.Message}");
        }
    }
}
catch (OperationCanceledException)
{
    // Normal shutdown
}

captureService.StopCapture();
captureService.Dispose();
Console.Error.WriteLine("[Sidecar] Exiting.");

static void WriteMessage(OutboundMessage msg)
{
    try
    {
        string json = MessageSerializer.Serialize(msg);
        Console.Out.WriteLine(json);
        Console.Out.Flush();
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[Sidecar] Failed to write message: {ex.Message}");
    }
}
