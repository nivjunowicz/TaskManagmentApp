using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TaskManager.api.Dto;
using TaskManager.api.Services;

namespace TaskManager.api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            throw new UnauthorizedAccessException("User ID not found in token");

        return userId;
    }

    [HttpGet]
    public async Task<ActionResult<List<TaskDto>>> GetAllTasks(bool includeArchived = false)
    {
        try
        {
            var userId = GetCurrentUserId();
            var tasks = await _taskService.GetUserTasksAsync(userId, includeArchived);
            return Ok(tasks);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(int id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var task = await _taskService.GetTaskByIdAsync(id, userId);

            if (task == null)
                return NotFound(new { message = "Task not found" });

            return Ok(task);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var task = await _taskService.CreateTaskAsync(userId, dto);

            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(int id, [FromBody] UpdateTaskDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var task = await _taskService.UpdateTaskAsync(id, userId, dto);

            if (task == null)
                return NotFound(new { message = "Task not found" });

            return Ok(task);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteTask(int id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var deleted = await _taskService.DeleteTaskAsync(id, userId);

            if (!deleted)
                return NotFound(new { message = "Task not found" });

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/archive")]
    public async Task<ActionResult<TaskDto>> ArchiveTask(int id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var task = await _taskService.ArchiveTaskAsync(id, userId);

            if (task == null)
                return NotFound(new { message = "Task not found" });

            return Ok(task);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
