namespace Neosphere.Application.Recommendations.Models;

public sealed record CropAdviceDto(
    AdviceProviderDto Provider,
    double Latitude,
    double Longitude,
    bool Irrigated,
    ClimateSummaryDto Climate,
    SoilSummaryDto? Soil,
    IReadOnlyList<SeasonDto> History,
    IReadOnlyList<CropRecommendationDto> Recommendations,
    IReadOnlyList<RotationStrategyDto> Strategies,
    IReadOnlyList<string> Gaps,
    IReadOnlyList<LandUseDto> LandUses);

/// <param name="Kind"><c>model</c> when learned from observed crop sequences, <c>rules</c> for agronomic rules only.</param>
public sealed record AdviceProviderDto(string Id, string Name, string Kind, string Description);

public sealed record LandUseDto(string Id, string Name);

public sealed record ClimateSummaryDto(
    double GrowingDegreeDays,
    int GrowingDays,
    double SeasonTemperature,
    double SeasonPrecipitation,
    double AnnualPrecipitation,
    double? SoilWetness,
    double? RecordLow,
    string Source);

public sealed record SoilSummaryDto(
    string Name,
    string? Drainage,
    double? Ph,
    double? OrganicMatter,
    double? Clay,
    double? Sand,
    string Source);

/// <param name="Origin"><c>observed</c> by satellite classification or <c>reported</c> by the user.</param>
public sealed record SeasonDto(int? Year, LandUseDto LandUse, string Origin);

/// <summary>Dates of an average year as <c>MM-DD</c>.</summary>
public sealed record SowingDatesDto(string Start, string End, string Maturity);

public sealed record CropRecommendationDto(
    LandUseDto Crop,
    double Score,
    double Suitability,
    double? Probability,
    SowingDatesDto? Sowing,
    IReadOnlyList<string> Reasons,
    IReadOnlyList<string> Cautions);

/// <summary>Scores from 0 to 1, higher is better.</summary>
public sealed record StrategyIndicatorsDto(
    double ClimateFit,
    double WaterBalance,
    double Nitrogen,
    double Diversity,
    double PestBreak,
    double SoilCover);

public sealed record RotationStrategyDto(
    string Id,
    string Name,
    bool IsCurrent,
    IReadOnlyList<LandUseDto> Sequence,
    string Summary,
    IReadOnlyList<string> Evidence,
    IReadOnlyList<string> Benefits,
    IReadOnlyList<string> Risks,
    StrategyIndicatorsDto Indicators);
