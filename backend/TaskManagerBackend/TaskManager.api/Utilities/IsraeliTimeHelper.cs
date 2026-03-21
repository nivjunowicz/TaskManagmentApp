namespace TaskManager.api.Utilities;

public static class IsraeliTimeHelper
{
    private static readonly TimeZoneInfo IsraeliTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Israel Standard Time");

    /// <summary>
    /// Gets the current time in Israeli timezone
    /// </summary>
    public static DateTime GetIsraeliNow()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IsraeliTimeZone);
    }

    /// <summary>
    /// Converts UTC DateTime to Israeli timezone
    /// </summary>
    public static DateTime ConvertUtcToIsraeli(DateTime utcTime)
    {
        if (utcTime.Kind != DateTimeKind.Utc)
        {
            utcTime = new DateTime(utcTime.Ticks, DateTimeKind.Utc);
        }
        return TimeZoneInfo.ConvertTimeFromUtc(utcTime, IsraeliTimeZone);
    }

    /// <summary>
    /// Converts Israeli DateTime to UTC
    /// </summary>
    public static DateTime ConvertIsraeliToUtc(DateTime israeliTime)
    {
        return TimeZoneInfo.ConvertTimeToUtc(israeliTime, IsraeliTimeZone);
    }
}
