using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Neosphere.Application.Auth.Commands.Login;
using Neosphere.Application.Auth.Commands.Register;
using Neosphere.Application.Auth.Models;
using Neosphere.Application.Auth.Queries.GetCurrentUser;

namespace Neosphere.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class AuthController(ISender sender) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    [EndpointSummary("Register")]
    [EndpointDescription("Creates an account and returns an access token.")]
    [ProducesResponseType<AuthResult>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResult>> Register(RegisterCommand command, CancellationToken cancellationToken) =>
        await sender.Send(command, cancellationToken);

    [HttpPost("login")]
    [AllowAnonymous]
    [EndpointSummary("Log in")]
    [EndpointDescription("Exchanges an email and password for an access token.")]
    [ProducesResponseType<AuthResult>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResult>> Login(LoginCommand command, CancellationToken cancellationToken) =>
        await sender.Send(command, cancellationToken);

    [HttpGet("me")]
    [Authorize]
    [EndpointSummary("Current user")]
    [EndpointDescription("Returns the user the access token belongs to.")]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UserDto>> GetCurrentUser(CancellationToken cancellationToken) =>
        await sender.Send(new GetCurrentUserQuery(), cancellationToken);
}
