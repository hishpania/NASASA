using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Neosphere.Application.Common.Interfaces;

namespace Neosphere.Application.FunctionalTests.Infrastructure;

public class WebApiFactory(string connectionString) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder
            .UseEnvironment("Development")
            .UseSetting($"ConnectionStrings:{Neosphere.Shared.Services.Database}", connectionString);

        builder.ConfigureTestServices(services =>
        {
            services
                .RemoveAll<IUser>()
                .AddTransient(_ =>
                {
                    var user = new Mock<IUser>();
                    user.SetupGet(x => x.Id).Returns(TestApp.GetUserId());
                    return user.Object;
                });
        });
    }
}
