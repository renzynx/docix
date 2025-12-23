package validator

import (
	"encoding/json"
	"errors"
	"net/http"
	"reflect"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/renzynx/docix/server/internal/response"
)

var validate *validator.Validate

// Username validation: 3-30 chars, alphanumeric, underscores, hyphens
var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{3,30}$`)

func init() {
	validate = validator.New()

	// Use JSON tag names in error messages
	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	// Register custom username validation
	validate.RegisterValidation("username", validateUsername)
}

func validateUsername(fl validator.FieldLevel) bool {
	username := fl.Field().String()
	if username == "" {
		return true // Empty is valid (use 'required' tag if needed)
	}
	return usernameRegex.MatchString(username)
}

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ValidationErrors struct {
	Errors []ValidationError `json:"errors"`
}

func DecodeAndValidate[T any](r *http.Request) (*T, error) {
	var req T
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, errors.New("invalid request body")
	}

	if err := validate.Struct(req); err != nil {
		return nil, err
	}

	return &req, nil
}

func HandleRequest[T any](w http.ResponseWriter, r *http.Request) (*T, bool) {
	req, err := DecodeAndValidate[T](r)
	if err != nil {
		SendValidationError(w, err)
		return nil, false
	}
	return req, true
}

func SendValidationError(w http.ResponseWriter, err error) {
	var validationErrs validator.ValidationErrors
	if errors.As(err, &validationErrs) {
		errors := make([]ValidationError, 0, len(validationErrs))
		for _, e := range validationErrs {
			errors = append(errors, ValidationError{
				Field:   e.Field(),
				Message: getErrorMessage(e),
			})
		}
		response.ValidationError(w, http.StatusBadRequest, errors)
		return
	}

	response.Error(w, http.StatusBadRequest, err.Error())
}

func getErrorMessage(e validator.FieldError) string {
	field := e.Field()

	switch e.Tag() {
	case "required":
		return field + " is required"
	case "email":
		return field + " must be a valid email address"
	case "min":
		if e.Type().Kind() == reflect.String {
			return field + " must be at least " + e.Param() + " characters"
		}
		return field + " must be at least " + e.Param()
	case "max":
		if e.Type().Kind() == reflect.String {
			return field + " must be at most " + e.Param() + " characters"
		}
		return field + " must be at most " + e.Param()
	case "username":
		return field + " must be 3-30 characters and contain only letters, numbers, underscores, or hyphens"
	case "oneof":
		return field + " must be one of: " + e.Param()
	case "url":
		return field + " must be a valid URL"
	case "hexcolor":
		return field + " must be a valid hex color"
	case "gte":
		return field + " must be greater than or equal to " + e.Param()
	case "lte":
		return field + " must be less than or equal to " + e.Param()
	case "len":
		return field + " must be exactly " + e.Param() + " characters"
	default:
		return field + " is invalid"
	}
}

func Get() *validator.Validate {
	return validate
}
