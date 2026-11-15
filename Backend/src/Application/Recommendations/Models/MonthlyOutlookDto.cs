namespace Neosphere.Application.Recommendations.Models;

public sealed record MonthlyOutlookDto(
    string Status,
    DateTimeOffset? StartedAt,
    string? ForecastDate,
    IReadOnlyList<OutlookSeriesDto> Series);

public sealed record OutlookSeriesDto(
    string Id,
    string Name,
    string Units,
    string BelowLabel,
    string AboveLabel,
    IReadOnlyList<OutlookMonthDto> Months);

public sealed record OutlookMonthDto(
    string Month,
    int Lead,
    double Below,
    double Near,
    double Above,
    double NormalLow,
    double NormalHigh,
    string Confidence,
    double Skill,
    double HitRate);
