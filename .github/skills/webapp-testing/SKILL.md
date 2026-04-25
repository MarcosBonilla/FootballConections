---
name: webapp-testing
description: Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
---

# Web Application Testing

This skill enables comprehensive testing and debugging of local web applications using Playwright automation.

Use the Playwright MCP Server to undertake the work if possible. If the MCP Server is unavailable, run the code in a local Node.js environment with Playwright installed.

## When to Use This Skill

Use this skill when you need to:

- Test frontend functionality in a real browser
- Verify UI behavior and interactions
- Debug web application issues
- Capture screenshots for documentation or debugging
- Inspect browser console logs
- Validate form submissions and user flows
- Check responsive design across viewports

## Prerequisites

- Node.js installed on the system
- A locally running web application (or accessible URL)
- Playwright will be installed automatically if not present

## Core Capabilities

### 1. Browser Automation
- Navigate to URLs
- Click buttons and links
- Fill form fields
- Select dropdowns
- Handle dialogs and alerts

### 2. Verification
- Assert element presence
- Verify text content
- Check element visibility
- Validate URLs
- Test responsive behavior

### 3. Debugging
- Capture screenshots
- View console logs
- Inspect network requests
- Debug failed tests

## Usage Examples

### Basic Navigation Test
```javascript
await page.goto("http://localhost:3000");
const title = await page.title();
console.log("Page title:", title);
```

### Form Interaction
```javascript
await page.fill("#username", "testuser");
await page.fill("#password", "password123");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");
```

### Screenshot Capture
```javascript
await page.screenshot({ path: "debug.png", fullPage: true });
```

### WebSocket / Real-Time Testing
```javascript
// Listen for WebSocket messages
page.on('websocket', ws => {
  ws.on('framesent', frame => console.log('Sent:', frame.payload));
  ws.on('framereceived', frame => console.log('Received:', frame.payload));
});
```

## Common Patterns

### Wait for Element
```javascript
await page.waitForSelector("#element-id", { state: "visible" });
```

### Check if Element Exists
```javascript
const exists = (await page.locator("#element-id").count()) > 0;
```

### Get Console Logs
```javascript
page.on("console", (msg) => console.log("Browser log:", msg.text()));
```

### Handle Errors
```javascript
try {
  await page.click("#button");
} catch (error) {
  await page.screenshot({ path: "error.png" });
  throw error;
}
```

### Test Responsive Design
```javascript
await page.setViewportSize({ width: 375, height: 812 }); // iPhone 12
await page.goto("http://localhost:3000");
await page.screenshot({ path: "mobile.png" });
```

## Guidelines

1. **Always verify the app is running** before starting tests
2. **Use explicit waits** — wait for elements or navigation to complete before interacting
3. **Capture screenshots on failure** to help debug issues
4. **Clean up resources** — always close the browser when done
5. **Handle timeouts gracefully** — set reasonable timeouts for slow operations
6. **Test incrementally** — start with simple interactions before complex flows
7. **Use selectors wisely** — prefer `data-testid` or role-based selectors over CSS classes

## Testing Checklist for Football Connections Game

- [ ] Home page loads correctly
- [ ] Matchmaking queue joins and finds opponent
- [ ] WebSocket connection established (PartyKit)
- [ ] Game board renders seed player correctly
- [ ] Turn-based input works (player suggestion)
- [ ] Valid teammate accepted — chain grows
- [ ] Invalid teammate rejected — game ends
- [ ] ELO rating updates after match
- [ ] Rematch option works
- [ ] Responsive on mobile (375px viewport)
- [ ] Auth flow (login, session persistence)

## Limitations

- Requires Node.js environment
- May have issues with complex authentication flows requiring MFA
- Some modern frameworks may require specific Playwright configuration
