package Sentina.demo.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.ANALYST;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Role { ANALYST, ADMIN }

    // ── UserDetails contract ──────────────────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    /** Spring Security expects this to return the password hash */
    @Override
    public String getPassword() { return passwordHash; }

    /** Spring Security uses email as the username */
    @Override
    public String getUsername() { return email; }

    @Override public boolean isAccountNonExpired()    { return true; }
    @Override public boolean isAccountNonLocked()     { return true; }
    @Override public boolean isCredentialsNonExpired(){ return true; }
    @Override public boolean isEnabled()              { return true; }

    // ── Getters & Setters ─────────────────────────────────────────────────

    public Long getId()                { return id; }
    public void setId(Long id)         { this.id = id; }

    public String getEmail()           { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash()                    { return passwordHash; }
    public void setPasswordHash(String passwordHash)   { this.passwordHash = passwordHash; }

    public String getFullName()                  { return fullName; }
    public void setFullName(String fullName)     { this.fullName = fullName; }

    public Role getRole()             { return role; }
    public void setRole(Role role)    { this.role = role; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
