using Neosphere.Domain.Enums;
using Neosphere.Domain.ValueObjects;

namespace Neosphere.Application.Territories.Models;

public static class TerritoryMapping
{
    public static void Apply(this Territory territory, ITerritoryPayload payload)
    {
        territory.Name = payload.Name.Trim();
        territory.Place = payload.Place?.ToDomain();

        var center = payload.Center.ToDomain();

        if (payload.Mode == TerritoryMode.Radius)
        {
            territory.ShapeAsRadius(center, payload.RadiusMeters!.Value, payload.AreaHectares);
        }
        else
        {
            territory.ShapeAsPolygon([.. payload.Points.Select(ToDomain)], center, payload.AreaHectares);
        }
    }

    public static TerritoryDto ToDto(this Territory territory) => new(
        territory.Id,
        territory.Name,
        territory.Mode,
        territory.AreaHectares,
        territory.RadiusMeters,
        territory.Center.ToDto(),
        [.. territory.Points.Select(ToDto)],
        territory.Place?.ToDto(),
        territory.Created,
        territory.LastModified);

    private static GeoPoint ToDomain(this LatLngDto point) => new(point.Lat, point.Lng);

    private static LatLngDto ToDto(this GeoPoint point) => new(point.Latitude, point.Longitude);

    private static Place ToDomain(this PlaceDto place) => new()
    {
        ExternalId = place.Id,
        Name = place.Name,
        Description = place.Description,
        Point = place.Point.ToDomain(),
        Bounds = place.Bounds is { } bounds ? new GeoBounds(bounds.South, bounds.West, bounds.North, bounds.East) : null,
        Address = new Address
        {
            District = place.Address.District,
            City = place.Address.City,
            County = place.Address.County,
            State = place.Address.State,
            Country = place.Address.Country,
            CountryCode = place.Address.CountryCode,
            Postcode = place.Address.Postcode
        }
    };

    private static PlaceDto ToDto(this Place place) => new(
        place.ExternalId,
        place.Name,
        place.Description,
        place.Point.ToDto(),
        place.Bounds is { } bounds ? new BoundsDto(bounds.South, bounds.West, bounds.North, bounds.East) : null,
        new AddressDto(
            place.Address.District,
            place.Address.City,
            place.Address.County,
            place.Address.State,
            place.Address.Country,
            place.Address.CountryCode,
            place.Address.Postcode));
}
