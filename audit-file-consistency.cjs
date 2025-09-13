#!/usr/bin/env node

/**
 * File Consistency Auditor
 * Detects and prevents "enhanced file chaos" - when AI assistants create
 * updated/enhanced versions instead of updating original files in place
 */

const fs = require('fs');
const path = require('path');

class FileConsistencyAuditor {
  constructor() {
    this.issues = [];
    this.fileMap = new Map(); // Track file relationships
    this.importMap = new Map(); // Track import statements
  }

  // Forbidden filename patterns that indicate "enhanced file chaos"
  FORBIDDEN_PATTERNS = [
    /_v\d+/i,           // _v1, _v2, _v3
    /_updated/i,        // _updated, _Updated
    /_enhanced/i,       // _enhanced, _Enhanced
    /_new/i,            // _new, _New
    /_improved/i,       // _improved, _Improved
    /_fixed/i,          // _fixed, _Fixed
    /_corrected/i,      // _corrected, _Corrected
    /_modified/i,       // _modified, _Modified
    /copy/i,            // copy, Copy, COPY
    /backup/i,          // backup, Backup, BACKUP
    /old/i,             // old, Old, OLD
    /temp/i,            // temp, Temp, TEMP
    /test/i,            // test, Test, TEST (when not in test directory)
    /draft/i,           // draft, Draft, DRAFT
    /working/i,         // working, Working, WORKING
    /final/i,           // final, Final, FINAL
    /latest/i,          // latest, Latest, LATEST
    /current/i,         // current, Current, CURRENT
  ];

  // Allowed patterns (exceptions to forbidden patterns)
  ALLOWED_PATTERNS = [
    /\.test\./i,        // .test.js, .test.ts
    /\.spec\./i,        // .spec.js, .spec.ts
    /test\//i,          // test/ directory
    /tests\//i,         // tests/ directory
    /__tests__\//i,     // __tests__/ directory
    /\.backup$/i,       // .backup extension
    /\.bak$/i,          // .bak extension
  ];

  // Case consistency rules
  CASE_RULES = {
    'PascalCase': /^[A-Z][a-zA-Z0-9]*$/,           // UserController, MyComponent
    'camelCase': /^[a-z][a-zA-Z0-9]*$/,            // userController, myComponent
    'kebab-case': /^[a-z][a-z0-9-]*[a-z0-9]$/,     // user-controller, my-component
    'snake_case': /^[a-z][a-z0-9_]*[a-z0-9]$/,     // user_controller, my_component
    'UPPER_SNAKE': /^[A-Z][A-Z0-9_]*[A-Z0-9]$/,   // USER_CONTROLLER, MY_COMPONENT
  };

  /**
   * Main audit function
   */
  async audit(directory = '.') {
    console.log('🔍 Starting File Consistency Audit...\n');
    
    await this.scanDirectory(directory);
    this.checkForbiddenFilenames();
    this.checkCaseConsistency();
    this.checkDuplicateFiles();
    this.checkImportConsistency();
    this.generateReport();
    
    return this.issues;
  }

