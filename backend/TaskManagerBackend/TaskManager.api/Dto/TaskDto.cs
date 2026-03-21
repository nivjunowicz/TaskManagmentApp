namespace TaskManager.api.Dto;

public class TaskDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public int Priority { get; set; }
    public bool IsArchived { get; set; }
    public List<TagDto> Tags { get; set; } = new();
}

public class CreateTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public int Priority { get; set; }
    public List<string> TagNames { get; set; } = new();
}

public class UpdateTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public int Priority { get; set; }
    public List<string> TagNames { get; set; } = new();
}

public class TagDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
