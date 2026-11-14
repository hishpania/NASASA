using Neosphere.Application.Common.Security;
using Neosphere.Application.Fields.Models;
using Neosphere.Domain.Enums;

namespace Neosphere.Application.Fields.Commands.UpdateField;

[Authorize]
public sealed record UpdateFieldCommand(
    int Id,
    string Name,
    ShapeMode Mode,
    double AreaHectares,
    double? RadiusMeters,
    LatLngDto Center,
    IReadOnlyList<LatLngDto> Points,
    PlaceDto? Place) : IRequest<FieldDto>, IFieldPayload;

public sealed class UpdateFieldCommandValidator : AbstractValidator<UpdateFieldCommand>
{
    public UpdateFieldCommandValidator()
    {
        Include(new FieldPayloadValidator());
    }
}

public sealed class UpdateFieldCommandHandler(IApplicationDbContext context, IUser currentUser)
    : IRequestHandler<UpdateFieldCommand, FieldDto>
{
    public async Task<FieldDto> Handle(UpdateFieldCommand request, CancellationToken cancellationToken)
    {
        var field = await context.Fields.GetOwnedAsync(request.Id, currentUser.RequireId(), cancellationToken);

        field.Apply(request);
        await context.SaveChangesAsync(cancellationToken);

        return field.ToDto();
    }
}
