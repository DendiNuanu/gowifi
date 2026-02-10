package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
	"unicode"
)

type Settings struct {
	BackgroundImage      string `json:"background_image"`
	BackgroundImageType  string `json:"background_image_type"`
	BackgroundImageData  string `json:"background_image_data"`
	BackgroundColor      string `json:"background_color"`
	PageTitle            string `json:"page_title"`
	ButtonText           string `json:"button_text"`
	GoogleLoginEnabled   string `json:"google_login_enabled"`
	FacebookLoginEnabled string `json:"facebook_login_enabled"`
	GoogleClientID       string `json:"google_client_id"`
	GoogleClientSecret   string `json:"google_client_secret"`
	FacebookAppID        string `json:"facebook_app_id"`
	FacebookAppSecret    string `json:"facebook_app_secret"`
}

type ScheduledAd struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Image       string    `json:"image"`
	StartDate   string    `json:"start_date"`
	EndDate     string    `json:"end_date"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

var db *sql.DB

func initDB() {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS page_settings (
			key TEXT PRIMARY KEY,
			value TEXT,
			setting_key TEXT,
			setting_value TEXT,
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS scheduled_ads (
			id SERIAL PRIMARY KEY,
			title TEXT,
			description TEXT,
			image TEXT,
			start_date DATE,
			end_date DATE,
			start_time TIME,
			end_time TIME,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT NOW()
		);
	`)
	if err != nil {
		log.Println("Database initialization error:", err)
	} else {
		log.Println("✅ Database tables ensured")
	}
}

func main() {
	var err error

	// Load .env file
	err = godotenv.Load("../.env")
	if err != nil {
		log.Println("⚠️ Warning: .env file not found or could not be loaded")
	} else {
		log.Println("✅ Environment variables loaded from .env")
	}

	// Database connection
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		// DANGER: Never hardcode secrets here.
		// Use a local DB string or keep it empty for Env requirement.
		connStr = "user=postgres password=postgres dbname=wifi_hotspot sslmode=disable"
	}

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Println("⚠️ Failed to connect to database:", err)
		log.Println("🔄 Continuing anyway... some endpoints may not work")
	} else {
		// Test connection
		if err = db.Ping(); err != nil {
			log.Println("⚠️ Failed to ping database:", err)
			log.Println("🔄 Continuing anyway... database operations may fail")
		} else {
			log.Println("✅ Database connected successfully")
		}
	}

	if db != nil {
		initDB()
	} else {
		log.Println("⚠️ Database initialization skipped (no connection)")
	}

	log.Println("--- NUANU BACKEND STARTING (v2.5 MEGA SUPER FIX) ---")

	// Router
	r := mux.NewRouter()

	// API Routes...
	r.HandleFunc("/api/settings", GetSettings).Methods("GET")
	r.HandleFunc("/api/settings", UpdateSettings).Methods("POST")
	r.HandleFunc("/api/upload", UploadFile).Methods("POST")
	r.HandleFunc("/api/auth/login", AdminLogin).Methods("POST")

	// Ads Routes...
	r.HandleFunc("/api/ads", GetAds).Methods("GET")
	r.HandleFunc("/api/ads", CreateAd).Methods("POST")
	r.HandleFunc("/api/ads/{id}", UpdateAd).Methods("PUT")
	r.HandleFunc("/api/ads/{id}", DeleteAd).Methods("DELETE")
	r.HandleFunc("/api/active-ad", GetActiveAd).Methods("GET")

	r.HandleFunc("/health", HealthCheck).Methods("GET")

	// Auth Routes - v2.4 GUARANTEE ENTRY POINT
	log.Println("🔌 Registering Auth Catch-All ENTRY POINT...")
	r.PathPrefix("/auth").HandlerFunc(AuthRouter)
	log.Println("✅ Auth Catch-All registered.")

	// Fallback for debugging (Enhanced for v2.5)
	r.NotFoundHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("❌ 404 NOT FOUND: [%s] %s (FULL URL: %s)", r.Method, r.URL.Path, r.URL.String())
		http.Error(w, "404 page not found - NUANU BACKEND v2.5", http.StatusNotFound)
	})

	// Static files
	// Static files - more robust path handling
	cwd, _ := os.Getwd()
	imgDir := filepath.Join(cwd, "..", "public", "img")
	if _, err := os.Stat(imgDir); os.IsNotExist(err) {
		// Fallback if we are in root
		imgDir = filepath.Join(cwd, "public", "img")
	}
	log.Printf("📂 Serving static files from: %s", imgDir)
	r.PathPrefix("/img/").Handler(http.StripPrefix("/img/", http.FileServer(http.Dir(imgDir))))

	// CORS: Enhanced stability
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Content-Length", "Accept-Encoding", "Authorization", "X-CSRF-Token"},
		AllowCredentials: true,
		Debug:            false,
	})

	handler := c.Handler(r)
	handler = LoggerMiddleware(handler)

	log.Println("🚀 Go Backend starting on 0.0.0.0:8080")
	log.Fatal(http.ListenAndServe("0.0.0.0:8080", handler))
}

