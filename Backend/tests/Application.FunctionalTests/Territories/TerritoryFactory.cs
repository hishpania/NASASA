using Neosphere.Application.Territories.Commands.CreateTerritory;
using Neosphere.Application.Territories.Models;
using Neosphere.Domain.Enums;

namespace Neosphere.Application.FunctionalTests.Territories;

internal static class TerritoryFactory
{
    public static readonly LatLngDto Center = new(49.05, 31.05);

    public static readonly PlaceDto Place = new(
        "osm:N1",
        "Bila Tserkva",
        "Kyiv Oblast, Ukraine",
        new LatLngDto(49.8, 30.11),
        new BoundsDto(49.7, 30.0, 49.9, 30.2),
        new AddressDto(null, "Bila Tserkva", null, "Kyiv Oblast", "Ukraine", "UA", "09100"));

    public static CreateTerritoryCommand Polygon(string name = "North field") => new(
        name,
        TerritoryMode.Polygon,
        42.5,
        null,
        Center,
        [new(49.0, 31.0), new(49.1, 31.0), new(49.1, 31.1), new(49.0, 31.1)],
        Place);

    public static CreateTerritoryCommand Radius(string name = "Well") => new(
        name,
        TerritoryMode.Radius,
        314.1593,
        1000,
        Center,
        [],
        null);
}
