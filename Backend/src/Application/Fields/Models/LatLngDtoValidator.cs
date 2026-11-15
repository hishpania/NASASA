namespace Neosphere.Application.Fields.Models;

public sealed class LatLngDtoValidator : AbstractValidator<LatLngDto>
{
    public LatLngDtoValidator()
    {
        RuleFor(point => point.Lat).InclusiveBetween(-90, 90);
        RuleFor(point => point.Lng).InclusiveBetween(-180, 180);
    }
}
