//
//  TradeHistoryView.swift
//  optionsdashboard
//
//  Created by Michael Baxter on 2025-11-06.
//

import SwiftUI

struct TradeHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    let viewModel: PortfolioViewModel

    @State private var groupByPosition = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.trades.isEmpty {
                    ProgressView("Loading trades...")
                } else if viewModel.trades.isEmpty {
                    emptyStateView
                } else {
                    if groupByPosition {
                        groupedTradesList
                    } else {
                        chronologicalTradesList
                    }
                }
            }
            .navigationTitle("Trade History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .primaryAction) {
                    Button {
                        groupByPosition.toggle()
                    } label: {
                        Label(groupByPosition ? "Chronological" : "By Position",
                              systemImage: groupByPosition ? "clock" : "square.grid.2x2")
                    }
                }

                ToolbarItem(placement: .secondaryAction) {
                    Button {
                        Task {
                            await viewModel.fetchTrades()
                        }
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                    .disabled(viewModel.isLoading)
                }
            }
            .task {
                await viewModel.fetchTrades()
            }
        }
    }

    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("No Trades", systemImage: "doc.text")
        } description: {
            Text("Your trade history will appear here")
        }
    }

    private var chronologicalTradesList: some View {
        List {
            ForEach(viewModel.trades) { trade in
                TradeRow(trade: trade)
            }
        }
        .listStyle(.plain)
    }

    private var groupedTradesList: some View {
        List {
            ForEach(groupedTrades.keys.sorted(by: >), id: \.self) { positionKey in
                Section {
                    ForEach(groupedTrades[positionKey] ?? []) { trade in
                        TradeRow(trade: trade, hideContractDetails: true)
                    }
                } header: {
                    Text(positionKey)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private var groupedTrades: [String: [OptionTrade]] {
        Dictionary(grouping: viewModel.trades) { trade in
            "\(trade.underlying) \(Int(trade.strike))\(trade.optionType.shortName) \(trade.expiration.formatted(date: .abbreviated, time: .omitted))"
        }
    }
}

// MARK: - Trade Row

struct TradeRow: View {
    let trade: OptionTrade
    var hideContractDetails: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                if !hideContractDetails {
                    Text(trade.underlying)
                        .font(.headline)

                    Text(trade.optionType.displayName)
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(trade.optionType == .CALL ? Color.green.opacity(0.2) : Color.red.opacity(0.2))
                        .foregroundStyle(trade.optionType == .CALL ? .green : .red)
                        .cornerRadius(4)
                }

                Text(trade.action.rawValue)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(actionBackgroundColor)
                    .foregroundStyle(actionForegroundColor)
                    .cornerRadius(4)

                Spacer()

                Text(trade.formattedTradeDate)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if !hideContractDetails {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Strike: $\(trade.strike, specifier: "%.2f")")
                            .font(.subheadline)
                        Text("Exp: \(trade.expiration.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Qty: \(trade.quantityContracts, specifier: "%.0f")")
                            .font(.subheadline)
                        Text("Premium: $\(trade.premiumPerShare, specifier: "%.2f")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            } else {
                HStack {
                    Text("Qty: \(trade.quantityContracts, specifier: "%.0f")")
                        .font(.subheadline)

                    Spacer()

                    Text("Premium: $\(trade.premiumPerShare, specifier: "%.2f")")
                        .font(.subheadline)
                }
            }

            HStack {
                Text("Notional: $\(trade.notional, specifier: "%.2f")")
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let notes = trade.notes {
                    Spacer()
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var actionBackgroundColor: Color {
        switch trade.action {
        case .BTO, .STO:
            return Color.blue.opacity(0.2)
        case .BTC, .STC:
            return Color.purple.opacity(0.2)
        }
    }

    private var actionForegroundColor: Color {
        switch trade.action {
        case .BTO, .STO:
            return .blue
        case .BTC, .STC:
            return .purple
        }
    }
}

#Preview {
    TradeHistoryView(viewModel: PortfolioViewModel())
}
