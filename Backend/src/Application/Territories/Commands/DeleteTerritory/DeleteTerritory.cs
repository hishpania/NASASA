using Neosphere.Application.Common.Security;
using Neosphere.Application.Territories.Models;

namespace Neosphere.Application.Territories.Commands.DeleteTerritory;

[Authorize]
public sealed record DeleteTerritoryCommand(int Id) : IRequest;

public sealed class DeleteTerritoryCommandHandler(IApplicationDbContext context, IUser currentUser)
    : IRequestHandler<DeleteTerritoryCommand>
{
    public async Task Handle(DeleteTerritoryCommand request, CancellationToken cancellationToken)
    {
        var territory = await context.Territories.GetOwnedAsync(request.Id, currentUser.RequireId(), cancellationToken);

        context.Territories.Remove(territory);
        await context.SaveChangesAsync(cancellationToken);
    }
}
