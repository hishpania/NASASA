using Neosphere.Application.Common.Security;
using Neosphere.Application.Fields.Models;
using Neosphere.Application.Recommendations.Models;

namespace Neosphere.Application.Recommendations.Queries.GetFieldForecast;

[Authorize]
public sealed record GetFieldForecastQuery(int FieldId) : IRequest<ClimateForecastDto>;

public sealed class GetFieldForecastQueryHandler(
    IApplicationDbContext context,
    IUser currentUser,
    ICropAdvisor cropAdvisor)
    : IRequestHandler<GetFieldForecastQuery, ClimateForecastDto>
{
    public async Task<ClimateForecastDto> Handle(GetFieldForecastQuery request, CancellationToken cancellationToken)
    {
        var field = await context.Fields.GetOwnedAsync(request.FieldId, currentUser.RequireId(), cancellationToken);

        return await cropAdvisor.GetForecastAsync(field.Center.Latitude, field.Center.Longitude, cancellationToken);
    }
}
