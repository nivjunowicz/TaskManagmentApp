using RabbitMQ.Client;
using TaskManager.api.Data;
using Microsoft.EntityFrameworkCore;
using TaskManager.api.Utilities;

namespace TaskReminderService.worker;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IConnection _rabbitMqConnection;
    private IChannel? _channel;

    public Worker(ILogger<Worker> logger, IServiceScopeFactory serviceScopeFactory, IConnection rabbitMqConnection)
    {
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
        _rabbitMqConnection = rabbitMqConnection;
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        _channel = await _rabbitMqConnection.CreateChannelAsync(cancellationToken: cancellationToken);
        await _channel.QueueDeclareAsync(queue: "Remainder", durable: false, exclusive: false, autoDelete: false, arguments: null, cancellationToken: cancellationToken);
        await base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _serviceScopeFactory.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    // Query overdue tasks that are not archived (using Israeli time)
                    var now = IsraeliTimeHelper.GetIsraeliNow();
                    var overdueTasks = await dbContext.Tasks
                        .Where(t => t.DueDate < now && !t.IsArchived)
                        .ToListAsync(stoppingToken);

                    if (overdueTasks.Count > 0)
                    {
                        _logger.LogInformation($"Found {overdueTasks.Count} overdue tasks");
                    }

                    foreach (var task in overdueTasks)
                    {
                        // Publish message to RabbitMQ
                        var timestamp = IsraeliTimeHelper.GetIsraeliNow().ToString("yyyy-MM-dd HH:mm:ss");
                        var message = $"[{timestamp}] Hi your Task is due {task.Title}";

                        var messageBytes = System.Text.Encoding.UTF8.GetBytes(message);

                        await _channel!.BasicPublishAsync(
                            exchange: "",
                            routingKey: "Remainder",
                            mandatory: false,
                            body: messageBytes,
                            cancellationToken: stoppingToken
                        );

                        _logger.LogInformation($"Published message for task: {task.Title}");

                        // Mark task as archived
                        task.IsArchived = true;
                    }

                    if (overdueTasks.Count > 0)
                    {
                        await dbContext.SaveChangesAsync(stoppingToken);
                        _logger.LogInformation($"Archived {overdueTasks.Count} tasks");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in worker");
            }

            // Run every 60 seconds
            await Task.Delay(60000, stoppingToken);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_channel != null)
        {
            await _channel.CloseAsync(cancellationToken);
            await _channel.DisposeAsync();
        }
        await base.StopAsync(cancellationToken);
    }
}
