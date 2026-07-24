import SwiftUI
import AppKit

// The mail_ design system, ported 1:1 from the Electron app's tokens
// (src/renderer/src/styles/tokens/*). Warm paper tones, iA Writer type.

extension NSColor {
    convenience init(hex: UInt32) {
        self.init(
            srgbRed: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: 1
        )
    }
}

extension Color {
    /// A colour that resolves light/dark automatically, matching the CSS tokens.
    static func dyn(_ light: UInt32, _ dark: UInt32) -> Color {
        Color(nsColor: NSColor(name: nil, dynamicProvider: { appearance in
            let isDark = appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
            return NSColor(hex: isDark ? dark : light)
        }))
    }
}

enum Palette {
    static let paper        = Color.dyn(0xFAFAF8, 0x1A1A1A)
    static let paperRaised  = Color.dyn(0xF0F0EC, 0x242422)
    static let paperSunken  = Color.dyn(0xEEEEE9, 0x141412)
    static let paperOverlay = Color.dyn(0xFFFFFF, 0x2A2A28)
    static let ink          = Color.dyn(0x1A1A1A, 0xE8E8E4)
    static let inkSecondary = Color.dyn(0x4A4A48, 0xB0B0AA)
    static let inkTertiary  = Color.dyn(0x8A8A86, 0x787874)
    static let inkFaint     = Color.dyn(0xC4C4BE, 0x484844)
    static let accent       = Color.dyn(0x2B3FA0, 0x7B8FD4)
    static let accentSubtle = Color.dyn(0xECEEF7, 0x22243A)
    static let border       = Color.dyn(0xE5E5E0, 0x333330)
    static let star         = Color(nsColor: NSColor(hex: 0xF1C40F))
    static let emailCanvas  = Color(nsColor: NSColor(hex: 0xFFFFFF))
}

// iA Writer if installed (as in the Electron app), else the system falls back.
enum Typo {
    static func duo(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        Font.custom("iA Writer Duo S", size: size).weight(weight)
    }
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        Font.custom("iA Writer Mono S", size: size).weight(weight)
    }
}
