# Apple HIG — Decision Model for Flutter

This reference is a **thinking model**, not a static copy of Apple documentation. When exact current behavior matters, verify the current Apple HIG.

## Current design-principle lens

Apple's 2026 HIG frames design around eight broad principles. Translate them into product decisions:

### Purpose
Know what the product is for and make the important jobs excellent. A CRM capture flow should optimize capture; it should not become a miniature analytics dashboard because dashboards look “premium.”

### Agency
People stay in control. Favor reversible actions, clear state, cancel paths, and visible consequences. Avoid trapping users in wizard-like flows when direct editing would work.

### Responsibility
Privacy, safety, and transparency are interaction qualities. Ask for access only when the user understands why it is needed. Never disguise data collection as convenience.

### Familiarity
Use interaction models people already know. On iOS this means respecting navigation stacks, tabs, sheets, menus, alerts, search behavior, standard gestures, and control semantics.

### Flexibility
Design for different devices, text sizes, input methods, appearances, and accessibility settings. “Looks right on my iPhone” is not a completion criterion.

### Simplicity
Remove what is not helping the task. Simplicity is not minimal visual styling; it is a clear model with fewer unnecessary decisions.

### Craft
Details accumulate. Alignment, spacing, motion, copy, focus behavior, haptics, loading state, and dismissal behavior all influence whether an app feels finished.

### Delight
Use warmth and personality where it improves the experience. Delight is not confetti by default. It can be a perfectly timed haptic, a forgiving undo, or an unusually clear transition.

## Practical hierarchy rules

- Put the user's content and current task ahead of app chrome.
- Use type, placement, grouping, and whitespace before color or elevation.
- Keep primary actions visible when the user needs them.
- Secondary actions can move into menus, context actions, swipe actions, or deeper detail.
- Do not make destructive actions visually or spatially adjacent to frequent safe actions.
- Preserve the relationship between parent and child screens through native spatial navigation.

## Native pattern questions

Before inventing a component, ask:

1. Is this navigation or temporary work?
2. Is the action frequent or contextual?
3. Is the state persistent or momentary?
4. Can the action be undone?
5. Does the user need the parent context while doing it?
6. Is this content, chrome, or status?

The answers normally reveal whether the right pattern is push navigation, a tab, sheet, form row, menu, context menu, swipe action, alert, or inline control.

## Materials

Treat translucency/glass as a layer relationship. Chrome may float over content; content itself should remain legible and structurally clear.

A fallback that is calm and readable is better than an inaccurate imitation of a newer Apple material.

## iPad adaptation

Do not scale up an iPhone layout mechanically.

Consider:
- persistent sidebars or split navigation when information hierarchy supports it
- keyboard shortcuts and pointer behavior
- larger content canvases without stretching line lengths absurdly
- popovers instead of phone-style full-width presentations when appropriate
- maintaining the same data model and semantics while changing presentation

## Source

Canonical reference: https://developer.apple.com/design/human-interface-guidelines/
Current design principles: https://developer.apple.com/design/human-interface-guidelines/design-principles
