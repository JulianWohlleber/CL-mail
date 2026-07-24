import Foundation

// Demo data (no real correspondence) — mirrors the redacted README hero so the
// native shell visibly matches the Electron app. Replaced by the sync engine.

enum MockData {
    static let accounts: [Account] = [
        Account(email: "lucas@design-space.studio"),
        Account(email: "hello@design-space.studio"),
        Account(email: "payments@studio.co"),
        Account(email: "accounts@studio.co")
    ]

    static let folders: [MailFolder] = [
        MailFolder(name: "Inbox", symbol: "↓"),
        MailFolder(name: "Sent", symbol: "↑"),
        MailFolder(name: "Drafts", symbol: "✎"),
        MailFolder(name: "Archive", symbol: "▣", unread: 2),
        MailFolder(name: "Spam", symbol: "⚠"),
        MailFolder(name: "Trash", symbol: "✕"),
        MailFolder(name: "Documents", symbol: "▸")
    ]

    static let threads: [MailThread] = [
        MailThread(
            senderName: "Alice Bergström",
            subject: "Re: Q3 review",
            snippet: "Morning — are you around this week to…",
            date: "6 Jul",
            hasAttachment: true,
            messages: [
                Message(
                    fromName: "Alice Bergström",
                    fromEmail: "alice@example.com",
                    to: "lucas@design-space.studio",
                    date: "Mon, 6 Jul 2026, 09:17",
                    body: """
                    Morning Lucas,

                    Hope all's well! Are you around this week? Curious how the \
                    v2 pass is going — happy to jump on a quick call if easier.

                    Let me know if you need anything else from my side.

                    Thanks,
                    Alice
                    """
                )
            ]
        ),
        MailThread(
            senderName: "Jonas Weber",
            subject: "Onepager with the study added",
            snippet: "Hi Lucas — you're clear to publish, I've…",
            date: "2 Jul",
            messages: [
                Message(fromName: "Jonas Weber", fromEmail: "jonas@example.com",
                        to: "lucas@design-space.studio", date: "2 Jul 2026",
                        body: "Hi Lucas — you're clear to publish, I've added the study to the onepager.")
            ]
        ),
        MailThread(
            senderName: "Sofia Lindqvist",
            subject: "Fwd: partner intro",
            snippet: "Could you take a quick look at this when…",
            date: "26 Jun",
            messages: [
                Message(fromName: "Sofia Lindqvist", fromEmail: "sofia@example.com",
                        to: "lucas@design-space.studio", date: "26 Jun 2026",
                        body: "Could you take a quick look at this when you get a moment?")
            ]
        ),
        MailThread(
            senderName: "Product Team",
            subject: "We're updating our Privacy Policy",
            snippet: "We're writing to let you know about…",
            date: "24 Jun",
            messages: [
                Message(fromName: "Product Team", fromEmail: "team@example.com",
                        to: "lucas@design-space.studio", date: "24 Jun 2026",
                        body: "We're writing to let you know about some changes to our Privacy Policy.")
            ]
        ),
        MailThread(
            senderName: "You",
            subject: "Re: Link to the deck",
            snippet: "Just shared it — thanks for the nudge…",
            date: "20 Jun",
            replied: true,
            messageCount: 5,
            messages: [
                Message(fromName: "You", fromEmail: "lucas@design-space.studio",
                        to: "sam@example.com", date: "20 Jun 2026",
                        body: "Just shared it — thanks for the nudge.")
            ]
        )
    ]
}
