//
//  ConvexClient.swift
//  optionsdashboard
//
//  Created by Michael Baxter on 2025-11-05.
//

import Foundation

/// Client for communicating with Convex backend
actor ConvexClient {
    private let baseURL: URL
    private let session: URLSession
    var authToken: String?

    init(convexURL: String, authToken: String? = nil) {
        self.baseURL = URL(string: convexURL)!
        self.session = URLSession.shared
        self.authToken = authToken
    }

    func setAuthToken(_ token: String?) {
        self.authToken = token
    }
    
    /// Query data from Convex
    func query<T: Decodable & Sendable>(_ functionName: String, args: [String: Any] = [:]) async throws -> T {
        let url = baseURL.appendingPathComponent("api/query")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Don't send auth token in header - we pass it as sessionToken argument instead
        // if let token = authToken {
        //     request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        // }
        
        let body: [String: Any] = [
            "path": functionName,
            "args": [args]
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        print("🔵 Convex Query Request:")
        print("   URL: \(url)")
        print("   Function: \(functionName)")
        print("   Args: \(args)")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ConvexError.invalidResponse
        }
        
        print("🔵 Convex Query Response:")
        print("   Status Code: \(httpResponse.statusCode)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response Body: \(responseString)")
        }
        
        guard httpResponse.statusCode == 200 else {
            throw ConvexError.httpError(statusCode: httpResponse.statusCode)
        }
        
        // Check if response is an error
        if let errorResponse = try? JSONDecoder().decode(ConvexErrorResponse.self, from: data) {
            if errorResponse.status == "error" {
                print("❌ Convex Error: \(errorResponse.errorMessage)")
                throw ConvexError.serverError(errorResponse.errorMessage)
            }
        }
        
        // Convex wraps the response in a "value" field
        // Decode in a nonisolated context to avoid actor isolation issues
        return try await Task.detached {
            let convexResponse = try JSONDecoder().decode(ConvexResponse<T>.self, from: data)
            return convexResponse.value
        }.value
    }
    
    /// Mutate data in Convex
    func mutation<T: Decodable & Sendable>(_ functionName: String, args: [String: Any] = [:]) async throws -> T {
        let url = baseURL.appendingPathComponent("api/mutation")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let body: [String: Any] = [
            "path": functionName,
            "args": [args]
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        print("🟢 Convex Mutation Request:")
        print("   URL: \(url)")
        print("   Function: \(functionName)")
        print("   Args: \(args)")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ConvexError.invalidResponse
        }
        
        print("🟢 Convex Mutation Response:")
        print("   Status Code: \(httpResponse.statusCode)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response Body: \(responseString)")
        }
        
        guard httpResponse.statusCode == 200 else {
            throw ConvexError.httpError(statusCode: httpResponse.statusCode)
        }
        
        // Check if response is an error
        if let errorResponse = try? JSONDecoder().decode(ConvexErrorResponse.self, from: data) {
            if errorResponse.status == "error" {
                print("❌ Convex Error: \(errorResponse.errorMessage)")
                throw ConvexError.serverError(errorResponse.errorMessage)
            }
        }
        
        // Decode in a nonisolated context to avoid actor isolation issues
        return try await Task.detached {
            let convexResponse = try JSONDecoder().decode(ConvexResponse<T>.self, from: data)
            return convexResponse.value
        }.value
    }

    /// Run an action in Convex
    func action<T: Decodable & Sendable>(_ functionName: String, args: [String: Any] = [:]) async throws -> T {
        let url = baseURL.appendingPathComponent("api/action")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let body: [String: Any] = [
            "path": functionName,
            "args": [args]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        print("🟡 Convex Action Request:")
        print("   URL: \(url)")
        print("   Function: \(functionName)")
        print("   Args: \(args)")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ConvexError.invalidResponse
        }

        print("🟡 Convex Action Response:")
        print("   Status Code: \(httpResponse.statusCode)")

        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response Body: \(responseString)")
        }

        guard httpResponse.statusCode == 200 else {
            throw ConvexError.httpError(statusCode: httpResponse.statusCode)
        }

        // Check if response is an error
        if let errorResponse = try? JSONDecoder().decode(ConvexErrorResponse.self, from: data) {
            if errorResponse.status == "error" {
                print("❌ Convex Error: \(errorResponse.errorMessage)")
                throw ConvexError.serverError(errorResponse.errorMessage)
            }
        }

        // Decode in a nonisolated context to avoid actor isolation issues
        return try await Task.detached {
            let convexResponse = try JSONDecoder().decode(ConvexResponse<T>.self, from: data)
            return convexResponse.value
        }.value
    }
}

// MARK: - Response Models

private struct ConvexResponse<T: Decodable>: Decodable, Sendable where T: Sendable {
    let value: T
}

private struct ConvexErrorResponse: Decodable {
    let status: String
    let errorMessage: String
}

// MARK: - Errors

enum ConvexError: LocalizedError, Sendable {
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(String)
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .decodingError(let message):
            return "Failed to decode response: \(message)"
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }
}
