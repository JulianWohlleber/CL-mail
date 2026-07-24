import SwiftUI

struct ThreadListView: View {
    let threads: [MailThread]
    @Binding var selection: MailThread.ID?

    var body: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack(spacing: 6) {
                Text("⌕").foregroundStyle(Palette.inkTertiary.opacity(0.6))
                Text("Search mail…").font(Typo.duo(13)).foregroundStyle(Palette.inkTertiary)
                Spacer()
                Text("/")
                    .font(Typo.mono(11)).foregroundStyle(Palette.inkTertiary)
                    .padding(.horizontal, 5).padding(.vertical, 1)
                    .background(Palette.paperRaised)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .padding(.horizontal, 8).padding(.vertical, 6)
            .background(Palette.paperRaised)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Palette.border))
            .padding(8)

            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(threads) { t in
                        ThreadRow(thread: t, selected: selection == t.id)
                            .contentShape(Rectangle())
                            .onTapGesture { selection = t.id }
                        Divider()
                    }
                }
            }
        }
        .background(Palette.paper)
    }
}

struct ThreadRow: View {
    let thread: MailThread
    let selected: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 6) {
                if thread.replied {
                    Text("↩").font(Typo.mono(11, .bold)).foregroundStyle(Palette.accent)
                }
                Text(thread.senderName)
                    .font(Typo.duo(15, thread.unread ? .bold : .regular))
                    .foregroundStyle(Palette.ink)
                if thread.replied {
                    Text("REPLIED")
                        .font(Typo.mono(9)).foregroundStyle(Palette.accent)
                        .padding(.horizontal, 4).padding(.vertical, 1)
                        .overlay(RoundedRectangle(cornerRadius: 3).stroke(Palette.accent))
                }
                Spacer()
                if thread.hasAttachment {
                    Text("􀉁").font(.system(size: 11)).foregroundStyle(Palette.inkTertiary)
                }
                Text(thread.date).font(Typo.mono(11)).foregroundStyle(Palette.inkTertiary)
            }
            Text(thread.subject).font(Typo.duo(14)).foregroundStyle(Palette.inkSecondary).lineLimit(1)
            Text(thread.snippet).font(Typo.duo(13)).foregroundStyle(Palette.inkTertiary).lineLimit(1)
        }
        .padding(.horizontal, 12).padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(selected ? Palette.accentSubtle : Color.clear)
        .overlay(alignment: .leading) {
            if thread.replied || selected {
                Rectangle().fill(Palette.accent).frame(width: 3)
            }
        }
    }
}
