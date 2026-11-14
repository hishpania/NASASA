namespace Neosphere.Domain.Entities;

public class User : BaseAuditableEntity
{
    public required string Email { get; set; }

    public required string PasswordHash { get; set; }

    public ICollection<Territory> Territories { get; } = [];
}
