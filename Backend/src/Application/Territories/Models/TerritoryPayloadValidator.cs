using Neosphere.Domain.Enums;

namespace Neosphere.Application.Territories.Models;

public sealed class TerritoryPayloadValidator : AbstractValidator<ITerritoryPayload>
{
    public const int MaxNameLength = 200;
    public const int MaxPolygonVertices = 1000;

    public TerritoryPayloadValidator()
    {
        RuleFor(payload => payload.Name).NotEmpty().MaximumLength(MaxNameLength);
        RuleFor(payload => payload.Mode).IsInEnum();
        RuleFor(payload => payload.AreaHectares).GreaterThan(0);
        RuleFor(payload => payload.Center).NotNull().SetValidator(new LatLngDtoValidator());
        RuleFor(payload => payload.Points).NotNull();
        RuleForEach(payload => payload.Points).SetValidator(new LatLngDtoValidator());

        When(payload => payload.Mode == TerritoryMode.Polygon, () =>
        {
            RuleFor(payload => payload.Points.Count)
                .InclusiveBetween(Territory.MinPolygonVertices, MaxPolygonVertices)
                .OverridePropertyName(nameof(ITerritoryPayload.Points));
            RuleFor(payload => payload.RadiusMeters).Null();
        });

        When(payload => payload.Mode == TerritoryMode.Radius, () =>
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
