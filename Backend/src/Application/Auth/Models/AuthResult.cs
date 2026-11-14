namespace Neosphere.Application.Auth.Models;

public sealed record AuthResult(string AccessToken, DateTimeOffset ExpiresAt, UserDto User);