// AuthRouter v2.5 - Final manual routing guarantee
func AuthRouter(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	log.Printf("🛂 AuthRouter ENTRY: [%s] %s (FULL: %s)", r.Method, path, r.URL.String())

	if strings.Contains(path, "google/login") {
		GoogleLogin(w, r)
	} else if strings.Contains(path, "google/callback") {
		GoogleCallback(w, r)
	} else if strings.Contains(path, "facebook/login") {
		FacebookLogin(w, r)
	} else if strings.Contains(path, "facebook/callback") {
		FacebookCallback(w, r)
	} else {
		log.Printf("❓ Unknown auth path: %s", path)
		http.Error(w, "404 Auth Route Not Found - NUANU v2.5", http.StatusNotFound)
	}
}


func GoogleLogin(w http.ResponseWriter, r *http.Request) {
	log.Printf("🚀 MEGA LOG: GoogleLogin triggered! Path: %s", r.URL.Path)
	settings := getSettingsFromDB()
	if settings.GoogleLoginEnabled != "true" || settings.GoogleClientID == "" {
		http.Error(w, "Google login is disabled or misconfigured", http.StatusForbidden)
		return
	}

	state := r.URL.RawQuery // Pass MikroTik params in state
	// SUPER FIX: Hardcode the production domain to avoid proxy issues with r.Host
	const prodDomain = "gowifi.nuanu.io"
	redirectURI := fmt.Sprintf("https://%s/auth/google/callback", prodDomain)
	
	authURL := fmt.Sprintf("https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=email profile&state=%s",
		settings.GoogleClientID,
		url.QueryEscape(redirectURI),
		url.QueryEscape(state),
	)

	log.Printf("🔗 Constructing Google Auth URL for redirect_uri: %s", redirectURI)
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

func GoogleCallback(w http.ResponseWriter, r *http.Request) {
	log.Printf("🚀 MEGA LOG: GoogleCallback triggered! Path: %s, Query: %s", r.URL.Path, r.URL.RawQuery)
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	settings := getSettingsFromDB()

	if code == "" {
		http.Error(w, "Code missing", http.StatusBadRequest)
		return
	}

	const prodDomain = "gowifi.nuanu.io"
	redirectURI := fmt.Sprintf("https://%s/auth/google/callback", prodDomain)

	// Exchange code for token
	resp, err := http.PostForm("https://oauth2.googleapis.com/token", map[string][]string{
		"client_id":     {settings.GoogleClientID},
		"client_secret": {settings.GoogleClientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {redirectURI},
	})

	if err != nil {
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(resp.Body).Decode(&tokenResp)

	// Get user info
	userResp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + tokenResp.AccessToken)
	if err != nil {
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}
	defer userResp.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
	}
	json.NewDecoder(userResp.Body).Decode(&userInfo)

	// Logic to authorize in MikroTik
	params, _ := url.ParseQuery(state)
	gatewayIP := params.Get("ip")
	if gatewayIP == "" {
		gatewayIP = "192.168.1.1"
	}
	linkLogin := params.Get("link-login-only")
	if linkLogin == "" {
		linkLogin = fmt.Sprintf("http://%s/login", gatewayIP)
	}
	dst := params.Get("link-orig")
	if dst == "" {
		dst = "https://www.nuanu.com/"
	}

	// Redirect to MikroTik login
	loginURL := fmt.Sprintf("%s?username=%s&password=%s&dst=%s",
		linkLogin,
		url.QueryEscape(userInfo.Email),
		"password",
		url.QueryEscape(dst),
	)

	http.Redirect(w, r, loginURL, http.StatusTemporaryRedirect)
}

func FacebookLogin(w http.ResponseWriter, r *http.Request) {
	settings := getSettingsFromDB()
	if settings.FacebookLoginEnabled != "true" || settings.FacebookAppID == "" {
		http.Error(w, "Facebook login is disabled or misconfigured", http.StatusForbidden)
		return
	}

	state := r.URL.RawQuery
	const prodDomain = "gowifi.nuanu.io"
	redirectURI := fmt.Sprintf("https://%s/auth/facebook/callback", prodDomain)
	
	authURL := fmt.Sprintf("https://www.facebook.com/v12.0/dialog/oauth?client_id=%s&redirect_uri=%s&state=%s&scope=email",
		settings.FacebookAppID,
		url.QueryEscape(redirectURI),
		url.QueryEscape(state),
	)

	log.Printf("🔗 Constructing Facebook Auth URL for redirect_uri: %s", redirectURI)
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

func FacebookCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	settings := getSettingsFromDB()

	if code == "" {
		http.Error(w, "Code missing", http.StatusBadRequest)
		return
	}

	const prodDomain = "gowifi.nuanu.io"
	redirectURI := fmt.Sprintf("https://%s/auth/facebook/callback", prodDomain)

	// Exchange code for token
	resp, err := http.Get(fmt.Sprintf("https://graph.facebook.com/v12.0/oauth/access_token?client_id=%s&redirect_uri=%s&client_secret=%s&code=%s",
		settings.FacebookAppID,
		url.QueryEscape(redirectURI),
		settings.FacebookAppSecret,
		code,
	))

	if err != nil {
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(resp.Body).Decode(&tokenResp)

	// Get user info
	userResp, err := http.Get("https://graph.facebook.com/me?fields=email&access_token=" + tokenResp.AccessToken)
	if err != nil {
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}
	defer userResp.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
	}
	json.NewDecoder(userResp.Body).Decode(&userInfo)

	// Logic to authorize in MikroTik
	params, _ := url.ParseQuery(state)
	gatewayIP := params.Get("ip")
	if gatewayIP == "" {
		gatewayIP = "192.168.1.1"
	}
	linkLogin := params.Get("link-login-only")
	if linkLogin == "" {
		linkLogin = fmt.Sprintf("http://%s/login", gatewayIP)
	}
	dst := params.Get("link-orig")
	if dst == "" {
		dst = "https://www.nuanu.com/"
	}

	// Redirect to MikroTik login
	loginURL := fmt.Sprintf("%s?username=%s&password=%s&dst=%s",
		linkLogin,
		url.QueryEscape(userInfo.Email),
		"password",
		url.QueryEscape(dst),
	)

	http.Redirect(w, r, loginURL, http.StatusTemporaryRedirect)
}

func getSettingsFromDB() Settings {
	settings := Settings{
		GoogleLoginEnabled:   "false",
		FacebookLoginEnabled: "false",
	}

	rows, err := db.Query("SELECT key, value FROM page_settings")
	if err != nil {
		return settings
	}
	defer rows.Close()

	settingsMap := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		settingsMap[key] = value
	}

	if val, ok := settingsMap["google_login_enabled"]; ok {
		settings.GoogleLoginEnabled = val
	}
	if val, ok := settingsMap["facebook_login_enabled"]; ok {
		settings.FacebookLoginEnabled = val
	}
	if val, ok := settingsMap["google_client_id"]; ok {
		settings.GoogleClientID = val
	}
	if val, ok := settingsMap["google_client_secret"]; ok {
		settings.GoogleClientSecret = val
	}
	if val, ok := settingsMap["facebook_app_id"]; ok {
		settings.FacebookAppID = val
	}
	if val, ok := settingsMap["facebook_app_secret"]; ok {
		settings.FacebookAppSecret = val
	}

	return settings
}

