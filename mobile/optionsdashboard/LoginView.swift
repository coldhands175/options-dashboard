//
//  LoginView.swift
//  optionsdashboard
//
//  Created by Michael Baxter on 2025-11-06.
//

import SwiftUI

struct LoginView: View {
    let authManager: AuthManager

    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Logo/Header
                VStack(spacing: 8) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 60))
                        .foregroundStyle(.blue)

                    Text("Options Dashboard")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Track your options trades")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 60)

                Spacer()

                // Login Form
                VStack(spacing: 16) {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.emailAddress)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)

                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)

                    Button {
                        Task {
                            await authManager.signIn(email: email, password: password)
                        }
                    } label: {
                        if authManager.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else {
                            Text("Sign In")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .padding()
                        }
                    }
                    .background(canSignIn ? Color.blue : Color.gray)
                    .foregroundStyle(.white)
                    .cornerRadius(10)
                    .disabled(!canSignIn || authManager.isLoading)

                    if let error = authManager.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, 32)

                Spacer()

                // Footer
                Text("Sign in with your Convex account")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 32)
            }
            .navigationBarHidden(true)
        }
    }

    private var canSignIn: Bool {
        !email.isEmpty && !password.isEmpty
    }
}

#Preview {
    LoginView(authManager: AuthManager())
}
