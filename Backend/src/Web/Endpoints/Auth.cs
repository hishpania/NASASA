using Microsoft.AspNetCore.Http.HttpResults;
using Neosphere.Application.Auth.Commands.Login;
using Neosphere.Application.Auth.Commands.Register;
using Neosphere.Application.Auth.Models;
using Neosphere.Application.Auth.Queries.GetCurrentUser;

namespace Neosphere.Web.Endpoints;

public class Auth : IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(Register, "register").AllowAnonymous();
        groupBuilder.MapPost(Login, "login").AllowAnonymous();
        groupBuilder.MapGet(GetCurrentUser, "me").RequireAuthorization();
    }

    [EndpointSummary("Register")]
    [EndpointDescription("Creates an account and returns an access token.")]
    public static async Task<Ok<AuthResult>> Register(ISender sender, RegisterCommand command) =>
        TypedResults.Ok(await sender.Send(command));

    [EndpointSummary("Log in")]
    [EndpointDescription("Exchanges an email and password for an access token.")]
    public static async Task<Ok<AuthResult>> Login(ISender sender, LoginCommand command) =>
        TypedResults.Ok(await sender.Send(command));

    [EndpointSummary("Current user")]
    [EndpointDescription("Returns the user the access token belongs to.")]
    public static async Task<Ok<UserDto>> GetCurrentUser(ISender sender) =>
        TypedResults.Ok(await sender.Send(new GetCurrentUserQuery()));
}
