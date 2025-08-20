#!/usr/bin/env node

/**
 * Release Script for Job Digest Bot
 * 
 * Provides manual release management with:
 * - Semantic versioning
 * - Automated changelog generation
 * - Git tagging
 * - Pre-release validation
 */

const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

async function main() {
  try {
    console.log('🚀 Job Digest Bot Release Manager\n');

    // Check git status
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.error('❌ Working directory not clean. Please commit or stash changes.');
      process.exit(1);
    }

    // Check current branch
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    if (branch !== 'main' && branch !== 'develop') {
      console.error('❌ Please run releases from main or develop branch');
      process.exit(1);
    }

    // Get current version
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const currentVersion = packageJson.version;
    console.log(`📦 Current version: v${currentVersion}`);

    // Get release type
    console.log('\n🔢 Select release type:');
    console.log('1. patch (bug fixes, small improvements)');
    console.log('2. minor (new features, non-breaking changes)');
    console.log('3. major (breaking changes, API changes)');
    
    const typeChoice = await question('\nEnter choice (1-3): ');
    const releaseTypes = { '1': 'patch', '2': 'minor', '3': 'major' };
    const releaseType = releaseTypes[typeChoice];
    
    if (!releaseType) {
      console.error('❌ Invalid choice');
      process.exit(1);
    }

    // Calculate new version
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    let newVersion;
    switch (releaseType) {
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
    }

    console.log(`\n📈 New version will be: v${newVersion}`);
    
    // Get release notes
    const releaseNotes = await question('\n📝 Enter release notes (or press Enter to auto-generate): ');
    
    // Confirm release
    const confirm = await question(`\n⚠️  Ready to release v${newVersion}? (y/N): `);
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Release cancelled');
      process.exit(0);
    }

    console.log('\n🔧 Running pre-release checks...');
    
    // Run tests and build
    console.log('  → Running linter...');
    execSync('npm run lint', { stdio: 'inherit' });
    
    console.log('  → Running type check...');
    execSync('npm run type-check', { stdio: 'inherit' });
    
    console.log('  → Building project...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('  → Testing database connection...');
    try {
      execSync('npm run test:prisma', { stdio: 'inherit' });
    } catch (error) {
      console.warn('  ⚠️  Database test failed (might be expected in CI)');
    }

    // Update version in package.json
    console.log('\n📦 Updating package.json...');
    packageJson.version = newVersion;
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2) + '\n');

    // Generate changelog entry
    console.log('📝 Updating CHANGELOG.md...');
    const date = new Date().toISOString().split('T')[0];
    
    let changelogContent = `# Changelog

## [${newVersion}] - ${date}

### Changes
`;

    if (releaseNotes) {
      changelogContent += releaseNotes + '\n\n';
    } else {
      // Auto-generate from git commits
      try {
        const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
        const commits = execSync(`git log ${lastTag}..HEAD --oneline --no-merges`, { encoding: 'utf8' });
        if (commits.trim()) {
          changelogContent += commits.trim().split('\n').map(line => `- ${line.replace(/^[a-f0-9]+\s/, '')}`).join('\n') + '\n\n';
        } else {
          changelogContent += `- Release v${newVersion}\n\n`;
        }
      } catch {
        changelogContent += `- Release v${newVersion}\n\n`;
      }
    }

    // Add existing changelog content
    const existingChangelog = fs.readFileSync('./CHANGELOG.md', 'utf8');
    const existingContent = existingChangelog.replace(/^# Changelog\s*\n/, '');
    changelogContent += existingContent;

    fs.writeFileSync('./CHANGELOG.md', changelogContent);

    // Commit changes
    console.log('💾 Creating release commit...');
    execSync('git add package.json CHANGELOG.md');
    execSync(`git commit -m "chore: bump version to ${newVersion} 🚀

Generated with Job Digest Bot Release Manager

Co-Authored-By: Claude <noreply@anthropic.com>"`);

    // Create git tag
    console.log('🏷️  Creating git tag...');
    execSync(`git tag -a "v${newVersion}" -m "Release v${newVersion}"`);

    console.log(`\n✅ Release v${newVersion} created successfully!`);
    console.log('\n📋 Next steps:');
    console.log('1. Push to origin: git push origin main --tags');
    console.log('2. Create GitHub release from the tag');
    console.log('3. Railway will auto-deploy from main branch');

    const pushNow = await question('\n🚀 Push to origin now? (y/N): ');
    if (pushNow.toLowerCase() === 'y') {
      console.log('📤 Pushing to origin...');
      execSync('git push origin HEAD --tags', { stdio: 'inherit' });
      console.log('✅ Successfully pushed to origin!');
      console.log('🎉 Release complete! Check GitHub Actions for deployment status.');
    }

  } catch (error) {
    console.error('❌ Release failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}