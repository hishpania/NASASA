namespace Neosphere.Application.Territories.Models;

public sealed record PlaceDto(
    string Id,
    string Name,
    string? Description,
    LatLngDto Point,
    BoundsDto? Bounds,
    AddressDto Address);
