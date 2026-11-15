namespace Neosphere.Domain.ValueObjects;

public sealed class Address : ValueObject
{
    public string? District { get; init; }

    public string? City { get; init; }

    public string? County { get; init; }

    public string? State { get; init; }

    public string? Country { get; init; }

    public string? CountryCode { get; init; }

    public string? Postcode { get; init; }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return District;
        yield return City;
        yield return County;
        yield return State;
        yield return Country;
        yield return CountryCode;
        yield return Postcode;
    }
}
