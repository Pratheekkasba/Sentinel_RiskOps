package Sentina.demo.service;

import Sentina.demo.models.User;
import Sentina.demo.models.User.Role;
import Sentina.demo.repository.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService      = jwtService;
    }

    // ── Spring Security integration ───────────────────────────────────────

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    // ── Register ─────────────────────────────────────────────────────────

    public record RegisterResult(String token, UserInfo user) {}

    public RegisterResult register(String email, String password, String fullName, String roleName) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already in use: " + email);
        }

        Role role;
        try {
            role = (roleName != null && !roleName.isBlank()) ? Role.valueOf(roleName.toUpperCase()) : Role.ANALYST;
        } catch (IllegalArgumentException e) {
            role = Role.ANALYST;
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setRole(role);

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved);
        return new RegisterResult(token, toInfo(saved));
    }

    // ── Login ─────────────────────────────────────────────────────────────

    public record LoginResult(String token, UserInfo user, long expiresIn) {}

    public LoginResult login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtService.generateToken(user);
        return new LoginResult(token, toInfo(user), 86400L);
    }

    // ── Helper ────────────────────────────────────────────────────────────

    public record UserInfo(Long id, String email, String fullName, String role) {}

    public UserInfo toInfo(User user) {
        return new UserInfo(user.getId(), user.getEmail(), user.getFullName(), user.getRole().name());
    }
}
