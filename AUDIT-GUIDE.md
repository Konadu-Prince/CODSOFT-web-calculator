# 🔍 File Consistency Auditor Guide

## Overview

The File Consistency Auditor is designed to prevent the **"Cursor AI Enhanced File Chaos"** problem where AI assistants create updated/enhanced versions of files instead of updating the original files in place.

## 🚨 The Problem

When AI assistants (like Cursor AI) enhance files, they often:

- Create new files with names like `UserControllerUpdated.js`, `usercontroller.js`, `FileEnhanced.js`
- Change case inconsistently (`UserController` → `usercontroller`)
- Create duplicate files instead of updating originals
- Break imports and references throughout the codebase

## ✅ The Solution

**Golden Rule**: Always update the original file in place, maintain consistent naming, and preserve all exports and imports.

## 🛠️ Usage

### Basic Usage

```bash
# Run audit on current directory
node audit-file-consistency.cjs

# Run audit on specific directory
node audit-file-consistency.cjs ./src

# Using npm script
npm run audit
```

### Watch Mode

```bash
# Run audit in watch mode (requires nodemon)
npm run audit:watch
```

## 🔍 What It Checks

### 1. Forbidden Filename Patterns

Detects files with these problematic patterns:

- `_v1`, `_v2`, `_v3` (version suffixes)
- `_updated`, `_enhanced`, `_improved`
- `_new`, `_fixed`, `_corrected`
- `copy`, `backup`, `old`, `temp`
- `draft`, `working`, `final`, `latest`

**Example Issues:**
```
❌ File 'UserControllerUpdated.js' uses forbidden pattern '_updated'
❌ File 'usercontroller.js' uses forbidden pattern (case change)
❌ File 'FileEnhanced.js' uses forbidden pattern '_enhanced'
```

### 2. Case Consistency

Ensures consistent naming conventions:

- **PascalCase**: `UserController.js`, `MyComponent.jsx`
- **camelCase**: `userController.js`, `myComponent.jsx`
- **kebab-case**: `user-controller.js`, `my-component.jsx`
- **snake_case**: `user_controller.js`, `my_component.jsx`
- **UPPER_SNAKE**: `USER_CONTROLLER.js`, `MY_COMPONENT.jsx`

### 3. Duplicate Files

Detects files with same name but different case:

```
❌ Duplicate file detected: 'usercontroller.js' conflicts with 'UserController.js'
```

### 4. Import Consistency

Checks if imports reference files with correct case:

```
❌ Import './usercontroller' references 'usercontroller.js' but file is named 'UserController.js'
```

## 📋 Example Audit Output

```
🔍 Starting File Consistency Audit...

🔍 Checking for forbidden filename patterns...
🔍 Checking case consistency...
🔍 Checking for duplicate files...
🔍 Checking import consistency...

📊 File Consistency Audit Report
================================

ERROR (2 issues):
--------------------------------------------------

❌ File 'UserControllerUpdated.js' uses forbidden pattern '_updated'. This suggests "enhanced file chaos" - update the original file instead of creating a new version.
   File: ./src/controllers/UserControllerUpdated.js
   💡 Update the original file in place instead of creating 'UserControllerUpdated.js'. Maintain naming consistency.

❌ Import './usercontroller' references 'usercontroller.js' but file is named 'UserController.js'.
   File: ./src/routes/userRoutes.js
   💡 Update import to use correct case: 'UserController.js'

📋 Summary:
   Total files scanned: 45
   Total issues found: 2
   Errors: 2
   Warnings: 0

❌ Please fix errors before proceeding.
```

## 🔧 Configuration

### Customizing Forbidden Patterns

Edit the `FORBIDDEN_PATTERNS` array in `audit-file-consistency.cjs`:

```javascript
FORBIDDEN_PATTERNS = [
  /_v\d+/i,           // _v1, _v2, _v3
  /_updated/i,        // _updated, _Updated
  /_enhanced/i,       // _enhanced, _Enhanced
  // Add your own patterns
  /_my_custom_pattern/i,
];
```

### Customizing Case Rules

Modify the `CASE_RULES` object:

```javascript
CASE_RULES = {
  'PascalCase': /^[A-Z][a-zA-Z0-9]*$/,
  'camelCase': /^[a-z][a-zA-Z0-9]*$/,
  // Add your own case rules
  'myCustomCase': /^[a-z]+[A-Z][a-z]*$/,
};
```

## 🎯 Best Practices

### ✅ Do This

```javascript
// Update original file in place
// UserController.js
export const getUser = () => {
  // enhanced logic
};

export const createUser = () => {
  // enhanced logic
};

// Add new function without renaming
export const deleteUser = () => {
  // new functionality
};
```

### ❌ Don't Do This

```javascript
// Don't create new files
// UserControllerUpdated.js ❌
// usercontroller.js ❌
// UserControllerV2.js ❌
// UserControllerEnhanced.js ❌
```

## 🔄 Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/audit.yml
name: File Consistency Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run File Consistency Audit
        run: node audit-file-consistency.cjs
```

## 🚀 Advanced Usage

### Pre-commit Hook

```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "node audit-file-consistency.cjs"
```

### VS Code Integration

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Audit File Consistency",
      "type": "shell",
      "command": "node",
      "args": ["audit-file-consistency.cjs"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

## 🐛 Troubleshooting

### Common Issues

1. **"Permission denied"**: Make sure the script is executable:
   ```bash
   chmod +x audit-file-consistency.cjs
   ```

2. **"Module not found"**: Ensure you're running from the project root:
   ```bash
   cd /path/to/project
   node audit-file-consistency.cjs
   ```

3. **Too many false positives**: Adjust the `ALLOWED_PATTERNS` array to exclude legitimate files.

## 📚 Examples

### Before (Problematic)

```
src/
├── UserController.js
├── UserControllerUpdated.js  ❌
├── usercontroller.js         ❌
└── UserControllerV2.js       ❌
```

### After (Fixed)

```
src/
├── UserController.js         ✅ (updated in place)
└── ...
```

## 🤝 Contributing

To improve the auditor:

1. Fork the repository
2. Create a feature branch
3. Add your improvements
4. Run the auditor on your changes
5. Submit a pull request

## 📄 License

This auditor is part of the CODSOFT Web Calculator project and follows the same MIT license.
