import Foundation

// Plain value models for the scaffold. In the full build these are backed by
// GRDB (SQLite + FTS5) and populated by the IMAP sync engine (MailCore2).

struct Account: Identifiable, Hashable {
    let id = UUID()
    let email: String
}

struct MailFolder: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let symbol: String        // matches FOLDER_ICONS from the Electron app
    var unread: Int = 0
}

struct Message: Identifiable, Hashable {
    let id = UUID()
    let fromName: String
    let fromEmail: String
    let to: String
    let date: String
    let body: String
}

struct MailThread: Identifiable, Hashable {
    let id = UUID()
    let senderName: String
    let subject: String
    let snippet: String
    let date: String
    var unread: Bool = false
    var replied: Bool = false
    var hasAttachment: Bool = false
    var messageCount: Int = 1
    var messages: [Message] = []
}
