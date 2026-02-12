namespace AudioSidecar.Services;

/// <summary>
/// Thread-safe circular byte buffer for accumulating resampled PCM audio.
/// </summary>
public sealed class AudioRingBuffer
{
    private readonly byte[] _buffer;
    private int _writePos;
    private int _readPos;
    private int _count;
    private readonly object _lock = new();

    public AudioRingBuffer(int capacity = 96000) // ~2s at 24kHz/16bit/mono
    {
        _buffer = new byte[capacity];
    }

    public int Available
    {
        get { lock (_lock) return _count; }
    }

    public void Write(byte[] data, int offset, int count)
    {
        lock (_lock)
        {
            for (int i = 0; i < count; i++)
            {
                if (_count >= _buffer.Length)
                {
                    // Overwrite oldest data when full
                    _readPos = (_readPos + 1) % _buffer.Length;
                    _count--;
                }
                _buffer[_writePos] = data[offset + i];
                _writePos = (_writePos + 1) % _buffer.Length;
                _count++;
            }
        }
    }

    public int Read(byte[] dest, int requestedCount)
    {
        lock (_lock)
        {
            int toRead = Math.Min(requestedCount, _count);
            for (int i = 0; i < toRead; i++)
            {
                dest[i] = _buffer[_readPos];
                _readPos = (_readPos + 1) % _buffer.Length;
            }
            _count -= toRead;
            return toRead;
        }
    }

    public void Clear()
    {
        lock (_lock)
        {
            _writePos = 0;
            _readPos = 0;
            _count = 0;
        }
    }
}
