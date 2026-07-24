import SwiftUI

struct ReadingPaneView: View {
    let thread: MailThread

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            ScrollView {
                VStack(spacing: 14) {
                    ForEach(thread.messages) { m in
                        MessageCard(message: m)
                    }
                }
                .padding(16)
            }
            Divider()
            replyBar
        }
        .background(Palette.paper)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(thread.subject)
                    .font(Typo.duo(20, .bold))
                    .foregroundStyle(Palette.ink)
                Spacer()
                HStack(spacing: 14) {
                    ForEach(["▣", "✕", "▸", "◔", "☆", "◷"], id: \.self) { sym in
                        Text(sym).font(Typo.mono(14)).foregroundStyle(Palette.inkTertiary)
                    }
                }
            }
            Text("\(thread.messageCount) message\(thread.messageCount == 1 ? "" : "s")")
                .font(Typo.mono(11))
                .foregroundStyle(Palette.inkTertiary)
        }
        .padding(.horizontal, 16).padding(.vertical, 14)
    }

    private var replyBar: some View {
        HStack(spacing: 8) {
            replyButton("↩", "Reply")
            replyButton("↩↩", "Reply All")
            replyButton("→", "Forward")
            Spacer()
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .background(Palette.paperRaised)
    }

    private func replyButton(_ symbol: String, _ label: String) -> some View {
        HStack(spacing: 6) {
            Text(symbol).font(Typo.mono(12))
            Text(label).font(Typo.duo(13))
        }
        .foregroundStyle(Palette.inkSecondary)
        .padding(.horizontal, 12).padding(.vertical, 6)
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Palette.border))
    }
}

struct MessageCard: View {
    let message: Message

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(message.fromName).font(Typo.duo(14, .bold)).foregroundStyle(Palette.ink)
                    Text(message.fromEmail).font(Typo.mono(11)).foregroundStyle(Palette.inkTertiary)
                }
                Spacer()
                Text(message.date).font(Typo.mono(11)).foregroundStyle(Palette.inkTertiary)
            }
            HStack(spacing: 6) {
                Text("to").font(Typo.mono(10)).foregroundStyle(Palette.inkFaint)
                Text(message.to).font(Typo.mono(11)).foregroundStyle(Palette.inkTertiary)
            }
            Divider()
            Text(message.body)
                .font(Typo.duo(14))
                .foregroundStyle(Palette.ink)
                .lineSpacing(4)
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.paperOverlay)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Palette.border))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