  /**
   * Recursively scan directory for files
   */
  async scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .git, and other common directories
        if (!this.shouldSkipDirectory(item)) {
          await this.scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        this.analyzeFile(fullPath);
      }
    }
  }

  /**
   * Check if directory should be skipped
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', '.vscode', '.idea', 
      'dist', 'build', 'coverage', '.nyc_output',
      'logs', 'tmp', 'temp'
    ];
    return skipDirs.includes(dirName);
  }

  /**
   * Analyze individual file
   */
  analyzeFile(filePath) {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath);
    const nameWithoutExt = path.basename(filePath, ext);
    
    // Store file info
    this.fileMap.set(filePath, {
      filename,
      nameWithoutExt,
      extension: ext,
      directory: path.dirname(filePath)
    });

    // Extract imports if it's a code file
    if (this.isCodeFile(ext)) {
      this.extractImports(filePath);
    }
  }

  /**
   * Check if file is a code file
   */
  isCodeFile(extension) {
    const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
    return codeExtensions.includes(extension.toLowerCase());
  }

  /**
   * Extract import statements from file
   */
  extractImports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = [];
      
      // Match various import patterns
      const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      this.importMap.set(filePath, imports);
    } catch (error) {
      // Skip files that can't be read
    }
  }

  /**
   * Check for forbidden filename patterns
   */
  checkForbiddenFilenames() {
    console.log('🔍 Checking for forbidden filename patterns...');
    
    for (const [filePath, fileInfo] of this.fileMap) {
      const filename = fileInfo.filename;
      const nameWithoutExt = fileInfo.nameWithoutExt;
      
      // Check if file matches any allowed patterns (exceptions)
      const isAllowed = this.ALLOWED_PATTERNS.some(pattern => 
        pattern.test(filePath) || pattern.test(filename)
      );
      
      if (isAllowed) continue;
      
      // Check for forbidden patterns
      for (const pattern of this.FORBIDDEN_PATTERNS) {
        if (pattern.test(filename) || pattern.test(nameWithoutExt)) {
          this.issues.push({
            type: 'forbidden_filename',
            severity: 'error',
            file: filePath,
            message: `❌ File '${filename}' uses forbidden pattern '${pattern.source}'. This suggests "enhanced file chaos" - update the original file instead of creating a new version.`,
            suggestion: `Update the original file in place instead of creating '${filename}'. Maintain naming consistency.`
          });
        }
      }
    }
  }

  /**
   * Check case consistency
   */
  checkCaseConsistency() {
    console.log('🔍 Checking case consistency...');
    
    for (const [filePath, fileInfo] of this.fileMap) {
      const filename = fileInfo.nameWithoutExt;
      const directory = fileInfo.directory;
      
      // Determine expected case based on directory and file type
      const expectedCase = this.determineExpectedCase(directory, filename);
      
      if (expectedCase && !this.CASE_RULES[expectedCase].test(filename)) {
        this.issues.push({
          type: 'case_inconsistency',
          severity: 'warning',
          file: filePath,
          message: `⚠️  File '${filename}' doesn't follow expected ${expectedCase} convention.`,
          suggestion: `Rename to follow ${expectedCase} convention or update imports accordingly.`
        });
      }
    }
  }

  /**
   * Determine expected case convention based on directory
   */
  determineExpectedCase(directory, filename) {
    // Documentation files (README, CHANGELOG, etc.)
    if (filename.match(/^(README|CHANGELOG|LICENSE|CONTRIBUTING|AUDIT-GUIDE)/i)) {
      return null; // Skip case checking for documentation
    }
    
    // Audit and script files
    if (filename.includes('audit-') || filename.endsWith('.cjs')) {
      return null; // Skip case checking for audit scripts
    }
    
    // Component files (React, Vue, etc.)
    if (directory.includes('components') || directory.includes('Components')) {
      return 'PascalCase';
    }
    
    // Utility files
    if (directory.includes('utils') || directory.includes('helpers')) {
      return 'camelCase';
    }
    
    // Configuration files
    if (filename.includes('config') || filename.includes('Config')) {
      return 'camelCase';
    }
    
    // Default to camelCase for most files
    return 'camelCase';
  }

  /**
   * Check for duplicate files (same name, different case)
   */
  checkDuplicateFiles() {
    console.log('🔍 Checking for duplicate files...');
    
    const nameMap = new Map();
    
    for (const [filePath, fileInfo] of this.fileMap) {
      const lowerName = fileInfo.nameWithoutExt.toLowerCase();
      
      if (nameMap.has(lowerName)) {
        const existingFile = nameMap.get(lowerName);
        this.issues.push({
          type: 'duplicate_file',
          severity: 'error',
          file: filePath,
          message: `❌ Duplicate file detected: '${fileInfo.filename}' conflicts with '${existingFile.filename}' (case-insensitive match).`,
          suggestion: `Consolidate into single file or use distinct names. Update all imports accordingly.`
        });
      } else {
        nameMap.set(lowerName, fileInfo);
      }
    }
  }

  /**
   * Check import consistency
   */
  checkImportConsistency() {
    console.log('🔍 Checking import consistency...');
    
    for (const [filePath, imports] of this.importMap) {
      for (const importPath of imports) {
        // Check if imported file exists with correct case
        const resolvedPath = this.resolveImportPath(filePath, importPath);
        
        if (resolvedPath && !fs.existsSync(resolvedPath)) {
          // Try to find file with different case
          const directory = path.dirname(resolvedPath);
          const filename = path.basename(resolvedPath);
          const ext = path.extname(filename);
          const nameWithoutExt = path.basename(filename, ext);
          
          const files = fs.readdirSync(directory);
          const matchingFile = files.find(file => 
            file.toLowerCase() === filename.toLowerCase()
          );
          
          if (matchingFile && matchingFile !== filename) {
            this.issues.push({
              type: 'import_case_mismatch',
              severity: 'error',
              file: filePath,
              message: `❌ Import '${importPath}' references '${filename}' but file is named '${matchingFile}'.`,
              suggestion: `Update import to use correct case: '${matchingFile}'`
            });
          }
        }
      }
    }
  }

  /**
   * Resolve import path relative to file
   */
  resolveImportPath(filePath, importPath) {
    if (importPath.startsWith('.')) {
      return path.resolve(path.dirname(filePath), importPath);
    }
    return null; // Skip node_modules imports
  }

  /**
   * Generate audit report
   */
  generateReport() {
    console.log('\n📊 File Consistency Audit Report');
    console.log('================================\n');
    
    if (this.issues.length === 0) {
      console.log('✅ No issues found! Your file naming is consistent.');
      return;
    }
    
    // Group issues by type
    const groupedIssues = this.issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {});
    
    // Display issues by severity
    const severityOrder = ['error', 'warning', 'info'];
    
    for (const severity of severityOrder) {
      const issues = this.issues.filter(issue => issue.severity === severity);
      
      if (issues.length > 0) {
        console.log(`\n${severity.toUpperCase()} (${issues.length} issues):`);
        console.log('-'.repeat(50));
        
        issues.forEach(issue => {
          console.log(`\n${issue.message}`);
          console.log(`   File: ${issue.file}`);
          if (issue.suggestion) {
            console.log(`   💡 ${issue.suggestion}`);
          }
        });
      }
    }
    
    console.log('\n📋 Summary:');
    console.log(`   Total files scanned: ${this.fileMap.size}`);
    console.log(`   Total issues found: ${this.issues.length}`);
    console.log(`   Errors: ${this.issues.filter(i => i.severity === 'error').length}`);
    console.log(`   Warnings: ${this.issues.filter(i => i.severity === 'warning').length}`);
    
    if (this.issues.some(issue => issue.severity === 'error')) {
      console.log('\n❌ Please fix errors before proceeding.');
      process.exit(1);
    }
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new FileConsistencyAuditor();
  const directory = process.argv[2] || '.';
  
  auditor.audit(directory).catch(error => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });
}

module.exports = FileConsistencyAuditor;
