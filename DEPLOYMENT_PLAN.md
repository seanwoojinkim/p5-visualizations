# Deployment Plan: Visualizations Monorepo

## Security Sweep Results ✓

### Clean Items
- ✅ No `.env` files found
- ✅ No credentials files found
- ✅ No actual API keys or secrets in code
- ✅ No private keys outside of test fixtures

### Items Requiring Attention

#### 1. Portfolio Contact Information (PRIORITY)
**Files affected:**
- `/portfolio/index.html:109`
- `/portfolio/about.html:116-118, 132, 141`
- `/portfolio/writing.html:96`

**Current placeholders:**
- Email: `hello@example.com`
- GitHub: `https://github.com`
- Twitter: `https://twitter.com` / `@yourusername`

**Action Required:**
- [ ] Replace with your actual contact information OR
- [ ] Remove contact links entirely if keeping this as dev index only
- [ ] Update GitHub link in `/index.html:104` (repository link)

#### 2. Large Directories to Exclude (626MB total)
- `hrv-monitor/` - 564MB Python venv (development only)
- `node_modules/` - 62MB (dev dependencies)
- `thoughts/` - 2.5MB (documentation/notes)

#### 3. Development/Documentation Files
Files safe to exclude from deployment:
- `*.md` files (DOCKER_SETUP, PHASE1_CHECKPOINT, etc.)
- `.DS_Store` files
- `test-*.mjs` files (Node.js test scripts)
- `.claude/` directory (AI assistant configs)
- Docker files (Dockerfile.dev, docker-compose.yml, etc.)
- Shell scripts (dev-start.sh, docker-entrypoint.sh, etc.)

#### 4. Binary/Archive Files
- `clouds/Stylized Cloud Generator.rar` - 3D asset source (not needed for web)
- `clouds/Stylized Cloud Generator/*.blend` - Blender files (not needed for web)

### Security Verdict: ✅ SAFE TO DEPLOY

No sensitive credentials or API keys found. Only placeholder contact info needs updating.

---

## Deployment Configuration

### 1. Root `.gitignore`

Current `.gitignore` is minimal:
```
.vercel
```

**Recommended comprehensive `.gitignore`:**

```gitignore
# Vercel
.vercel

# Dependencies
node_modules/

# Development
hrv-monitor/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Test files
test-*.mjs
*.test.js

# Documentation (optional - keep if you want docs deployed)
DOCKER_SETUP.md
PHASE*.md
code-review-*.md

# Claude AI
.claude/

# Docker
Dockerfile*
docker-compose.yml
*.sh
```

### 2. Root `.vercelignore`

Additional files to exclude from Vercel builds:

```
# Development
hrv-monitor
node_modules
thoughts

# Binary assets not needed for web
clouds/Stylized Cloud Generator.rar
clouds/Stylized Cloud Generator
*.blend

# Documentation
*.md
!README.md

# OS
.DS_Store
Thumbs.db

# Test files
test-*.mjs
*.test.js

# Claude AI
.claude

# Docker
Dockerfile*
docker-compose.yml
*.sh

# Git
.git
.gitignore
```

### 3. Root `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/koi/editor",
      "destination": "/flocking/koi-editor.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, must-revalidate"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "cleanUrls": true,
  "trailingSlash": false
}
```

**Configuration notes:**
- Sets 1-hour cache for pages, 1-year cache for static assets
- Clean URLs enabled (removes .html extensions)
- Maintains `/koi/editor` rewrite from original flocking deployment

---

## GitHub + Vercel Auto-Deploy Setup

### Step 1: Update Contact Information

Before pushing to GitHub, update placeholder contact info in portfolio files.

### Step 2: Create/Update `.gitignore`

Add comprehensive `.gitignore` to prevent committing unnecessary files.

### Step 3: Create GitHub Repository

```bash
# If not already initialized
git remote add origin https://github.com/yourusername/visualizations.git

# Or update existing remote
git remote set-url origin https://github.com/yourusername/visualizations.git
```

### Step 4: Initial Commit & Push

```bash
# Add deployment configs
git add .gitignore .vercelignore vercel.json

# Review what will be committed
git status

# Commit and push
git add .
git commit -m "feat: Configure monorepo for Vercel deployment with GitHub integration"
git push -u origin main
```

### Step 5: Configure Vercel Project

#### Option A: Reconfigure Existing Project

1. Go to Vercel dashboard → Your "visualizations" project
2. Settings → Git → Disconnect current deployment (if any)
3. Settings → General → Root Directory → Change from `./flocking` to `./`
4. Connect to GitHub repository
5. Set up automatic deployments

#### Option B: Create New Project

1. Import GitHub repository in Vercel
2. Project settings:
   - **Framework Preset:** Other
   - **Root Directory:** `./` (leave empty)
   - **Build Command:** (leave empty - static site)
   - **Output Directory:** (leave empty)
   - **Install Command:** (leave empty)

### Step 6: Environment Variables

None needed! All visualizations are client-side only.

### Step 7: Custom Domain (Optional)

1. Vercel dashboard → Domains
2. Add your domain (e.g., `visualizations.yourdomain.com`)
3. Configure DNS as instructed

---

## URL Structure After Deployment

```
yourdomain.vercel.app/
├── /                          → Project index (new!)
├── /portfolio/                → Portfolio site
├── /flocking/                 → Koi simulation
│   ├── /flocking/index.html   → Main simulation
│   ├── /flocking/koi-editor   → Editor (rewrite)
├── /coherence/                → Coherence visualization
│   ├── /coherence/index.html  → Simulated version
│   ├── /coherence/index-polar → Polar H10 version
├── /clouds/                   → Calming clouds
└── /water-background/         → Animated water
```

---

## Testing Checklist

After deployment, verify:

- [ ] Root index page loads correctly
- [ ] All project links work from index
- [ ] Individual project pages load with assets
- [ ] `/koi/editor` rewrite works
- [ ] Portfolio pages render correctly
- [ ] No 404s for assets (check browser console)
- [ ] Mobile responsiveness works
- [ ] Performance is acceptable (check Lighthouse)

---

## Future Considerations

### Portfolio Separation Strategy

When ready to move portfolio to separate repo:

1. **Create new repo:** `portfolio` (separate from visualizations)
2. **Deploy to custom domain:** `yourdomain.com`
3. **Update visualization links in portfolio** to point to deployed viz site
4. **Remove portfolio from visualizations repo** (or keep as backup)

### Benefits of separation:
- Clean personal brand on main domain
- Independent versioning for portfolio vs. projects
- Different update cadences
- Portfolio can link to deployed visualizations

---

## Maintenance Notes

### Adding New Visualizations

1. Create new directory in root (e.g., `/new-project/`)
2. Add entry to `/index.html`
3. Optionally add to portfolio showcase
4. Commit and push → Auto-deploys via GitHub integration

### Updating Existing Projects

1. Edit files in project directory
2. Test locally at `http://localhost:8123`
3. Commit and push → Auto-deploys

### Rollback Strategy

Vercel keeps deployment history:
- Dashboard → Deployments → Select previous version → Promote to Production
