using Neosphere.Application.Common.Security;
using Neosphere.Application.Fields.Models;
using Neosphere.Application.Recommendations.Models;

namespace Neosphere.Application.Recommendations.Queries.GetFieldOutlook;

[Authorize]
public sealed record GetFieldOutlookQuery(int FieldId) : IRequest<MonthlyOutlookDto>;

public sealed class GetFieldOutlookQueryHandler(
    IApplicationDbContext context,
    IUser currentUser,
    ICropAdvisor cropAdvisor)
    : IRequestHandler<GetFieldOutlookQuery, MonthlyOutlookDto>
{
    public async Task<MonthlyOutlookDto> Handle(GetFieldOutlookQuery request, CancellationToken cancellationToken)
    {
        var field = await context.Fields.GetOwnedAsync(request.FieldId, currentUser.RequireId(), cancellationToken);

        return await cropAdvisor.GetOutlookAsync(field.Center.Latitude, field.Center.Longitude, cancellationToken);
    }
}
