using NAudio.Wave;
using NAudio.Wave.SampleProviders;

namespace AudioSidecar.Services;

/// <summary>
/// Converts captured audio (typically 48kHz/32-bit float/stereo) to 24kHz/16-bit/mono PCM.
/// Uses NAudio provider chain + MediaFoundation resampler.
/// </summary>
public sealed class AudioResampler : IDisposable
{
    private readonly WaveFormat _targetFormat = new(24000, 16, 1);
    private BufferedWaveProvider? _sourceBuffer;
    private IWaveProvider? _resamplerChain;
    private MediaFoundationResampler? _resampler;
    private bool _initialized;

    public WaveFormat TargetFormat => _targetFormat;

    /// <summary>
    /// Initialise the resampling chain based on the source format from WasapiLoopbackCapture.
    /// Must be called before Process().
    /// </summary>
    public void Initialize(WaveFormat sourceFormat)
    {
        Dispose();

        // Buffered source to feed captured data into the chain
        _sourceBuffer = new BufferedWaveProvider(sourceFormat)
        {
            BufferLength = sourceFormat.AverageBytesPerSecond * 4,
            DiscardOnBufferOverflow = true
        };

        IWaveProvider current = _sourceBuffer;

        // Step 1: Float32 -> 16-bit (if source is float)
        if (sourceFormat.Encoding == WaveFormatEncoding.IeeeFloat)
        {
            current = new Wave16ToFloatProvider(current) is var _ // wrong direction
                ? new WaveFloatTo16Provider(current)
                : current;
            // After float->16, format is 16-bit at original sample rate + channels
        }

        // Step 2: Stereo -> Mono (if stereo)
        if (sourceFormat.Channels >= 2)
        {
            // WaveFloatTo16Provider output is 16-bit, so we can use StereoToMonoProvider16
            // But we need to check the current format
            var currentFormat = current.WaveFormat;
            if (currentFormat.BitsPerSample == 16 && currentFormat.Channels == 2)
            {
                current = new StereoToMonoProvider16(current);
            }
            else if (currentFormat.Channels >= 2)
            {
                // Use MFResampler to handle channel conversion too
                // We'll let the final resampler do it
            }
        }

        // Step 3: Resample to 24kHz mono using MediaFoundation
        _resampler = new MediaFoundationResampler(current, _targetFormat)
        {
            ResamplerQuality = 60 // highest quality
        };
        _resamplerChain = _resampler;
        _initialized = true;
    }

    /// <summary>
    /// Feed raw captured audio bytes and get back resampled 24kHz/16-bit/mono PCM.
    /// </summary>
    public byte[] Process(byte[] inputBuffer, int offset, int count)
    {
        if (!_initialized || _sourceBuffer == null || _resamplerChain == null)
            throw new InvalidOperationException("Resampler not initialized. Call Initialize() first.");

        _sourceBuffer.AddSamples(inputBuffer, offset, count);

        // Read resampled output
        // Estimate output size: input duration * target bytes per second
        int maxOutputBytes = (int)((double)count / _sourceBuffer.WaveFormat.AverageBytesPerSecond
            * _targetFormat.AverageBytesPerSecond * 1.5) + 4096;
        byte[] outputBuffer = new byte[maxOutputBytes];

        int totalRead = 0;
        int bytesRead;
        do
        {
            bytesRead = _resamplerChain.Read(outputBuffer, totalRead,
                Math.Min(4096, outputBuffer.Length - totalRead));
            totalRead += bytesRead;
        } while (bytesRead > 0 && totalRead < outputBuffer.Length);

        if (totalRead == 0) return Array.Empty<byte>();

        byte[] result = new byte[totalRead];
        Array.Copy(outputBuffer, result, totalRead);
        return result;
    }

    public void Dispose()
    {
        _resampler?.Dispose();
        _resampler = null;
        _sourceBuffer = null;
        _resamplerChain = null;
        _initialized = false;
    }
}
