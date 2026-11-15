using Neosphere.Shared;

var builder = DistributedApplication.CreateBuilder(args);

var database = builder
    .AddPostgres(Services.DatabaseServer)
    .WithDataVolume()
    .WithPgAdmin()
    .WithLifetime(ContainerLifetime.Persistent)
    .AddDatabase(Services.Database);

#pragma warning disable ASPIRECERTIFICATES001 // WithoutHttpsCertificate is experimental.
var cropAdvisor = builder
    .AddUvicornApp(Services.CropAdvisor, "../../../Model/crop_advisor", "crop_advisor.main:app")
    .WithUv()
    .WithEnvironment("PYTHONPATH", string.Join(
        Path.PathSeparator,
        Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "../../..")),
        Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "../../../Model/regressions"))))
    // Aspire would otherwise serve uvicorn over TLS with the developer certificate, which the API does not
    // trust on Linux; the advisor is an internal service, so plain HTTP is enough.
    .WithoutHttpsCertificate()
    .WithHttpHealthCheck("/health")
    .WithUrlForEndpoint("http", url =>
    {
        url.DisplayText = "Crop Advisor API";
        url.Url = "/docs";
    });
#pragma warning restore ASPIRECERTIFICATES001

var api = builder.AddProject<Projects.Web>(Services.WebApi)
    .WithReference(database)
    .WaitFor(database)
    // Referenced but not awaited: the API answers 503 for recommendations while the advisor is down.
    .WithReference(cropAdvisor)
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
    .WithEndpoint("http", endpoint => endpoint.Port = 5173)
    .WithExternalHttpEndpoints();

builder.Build().Run();
