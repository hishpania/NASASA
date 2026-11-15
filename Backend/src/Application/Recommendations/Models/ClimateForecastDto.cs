namespace Neosphere.Application.Recommendations.Models;

public sealed record ClimateForecastDto(
    double Latitude,
    double Longitude,
    string LastObserved,
    string Source,
    IReadOnlyList<ForecastSeriesDto> Series);

public sealed record ForecastSeriesDto(
    string Id,
    string Name,
    string Unit,
    IReadOnlyList<ForecastPointDto> History,
    IReadOnlyList<ForecastPointDto> Forecast,
    IReadOnlyList<ForecastSkillDto> Skill,
    ForecastSeasonDto Season);

public sealed record ForecastPointDto(
    string Month,
    double Value,
    double Normal,
    double? Low,
    double? High,
    string? Method);

public sealed record ForecastSkillDto(int Horizon, double ModelError, double NormalError, string Method);

public sealed record ForecastSeasonDto(
    string Start,
    string End,
    int Below,
    int Near,
    int Above,
    double Lower,
    double Upper,
    string Method);
