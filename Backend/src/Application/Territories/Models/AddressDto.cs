namespace Neosphere.Application.Territories.Models;

public sealed record AddressDto(
    string? District,
    string? City,
    string? County,
    string? State,
    string? Country,
    string? CountryCode,
    string? Postcode);
