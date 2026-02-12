using NAudio.CoreAudioApi;
using NAudio.Wave;

namespace AudioSidecar.Services;

/// <summary>
/// Wraps WasapiLoopbackCapture to capture system audio output (desktop audio).
/// Feeds captured data through AudioResampler into a ring buffer.
/// A 50ms timer drains the ring buffer and emits base64 PCM chunks.
/// </summary>
public sealed class AudioCaptureService : IDisposable
{
    private WasapiLoopbackCapture? _capture;
    private readonly AudioResampler _resampler = new();
    private readonly AudioRingBuffer _ringBuffer = new(96000);
    private Timer? _drainTimer;
    private volatile bool _isCapturing;

    /// <summary>
    /// Raised every ~50ms with a base64-encoded chunk of 24kHz/16-bit/mono PCM.
    /// </summary>
    public event Action<string>? AudioChunkReady;

    /// <summary>
    /// Raised when an error occurs during capture.
    /// </summary>
    public event Action<string>? ErrorOccurred;

    public bool IsCapturing => _isCapturing;

    public void StartCapture()
    {
        try
        {
            var enumerator = new MMDeviceEnumerator();
            MMDevice device;
            try
            {
                device = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
            }
            catch (Exception ex)
            {
                ErrorOccurred?.Invoke($"No default audio render device found: {ex.Message}");
                return;
            }

            _capture = new WasapiLoopbackCapture(device);
            _resampler.Initialize(_capture.WaveFormat);
            _ringBuffer.Clear();

            _capture.DataAvailable += OnDataAvailable;
            _capture.RecordingStopped += OnRecordingStopped;

            // Start drain timer: every 50ms, drain 2400 bytes (50ms at 24kHz/16-bit/mono)
            _drainTimer = new Timer(DrainBuffer, null, 50, 50);

            _capture.StartRecording();
            _isCapturing = true;
        }
        catch (Exception ex)
        {
            ErrorOccurred?.Invoke($"Failed to start capture: {ex.Message}");
        }
    }

    public void StopCapture()
    {
        _isCapturing = false;
        _drainTimer?.Dispose();
        _drainTimer = null;

        try
        {
            _capture?.StopRecording();
        }
        catch
        {
            // Ignore errors on stop
        }
    }

    private void OnDataAvailable(object? sender, WaveInEventArgs e)
    {
        if (!_isCapturing || e.BytesRecorded == 0) return;

        try
        {
            byte[] resampled = _resampler.Process(e.Buffer, 0, e.BytesRecorded);
            if (resampled.Length > 0)
            {
                _ringBuffer.Write(resampled, 0, resampled.Length);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[AudioCapture] Resample error: {ex.Message}");
        }
    }

    private void DrainBuffer(object? state)
    {
        if (!_isCapturing) return;

        // 2400 bytes = 1200 samples = 50ms at 24kHz/16-bit/mono
        const int chunkSize = 2400;
        byte[] chunk = new byte[chunkSize];

        int bytesRead = _ringBuffer.Read(chunk, chunkSize);
        if (bytesRead > 0)
        {
            // If we got fewer bytes than a full chunk, send what we have
            byte[] toSend = bytesRead == chunkSize ? chunk : chunk[..bytesRead];
            string base64 = Convert.ToBase64String(toSend);
            AudioChunkReady?.Invoke(base64);
        }
    }

    private void OnRecordingStopped(object? sender, StoppedEventArgs e)
    {
        if (e.Exception != null)
        {
            ErrorOccurred?.Invoke($"Capture stopped with error: {e.Exception.Message}");
        }
    }

    public void Dispose()
    {
        _isCapturing = false;
        _drainTimer?.Dispose();
        _capture?.Dispose();
        _resampler.Dispose();
    }
}
