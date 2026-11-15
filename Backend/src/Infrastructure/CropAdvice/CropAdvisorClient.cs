using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http.Extensions;
using Neosphere.Application.Common.Exceptions;
using Neosphere.Application.Common.Interfaces;
using Neosphere.Application.Recommendations.Models;

namespace Neosphere.Infrastructure.CropAdvice;

/// <summary>
/// Talks to the Python crop advisor service (<c>Model/crop_advisor</c>), which hosts the rotation model
/// and the agro-climatic rules.
/// </summary>
internal sealed class CropAdvisorClient(HttpClient http) : ICropAdvisor
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public async Task<CropAdviceDto> GetAdviceAsync(CropAdviceRequest request, CancellationToken cancellationToken)
    {
        var query = new QueryBuilder
        {
            { "latitude", request.Latitude.ToString("R", CultureInfo.InvariantCulture) },
            { "longitude", request.Longitude.ToString("R", CultureInfo.InvariantCulture) },
            { "irrigated", request.Irrigated ? "true" : "false" }
        };

        if (request.PreviousCrops.Count > 0)
        {
            query.Add("previousCrops", string.Join(',', request.PreviousCrops));
        }

        try
        {
            using var response = await http.GetAsync($"advice{query.ToQueryString()}", cancellationToken);

            if (response.StatusCode == HttpStatusCode.UnprocessableEntity)
            {
                var problem = await response.Content.ReadFromJsonAsync<AdvisorProblem>(SerializerOptions, cancellationToken);
                throw new ValidationException(
                    [new ValidationFailure(nameof(request.PreviousCrops), problem?.Detail ?? "The request was rejected.")]);
            }

            response.EnsureSuccessStatusCode();

            return await response.Content.ReadFromJsonAsync<CropAdviceDto>(SerializerOptions, cancellationToken)
                ?? throw new CropAdvisorUnavailableException("The crop advisor returned an empty response.");
        }
        catch (Exception exception) when (exception is not ValidationException
                                              and not CropAdvisorUnavailableException
                                          && !cancellationToken.IsCancellationRequested)
        {
            throw new CropAdvisorUnavailableException("The crop advisor service did not answer.", exception);
        }
    }

    public Task<ClimateForecastDto> GetForecastAsync(double latitude, double longitude, CancellationToken cancellationToken) =>
        GetAtPointAsync<ClimateForecastDto>("forecast", latitude, longitude, cancellationToken);

    public Task<MonthlyOutlookDto> GetOutlookAsync(double latitude, double longitude, CancellationToken cancellationToken) =>
        GetAtPointAsync<MonthlyOutlookDto>("outlook", latitude, longitude, cancellationToken);

    private async Task<T> GetAtPointAsync<T>(
        string path,
        double latitude,
        double longitude,
        CancellationToken cancellationToken)
    {
        var query = new QueryBuilder
        {
            { "latitude", latitude.ToString("R", CultureInfo.InvariantCulture) },
            { "longitude", longitude.ToString("R", CultureInfo.InvariantCulture) }
        };

        try
        {
            using var response = await http.GetAsync($"{path}{query.ToQueryString()}", cancellationToken);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadFromJsonAsync<T>(SerializerOptions, cancellationToken)
                ?? throw new CropAdvisorUnavailableException($"The crop advisor returned an empty {path}.");
        }
        catch (Exception exception) when (exception is not CropAdvisorUnavailableException
                                          && !cancellationToken.IsCancellationRequested)
        {
            throw new CropAdvisorUnavailableException("The crop advisor service did not answer.", exception);
        }
    }

    private sealed record AdvisorProblem(string? Detail);
}
