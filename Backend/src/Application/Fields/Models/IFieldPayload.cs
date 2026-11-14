using Neosphere.Domain.Enums;

namespace Neosphere.Application.Fields.Models;

public interface IFieldPayload
{
    string Name { get; }

    ShapeMode Mode { get; }

    double AreaHectares { get; }

    double? RadiusMeters { get; }

    LatLngDto Center { get; }

    IReadOnlyList<LatLngDto> Points { get; }

    PlaceDto? Place { get; }
}
