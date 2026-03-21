using Microsoft.EntityFrameworkCore;
using TaskManager.api.Data;
using TaskManager.api.Dto;
using TaskManager.api.Entities;
using TaskManager.api.Utilities;

namespace TaskManager.api.Services;

public interface ITaskService
{
    Task<List<TaskDto>> GetUserTasksAsync(int userId, bool includeArchived = false);
    Task<TaskDto?> GetTaskByIdAsync(int taskId, int userId);
    Task<TaskDto> CreateTaskAsync(int userId, CreateTaskDto dto);
    Task<TaskDto?> UpdateTaskAsync(int taskId, int userId, UpdateTaskDto dto);
    Task<bool> DeleteTaskAsync(int taskId, int userId);
    Task<TaskDto?> ArchiveTaskAsync(int taskId, int userId);
}

public class TaskService : ITaskService
{
    private readonly AppDbContext _context;

    public TaskService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TaskDto>> GetUserTasksAsync(int userId, bool includeArchived = false)
    {
        var query = _context.Tasks
            .Where(t => t.UserId == userId);

        if (!includeArchived)
        {
            query = query.Where(t => !t.IsArchived);
        }

        var tasks = await query
            .Include(t => t.Tags)
            .ToListAsync();

        return tasks.Select(t => MapToDto(t)).ToList();
    }

    public async Task<TaskDto?> GetTaskByIdAsync(int taskId, int userId)
    {
        var task = await _context.Tasks
            .Where(t => t.Id == taskId && t.UserId == userId)
            .Include(t => t.Tags)
            .FirstOrDefaultAsync();

        return task == null ? null : MapToDto(task);
    }

    public async Task<TaskDto> CreateTaskAsync(int userId, CreateTaskDto dto)
    {
        ValidateTaskDto(dto);

        var task = new TaskItem
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            DueDate = dto.DueDate,
            Priority = dto.Priority,
            UserId = userId
        };

        await AssignTagsToTaskAsync(task, dto.TagNames);

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        return MapToDto(task);
    }

    public async Task<TaskDto?> UpdateTaskAsync(int taskId, int userId, UpdateTaskDto dto)
    {
        ValidateTaskDto(dto);

        var task = await _context.Tasks
            .Where(t => t.Id == taskId && t.UserId == userId)
            .Include(t => t.Tags)
            .FirstOrDefaultAsync();

        if (task == null)
            return null;

        task.Title = dto.Title.Trim();
        task.Description = dto.Description.Trim();
        task.DueDate = dto.DueDate;
        task.Priority = dto.Priority;

        // Clear existing tags and assign new ones
        task.Tags.Clear();
        await AssignTagsToTaskAsync(task, dto.TagNames);

        _context.Tasks.Update(task);
        await _context.SaveChangesAsync();

        return MapToDto(task);
    }

    public async Task<bool> DeleteTaskAsync(int taskId, int userId)
    {
        var task = await _context.Tasks
            .FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);

        if (task == null)
            return false;


        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<TaskDto?> ArchiveTaskAsync(int taskId, int userId)
    {
        var task = await _context.Tasks
            .Where(t => t.Id == taskId && t.UserId == userId)
            .Include(t => t.Tags)
            .FirstOrDefaultAsync();

        if (task == null)
            return null;

        task.IsArchived = !task.IsArchived;
        _context.Tasks.Update(task);
        await _context.SaveChangesAsync();

        return MapToDto(task);
    }

    private async Task AssignTagsToTaskAsync(TaskItem task, List<string> tagNames)
    {
        foreach (var tagName in tagNames)
        {
            var trimmedName = tagName.Trim();
            if (string.IsNullOrEmpty(trimmedName))
                continue;

            var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Name == trimmedName);

            if (tag == null)
            {
                tag = new Tag { Name = trimmedName };
                _context.Tags.Add(tag);
            }

            task.Tags.Add(tag);
        }
    }

    private void ValidateTaskDto(CreateTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Length > 255)
            throw new ArgumentException("Title is required and must not exceed 255 characters");

        if (dto.Description.Length > 1000)
            throw new ArgumentException("Description must not exceed 1000 characters");

        if (dto.DueDate.Date < IsraeliTimeHelper.GetIsraeliNow().Date)
            throw new ArgumentException("Due date cannot be in the past");

        if (dto.Priority < 1 || dto.Priority > 5)
            throw new ArgumentException("Priority must be between 1 and 5");
    }

    private void ValidateTaskDto(UpdateTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Length > 255)
            throw new ArgumentException("Title is required and must not exceed 255 characters");

        if (dto.Description.Length > 1000)
            throw new ArgumentException("Description must not exceed 1000 characters");

        if (dto.DueDate < IsraeliTimeHelper.GetIsraeliNow())
            throw new ArgumentException("Due date cannot be in the past");

        if (dto.Priority < 1 || dto.Priority > 5)
            throw new ArgumentException("Priority must be between 1 and 5");
    }

    private TaskDto MapToDto(TaskItem task)
    {
        return new TaskDto
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            DueDate = task.DueDate,
            CreatedAt = task.CreatedAt,
            Priority = task.Priority,
            IsArchived = task.IsArchived,
            Tags = task.Tags.Select(t => new TagDto { Id = t.Id, Name = t.Name }).ToList()
        };
    }
}
