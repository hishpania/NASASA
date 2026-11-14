using Neosphere.Domain.Entities;
using Neosphere.Domain.Enums;
using Neosphere.Domain.ValueObjects;
using NUnit.Framework;
using Shouldly;

namespace Neosphere.Domain.UnitTests.Entities;

public class TerritoryTests
{
    private static readonly GeoPoint Origin = new(49.0, 31.4);

    [Test]
    public void ShapeAsPolygonShouldStoreVerticesAndClearRadius()
    {
        var territory = new Territory { Name = "Field" };
        territory.ShapeAsRadius(Origin, 500, 78.5);

        territory.ShapeAsPolygon([new(49.0, 31.0), new(49.1, 31.0), new(49.1, 31.1)], Origin, 12.3);

        territory.Mode.ShouldBe(TerritoryMode.Polygon);
        territory.Points.Count.ShouldBe(3);
        territory.RadiusMeters.ShouldBeNull();
        territory.AreaHectares.ShouldBe(12.3);
    }

    [Test]
    public void ShapeAsPolygonShouldRejectTooFewVertices()
    {
        var territory = new Territory { Name = "Field" };

        Should.Throw<ArgumentException>(() =>
            territory.ShapeAsPolygon([new(49.0, 31.0), new(49.1, 31.0)], Origin, 1));
    }

    [Test]
    public void ShapeAsRadiusShouldUseOriginAsCenterAndSinglePoint()
    {
        var territory = new Territory { Name = "Field" };

        territory.ShapeAsRadius(Origin, 1000, 314.16);

        territory.Mode.ShouldBe(TerritoryMode.Radius);
        territory.Center.ShouldBe(Origin);
        territory.Points.ShouldBe([Origin]);
        territory.RadiusMeters.ShouldBe(1000);
    }

    [Test]
    public void ShapeAsRadiusShouldRejectNonPositiveRadius()
    {
        var territory = new Territory { Name = "Field" };

        Should.Throw<ArgumentOutOfRangeException>(() => territory.ShapeAsRadius(Origin, 0, 0));
    }
}
