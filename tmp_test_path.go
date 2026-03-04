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
		"/auth/google/callback?code=123",
	}

	for _, p := range testPaths {
		path := strings.TrimRight(p, "/")
		fmt.Printf("Input: [%s] -> TrimRight: [%s]\n", p, path)
		
		match := false
		switch path {
		case "/auth/google/callback":
			match = true
		}
		fmt.Printf("  Match '/auth/google/callback': %v\n", match)
	}
}
