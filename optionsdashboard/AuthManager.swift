//
//  AuthManager.swift
//  optionsdashboard
//
//  Created by Michael Baxter on 2025-11-06.
//

import Foundation
import SwiftUI

@Observable
class AuthManager {
    @MainActor
    var isAuthenticated = false

    @MainActor
    var currentUser: User?

    @MainActor
    var authToken: String?

    @MainActor
    var isLoading = false

    @MainActor
    var errorMessage: String?

    private let convexClient: ConvexClient

    init(convexURL: String = "https://clever-poodle-30.convex.cloud") {
        self.convexClient = ConvexClient(convexURL: convexURL)
        loadStoredAuth()
    }

    @MainActor
    private func loadStoredAuth() {
        if let token = UserDefaults.standard.string(forKey: "authToken") {
            authToken = token
            isAuthenticated = true
        }
    }

    @MainActor
    private func saveAuth(token: String) {
        authToken = token
        isAuthenticated = true
        UserDefaults.standard.set(token, forKey: "authToken")
    }

    @MainActor
    func clearAuth() {
        authToken = nil
        currentUser = nil
        isAuthenticated = false
        UserDefaults.standard.removeObject(forKey: "authToken")
    }

    func signIn(email: String, password: String) async {
        await MainActor.run { isLoading = true }
        await MainActor.run { errorMessage = nil }

        do {
            let args: [String: Any] = [
                "provider": "password",
                "params": [
                    "flow": "signIn",
                    "email": email,
                    "password": password
                ]
            ]

            nonisolated(unsafe) struct SignInResponse: Decodable, Sendable {
                let tokens: Tokens?

                nonisolated(unsafe) struct Tokens: Decodable, Sendable {
                    let token: String
                }
            }

            let response: SignInResponse = try await convexClient.mutation("authFunctions:signIn", args: args)

            if let token = response.tokens?.token {
                await MainActor.run {
                    saveAuth(token: token)
                }
            } else {
                await MainActor.run {
                    errorMessage = "Authentication failed: No token received"
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Sign in failed: \(error.localizedDescription)"
            }
            print("Sign in error: \(error)")
        }

        await MainActor.run { isLoading = false }
    }

    func signOut() async {
        await MainActor.run { isLoading = true }

        do {
            let _: EmptyResponse = try await convexClient.mutation("authFunctions:signOut")
        } catch {
            print("Sign out error (ignored): \(error)")
        }

        await MainActor.run {
            clearAuth()
            isLoading = false
        }
    }
}

// MARK: - Supporting Types

struct User: Codable, Sendable {
    let id: String
    let email: String?
    let name: String?
}

private nonisolated(unsafe) struct EmptyResponse: Decodable, Sendable {}
