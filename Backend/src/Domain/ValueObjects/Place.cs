namespace Neosphere.Domain.ValueObjects;

public sealed class Place : ValueObject
{
    public required string ExternalId { get; init; }

    public required string Name { get; init; }

    public string? Description { get; init; }

    public required GeoPoint Point { get; init; }

    public GeoBounds? Bounds { get; init; }

    public required Address Address { get; init; }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return ExternalId;
        yield return Name;
        yield return Description;
        yield return Point;
        yield return Bounds;
        yield return Address;
    }
}
