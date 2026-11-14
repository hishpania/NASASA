using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Neosphere.Domain.Entities;

namespace Neosphere.Infrastructure.Data.Configurations;

public class TerritoryConfiguration : IEntityTypeConfiguration<Territory>
{
    public const int MaxNameLength = 200;
    public const int MaxModeLength = 16;

    public void Configure(EntityTypeBuilder<Territory> builder)
    {
        builder.Property(territory => territory.Name).HasMaxLength(MaxNameLength).IsRequired();
        builder.Property(territory => territory.Mode).HasConversion<string>().HasMaxLength(MaxModeLength);

        builder.ComplexProperty(territory => territory.Center);
        builder.ComplexCollection(territory => territory.Points, points => points.ToJson());
        builder.ComplexProperty(territory => territory.Place, place => place.ToJson());

        builder.HasOne(territory => territory.Owner)
            .WithMany(user => user.Territories)
            .HasForeignKey(territory => territory.OwnerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(territory => territory.OwnerId);
    }
}
