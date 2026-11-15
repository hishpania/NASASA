using Neosphere.Application.Recommendations.Models;

namespace Neosphere.Application.Common.Interfaces;

public interface ICropAdvisor
{
    Task<CropAdviceDto> GetAdviceAsync(CropAdviceRequest request, CancellationToken cancellationToken);

    Task<ClimateForecastDto> GetForecastAsync(double latitude, double longitude, CancellationToken cancellationToken);
}
