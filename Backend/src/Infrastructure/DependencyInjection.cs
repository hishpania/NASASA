using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Neosphere.Application.Common.Interfaces;
using Neosphere.Infrastructure.CropAdvice;
using Neosphere.Infrastructure.Data;
using Neosphere.Infrastructure.Data.Interceptors;
using Neosphere.Infrastructure.Security;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        builder.AddPersistence();
        builder.AddJwtAuthentication();
        builder.AddCropAdvisor();

        builder.Services.AddSingleton(TimeProvider.System);
    }

    private static void AddPersistence(this IHostApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString(Services.Database);
        Guard.Against.Null(connectionString, message: $"Connection string '{Services.Database}' not found.");

        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
        {
            options.AddInterceptors(serviceProvider.GetServices<ISaveChangesInterceptor>());
            options.UseNpgsql(connectionString);
        });

        builder.EnrichNpgsqlDbContext<ApplicationDbContext>();

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        builder.Services.AddScoped<ApplicationDbContextInitialiser>();
    }

    private static void AddCropAdvisor(this IHostApplicationBuilder builder)
    {
        // The host name is resolved by service discovery to the crop advisor resource of the AppHost.
        builder.Services.AddHttpClient<ICropAdvisor, CropAdvisorClient>(client =>
            client.BaseAddress = new Uri($"http://{Services.CropAdvisor}"));
    }

    private static void AddJwtAuthentication(this IHostApplicationBuilder builder)
    {
        var section = builder.Configuration.GetSection(JwtOptions.SectionName);
        var settings = section.Get<JwtOptions>() ?? new JwtOptions();

        builder.Services.AddOptions<JwtOptions>()
            .Bind(section)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        builder.Services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = settings.Issuer,
                    ValidAudience = settings.Audience,
                    IssuerSigningKey = JwtTokenService.CreateSigningKey(settings),
                    NameClaimType = JwtRegisteredClaimNames.Email
                };
            });

        builder.Services.AddAuthorization();

        builder.Services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        builder.Services.AddSingleton<ITokenService, JwtTokenService>();
    }
}
