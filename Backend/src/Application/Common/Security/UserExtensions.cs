namespace Neosphere.Application.Common.Security;

public static class UserExtensions
{
    public static int RequireId(this IUser user) => user.Id ?? throw new UnauthorizedAccessException();
}
