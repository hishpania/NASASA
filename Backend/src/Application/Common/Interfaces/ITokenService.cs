using Neosphere.Application.Common.Models;

namespace Neosphere.Application.Common.Interfaces;

public interface ITokenService
{
    AccessToken Issue(User user);
}
