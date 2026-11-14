using Neosphere.Application.Auth.Models;

namespace Neosphere.Application.Auth.Commands.Register;

public sealed record RegisterCommand(string Email, string Password) : IRequest<AuthResult>;

public sealed class RegisterCommandHandler(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    ITokenService tokenService) : IRequestHandler<RegisterCommand, AuthResult>
{
    public async Task<AuthResult> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var user = new User
        {
            Email = EmailNormalizer.Normalize(request.Email),
            PasswordHash = passwordHasher.Hash(request.Password)
        };

        context.Users.Add(user);
        await context.SaveChangesAsync(cancellationToken);

        var token = tokenService.Issue(user);

        return new AuthResult(token.Value, token.ExpiresAt, UserDto.From(user));
    }
}
