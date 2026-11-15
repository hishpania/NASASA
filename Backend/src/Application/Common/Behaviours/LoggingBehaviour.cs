using MediatR.Pipeline;
using Microsoft.Extensions.Logging;

namespace Neosphere.Application.Common.Behaviours;

public class LoggingBehaviour<TRequest>(ILogger<TRequest> logger, IUser user) : IRequestPreProcessor<TRequest>
    where TRequest : notnull
{
    public Task Process(TRequest request, CancellationToken cancellationToken)
    {
        logger.LogInformation("Neosphere Request: {Name} {@UserId}", typeof(TRequest).Name, user.Id);

        return Task.CompletedTask;
    }
}
