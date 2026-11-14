namespace Neosphere.Domain.Entities;

public class Territory : BaseAuditableEntity
{
    public const int MinPolygonVertices = 3;

    public int OwnerId { get; set; }

    public User? Owner { get; set; }

    public required string Name { get; set; }

    public TerritoryMode Mode { get; private set; }

    public double AreaHectares { get; private set; }

    public double? RadiusMeters { get; private set; }

    public GeoPoint Center { get; private set; } = null!;

    public List<GeoPoint> Points { get; private set; } = [];

    public Place? Place { get; set; }

    public void ShapeAsPolygon(IReadOnlyCollection<GeoPoint> vertices, GeoPoint center, double areaHectares)
    {
        if (vertices.Count < MinPolygonVertices)
        {
            throw new ArgumentException($"A polygon needs at least {MinPolygonVertices} vertices.", nameof(vertices));
        }

        Mode = TerritoryMode.Polygon;
        Points = [.. vertices];
        Center = center;
        RadiusMeters = null;
        AreaHectares = areaHectares;
    }

    public void ShapeAsRadius(GeoPoint origin, double radiusMeters, double areaHectares)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(radiusMeters);

        Mode = TerritoryMode.Radius;
        Points = [origin];
        Center = origin;
        RadiusMeters = radiusMeters;
        AreaHectares = areaHectares;
    }
}
