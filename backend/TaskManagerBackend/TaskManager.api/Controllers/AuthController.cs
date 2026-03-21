using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.api.Data;
using TaskManager.api.Dto;
using TaskManager.api.Entities;
using TaskManager.api.Services;

namespace TaskManager.api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public AuthController(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Telephone))
        {
            return BadRequest(new AuthResponse
            {
                Success = false,
                Message = "All fields are required"
            });
        }

        var userExists = _context.Users.Any(u => u.Email == request.Email || u.FullName == request.FullName);
        if (userExists)
        {
            return BadRequest(new AuthResponse
            {
                Success = false,
                Message = "User with this email or full name already exists"
            });
        }

        var user = new User
        {
            Email = request.Email,
            FullName = request.FullName,
            Telephone = request.Telephone,
            PasswordHash = _authService.HashPassword(request.Password)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _authService.GenerateJwtToken(user);
        return Ok(new AuthResponse
        {
            Success = true,
            Message = "User registered successfully",
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Telephone = user.Telephone
            }
        });
    }

    [HttpPost("login")]
    public ActionResult<AuthResponse> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new AuthResponse
            {
                Success = false,
                Message = "Email and password are required"
            });
        }

        var user = _context.Users.FirstOrDefault(u => u.Email == request.Email);
        if (user == null || !_authService.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new AuthResponse
            {
                Success = false,
                Message = "Invalid email or password"
            });
        }

        var token = _authService.GenerateJwtToken(user);
        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Login successful",
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Telephone = user.Telephone
            }
        });
    }

    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [HttpPost("logout")]
    public ActionResult<AuthResponse> Logout()
    {
        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Logout successful. Please discard the token on client side."
        });
    }
}
