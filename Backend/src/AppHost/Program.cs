using Neosphere.Shared;

var builder = DistributedApplication.CreateBuilder(args);

var database = builder
    .AddPostgres(Services.DatabaseServer)
    .WithDataVolume()
    .WithPgAdmin()
    .WithLifetime(ContainerLifetime.Persistent)
    .AddDatabase(Services.Database);

var api = builder.AddProject<Projects.Web>(Services.WebApi)
    .WithReference(database)
    .WaitFor(database)
    .WithExternalHttpEndpoints()
    .WithAspNetCoreEnvironment()
    .WithUrlForEndpoint("http", url =>
    {
        url.DisplayText = "Scalar API Reference";
        url.Url = "/scalar";
    });

builder.AddViteApp(Services.WebFrontend, "../../../Frontend")
    .WithReference(api)
    .WaitFor(api)
    .WithExternalHttpEndpoints();

builder.Build().Run();
