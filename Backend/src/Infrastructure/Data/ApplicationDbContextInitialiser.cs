using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Neosphere.Application.Common.Interfaces;
using Neosphere.Domain.Entities;

namespace Neosphere.Infrastructure.Data;

public static class InitialiserExtensions
{
    public static async Task InitialiseDatabaseAsync(this WebApplication app, bool seed = true)
    {
        using var scope = app.Services.CreateScope();

        var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();

        await initialiser.InitialiseAsync();
        if (seed)
        {
            await initialiser.SeedAsync();
        }
    }
}

public class ApplicationDbContextInitialiser(
    ILogger<ApplicationDbContextInitialiser> logger,
    ApplicationDbContext context,
    IPasswordHasher passwordHasher)
{
    public const string DemoEmail = "demo@example.com";
    public const string DemoPassword = "123456789";

    public async Task InitialiseAsync()
    {
        try
        {
            await context.Database.MigrateAsync();
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "An error occurred while migrating the database.");
            throw;
        }
    }

    public async Task SeedAsync()
    {
        try
        {
            if (!await context.Users.AnyAsync(user => user.Email == DemoEmail))
            {
                context.Users.Add(new User { Email = DemoEmail, PasswordHash = passwordHasher.Hash(DemoPassword) });
                await context.SaveChangesAsync();
            }
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "An error occurred while seeding the database.");
            throw;
        }
    }
}
