using Neosphere.Domain.Enums;

namespace Neosphere.Application.Territories.Models;

public interface ITerritoryPayload
{
    string Name { get; }

    TerritoryMode Mode { get; }

    double AreaHectares { get; }

    double? RadiusMeters { get; }

    LatLngDto Center { get; }

    IReadOnlyList<LatLngDto> Points { get; }

    PlaceDto? Place { get; }
}
