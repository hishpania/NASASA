using Neosphere.Application.Territories.Commands.DeleteTerritory;
using Neosphere.Application.Territories.Commands.UpdateTerritory;
using Neosphere.Domain.Entities;
using Neosphere.Domain.Enums;

namespace Neosphere.Application.FunctionalTests.Territories;

public class UpdateTerritoryTests : TestBase
{
    [Test]
    public async Task ShouldReshapePolygonIntoRadius()
    {
        await TestApp.RunAsDefaultUserAsync();
        var created = await TestApp.SendAsync(TerritoryFactory.Polygon());

        var radius = TerritoryFactory.Radius("Renamed");
        var updated = await TestApp.SendAsync(new UpdateTerritoryCommand(
            created.Id, radius.Name, radius.Mode, radius.AreaHectares, radius.RadiusMeters, radius.Center, radius.Points, null));

        updated.Name.ShouldBe("Renamed");
        updated.Mode.ShouldBe(TerritoryMode.Radius);
        updated.Points.Count.ShouldBe(1);
        updated.Place.ShouldBeNull();
    }

    [Test]
    public async Task ShouldNotUpdateTerritoryOfAnotherUser()
    {
        await TestApp.RunAsUserAsync("owner@local", "Owner1234!");
        var created = await TestApp.SendAsync(TerritoryFactory.Polygon());

        await TestApp.RunAsUserAsync("intruder@local", "Intruder1234!");
        var polygon = TerritoryFactory.Polygon("Stolen");

        await Should.ThrowAsync<NotFoundException>(() => TestApp.SendAsync(new UpdateTerritoryCommand(
            created.Id, polygon.Name, polygon.Mode, polygon.AreaHectares, polygon.RadiusMeters, polygon.Center, polygon.Points, polygon.Place)));
    }

    [Test]
    public async Task ShouldDeleteOwnTerritory()
    {
        await TestApp.RunAsDefaultUserAsync();
        var created = await TestApp.SendAsync(TerritoryFactory.Radius());

        await TestApp.SendAsync(new DeleteTerritoryCommand(created.Id));

        (await TestApp.FindAsync<Territory>(created.Id)).ShouldBeNull();
    }
}
