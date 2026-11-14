namespace Neosphere.Application.Territories.Models;

public static class TerritoryQueries
{
    public static async Task<Territory> GetOwnedAsync(
        this DbSet<Territory> territories,
        int id,
        int ownerId,
        CancellationToken cancellationToken)
    {
        var territory = await territories
            .SingleOrDefaultAsync(candidate => candidate.Id == id && candidate.OwnerId == ownerId, cancellationToken);

        Guard.Against.NotFound(id, territory);

        return territory;
    }
}
