using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Neosphere.Domain.Entities;

namespace Neosphere.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public const int MaxEmailLength = 256;
    public const int MaxPasswordHashLength = 512;

    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(user => user.Email).HasMaxLength(MaxEmailLength).IsRequired();
        builder.Property(user => user.PasswordHash).HasMaxLength(MaxPasswordHashLength).IsRequired();

        builder.HasIndex(user => user.Email).IsUnique();
    }
}
