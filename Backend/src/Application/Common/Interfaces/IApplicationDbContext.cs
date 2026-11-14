namespace Neosphere.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }

    DbSet<Territory> Territories { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
