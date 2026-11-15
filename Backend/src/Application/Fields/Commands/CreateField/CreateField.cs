using Neosphere.Application.Common.Security;
using Neosphere.Application.Fields.Models;
using Neosphere.Domain.Enums;

namespace Neosphere.Application.Fields.Commands.CreateField;

[Authorize]
public sealed record CreateFieldCommand(
    string Name,
    ShapeMode Mode,
    double AreaHectares,
    double? RadiusMeters,
    LatLngDto Center,
    IReadOnlyList<LatLngDto> Points,
    PlaceDto? Place) : IRequest<FieldDto>, IFieldPayload;

public sealed class CreateFieldCommandValidator : AbstractValidator<CreateFieldCommand>
{
    public CreateFieldCommandValidator()
    {
        Include(new FieldPayloadValidator());
    }
}

public sealed class CreateFieldCommandHandler(IApplicationDbContext context, IUser currentUser)
    : IRequestHandler<CreateFieldCommand, FieldDto>
{
    public async Task<FieldDto> Handle(CreateFieldCommand request, CancellationToken cancellationToken)
    {
        var field = new Field
        {
            OwnerId = currentUser.RequireId(),
            Name = request.Name
        };
        field.Apply(request);

        context.Fields.Add(field);
        await context.SaveChangesAsync(cancellationToken);

        return field.ToDto();
    }
}
