using System.Text.Json;
using System.Text.Json.Serialization;

namespace AudioSidecar.Protocol;

public class InboundMessage
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";
}

public class OutboundMessage
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("data")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Data { get; set; }

    [JsonPropertyName("status")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Status { get; set; }

    [JsonPropertyName("message")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Message { get; set; }

    public static OutboundMessage Audio(string base64Data) =>
        new() { Type = "audio", Data = base64Data };

    public static OutboundMessage StatusMsg(string status) =>
        new() { Type = "status", Status = status };

    public static OutboundMessage Error(string message) =>
        new() { Type = "error", Message = message };
}

public static class MessageSerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static InboundMessage? Deserialize(string json) =>
        JsonSerializer.Deserialize<InboundMessage>(json, Options);

    public static string Serialize(OutboundMessage msg) =>
        JsonSerializer.Serialize(msg, Options);
}
