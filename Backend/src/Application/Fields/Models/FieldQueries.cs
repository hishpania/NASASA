namespace Neosphere.Application.Fields.Models;

public static class FieldQueries
{
    public static async Task<Field> GetOwnedAsync(
        this DbSet<Field> fields,
        int id,
        int ownerId,
        CancellationToken cancellationToken)
    {
        var field = await fields
            .SingleOrDefaultAsync(candidate => candidate.Id == id && candidate.OwnerId == ownerId, cancellationToken);

        Guard.Against.NotFound(id, field);

        return field;
    }
}
