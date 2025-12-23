package email

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"

	"github.com/renzynx/docix/server/internal/config"
	log "github.com/sirupsen/logrus"
)

type Message struct {
	To      []string
	Subject string
	Body    string
	IsHTML  bool
}

// Sender interface defines the email sending contract
type Sender interface {
	Send(msg *Message) error
}

type Service struct {
	sender Sender
	from   string
}

func New(cfg *config.Config) *Service {
	var sender Sender

	if cfg.IsProduction {
		smtpCfg := cfg.SMTP
		sender = &smtpSender{
			host:     smtpCfg.Host,
			port:     smtpCfg.Port,
			username: smtpCfg.Username,
			password: smtpCfg.Password,
			from:     smtpCfg.From,
			useTLS:   smtpCfg.UseTLS,
		}
		log.Info("Email service initialized with SMTP sender")
	} else {
		sender = &consoleSender{}
		log.Info("Email service initialized with console sender (dev mode)")
	}

	return &Service{
		sender: sender,
		from:   cfg.SMTP.From,
	}
}

func (s *Service) Send(msg *Message) error {
	return s.sender.Send(msg)
}

func (s *Service) SendVerificationEmail(to, username, verificationLink string) error {
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

	return s.Send(&Message{
		To:      []string{to},
		Subject: "Verify Your Email - Docix",
		Body:    body,
		IsHTML:  true,
	})
}

func (s *Service) SendPasswordResetEmail(to, username, resetLink string) error {
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

	return s.Send(&Message{
		To:      []string{to},
		Subject: "Reset Your Password - Docix",
		Body:    body,
		IsHTML:  true,
	})
}

type consoleSender struct{}

func (s *consoleSender) Send(msg *Message) error {
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
