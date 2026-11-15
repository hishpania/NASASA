using Neosphere.Infrastructure.Data;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddApplicationServices();
builder.AddInfrastructureServices();
builder.AddWebServices();

var app = builder.Build();

// Migrations run on every start; the demo account is seeded in development only.
await app.InitialiseDatabaseAsync(seed: app.Environment.IsDevelopment());

// In production TLS ends at the reverse proxy (Caddy), which also redirects HTTP to HTTPS.

app.UseCors(static cors => cors
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowAnyOrigin());

app.UseExceptionHandler(_ => { });

app.UseAuthentication();
app.UseAuthorization();

app.UseFileServer();

app.MapOpenApi();
app.MapScalarApiReference();

app.Map("/", () => Results.Redirect("/scalar"));

app.MapDefaultEndpoints();
app.MapControllers();

app.Run();