func HealthCheck(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func GetSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	settings := Settings{
		BackgroundImage:      "url(/img/nuanu.png)",
		BackgroundImageType:  "url",
		BackgroundImageData:  "",
		BackgroundColor:      "#667eea",
		PageTitle:            "Welcome To NUANU Free WiFi",
		ButtonText:           "Connect to WiFi",
		GoogleLoginEnabled:   "false",
		FacebookLoginEnabled: "false",
		GoogleClientID:       "",
		GoogleClientSecret:   "",
		FacebookAppID:        "",
		FacebookAppSecret:    "",
	}

	rows, err := db.Query("SELECT key, value FROM page_settings")
	if err != nil {
		log.Println("Query error:", err)
		json.NewEncoder(w).Encode(settings)
		return
	}
	defer rows.Close()

	settingsMap := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		settingsMap[key] = value
	}

	if val, ok := settingsMap["background_image"]; ok {
		settings.BackgroundImage = val
	}
	if val, ok := settingsMap["background_color"]; ok {
		settings.BackgroundColor = val
	}
	if val, ok := settingsMap["page_title"]; ok {
		settings.PageTitle = val
	}
	if val, ok := settingsMap["button_text"]; ok {
		settings.ButtonText = val
	}
	if val, ok := settingsMap["google_login_enabled"]; ok {
		settings.GoogleLoginEnabled = val
	}
	if val, ok := settingsMap["facebook_login_enabled"]; ok {
		settings.FacebookLoginEnabled = val
	}
	if val, ok := settingsMap["google_client_id"]; ok {
		settings.GoogleClientID = val
	}
	if val, ok := settingsMap["google_client_secret"]; ok {
		settings.GoogleClientSecret = val
	}
	if val, ok := settingsMap["facebook_app_id"]; ok {
		settings.FacebookAppID = val
	}
	if val, ok := settingsMap["facebook_app_secret"]; ok {
		settings.FacebookAppSecret = val
	}

	json.NewEncoder(w).Encode(settings)
}

func UpdateSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var settings Settings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updateSetting := func(key, value string) error {
		if value == "" {
			return nil
		}
		_, err := db.Exec(`
			INSERT INTO page_settings (key, value, setting_key, setting_value, updated_at)
			VALUES ($1, $2, $1, $2, NOW())
			ON CONFLICT (key) DO UPDATE SET value = $2, setting_value = $2, updated_at = NOW()
		`, key, value)
		return err
	}

	updateSetting("page_title", settings.PageTitle)
	updateSetting("button_text", settings.ButtonText)
	updateSetting("background_color", settings.BackgroundColor)
	updateSetting("google_login_enabled", settings.GoogleLoginEnabled)
	updateSetting("facebook_login_enabled", settings.FacebookLoginEnabled)
	updateSetting("google_client_id", settings.GoogleClientID)
	updateSetting("google_client_secret", settings.GoogleClientSecret)
	updateSetting("facebook_app_id", settings.FacebookAppID)
	updateSetting("facebook_app_secret", settings.FacebookAppSecret)

	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func UploadFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "No file received", http.StatusBadRequest)
		return
	}
	defer file.Close()

	filename := fmt.Sprintf("upload_%d_%s", time.Now().Unix(), header.Filename)
	uploadDir := "../public/img"
	os.MkdirAll(uploadDir, 0755)

	dst, err := os.Create(filepath.Join(uploadDir, filename))
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	fileURL := fmt.Sprintf("/img/%s", filename)

	// Check if this is for an ad or main BG
	isAd := r.FormValue("is_ad") == "true"
	if !isAd {
		db.Exec(`
			INSERT INTO page_settings (key, value, setting_key, setting_value, updated_at)
			VALUES ('background_image', $1, 'background_image', $1, NOW())
			ON CONFLICT (key) DO UPDATE SET value = $1, setting_value = $1, updated_at = NOW()
		`, fmt.Sprintf("url(%s)", fileURL))
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"url":     fileURL,
	})
}

func GetAds(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	rows, err := db.Query("SELECT id, title, description, image, start_date, end_date, start_time, end_time, is_active FROM scheduled_ads ORDER BY created_at DESC")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	ads := []ScheduledAd{}
	for rows.Next() {
		var ad ScheduledAd
		var sd, ed sql.NullString
		var st, et sql.NullString
		if err := rows.Scan(&ad.ID, &ad.Title, &ad.Description, &ad.Image, &sd, &ed, &st, &et, &ad.IsActive); err != nil {
			continue
		}
		if sd.Valid {
			ad.StartDate = sd.String
		}
		if ed.Valid {
			ad.EndDate = ed.String
		}
		if st.Valid {
			ad.StartTime = st.String
		}
		if et.Valid {
			ad.EndTime = et.String
		}
		ads = append(ads, ad)
	}
	json.NewEncoder(w).Encode(ads)
}

