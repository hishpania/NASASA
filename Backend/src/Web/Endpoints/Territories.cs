using Microsoft.AspNetCore.Http.HttpResults;
using Neosphere.Application.Territories.Commands.CreateTerritory;
using Neosphere.Application.Territories.Commands.DeleteTerritory;
using Neosphere.Application.Territories.Commands.UpdateTerritory;
using Neosphere.Application.Territories.Models;
using Neosphere.Application.Territories.Queries.GetTerritories;

namespace Neosphere.Web.Endpoints;

public class Territories : IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.RequireAuthorization();

        groupBuilder.MapGet(GetTerritories);
        groupBuilder.MapPost(CreateTerritory);
        groupBuilder.MapPut(UpdateTerritory, "{id:int}");
        groupBuilder.MapDelete(DeleteTerritory, "{id:int}");
    }

    [EndpointSummary("List territories")]
    [EndpointDescription("Returns the territories owned by the current user.")]
    public static async Task<Ok<IReadOnlyList<TerritoryDto>>> GetTerritories(ISender sender) =>
        TypedResults.Ok(await sender.Send(new GetTerritoriesQuery()));

    [EndpointSummary("Create territory")]
    [EndpointDescription("Stores a polygon or radius territory for the current user.")]
    public static async Task<Created<TerritoryDto>> CreateTerritory(ISender sender, CreateTerritoryCommand command)
    {
        var territory = await sender.Send(command);

        return TypedResults.Created($"/api/{nameof(Territories)}/{territory.Id}", territory);
    }

    [EndpointSummary("Update territory")]
    [EndpointDescription("Replaces the name, shape and place of a territory. The ID in the URL must match the payload.")]
    public static async Task<Results<Ok<TerritoryDto>, BadRequest>> UpdateTerritory(ISender sender, int id, UpdateTerritoryCommand command)
    {
        if (id != command.Id)
        {
            return TypedResults.BadRequest();
        }

        return TypedResults.Ok(await sender.Send(command));
    }

    [EndpointSummary("Delete territory")]
    [EndpointDescription("Deletes a territory owned by the current user.")]
    public static async Task<NoContent> DeleteTerritory(ISender sender, int id)
    {
        await sender.Send(new DeleteTerritoryCommand(id));

        return TypedResults.NoContent();
    }
}
