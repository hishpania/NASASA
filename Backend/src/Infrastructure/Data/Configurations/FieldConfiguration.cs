using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Neosphere.Domain.Entities;

namespace Neosphere.Infrastructure.Data.Configurations;

public class FieldConfiguration : IEntityTypeConfiguration<Field>
{
    public const int MaxNameLength = 200;
    public const int MaxModeLength = 16;

    public void Configure(EntityTypeBuilder<Field> builder)
    {
        builder.Property(field => field.Name).HasMaxLength(MaxNameLength).IsRequired();
        builder.Property(field => field.Mode).HasConversion<string>().HasMaxLength(MaxModeLength);

        builder.ComplexProperty(field => field.Center);
        builder.ComplexCollection(field => field.Points, points => points.ToJson());
        builder.ComplexProperty(field => field.Place, place => place.ToJson());

        builder.HasOne(field => field.Owner)
            .WithMany(user => user.Fields)
            .HasForeignKey(field => field.OwnerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(field => field.OwnerId);
    }
}
