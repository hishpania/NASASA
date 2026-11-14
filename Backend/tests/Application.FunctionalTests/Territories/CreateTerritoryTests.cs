using Neosphere.Application.Common.Exceptions;
using Neosphere.Application.Territories.Queries.GetTerritories;
using Neosphere.Domain.Entities;
using Neosphere.Domain.Enums;

namespace Neosphere.Application.FunctionalTests.Territories;

public class CreateTerritoryTests : TestBase
{
    [Test]
    public async Task ShouldRequireAuthenticatedUser()
    {
        await Should.ThrowAsync<UnauthorizedAccessException>(() => TestApp.SendAsync(TerritoryFactory.Polygon()));
    }

    [Test]
    public async Task ShouldRejectPolygonWithTooFewPoints()
    {
        await TestApp.RunAsDefaultUserAsync();

        var command = TerritoryFactory.Polygon() with { Points = [new(49.0, 31.0), new(49.1, 31.0)] };

        await Should.ThrowAsync<ValidationException>(() => TestApp.SendAsync(command));
    }

    [Test]
    public async Task ShouldPersistPolygonWithPlace()
    {
        var userId = await TestApp.RunAsDefaultUserAsync();

        var created = await TestApp.SendAsync(TerritoryFactory.Polygon());

        var territory = await TestApp.FindAsync<Territory>(created.Id);
        territory.ShouldNotBeNull();
        territory.OwnerId.ShouldBe(userId);
        territory.CreatedBy.ShouldBe(userId);
        territory.Mode.ShouldBe(TerritoryMode.Polygon);
        territory.Points.Count.ShouldBe(4);
        territory.Place.ShouldNotBeNull();
        territory.Place.Address.City.ShouldBe("Bila Tserkva");
        territory.Place.Bounds.ShouldNotBeNull();
    }

    [Test]
    public async Task ShouldPersistRadiusWithOriginAsOnlyPoint()
    {
        await TestApp.RunAsDefaultUserAsync();

        var created = await TestApp.SendAsync(TerritoryFactory.Radius());

        created.Mode.ShouldBe(TerritoryMode.Radius);
        created.RadiusMeters.ShouldBe(1000);
        created.Points.ShouldBe([TerritoryFactory.Center]);
        created.Place.ShouldBeNull();
    }

    [Test]
    public async Task ShouldOnlyListTerritoriesOfCurrentUser()
    {
        await TestApp.RunAsUserAsync("owner@local", "Owner1234!");
        await TestApp.SendAsync(TerritoryFactory.Polygon("Owner field"));

        await TestApp.RunAsUserAsync("other@local", "Other1234!");
        await TestApp.SendAsync(TerritoryFactory.Radius("Other well"));

        var territories = await TestApp.SendAsync(new GetTerritoriesQuery());

        territories.Select(territory => territory.Name).ShouldBe(["Other well"]);
    }
}
