using System.ComponentModel.DataAnnotations;

namespace Neosphere.Infrastructure.Security;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string Issuer { get; init; } = string.Empty;

    [Required]
    public string Audience { get; init; } = string.Empty;

    [Required, MinLength(32)]
    public string SigningKey { get; init; } = string.Empty;

    [Range(1, 60 * 24 * 30)]
    public int LifetimeMinutes { get; init; } = 60 * 12;
}
