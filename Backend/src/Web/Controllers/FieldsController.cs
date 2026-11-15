using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Neosphere.Application.Fields.Commands.CreateField;
using Neosphere.Application.Fields.Commands.DeleteField;
using Neosphere.Application.Fields.Commands.UpdateField;
using Neosphere.Application.Fields.Models;
using Neosphere.Application.Fields.Queries.GetFields;
using Neosphere.Application.Recommendations.Models;
using Neosphere.Application.Recommendations.Queries.GetFieldForecast;
using Neosphere.Application.Recommendations.Queries.GetFieldOutlook;
using Neosphere.Application.Recommendations.Queries.GetFieldRecommendations;

namespace Neosphere.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class FieldsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("List fields")]
    [EndpointDescription("Returns the fields owned by the current user.")]
    [ProducesResponseType<IReadOnlyList<FieldDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FieldDto>>> GetFields(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetFieldsQuery(), cancellationToken));

    [HttpGet("{id:int}/recommendations")]
    [EndpointSummary("Recommend crops and rotations")]
    [EndpointDescription(
        "Returns sowing recommendations and rotation strategies for a field owned by the current user. " +
        "Fields in the contiguous United States are answered by the crop rotation model, the rest of the world by agro-climatic rules.")]
    [ProducesResponseType<CropAdviceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<CropAdviceDto>> GetRecommendations(
        int id,
        [FromQuery] string[]? previousCrops,
        [FromQuery] bool irrigated = false,
        CancellationToken cancellationToken = default) =>
        Ok(await sender.Send(new GetFieldRecommendationsQuery(id, previousCrops ?? [], irrigated), cancellationToken));

    [HttpGet("{id:int}/forecast")]
    [EndpointSummary("Forecast field climate")]
    [EndpointDescription(
        "Returns the last two years of monthly temperature, precipitation and root zone soil wetness for a field owned by the current user, " +
        "and a forecast for the next twelve months. Where the model does not beat the long-term normal in a backtest, the normal is returned.")]
    [ProducesResponseType<ClimateForecastDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ClimateForecastDto>> GetForecast(int id, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetFieldForecastQuery(id), cancellationToken));

    [HttpGet("{id:int}/outlook")]
    [EndpointSummary("Monthly outlook of a field")]
    [EndpointDescription(
        "Returns the chance that each of the next twelve months is below, near or above normal for air temperature, " +
        "relative humidity and root zone soil wetness at a field owned by the current user. The first request for a region " +
        "starts training its models and answers with status \"preparing\"; ask again until the status is \"ready\".")]
    [ProducesResponseType<MonthlyOutlookDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<MonthlyOutlookDto>> GetOutlook(int id, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetFieldOutlookQuery(id), cancellationToken));

    [HttpPost]
    [EndpointSummary("Create field")]
    [EndpointDescription("Stores a polygon or radius field for the current user.")]
    [ProducesResponseType<FieldDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<FieldDto>> CreateField(CreateFieldCommand command, CancellationToken cancellationToken)
    {
        var field = await sender.Send(command, cancellationToken);

        return Created($"/api/Fields/{field.Id}", field);
    }

    [HttpPut("{id:int}")]
    [EndpointSummary("Update field")]
    [EndpointDescription("Replaces the name, shape and place of a field. The ID in the URL must match the payload.")]
    [ProducesResponseType<FieldDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FieldDto>> UpdateField(int id, UpdateFieldCommand command, CancellationToken cancellationToken)
    {
        if (id != command.Id)
        {
            return BadRequest();
        }

        return await sender.Send(command, cancellationToken);
    }

    [HttpDelete("{id:int}")]
    [EndpointSummary("Delete field")]
    [EndpointDescription("Deletes a field owned by the current user.")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteField(int id, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteFieldCommand(id), cancellationToken);

        return NoContent();
    }
}
