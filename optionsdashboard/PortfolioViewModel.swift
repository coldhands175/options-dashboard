//
//  PortfolioViewModel.swift
//  optionsdashboard
//
//  Created by Michael Baxter on 2025-11-05.
//

import Foundation
import SwiftUI

@Observable
class PortfolioViewModel {
    private let convexClient: ConvexClient

    @MainActor
    var positions: [ActiveOptionPosition] = []

    @MainActor
    var trades: [OptionTrade] = []

    @MainActor
    var isLoading = false

    @MainActor
    var errorMessage: String?

    init(convexURL: String = "https://clever-poodle-30.convex.cloud", authToken: String? = nil) {
        self.convexClient = ConvexClient(convexURL: convexURL, authToken: authToken)
    }

    /// Fetch all active positions from Convex
    func fetchPositions() async {
        await MainActor.run { isLoading = true }
        await MainActor.run { errorMessage = nil }

        do {
            let result: [ActiveOptionPosition] = try await convexClient.query("trades:listActiveOptionPositions")
            await MainActor.run { positions = result }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load positions: \(error.localizedDescription)"
            }
            print("Error fetching positions: \(error)")
        }

        await MainActor.run { isLoading = false }
    }

    /// Fetch trade history from Convex
    func fetchTrades() async {
        await MainActor.run { isLoading = true }
        await MainActor.run { errorMessage = nil }

        do {
            // Note: listUserTransactions returns both stock and option trades
            // We'll need to filter for option trades
            nonisolated(unsafe) struct TransactionResponse: Decodable, Sendable {
                let items: [Transaction]
            }

            nonisolated(unsafe) enum Transaction: Decodable, Sendable {
                case option(OptionTrade)
                case stock // We'll ignore stock trades for now

                enum CodingKeys: String, CodingKey {
                    case kind
                }

                init(from decoder: Decoder) throws {
                    let container = try decoder.container(keyedBy: CodingKeys.self)
                    let kind = try container.decode(String.self, forKey: .kind)

                    if kind == "option" {
                        let trade = try OptionTrade(from: decoder)
                        self = .option(trade)
                    } else {
                        self = .stock
                    }
                }
            }

            let response: TransactionResponse = try await convexClient.query("trades:listUserTransactions")
            let optionTrades = response.items.compactMap { transaction -> OptionTrade? in
                if case .option(let trade) = transaction {
                    return trade
                }
                return nil
            }

            await MainActor.run { trades = optionTrades }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load trades: \(error.localizedDescription)"
            }
            print("Error fetching trades: \(error)")
        }

        await MainActor.run { isLoading = false }
    }

    /// Add a new trade
    func addTrade(
        underlying: String,
        optionType: OptionType,
        strike: Double,
        expiration: Date,
        action: TradeAction,
        quantity: Double,
        premium: Double,
        tradeTime: Date = Date(),
        accountTag: String? = nil,
        notes: String? = nil
    ) async {
        await MainActor.run { isLoading = true }
        await MainActor.run { errorMessage = nil }

        do {
            var args: [String: Any] = [
                "underlying": underlying.uppercased(),
                "optionType": optionType.rawValue,
                "strike": strike,
                "expiration": expiration.timeIntervalSince1970 * 1000, // Convex uses milliseconds
                "action": action.rawValue,
                "quantity_contracts": abs(quantity),
                "premium_per_contract": premium,
                "tradeTime": tradeTime.timeIntervalSince1970 * 1000
            ]

            if let accountTag = accountTag {
                args["accountTag"] = accountTag
            }

            if let notes = notes {
                args["notes"] = notes
            }

            let _: String = try await convexClient.mutation("trades:createOptionTrade", args: args)

            // Refresh positions and trades after adding
            await fetchPositions()
            await fetchTrades()
        } catch {
            await MainActor.run {
                errorMessage = "Failed to add trade: \(error.localizedDescription)"
            }
            print("Error adding trade: \(error)")
        }

        await MainActor.run { isLoading = false }
    }

    /// Calculate portfolio summary
    @MainActor
    var summary: PortfolioSummary {
        let totalValue = positions.reduce(0.0) { $0 + $1.notionalValue }

        return PortfolioSummary(
            totalValue: totalValue,
            totalProfitLoss: 0, // TODO: Add market data to calculate P&L
            openPositions: positions.count
        )
    }
}
