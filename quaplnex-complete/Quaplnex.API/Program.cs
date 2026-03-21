using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure middleware
app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/api/chat");

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run("http://0.0.0.0:5000");

public class ChatHub : Hub
{
    public async Task SendMessage(string channelId, string message)
    {
        await Clients.Group(channelId).SendAsync("ReceiveMessage", message);
    }

    public async Task JoinChannel(string channelId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, channelId);
    }

    public async Task LeaveChannel(string channelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, channelId);
    }

    public async Task NotifyTyping(string channelId)
    {
        await Clients.Group(channelId).SendAsync("UserTyping", Context.ConnectionId);
    }

    public async Task NotifyStopTyping(string channelId)
    {
        await Clients.Group(channelId).SendAsync("UserStoppedTyping", Context.ConnectionId);
    }
}
