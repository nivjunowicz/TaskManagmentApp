using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using TaskManager.api.Utilities;

namespace TaskReminderService.worker;

public class TaskReminderConsumer : BackgroundService
{
    private readonly ILogger<TaskReminderConsumer> _logger;
    private readonly IConnection _rabbitMqConnection;
    private IChannel? _channel;

    public TaskReminderConsumer(ILogger<TaskReminderConsumer> logger, IConnection rabbitMqConnection)
    {
        _logger = logger;
        _rabbitMqConnection = rabbitMqConnection;
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        _channel = await _rabbitMqConnection.CreateChannelAsync(cancellationToken: cancellationToken);
        await _channel.QueueDeclareAsync(queue: "Remainder", durable: false, exclusive: false, autoDelete: false, arguments: null, cancellationToken: cancellationToken);
        
        // Set BasicQos with prefetch count of 10 for concurrent handling
        await _channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 10, global: false, cancellationToken: cancellationToken);

        await base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var consumer = new AsyncEventingBasicConsumer(_channel);
        
        consumer.ReceivedAsync += async (model, ea) =>
        {
            try
            {
                var message = System.Text.Encoding.UTF8.GetString(ea.Body.ToArray());
                var timestamp = IsraeliTimeHelper.GetIsraeliNow().ToString("yyyy-MM-dd HH:mm:ss");
                _logger.LogInformation($"[{timestamp}] {message}");

                // Acknowledge the message
                await _channel!.BasicAckAsync(ea.DeliveryTag, multiple: false, cancellationToken: stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message");
                // Negative acknowledge to requeue the message
                await _channel!.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: true, cancellationToken: stoppingToken);
            }
        };

        await _channel!.BasicConsumeAsync(queue: "Remainder", autoAck: false, consumerTag: "TaskReminderConsumer", noLocal: false, exclusive: false, arguments: null, consumer: consumer, cancellationToken: stoppingToken);

        // Keep the consumer running
        await Task.Delay(Timeout.Infinite, stoppingToken);
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
