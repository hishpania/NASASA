using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace Neosphere.Application.Common.Behaviours;

public class PerformanceBehaviour<TRequest, TResponse>(ILogger<TRequest> logger, IUser user) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private const long SlowRequestThresholdMilliseconds = 500;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var startedAt = Stopwatch.GetTimestamp();

        var response = await next(cancellationToken);

        var elapsedMilliseconds = (long)Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds;

        if (elapsedMilliseconds > SlowRequestThresholdMilliseconds)
        {
            logger.LogWarning("Neosphere Long Running Request: {Name} ({ElapsedMilliseconds} milliseconds) {@UserId}",
                typeof(TRequest).Name, elapsedMilliseconds, user.Id);
        }

        return response;
    }
}
