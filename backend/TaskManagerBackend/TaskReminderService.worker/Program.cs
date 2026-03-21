using TaskReminderService.worker;
using Microsoft.EntityFrameworkCore;
using TaskManager.api.Data;
using RabbitMQ.Client;
using Serilog;
using TaskReminderService.worker;

// Create logs directory if it doesn't exist
var logsDirectory = Path.Combine(AppContext.BaseDirectory, "logs");
Directory.CreateDirectory(logsDirectory);

// Configure Serilog - ONLY log from TaskReminderService namespace
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Filter.ByIncludingOnly(le => 
        le.Properties.ContainsKey("SourceContext") && 
        le.Properties["SourceContext"].ToString().Contains("TaskReminderService"))
    .WriteTo.Console(
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}")
    .WriteTo.File(
        path: Path.Combine(logsDirectory, "worker-.log"),
        rollingInterval: RollingInterval.Day,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}")
    .CreateLogger();

try
{
    var builder = Host.CreateApplicationBuilder(args);

    // Remove all default logging providers
    builder.Logging.ClearProviders();
    
    // Use ONLY Serilog
    builder.Services.AddSerilog(Log.Logger);

    // Configuration is automatically loaded from appsettings.json
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found");

    // Register AppDbContext with SQL Server
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlServer(connectionString));

    // Register RabbitMQ connection
    builder.Services.AddSingleton<IConnection>(sp =>
    {
        var factory = new ConnectionFactory()
        {
            HostName = "localhost",
            Port = 5672,
            UserName = "guest",
            Password = "guest"
        };
        return factory.CreateConnectionAsync().Result;
    });

    // Register Worker and Consumer as hosted services
    builder.Services.AddHostedService<Worker>();
    builder.Services.AddHostedService<TaskReminderConsumer>();

    var host = builder.Build();
    host.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
