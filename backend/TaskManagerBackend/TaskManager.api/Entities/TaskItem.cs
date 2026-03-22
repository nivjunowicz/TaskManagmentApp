using TaskManager.api.Utilities;

namespace TaskManager.api.Entities;

public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public int Priority { get; set; }
    public int UserId { get; set; }
    public DateTime CreatedAt { get; set; } = IsraeliTimeHelper.GetIsraeliNow();
    public bool IsArchived { get; set; } = false;

    public User? User { get; set; }
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
}
