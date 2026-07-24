import SwiftUI

@main
struct MailApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 900, minHeight: 560)
        }
    }
}

struct ContentView: View {
    @State private var selectedFolder: MailFolder.ID?
    @State private var selectedThread: MailThread.ID?
    private let threads = MockData.threads

    var body: some View {
        NavigationSplitView {
            SidebarView(selectedFolder: $selectedFolder)
                .navigationSplitViewColumnWidth(min: 200, ideal: 220, max: 300)
        } content: {
            ThreadListView(threads: threads, selection: $selectedThread)
                .navigationSplitViewColumnWidth(min: 340, ideal: 420, max: 640)
        } detail: {
            if let id = selectedThread, let t = threads.first(where: { $0.id == id }) {
                ReadingPaneView(thread: t)
            } else {
                EmptyReadingState()
            }
        }
        .navigationSplitViewStyle(.balanced)
    }
}

struct EmptyReadingState: View {
    var body: some View {
        VStack(spacing: 8) {
            Text("Select a conversation to read")
                .font(Typo.duo(15))
                .foregroundStyle(Palette.inkTertiary)
            Text("j/k or arrows to navigate · Enter to open · c to compose")
                .font(Typo.mono(12))
                .foregroundStyle(Palette.inkFaint)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.paper)
    }
}
