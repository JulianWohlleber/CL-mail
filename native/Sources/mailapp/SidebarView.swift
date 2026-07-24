import SwiftUI

struct SidebarView: View {
    @Binding var selectedFolder: MailFolder.ID?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 2) {
                // Unified inbox
                HStack(spacing: 8) {
                    Text("∀").font(Typo.mono(12)).frame(width: 16)
                    Text("All Inboxes").font(Typo.duo(14, .bold)).foregroundStyle(Palette.ink)
                    Spacer()
                    Text("6").font(Typo.mono(11)).foregroundStyle(Palette.inkTertiary)
                }
                .padding(.horizontal, 8).padding(.vertical, 5)

                Divider().padding(.vertical, 6)

                // Accounts
                ForEach(MockData.accounts) { a in
                    HStack(spacing: 8) {
                        Text("✉").font(Typo.mono(11)).foregroundStyle(Palette.inkTertiary.opacity(0.5))
                        Text(a.email).font(Typo.duo(13)).foregroundStyle(Palette.inkSecondary).lineLimit(1)
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, 8).padding(.vertical, 4)
                }

                Divider().padding(.vertical, 6)

                // Folders
                ForEach(MockData.folders) { f in
                    Button {
                        selectedFolder = f.id
                    } label: {
                        HStack(spacing: 8) {
                            Text(f.symbol).font(Typo.mono(12)).frame(width: 16)
                            Text(f.name).font(Typo.duo(14, selectedFolder == f.id ? .bold : .regular))
                            Spacer()
                            if f.unread > 0 {
                                Text("\(f.unread)").font(Typo.mono(11)).foregroundStyle(Palette.inkTertiary)
                            }
                        }
                        .foregroundStyle(selectedFolder == f.id ? Palette.ink : Palette.inkSecondary)
                        .padding(.horizontal, 8).padding(.vertical, 5)
                        .background(selectedFolder == f.id ? Palette.paperRaised : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 5))
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(8)
        }
        .background(Palette.paperSunken)
    }
}
