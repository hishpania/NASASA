using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Neosphere.Web.Infrastructure;

/// <summary>
/// Adds standard error responses to every OpenAPI operation. A 400 Bad Request is added to all
/// operations because every request passes through <c>ValidationBehaviour</c> in the MediatR
/// pipeline. 401 Unauthorized and 403 Forbidden are added only to operations that carry
/// <see cref="IAuthorizeData"/> metadata.
/// </summary>
internal sealed class ApiExceptionOperationTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
    {
        operation.Responses ??= [];
        operation.Responses.TryAdd("400", new OpenApiResponse { Description = "Bad Request" });

        var metadata = context.Description.ActionDescriptor.EndpointMetadata;
        var requiresAuth = metadata.Any(m => m is IAuthorizeData) && !metadata.Any(m => m is IAllowAnonymous);

        if (requiresAuth)
        {
            operation.Responses.TryAdd("401", new OpenApiResponse { Description = "Unauthorized" });
            operation.Responses.TryAdd("403", new OpenApiResponse { Description = "Forbidden" });
        }

        return Task.CompletedTask;
    }
}
