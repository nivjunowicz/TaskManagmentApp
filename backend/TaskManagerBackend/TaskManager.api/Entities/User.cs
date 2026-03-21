using System.ComponentModel.DataAnnotations;

namespace TaskManager.api.Entities;

public class User
{
    public int Id { get; set; }

    [EmailAddress(ErrorMessage = "Invalid email format")]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Invalid phone format")]
    [MaxLength(20)]
    public string Telephone { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
