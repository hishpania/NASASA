namespace Neosphere.Application.Common.Models;

public sealed record AccessToken(string Value, DateTimeOffset ExpiresAt);
