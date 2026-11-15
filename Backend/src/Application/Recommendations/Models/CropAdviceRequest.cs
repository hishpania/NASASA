namespace Neosphere.Application.Recommendations.Models;

/// <param name="PreviousCrops">Land uses the user reports for the field, most recent season first.</param>
public sealed record CropAdviceRequest(
    double Latitude,
    double Longitude,
    IReadOnlyList<string> PreviousCrops,
    bool Irrigated);
