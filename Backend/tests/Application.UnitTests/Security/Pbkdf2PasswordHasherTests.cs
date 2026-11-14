using Neosphere.Infrastructure.Security;
using NUnit.Framework;
using Shouldly;

namespace Neosphere.Application.UnitTests.Security;

public class Pbkdf2PasswordHasherTests
{
    private readonly Pbkdf2PasswordHasher _hasher = new();

    [Test]
    public void ShouldVerifyMatchingPassword()
    {
        var hash = _hasher.Hash("secret-password");

        _hasher.Verify("secret-password", hash).ShouldBeTrue();
    }

    [Test]
    public void ShouldRejectWrongPassword()
    {
        var hash = _hasher.Hash("secret-password");

        _hasher.Verify("other-password", hash).ShouldBeFalse();
    }

    [Test]
    public void ShouldProduceDifferentHashesForSamePassword()
    {
        _hasher.Hash("secret-password").ShouldNotBe(_hasher.Hash("secret-password"));
    }

    [Test]
    public void ShouldRejectMalformedHash()
    {
        _hasher.Verify("secret-password", "not-a-hash").ShouldBeFalse();
    }
}
