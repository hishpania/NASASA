using Neosphere.Application.Auth.Models;

namespace Neosphere.Application.Auth.Commands.Register;

public sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public const int MinPasswordLength = 6;
    public const int MaxEmailLength = 256;

    private readonly IApplicationDbContext _context;

    public RegisterCommandValidator(IApplicationDbContext context)
    {
        _context = context;

        RuleFor(command => command.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(MaxEmailLength)
            .MustAsync(BeUnusedEmail)
                .WithMessage("'{PropertyName}' is already registered.")
                .WithErrorCode("Unique");

        RuleFor(command => command.Password)
            .NotEmpty()
            .MinimumLength(MinPasswordLength);
    }

    private async Task<bool> BeUnusedEmail(string email, CancellationToken cancellationToken)
    {
        var normalizedEmail = EmailNormalizer.Normalize(email);

        return !await _context.Users.AnyAsync(user => user.Email == normalizedEmail, cancellationToken);
    }
}
