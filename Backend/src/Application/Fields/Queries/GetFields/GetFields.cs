using Neosphere.Application.Common.Security;
using Neosphere.Application.Fields.Models;

namespace Neosphere.Application.Fields.Queries.GetFields;

[Authorize]
public sealed record GetFieldsQuery : IRequest<IReadOnlyList<FieldDto>>;

public sealed class GetFieldsQueryHandler(IApplicationDbContext context, IUser currentUser)
    : IRequestHandler<GetFieldsQuery, IReadOnlyList<FieldDto>>
{
    public async Task<IReadOnlyList<FieldDto>> Handle(GetFieldsQuery request, CancellationToken cancellationToken)
    {
        var ownerId = currentUser.RequireId();

        var fields = await context.Fields
            .AsNoTracking()
            .Where(field => field.OwnerId == ownerId)
            .OrderBy(field => field.Created)
            .ToListAsync(cancellationToken);

        return [.. fields.Select(field => field.ToDto())];
    }
}
