//
//  AddTradeView.swift
//  optionsdashboard
//
//  Created by Michael Baxter on 2025-11-05.
//

import SwiftUI

struct AddTradeView: View {
    @Environment(\.dismiss) private var dismiss
    let viewModel: PortfolioViewModel

    @State private var underlying = ""
    @State private var optionType: OptionType = .CALL
    @State private var strike = ""
    @State private var expiration = Date().addingTimeInterval(30 * 24 * 60 * 60) // 30 days from now
    @State private var action: TradeAction = .BTO
    @State private var quantity = ""
    @State private var premium = ""
    @State private var tradeTime = Date()
    @State private var notes = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Contract Details") {
                    TextField("Symbol", text: $underlying)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()

                    Picker("Type", selection: $optionType) {
                        Text("Call").tag(OptionType.CALL)
                        Text("Put").tag(OptionType.PUT)
                    }
                    .pickerStyle(.segmented)

                    TextField("Strike Price", text: $strike)
                        .keyboardType(.decimalPad)

                    DatePicker("Expiration Date", selection: $expiration, displayedComponents: .date)
                }

                Section("Trade Details") {
                    Picker("Action", selection: $action) {
                        ForEach([TradeAction.BTO, .BTC, .STO, .STC], id: \.self) { action in
                            Text(action.displayName).tag(action)
                        }
                    }

                    DatePicker("Trade Date", selection: $tradeTime, displayedComponents: [.date, .hourAndMinute])

                    TextField("Quantity (contracts)", text: $quantity)
                        .keyboardType(.decimalPad)

                    TextField("Premium (per share)", text: $premium)
                        .keyboardType(.decimalPad)
                }

                Section("Optional") {
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }

                if let notional = calculateNotional() {
                    Section {
                        HStack {
                            Text("Total Notional")
                                .fontWeight(.medium)
                            Spacer()
                            Text("$\(notional, specifier: "%.2f")")
                                .fontWeight(.semibold)
                        }

                        HStack {
                            Text("Action Summary")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(actionSummary)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Add Trade")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task {
                            await addTrade()
                        }
                    }
                    .disabled(!isValidInput)
                }
            }
        }
    }

    private var isValidInput: Bool {
        !underlying.isEmpty &&
        Double(strike) != nil &&
        Double(quantity) != nil &&
        Double(premium) != nil
    }

    private func calculateNotional() -> Double? {
        guard let qty = Double(quantity),
              let prem = Double(premium) else {
            return nil
        }

        return prem * qty * 100 // Options contracts are 100 shares
    }

    private var actionSummary: String {
        guard let qty = Double(quantity) else { return "" }
        let contracts = Int(qty)
        return "\(action.rawValue) \(contracts) contract\(contracts == 1 ? "" : "s")"
    }

    private func addTrade() async {
        guard let strikeValue = Double(strike),
              let qtyValue = Double(quantity),
              let premValue = Double(premium) else {
            return
        }

        await viewModel.addTrade(
            underlying: underlying.uppercased(),
            optionType: optionType,
            strike: strikeValue,
            expiration: expiration,
            action: action,
            quantity: qtyValue,
            premium: premValue,
            tradeTime: tradeTime,
            accountTag: nil,
            notes: notes.isEmpty ? nil : notes
        )

        dismiss()
    }
}

#Preview {
    AddTradeView(viewModel: PortfolioViewModel())
}
