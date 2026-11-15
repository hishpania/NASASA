using Microsoft.IdentityModel.JsonWebTokens;
using Neosphere.Application.Common.Interfaces;

namespace Neosphere.Web.Services;

public sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : IUser
{
    public int? Id =>
        int.TryParse(httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id)
            ? id
            : null;
}
