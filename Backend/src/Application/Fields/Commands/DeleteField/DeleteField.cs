using Neosphere.Application.Common.Security;
using Neosphere.Application.Fields.Models;

namespace Neosphere.Application.Fields.Commands.DeleteField;

[Authorize]
public sealed record DeleteFieldCommand(int Id) : IRequest;

public sealed class DeleteFieldCommandHandler(IApplicationDbContext context, IUser currentUser)
    : IRequestHandler<DeleteFieldCommand>
{
    public async Task Handle(DeleteFieldCommand request, CancellationToken cancellationToken)
    {
        var field = await context.Fields.GetOwnedAsync(request.Id, currentUser.RequireId(), cancellationToken);

        context.Fields.Remove(field);
        await context.SaveChangesAsync(cancellationToken);
    }
}
