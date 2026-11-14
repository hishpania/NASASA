namespace Neosphere.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }

    DbSet<Field> Fields { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