func CreateAd(w http.ResponseWriter, r *http.Request) {
	var ad ScheduledAd
	if err := json.NewDecoder(r.Body).Decode(&ad); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := db.Exec(`
		INSERT INTO scheduled_ads (title, description, image, start_date, end_date, start_time, end_time, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, ad.Title, ad.Description, ad.Image,
		nullIfEmpty(ad.StartDate), nullIfEmpty(ad.EndDate),
		nullIfEmpty(ad.StartTime), nullIfEmpty(ad.EndTime), true)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func UpdateAd(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("❌ UpdateAd: Invalid ID format '%s': %v", idStr, err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid ID format"})
		return
	}

	var ad ScheduledAd
	if err := json.NewDecoder(r.Body).Decode(&ad); err != nil {
		log.Printf("❌ UpdateAd: JSON decode error: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Invalid request body"})
		return
	}

	log.Printf("🔄 Updating Ad ID %d: %s (Active: %v)", id, ad.Title, ad.IsActive)

	_, err = db.Exec(`
		UPDATE scheduled_ads 
		SET title = $1, description = $2, image = $3, start_date = $4, end_date = $5, start_time = $6, end_time = $7, is_active = $8
		WHERE id = $9
	`, ad.Title, ad.Description, ad.Image,
		nullIfEmpty(ad.StartDate), nullIfEmpty(ad.EndDate),
		nullIfEmpty(ad.StartTime), nullIfEmpty(ad.EndTime), ad.IsActive, id)

	if err != nil {
		log.Printf("❌ UpdateAd: Database execution error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": "Database error: " + err.Error()})
		return
	}

	log.Printf("✅ Ad ID %d updated successfully", id)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func DeleteAd(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	_, err := db.Exec("DELETE FROM scheduled_ads WHERE id = $1", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func GetActiveAd(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	loc, _ := time.LoadLocation("Asia/Makassar")
	now := time.Now().In(loc)
	dateStr := now.Format("2006-01-02")
	timeStr := now.Format("15:04:05")

	var ad ScheduledAd
	err := db.QueryRow(`
		SELECT id, title, description, image, end_date, end_time FROM scheduled_ads 
		WHERE is_active = TRUE 
		AND (start_date IS NULL OR start_date <= $1)
		AND (end_date IS NULL OR end_date >= $1)
		AND (start_time IS NULL OR start_time <= $2)
		AND (end_time IS NULL OR end_time >= $2)
		ORDER BY created_at DESC LIMIT 1
	`, dateStr, timeStr).Scan(&ad.ID, &ad.Title, &ad.Description, &ad.Image, &ad.EndDate, &ad.EndTime)

	if err != nil {
		if err == sql.ErrNoRows {
			json.NewEncoder(w).Encode(map[string]interface{}{"ad": nil})
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"ad": ad})
}

func AdminLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	adminUser := strings.TrimSpace(CleanEnv(os.Getenv("ADMIN_USERNAME")))
	adminPass := strings.TrimSpace(CleanEnv(os.Getenv("ADMIN_PASSWORD")))

	// Robust fallback if Env is missing
	if adminUser == "" {
		adminUser = "admin"
	}
	if adminPass == "" {
		adminPass = "Nuanu0361"
	}

	inputUser := strings.TrimSpace(creds.Username)
	inputPass := strings.TrimSpace(creds.Password)

	log.Printf("🔑 Login attempt for user: [%s] (Hex: %x)", inputUser, inputUser)

	if inputUser == adminUser && inputPass == adminPass {
		log.Println("✅ Login successful")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"token":   "nuanu_mock_token_2026",
		})
	} else {
		log.Printf("❌ Login failed. Expected: [%s] (%x) Received: [%s] (%x)", adminUser, adminUser, inputUser, inputUser)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Invalid username or password",
		})
	}
}

func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func CleanEnv(s string) string {
	cleaned := strings.Map(func(r rune) rune {
		if unicode.IsPrint(r) && !unicode.IsSpace(r) {
			return r
		}
		if unicode.IsSpace(r) {
			return ' '
		}
		return -1
	}, s)
	return strings.TrimSpace(cleaned)
}

func LoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		origin := r.Header.Get("Origin")
		
		// Clean logs for high frequency
		log.Printf("📥 [%s] %s (Origin: %s, From: %s)", r.Method, r.URL.Path, origin, r.RemoteAddr)
		
		next.ServeHTTP(w, r)
		
		elapsed := time.Since(start)
		if elapsed > 100*time.Millisecond {
			log.Printf("⚠️  SLUGGISH: %s took %v", r.URL.Path, elapsed)
		}
	})
}
