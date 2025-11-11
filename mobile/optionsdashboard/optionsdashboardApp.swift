//
//  optionsdashboardApp.swift
//  optionsdashboard
//
//  Created by Michael Baxter on 2025-11-05.
//

import SwiftUI

@main
struct optionsdashboardApp: App {
    @State private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            if authManager.isAuthenticated {
                ContentView(authManager: authManager)
            } else {
                LoginView(authManager: authManager)
            }
        }
    }
}
