package Sentina.demo.controller;

import Sentina.demo.models.User;
import Sentina.demo.repository.UserRepository;
import Sentina.demo.service.AuthService;
import Sentina.demo.service.AuthService.LoginResult;
import Sentina.demo.service.AuthService.RegisterResult;
import Sentina.demo.service.AuthService.UserInfo;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // ── POST /api/auth/register ───────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String email    = body.get("email");
        String password = body.get("password");
        String fullName = body.get("fullName");
        String role     = body.get("role");   // optional, defaults to ANALYST

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        if (password == null || password.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters"));
        }
        if (fullName == null || fullName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Full name is required"));
        }

        try {
            RegisterResult result = authService.register(email, password, fullName, role);
            return ResponseEntity.ok(Map.of(
                "token",     result.token(),
                "user",      result.user(),
                "message",   "Account created successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── POST /api/auth/login ──────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email    = body.get("email");
        String password = body.get("password");

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }

        try {
            LoginResult result = authService.login(email, password);
            return ResponseEntity.ok(Map.of(
                "token",     result.token(),
                "user",      result.user(),
                "expiresIn", result.expiresIn()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }
    }

    // ── GET /api/auth/me ──────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(authService.toInfo(user));
    }
}
