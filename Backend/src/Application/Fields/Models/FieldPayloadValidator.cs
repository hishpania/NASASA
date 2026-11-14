using Neosphere.Domain.Enums;

namespace Neosphere.Application.Fields.Models;

public sealed class FieldPayloadValidator : AbstractValidator<IFieldPayload>
{
    public const int MaxNameLength = 200;
    public const int MaxPolygonVertices = 1000;

    public FieldPayloadValidator()
    {
        RuleFor(payload => payload.Name).NotEmpty().MaximumLength(MaxNameLength);
        RuleFor(payload => payload.Mode).IsInEnum();
        RuleFor(payload => payload.AreaHectares).GreaterThan(0);
        RuleFor(payload => payload.Center).NotNull().SetValidator(new LatLngDtoValidator());
        RuleFor(payload => payload.Points).NotNull();
        RuleForEach(payload => payload.Points).SetValidator(new LatLngDtoValidator());

        When(payload => payload.Mode == ShapeMode.Polygon, () =>
        {
            RuleFor(payload => payload.Points.Count)
                .InclusiveBetween(Field.MinPolygonVertices, MaxPolygonVertices)
                .OverridePropertyName(nameof(IFieldPayload.Points));
            RuleFor(payload => payload.RadiusMeters).Null();
        });

        When(payload => payload.Mode == ShapeMode.Radius, () =>
        {
            RuleFor(payload => payload.RadiusMeters).NotNull().GreaterThan(0);
        });

        When(payload => payload.Place is not null, () =>
        {
            RuleFor(payload => payload.Place!.Id).NotEmpty();
            RuleFor(payload => payload.Place!.Name).NotEmpty();
            RuleFor(payload => payload.Place!.Point).NotNull().SetValidator(new LatLngDtoValidator());
        });
    }
}
