namespace Neosphere.Application.Auth.Models;

public sealed record UserDto(int Id, string Email)
{
    public static UserDto From(User user) => new(user.Id, user.Email);
}
