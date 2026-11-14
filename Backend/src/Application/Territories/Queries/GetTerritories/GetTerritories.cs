using Neosphere.Application.Common.Security;
using Neosphere.Application.Territories.Models;

namespace Neosphere.Application.Territories.Queries.GetTerritories;

[Authorize]
public sealed record GetTerritoriesQuery : IRequest<IReadOnlyList<TerritoryDto>>;

public sealed class GetTerritoriesQueryHandler(IApplicationDbContext context, IUser currentUser)
    : IRequestHandler<GetTerritoriesQuery, IReadOnlyList<TerritoryDto>>
{
    public async Task<IReadOnlyList<TerritoryDto>> Handle(GetTerritoriesQuery request, CancellationToken cancellationToken)
    {
        var ownerId = currentUser.RequireId();

        var territories = await context.Territories
            .AsNoTracking()
            .Where(territory => territory.OwnerId == ownerId)
            .OrderBy(territory => territory.Created)
            .ToListAsync(cancellationToken);

        return [.. territories.Select(territory => territory.ToDto())];
    }
}
