using Neosphere.Domain.Enums;

namespace Neosphere.Application.Territories.Models;

public sealed record TerritoryDto(
    int Id,
    string Name,
    TerritoryMode Mode,
    double AreaHectares,
    double? RadiusMeters,
    LatLngDto Center,
    IReadOnlyList<LatLngDto> Points,
    PlaceDto? Place,
    DateTimeOffset Created,
    DateTimeOffset LastModified);
