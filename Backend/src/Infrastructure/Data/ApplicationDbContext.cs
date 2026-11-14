using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Neosphere.Application.Common.Interfaces;
using Neosphere.Domain.Entities;

namespace Neosphere.Infrastructure.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options), IApplicationDbContext
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Field> Fields => Set<Field>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
