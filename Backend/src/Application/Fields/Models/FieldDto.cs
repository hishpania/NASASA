using Neosphere.Domain.Enums;

namespace Neosphere.Application.Fields.Models;

public sealed record FieldDto(
    int Id,
    string Name,
    ShapeMode Mode,
    double AreaHectares,
    double? RadiusMeters,
    LatLngDto Center,
    IReadOnlyList<LatLngDto> Points,
    PlaceDto? Place,
    DateTimeOffset Created,
    DateTimeOffset LastModified);
