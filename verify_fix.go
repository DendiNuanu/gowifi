package main

import (
	"fmt"
	"strings"
)

func main() {
	testPaths := []string{
		"/auth/google/callback",
		"/auth/google/callback/",
		"//auth/google/callback",
		"/AUTH/GOOGLE/CALLBACK",
		"/api/auth/google/callback",
		"/auth/facebook/callback",
		"/auth/facebook/callback/",
		"//auth/facebook/callback",
	}

	for _, rawPath := range testPaths {
		// Mimic implementation logic
		path := strings.ToLower(strings.TrimRight(rawPath, "/"))
		
		matchGoogle := strings.HasSuffix(path, "/auth/google/callback")
		matchFacebook := strings.HasSuffix(path, "/auth/facebook/callback")
		
		fmt.Printf("Raw: [%-25s] -> Clean: [%-25s] | Google: %-5v | Facebook: %-5v\n", 
			rawPath, path, matchGoogle, matchFacebook)
	}
}
