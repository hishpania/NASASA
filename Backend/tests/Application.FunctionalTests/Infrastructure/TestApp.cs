using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Neosphere.Application.Common.Interfaces;
using Neosphere.Domain.Entities;
using Neosphere.Infrastructure.Data;

namespace Neosphere.Application.FunctionalTests.Infrastructure;

public static class TestApp
{
    private static int? _userId;

    public static async Task<TResponse> SendAsync<TResponse>(IRequest<TResponse> request)
    {
        using var scope = FunctionalTestSetup.ScopeFactory.CreateScope();

        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(request);
    }

    public static async Task SendAsync(IBaseRequest request)
    {
        using var scope = FunctionalTestSetup.ScopeFactory.CreateScope();

        await scope.ServiceProvider.GetRequiredService<ISender>().Send(request);
    }

    public static int? GetUserId() => _userId;

    public static Task<int> RunAsDefaultUserAsync() => RunAsUserAsync("test@local", "Testing1234!");

    public static async Task<int> RunAsUserAsync(string email, string password)
    {
        using var scope = FunctionalTestSetup.ScopeFactory.CreateScope();

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        var user = new User { Email = email, PasswordHash = hasher.Hash(password) };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        _userId = user.Id;
        return user.Id;
    }

    public static void RunAsAnonymous() => _userId = null;

    public static async Task ResetState()
    {
        if (FunctionalTestSetup.DbResetter is not null)
        {
            await FunctionalTestSetup.DbResetter.ResetAsync();
        }

        _userId = null;
    }

    public static async Task<TEntity?> FindAsync<TEntity>(params object[] keyValues)
        where TEntity : class
    {
        using var scope = FunctionalTestSetup.ScopeFactory.CreateScope();

        return await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().FindAsync<TEntity>(keyValues);
    }

    public static async Task<int> CountAsync<TEntity>() where TEntity : class
    {
        using var scope = FunctionalTestSetup.ScopeFactory.CreateScope();

        return await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Set<TEntity>().CountAsync();
    }
}
