using Neosphere.Application.Common.Security;
using Neosphere.Application.Fields.Models;
using Neosphere.Application.Recommendations.Models;

namespace Neosphere.Application.Recommendations.Queries.GetFieldRecommendations;

[Authorize]
public sealed record GetFieldRecommendationsQuery(int FieldId, IReadOnlyList<string> PreviousCrops, bool Irrigated)
    : IRequest<CropAdviceDto>;

public sealed class GetFieldRecommendationsQueryValidator : AbstractValidator<GetFieldRecommendationsQuery>
{
    public const int MaxPreviousCrops = 5;

    public GetFieldRecommendationsQueryValidator()
    {
        RuleFor(query => query.PreviousCrops)
            .Must(crops => crops.Count <= MaxPreviousCrops)
            .WithMessage($"At most {MaxPreviousCrops} previous crops can be reported.");

        RuleForEach(query => query.PreviousCrops)
            .Matches("^[a-z_]{1,32}$")
            .WithMessage("A previous crop must be a land use identifier such as 'winter_wheat'.");
    }
}

public sealed class GetFieldRecommendationsQueryHandler(
    IApplicationDbContext context,
    IUser currentUser,
    ICropAdvisor cropAdvisor)
    : IRequestHandler<GetFieldRecommendationsQuery, CropAdviceDto>
{
    public async Task<CropAdviceDto> Handle(GetFieldRecommendationsQuery request, CancellationToken cancellationToken)
    {
        var field = await context.Fields.GetOwnedAsync(request.FieldId, currentUser.RequireId(), cancellationToken);

        return await cropAdvisor.GetAdviceAsync(
            new CropAdviceRequest(field.Center.Latitude, field.Center.Longitude, request.PreviousCrops, request.Irrigated),
            cancellationToken);
    }
}
