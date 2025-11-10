//
//  ContentView.swift
//  optionsdashboard
//
//  Created by Michael Baxter on 2025-11-05.
//

import SwiftUI

struct ContentView: View {
    let authManager: AuthManager
    @State private var viewModel: PortfolioViewModel
    @State private var showingAddTrade = false
    @State private var showingTradeHistory = false

    init(authManager: AuthManager) {
        self.authManager = authManager
        self._viewModel = State(initialValue: PortfolioViewModel(authToken: authManager.authToken))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Portfolio Summary Header
                portfolioSummaryView
                    .padding()
                    .background(Color(.systemGray6))

                // Positions List
                if viewModel.isLoading && viewModel.positions.isEmpty {
                    ProgressView("Loading positions...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.positions.isEmpty {
                    emptyStateView
                } else {
                    positionsList
                }
            }
            .navigationTitle("Options Portfolio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingAddTrade = true
                    } label: {
                        Label("Add Trade", systemImage: "plus")
                    }
                }

                ToolbarItem(placement: .secondaryAction) {
                    Button {
                        Task {
                            await viewModel.fetchPositions()
                        }
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                    .disabled(viewModel.isLoading)
                }

                ToolbarItem(placement: .secondaryAction) {
                    Button {
                        showingTradeHistory = true
                    } label: {
                        Label("History", systemImage: "clock")
                    }
                }

                ToolbarItem(placement: .secondaryAction) {
                    Button {
                        Task {
                            await authManager.signOut()
                        }
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .sheet(isPresented: $showingAddTrade) {
                AddTradeView(viewModel: viewModel)
            }
            .sheet(isPresented: $showingTradeHistory) {
                TradeHistoryView(viewModel: viewModel)
            }
            .task {
                await viewModel.fetchPositions()
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                if let error = viewModel.errorMessage {
                    Text(error)
                }
            }
        }
    }
    
    private var portfolioSummaryView: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Total Value")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("$\(viewModel.summary.totalValue, specifier: "%.2f")")
                        .font(.title2)
                        .fontWeight(.semibold)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Open Positions")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("\(viewModel.summary.openPositions)")
                        .font(.title2)
                        .fontWeight(.semibold)
                }
            }
        }
    }
    
    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("No Positions", systemImage: "chart.line.uptrend.xyaxis")
        } description: {
            Text("Add your first options trade to get started")
        } actions: {
            Button("Add Trade") {
                showingAddTrade = true
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var positionsList: some View {
        List {
            ForEach(viewModel.positions) { position in
                PositionRow(position: position)
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Position Row

struct PositionRow: View {
    let position: ActiveOptionPosition

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(position.underlying)
                    .font(.headline)

                Text(position.optionType.displayName)
                    .font(.caption)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(position.optionType == .CALL ? Color.green.opacity(0.2) : Color.red.opacity(0.2))
                    .foregroundStyle(position.optionType == .CALL ? .green : .red)
                    .cornerRadius(4)

                Spacer()

                Text(position.side.displayName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(position.side == .Long ? .blue : .orange)
            }

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Strike: $\(position.strike, specifier: "%.2f")")
                        .font(.subheadline)
                    Text("Exp: \(position.formattedExpiration)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Contracts: \(position.netContracts, specifier: "%.0f")")
                        .font(.subheadline)
                    Text("Opened: \(position.openedAt.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            HStack {
                Text("Price: $\(position.averagePremiumPerShare, specifier: "%.2f")")
                    .font(.subheadline)

                Spacer()

                Text("Book Value: $\(position.notionalValue, specifier: "%.2f")")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    ContentView(authManager: AuthManager())
}
