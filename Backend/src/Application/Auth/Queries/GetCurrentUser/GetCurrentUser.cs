using Neosphere.Application.Auth.Models;
using Neosphere.Application.Common.Security;

namespace Neosphere.Application.Auth.Queries.GetCurrentUser;

[Authorize]
public sealed record GetCurrentUserQuery : IRequest<UserDto>;

public sealed class GetCurrentUserQueryHandler(IApplicationDbContext context, IUser currentUser)
    : IRequestHandler<GetCurrentUserQuery, UserDto>
{
    public async Task<UserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireId();

        var user = await context.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == userId, cancellationToken);

        return user is null ? throw new UnauthorizedAccessException() : UserDto.From(user);
    }
}
