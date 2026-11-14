using Neosphere.Application.Common.Security;
using Neosphere.Application.Territories.Models;
using Neosphere.Domain.Enums;

namespace Neosphere.Application.Territories.Commands.UpdateTerritory;

[Authorize]
public sealed record UpdateTerritoryCommand(
    int Id,
    string Name,
    TerritoryMode Mode,
    double AreaHectares,
    double? RadiusMeters,
    LatLngDto Center,
    IReadOnlyList<LatLngDto> Points,
    PlaceDto? Place) : IRequest<TerritoryDto>, ITerritoryPayload;

public sealed class UpdateTerritoryCommandValidator : AbstractValidator<UpdateTerritoryCommand>
{
    public UpdateTerritoryCommandValidator()
    {
        Include(new TerritoryPayloadValidator());
    }
}

public sealed class UpdateTerritoryCommandHandler(IApplicationDbContext context, IUser currentUser)
    : IRequestHandler<UpdateTerritoryCommand, TerritoryDto>
{
    public async Task<TerritoryDto> Handle(UpdateTerritoryCommand request, CancellationToken cancellationToken)
    {
        var territory = await context.Territories.GetOwnedAsync(request.Id, currentUser.RequireId(), cancellationToken);

        territory.Apply(request);
        await context.SaveChangesAsync(cancellationToken);

        return territory.ToDto();
    }
}
