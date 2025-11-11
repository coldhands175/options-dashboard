//
//  Models.swift
//  optionsdashboard
//
//  Created by Michael Baxter on 2025-11-05.
//

import Foundation

// MARK: - Active Position (Aggregated View)

/// Represents an aggregated options position from multiple trades
/// Returned by trades:listActiveOptionPositions
struct ActiveOptionPosition: Identifiable, Sendable {
    let id: String // Computed from contract specs
    let underlying: String
    let optionType: OptionType
    let strike: Double
    let expiration: Date
    let netContracts: Double
    let side: PositionSide
    let openedAt: Date
    let latestTradeTime: Date
    let averagePremiumPerShare: Double // Weighted average premium per share
    let notional: Double // Total book value (premiumPerShare × netContracts × 100)

    enum CodingKeys: String, CodingKey {
        case underlying
        case optionType
        case strike
        case expiration
        case netContracts
        case side
        case openedAt
        case latestTradeTime
        case averagePremiumPerShare = "average_premium_per_share"
        case notional
    }

    /// Total book value (cost basis)
    var notionalValue: Double {
        notional
    }

    /// Average premium per share across all trades
    var premiumPerShare: Double {
        averagePremiumPerShare
    }

    /// Average premium per contract (100 shares)
    var premiumPerContract: Double {
        averagePremiumPerShare * 100
    }

    /// Returns a formatted expiration date
    var formattedExpiration: String {
        expiration.formatted(date: .abbreviated, time: .omitted)
    }

    /// Display name for the position
    var displayName: String {
        "\(underlying) \(Int(strike))\(optionType.shortName) \(formattedExpiration)"
    }
}

extension ActiveOptionPosition: Codable {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        underlying = try container.decode(String.self, forKey: .underlying)
        optionType = try container.decode(OptionType.self, forKey: .optionType)
        strike = try container.decode(Double.self, forKey: .strike)

        // Convex returns milliseconds since epoch
        let expirationMs = try container.decode(Double.self, forKey: .expiration)
        expiration = Date(timeIntervalSince1970: expirationMs / 1000)

        netContracts = try container.decode(Double.self, forKey: .netContracts)
        side = try container.decode(PositionSide.self, forKey: .side)

        let openedAtMs = try container.decode(Double.self, forKey: .openedAt)
        openedAt = Date(timeIntervalSince1970: openedAtMs / 1000)

        let latestMs = try container.decode(Double.self, forKey: .latestTradeTime)
        latestTradeTime = Date(timeIntervalSince1970: latestMs / 1000)

        // Decode weighted average premium and total notional from Convex
        averagePremiumPerShare = try container.decode(Double.self, forKey: .averagePremiumPerShare)
        notional = try container.decode(Double.self, forKey: .notional)

        // Generate ID from contract specs
        id = "\(underlying)-\(optionType.rawValue)-\(strike)-\(Int(expirationMs))"
    }
}

// MARK: - Option Trade (Individual Transaction)

/// Represents a single option trade transaction
struct OptionTrade: Identifiable, Sendable {
    let id: String
    let underlying: String
    let optionType: OptionType
    let strike: Double
    let expiration: Date
    let action: TradeAction
    let quantityContracts: Double
    let quantitySignedContracts: Double
    let premiumPerShare: Double // Premium per share (contract = 100 shares)
    let notional: Double // Total cost: premiumPerShare × quantityContracts × 100
    let tradeTime: Date
    let brokerTradeNumber: String?
    let accountTag: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case underlying
        case optionType
        case strike
        case expiration
        case action
        case quantityContracts = "quantity_contracts"
        case quantitySignedContracts = "quantity_signed_contracts"
        case premiumPerShare = "premium_per_share"
        case notional
        case tradeTime
        case brokerTradeNumber
        case accountTag
        case notes
    }

    /// Display name for the trade
    var displayName: String {
        "\(action.rawValue) \(Int(quantityContracts)) \(underlying) \(Int(strike))\(optionType.shortName)"
    }

    /// Formatted trade date
    var formattedTradeDate: String {
        tradeTime.formatted(date: .abbreviated, time: .shortened)
    }
}

extension OptionTrade: Codable {
    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        underlying = try container.decode(String.self, forKey: .underlying)
        optionType = try container.decode(OptionType.self, forKey: .optionType)
        strike = try container.decode(Double.self, forKey: .strike)

        let expirationMs = try container.decode(Double.self, forKey: .expiration)
        expiration = Date(timeIntervalSince1970: expirationMs / 1000)

        action = try container.decode(TradeAction.self, forKey: .action)
        quantityContracts = try container.decode(Double.self, forKey: .quantityContracts)
        quantitySignedContracts = try container.decode(Double.self, forKey: .quantitySignedContracts)
        premiumPerShare = try container.decode(Double.self, forKey: .premiumPerShare)
        notional = try container.decode(Double.self, forKey: .notional)

        let tradeTimeMs = try container.decode(Double.self, forKey: .tradeTime)
        tradeTime = Date(timeIntervalSince1970: tradeTimeMs / 1000)

        brokerTradeNumber = try container.decodeIfPresent(String.self, forKey: .brokerTradeNumber)
        accountTag = try container.decodeIfPresent(String.self, forKey: .accountTag)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
    }
}

// MARK: - Enums

enum OptionType: String, Codable, Sendable {
    case CALL = "CALL"
    case PUT = "PUT"

    var displayName: String {
        rawValue.capitalized
    }

    var shortName: String {
        self == .CALL ? "C" : "P"
    }
}

enum TradeAction: String, Codable, Sendable {
    case BTO = "BTO" // Buy to Open
    case BTC = "BTC" // Buy to Close
    case STO = "STO" // Sell to Open
    case STC = "STC" // Sell to Close

    var displayName: String {
        switch self {
        case .BTO: return "Buy to Open"
        case .BTC: return "Buy to Close"
        case .STO: return "Sell to Open"
        case .STC: return "Sell to Close"
        }
    }

    var isOpening: Bool {
        self == .BTO || self == .STO
    }

    var isClosing: Bool {
        self == .BTC || self == .STC
    }
}

enum PositionSide: String, Codable, Sendable {
    case Long = "Long"
    case Short = "Short"

    var displayName: String {
        rawValue
    }
}

/// Portfolio summary statistics
struct PortfolioSummary: Sendable {
    let totalValue: Double
    let totalProfitLoss: Double
    let openPositions: Int

    var profitLossPercentage: Double {
        guard totalValue > 0 else { return 0 }
        return (totalProfitLoss / totalValue) * 100
    }
}
