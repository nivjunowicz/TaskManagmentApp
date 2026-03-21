using Microsoft.EntityFrameworkCore;
using TaskManager.api.Data;
using TaskManager.api.Dto;

namespace TaskManager.api.Services;

public interface ITagService
{
    Task<List<TagDto>> GetAllTagsAsync();
}

public class TagService : ITagService
{
    private readonly AppDbContext _context;

    public TagService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TagDto>> GetAllTagsAsync()
    {
        var tags = await _context.Tags
            .OrderBy(t => t.Name)
            .Select(t => new TagDto { Id = t.Id, Name = t.Name })
            .ToListAsync();

        return tags;
    }
}
