namespace Neosphere.Domain.ValueObjects;

public sealed class GeoBounds : ValueObject
{
    public GeoBounds(double south, double west, double north, double east)
    {
        South = south;
        West = west;
        North = north;
        East = east;
    }

    public double South { get; private set; }

    public double West { get; private set; }

    public double North { get; private set; }

    public double East { get; private set; }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return South;
        yield return West;
        yield return North;
        yield return East;
    }
}
