using System.Reflection;
using Neosphere.Application.Common.Security;

namespace Neosphere.Application.Common.Behaviours;

public class AuthorizationBehaviour<TRequest, TResponse>(IUser user) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (request.GetType().GetCustomAttribute<AuthorizeAttribute>() is not null && user.Id is null)
        {
            throw new UnauthorizedAccessException();
        }

        return next(cancellationToken);
    }
}
