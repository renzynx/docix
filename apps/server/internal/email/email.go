package email

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net/smtp"
	"strings"

	"github.com/renzynx/docix/server/internal/config"
	"github.com/renzynx/docix/server/internal/models"
	log "github.com/sirupsen/logrus"
)

// ErrSMTPDisabled is returned when SMTP is not enabled in settings
var ErrSMTPDisabled = errors.New("SMTP is not enabled")

type Message struct {
	To      []string
	Subject string
	Body    string
	IsHTML  bool
}

// SMTPSettingsProvider defines the interface for getting SMTP settings
type SMTPSettingsProvider interface {
	GetIntegrationsConfig(ctx context.Context) (*models.IntegrationsConfig, error)
}

// Sender interface defines the email sending contract
type Sender interface {
	Send(msg *Message) error
}

type Service struct {
	config   *config.Config
	settings SMTPSettingsProvider
}

// New creates a new email service
// The service reads SMTP config from settings (database) with fallback to env config
func New(cfg *config.Config, settings SMTPSettingsProvider) *Service {
	return &Service{
		config:   cfg,
		settings: settings,
	}
}

// getSMTPConfig returns the SMTP configuration from settings or falls back to env config
func (s *Service) getSMTPConfig(ctx context.Context) (host string, port int, username, password, from string, useTLS, enabled bool) {
	// Try to get from settings first
	if s.settings != nil {
		integrations, err := s.settings.GetIntegrationsConfig(ctx)
		if err == nil && integrations != nil {
			// Check if SMTP is enabled in settings
			if !integrations.SMTPEnabled {
				return "", 0, "", "", "", false, false
			}

			// Use settings values, but password comes from env (security)
			host = integrations.SMTPHost
			port = integrations.SMTPPort
			username = integrations.SMTPUsername
			from = integrations.SMTPFromEmail
			if integrations.SMTPFromName != "" {
				from = fmt.Sprintf("%s <%s>", integrations.SMTPFromName, integrations.SMTPFromEmail)
			}

			// Password is stored encrypted or not exposed via API
			// Use the password from settings if available, otherwise fall back to env
			password = s.config.SMTP.Password
			useTLS = s.config.SMTP.UseTLS
			enabled = true

			return host, port, username, password, from, useTLS, enabled
		}
	}

	// Fall back to env config
	smtpCfg := s.config.SMTP
	if smtpCfg.Host == "" {
		return "", 0, "", "", "", false, false
	}

	return smtpCfg.Host, smtpCfg.Port, smtpCfg.Username, smtpCfg.Password, smtpCfg.From, smtpCfg.UseTLS, true
}

// Send sends an email message
func (s *Service) Send(ctx context.Context, msg *Message) error {
	// In development mode, use console sender
	if !s.config.IsProduction {
		return s.sendToConsole(msg)
	}

	host, port, username, password, from, useTLS, enabled := s.getSMTPConfig(ctx)
	if !enabled {
		log.Warn("SMTP is not enabled, email not sent")
		return ErrSMTPDisabled
	}

	sender := &smtpSender{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     from,
		useTLS:   useTLS,
	}

	return sender.Send(msg)
}

// sendToConsole logs the email to console (dev mode)
func (s *Service) sendToConsole(msg *Message) error {
	log.WithFields(log.Fields{
		"to":      strings.Join(msg.To, ", "),
		"subject": msg.Subject,
		"is_html": msg.IsHTML,
	}).Info("Email sent (dev mode)")

	fmt.Println("========== EMAIL ==========")
	fmt.Printf("To: %s\n", strings.Join(msg.To, ", "))
	fmt.Printf("Subject: %s\n", msg.Subject)
	fmt.Println("------ Body ------")
	fmt.Println(msg.Body)
	fmt.Println("========== END EMAIL ==========")

	return nil
}

// SendVerificationEmail sends an email verification link
func (s *Service) SendVerificationEmail(ctx context.Context, to, username, verificationLink string) error {
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2c3e50;">Welcome to Docix, %s!</h1>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #7f8c8d;">%s</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
</body>
</html>
`, username, verificationLink, verificationLink)

	return s.Send(ctx, &Message{
		To:      []string{to},
		Subject: "Verify Your Email - Docix",
		Body:    body,
		IsHTML:  true,
	})
}

// SendPasswordResetEmail sends a password reset link
func (s *Service) SendPasswordResetEmail(ctx context.Context, to, username, resetLink string) error {
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2c3e50;">Password Reset Request</h1>
        <p>Hi %s,</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #7f8c8d;">%s</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
</body>
</html>
`, username, resetLink, resetLink)

	return s.Send(ctx, &Message{
		To:      []string{to},
		Subject: "Reset Your Password - Docix",
		Body:    body,
		IsHTML:  true,
	})
}

// SendTestEmail sends a test email to verify SMTP configuration
func (s *Service) SendTestEmail(ctx context.Context, to string) error {
	return s.Send(ctx, &Message{
		To:      []string{to},
		Subject: "Test Email - Docix",
		Body:    "This is a test email from Docix. If you received this, your SMTP configuration is working correctly.",
		IsHTML:  false,
	})
}

type smtpSender struct {
	host     string
	port     int
	username string
	password string
	from     string
	useTLS   bool
}

func (s *smtpSender) Send(msg *Message) error {
	addr := fmt.Sprintf("%s:%d", s.host, s.port)

	headers := make(map[string]string)
	headers["From"] = s.from
	headers["To"] = strings.Join(msg.To, ", ")
	headers["Subject"] = msg.Subject
	headers["MIME-Version"] = "1.0"

	if msg.IsHTML {
		headers["Content-Type"] = "text/html; charset=UTF-8"
	} else {
		headers["Content-Type"] = "text/plain; charset=UTF-8"
	}

	// Build message
	var builder strings.Builder
	for k, v := range headers {
		builder.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	builder.WriteString("\r\n")
	builder.WriteString(msg.Body)

	message := []byte(builder.String())

	// Setup authentication
	auth := smtp.PlainAuth("", s.username, s.password, s.host)

	if s.useTLS {
		// TLS connection
		tlsConfig := &tls.Config{
			ServerName: s.host,
		}

		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("failed to connect to SMTP server: %w", err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, s.host)
		if err != nil {
			return fmt.Errorf("failed to create SMTP client: %w", err)
		}
		defer client.Close()

		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP authentication failed: %w", err)
		}

		if err := client.Mail(s.from); err != nil {
			return fmt.Errorf("failed to set sender: %w", err)
		}

		for _, to := range msg.To {
			if err := client.Rcpt(to); err != nil {
				return fmt.Errorf("failed to set recipient %s: %w", to, err)
			}
		}

		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("failed to get data writer: %w", err)
		}

		_, err = w.Write(message)
		if err != nil {
			return fmt.Errorf("failed to write message: %w", err)
		}

		if err := w.Close(); err != nil {
			return fmt.Errorf("failed to close data writer: %w", err)
		}

		return client.Quit()
	}

	// Non-TLS (STARTTLS will be used if available)
	return smtp.SendMail(addr, auth, s.from, msg.To, message)
}
