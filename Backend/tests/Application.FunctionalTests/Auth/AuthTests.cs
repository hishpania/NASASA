using Neosphere.Application.Auth.Commands.Login;
using Neosphere.Application.Auth.Commands.Register;
using Neosphere.Application.Common.Exceptions;

namespace Neosphere.Application.FunctionalTests.Auth;

public class AuthTests : TestBase
{
    [Test]
    public async Task ShouldRegisterAndLogInWithNormalizedEmail()
    {
        var registered = await TestApp.SendAsync(new RegisterCommand("Farmer@Example.com", "harvest42"));

        var loggedIn = await TestApp.SendAsync(new LoginCommand("farmer@example.com", "harvest42"));

        loggedIn.User.Id.ShouldBe(registered.User.Id);
        loggedIn.User.Email.ShouldBe("farmer@example.com");
        loggedIn.AccessToken.ShouldNotBeNullOrWhiteSpace();
    }

    [Test]
    public async Task ShouldRejectDuplicateEmail()
    {
        await TestApp.SendAsync(new RegisterCommand("farmer@example.com", "harvest42"));

        await Should.ThrowAsync<ValidationException>(() =>
            TestApp.SendAsync(new RegisterCommand("FARMER@example.com", "harvest42")));
    }

    [Test]
    public async Task ShouldRejectWrongPassword()
    {
        await TestApp.SendAsync(new RegisterCommand("farmer@example.com", "harvest42"));

        await Should.ThrowAsync<UnauthorizedAccessException>(() =>
            TestApp.SendAsync(new LoginCommand("farmer@example.com", "wrong-password")));
    }
}
