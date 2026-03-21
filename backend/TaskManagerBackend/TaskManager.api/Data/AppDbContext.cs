using Microsoft.EntityFrameworkCore;
using TaskManager.api.Entities;

namespace TaskManager.api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<TaskItem> Tasks { get; set; }
    public DbSet<Tag> Tags { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User entity configuration
        modelBuilder.Entity<User>()
            .HasKey(u => u.Id);

        modelBuilder.Entity<User>()
            .Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(255);

        modelBuilder.Entity<User>()
            .Property(u => u.FullName)
            .IsRequired()
            .HasMaxLength(255);

        modelBuilder.Entity<User>()
            .Property(u => u.Telephone)
            .IsRequired()
            .HasMaxLength(20);

        modelBuilder.Entity<User>()
            .Property(u => u.PasswordHash)
            .IsRequired();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.FullName)
            .IsUnique();

        // TaskItem entity configuration
        modelBuilder.Entity<TaskItem>()
            .HasKey(t => t.Id);

        modelBuilder.Entity<TaskItem>()
            .Property(t => t.Title)
            .IsRequired()
            .HasMaxLength(255);

        modelBuilder.Entity<TaskItem>()
            .Property(t => t.Description)
            .HasMaxLength(1000);

        modelBuilder.Entity<TaskItem>()
            .Property(t => t.Priority)
            .IsRequired();

        modelBuilder.Entity<TaskItem>()
            .Property(t => t.IsArchived)
            .HasDefaultValue(false);

        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.User)
            .WithMany(u => u.Tasks)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Tag entity configuration
        modelBuilder.Entity<Tag>()
            .HasKey(t => t.Id);

        modelBuilder.Entity<Tag>()
            .Property(t => t.Name)
            .IsRequired()
            .HasMaxLength(100);

        // Seed default tags
        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = 1, Name = "Work" },
            new Tag { Id = 2, Name = "Personal" },
            new Tag { Id = 3, Name = "Urgent" },
            new Tag { Id = 4, Name = "Review" },
            new Tag { Id = 5, Name = "Bug Fix" },
            new Tag { Id = 6, Name = "Feature" },
            new Tag { Id = 7, Name = "Documentation" },
            new Tag { Id = 8, Name = "Testing" }
        );

        // Many-to-Many relationship: TaskItem -> Tag
        modelBuilder.Entity<TaskItem>()
            .HasMany(t => t.Tags)
            .WithMany(tg => tg.Tasks)
            .UsingEntity("TaskTags");
    }
}
