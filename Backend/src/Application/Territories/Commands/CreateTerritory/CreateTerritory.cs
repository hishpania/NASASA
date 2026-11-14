using Neosphere.Application.Common.Security;
using Neosphere.Application.Territories.Models;
using Neosphere.Domain.Enums;

namespace Neosphere.Application.Territories.Commands.CreateTerritory;

[Authorize]
public sealed record CreateTerritoryCommand(
    string Name,
    TerritoryMode Mode,
    double AreaHectares,
    double? RadiusMeters,
    LatLngDto Center,
    IReadOnlyList<LatLngDto> Points,
    PlaceDto? Place) : IRequest<TerritoryDto>, ITerritoryPayload;

public sealed class CreateTerritoryCommandValidator : AbstractValidator<CreateTerritoryCommand>
{
    public CreateTerritoryCommandValidator()
    {
        Include(new TerritoryPayloadValidator());
    }
}

public sealed class CreateTerritoryCommandHandler(IApplicationDbContext context, IUser currentUser)
    : IRequestHandler<CreateTerritoryCommand, TerritoryDto>
{
    public async Task<TerritoryDto> Handle(CreateTerritoryCommand request, CancellationToken cancellationToken)
    {
        var territory = new Territory
        {
            OwnerId = currentUser.RequireId(),
            Name = request.Name
        };
        territory.Apply(request);

        context.Territories.Add(territory);
        await context.SaveChangesAsync(cancellationToken);

        return territory.ToDto();
    }
}
