# Docker Setup for Visualizations with Autonomous Claude Code

This setup provides a safe, isolated Docker environment for running Claude Code autonomously with `--dangerously-skip-permission` while serving your visualizations.

## Features

- **Docker isolation**: Container protects your host system
- **Claude data persistence**: Auth and history saved in named volume
- **Multi-visualization support**: Serves all visualization directories
- **External access**: Webserver accessible from host machine
- **Resource limits**: Prevents runaway processes
- **Real-time sync**: Changes sync between host and container

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Host Machine (macOS)                            │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Docker Container                          │  │
│  │                                           │  │
│  │  ├─ Node.js 20                           │  │
│  │  ├─ Claude Code CLI                      │  │
│  │  ├─ http-server (0.0.0.0:8000)          │  │
│  │  ├─ Project files (volume mount)         │  │
│  │  └─ Claude data (named volume)           │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│         ↕ volume mount                          │
│  /Users/seankim/dev/visualizations             │
│                                                 │
│  Access: http://localhost:8123                  │
└─────────────────────────────────────────────────┘
```

## Quick Start

### 1. Build the Container

```bash
docker-compose build
```

This will:
- Download Node.js 20 base image
- Install Claude Code CLI
- Install http-server for serving visualizations
- Install development tools (git, vim, python3)

**Note**: First build takes 5-10 minutes.

### 2. Start the Container

```bash
docker-compose up -d
```

The `-d` flag runs in background.

### 3. Enter the Container

```bash
docker-compose exec -u node visualizations-dev bash
```

**Important**: Always use the `-u node` flag to enter as the `node` user (not root). This is required for Claude Code's `--dangerously-skip-permissions` flag to work.

**Pro tip**: Use the provided helper script instead:
```bash
./enter-container.sh
```

Or create a shell alias:
```bash
alias dexec='docker-compose exec -u node visualizations-dev bash'
```

### 4. Configure Claude Code (First Time Only)

Inside the container:

```bash
# Option 1: Set API key as environment variable
export ANTHROPIC_API_KEY="your-api-key-here"

# Option 2: Configure interactively
claude config
```

**Pro tip**: Add API key to `.env` file on host:

```bash
# Create .env file (don't commit this!)
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env
```

Then update `docker-compose.yml`:
```yaml
env_file:
  - .env
```

### 5. Start the Development Server

Inside the container:

```bash
./dev-start.sh
```

Or run directly:

```bash
npm run start
```

The server will be accessible at:
- **Host**: http://localhost:8123
- **Flocking**: http://localhost:8123/flocking/index.html
- **Editor**: http://localhost:8123/flocking/koi-editor.html

### 6. Run Claude Code

Inside the container:

```bash
# Interactive mode (safer for testing)
claude

# Autonomous mode (no permission prompts)
claude --dangerously-skip-permission "Your task description here"
```

## Usage Examples

### Running Autonomous Tasks

```bash
# Inside container
claude --dangerously-skip-permission "Add a new particle effect to the flocking simulation"

claude --dangerously-skip-permission "Create a new visualization in /galaxy that shows a spiral galaxy"

claude --dangerously-skip-permission "Fix the responsive layout issues in the koi editor"

claude --dangerously-skip-permission "Add comprehensive documentation to sketch.js"
```

### Development Workflow

```bash
# 1. Start container
docker-compose up -d

# 2. Enter container as node user
docker-compose exec -u node visualizations-dev bash

# 3. Start dev server (in container)
./dev-start.sh

# 4. In a new terminal, enter container again as node user
docker-compose exec -u node visualizations-dev bash

# 5. Create checkpoint
git add . && git commit -m "Before Claude task"

# 6. Run Claude autonomously
claude --dangerously-skip-permission "Implement feature X"

# 7. Exit container
exit

# 8. Review changes on host
git diff

# 9. Test in browser: http://localhost:8123

# 10. If good, commit
git add .
git commit -m "Implement feature X via Claude"

# 11. If bad, rollback
git reset --hard HEAD

# 12. Stop container when done
docker-compose down
```

## File Structure

```
visualizations/
├── Dockerfile.dev           # Container definition
├── docker-compose.yml       # Container orchestration
├── docker-entrypoint.sh     # Entrypoint to fix permissions
├── .dockerignore           # Files to exclude from build
├── dev-start.sh            # Server startup script
├── enter-container.sh       # Helper to enter container as node user
├── package.json            # Node dependencies
├── flocking/               # First visualization
│   ├── index.html
│   ├── sketch.js
│   └── ...
└── [future-viz]/           # Additional visualizations
    └── ...
```

## Volume Persistence

### Claude Data (Named Volume)

Claude authentication and history are persisted in the `claude-data` volume:

```yaml
volumes:
  claude-data:/home/node  # Persists .claude/ and .claude.json
```

This means:
- You only need to authenticate once
- Chat history is preserved across container restarts
- Config survives container recreation

**Note**: The container runs as the `node` user (not root) because Claude Code's `--dangerously-skip-permissions` flag requires non-root privileges for security reasons. A `docker-entrypoint.sh` script automatically fixes volume permissions on container startup.

### Project Files (Bind Mount)

Your code is mounted from host to container:

```yaml
volumes:
  - .:/workspace  # Real-time sync
```

This means:
- Changes in container appear on host immediately
- Changes on host appear in container immediately
- Use git on host or in container

## Adding New Visualizations

To add a new visualization:

1. Create a new directory at the root level:
   ```bash
   mkdir /workspace/my-new-viz
   ```

2. Add your visualization files:
   ```bash
   cd my-new-viz
   # Add index.html, sketch.js, etc.
   ```

3. Access it at:
   ```
   http://localhost:8123/my-new-viz/index.html
   ```

The http-server automatically serves all directories!

## Useful Commands

```bash
# Build container
docker-compose build

# Start container (background)
docker-compose up -d

# Enter container as node user
docker-compose exec -u node visualizations-dev bash

# View logs
docker-compose logs -f visualizations-dev

# Stop container
docker-compose down

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check resource usage
docker stats

# List running containers
docker ps

# Remove everything (including volumes)
docker-compose down -v
```

## Safety Best Practices

### 1. Always Use Git

```bash
# Before autonomous tasks
git add . && git commit -m "Checkpoint before Claude task"

# After task
git diff  # Review changes
git add . && git commit -m "Task completed by Claude"

# Rollback if needed
git reset --hard HEAD
```

### 2. Start with Bounded Tasks

Good examples:
- "Add a new particle type to the flocking simulation"
- "Improve the color palette in koi-editor.html"
- "Add JSDoc comments to all functions in sketch.js"
- "Fix the mobile responsive layout"

Too broad:
- "Build an entire new visualization system"
- "Completely rewrite the codebase"

### 3. Review Before Committing

Always review:
- Security issues
- Logic errors
- Performance problems
- Code quality
- Proper error handling

## Troubleshooting

### Port Already in Use

If port 8123 is taken, change in `docker-compose.yml`:
```yaml
ports:
  - "8124:8000"  # Use 8124 on host instead
```

### Claude Code Not Found

Rebuild container:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Changes Not Appearing

1. Verify volume mount in `docker-compose.yml`
2. Restart container: `docker-compose restart`
3. Check you're in `/workspace` inside container

### Permission Issues

The container runs as the `node` user for security. If you need root access:
```bash
# Enter as root
docker-compose exec -u root visualizations-dev bash

# Fix ownership if needed
chown -R node:node /workspace /home/node

# Then exit and re-enter as node user
exit
docker-compose exec visualizations-dev bash
```

## Resource Limits

Current limits (adjust in `docker-compose.yml`):
- **CPU**: 2 cores
- **Memory**: 4GB

To change:
```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
```

## Security Checklist

Before running `--dangerously-skip-permission`:

- [ ] Code is committed to git
- [ ] Container is isolated from host system
- [ ] Resource limits are set
- [ ] Task scope is clearly defined
- [ ] Time available to review changes
- [ ] Backup/rollback plan exists
- [ ] No production credentials in environment

## Cost Considerations

Running Claude Code autonomously consumes API credits:

**Typical costs**:
- Simple task (15 min): $0.50 - $2
- Medium task (1 hour): $5 - $15
- Complex task (4 hours): $20 - $60

**Optimization tips**:
1. Be specific with task descriptions
2. Start in interactive mode to debug
3. Set clear boundaries
4. Monitor usage in Anthropic dashboard

## Next Steps

1. **Test the setup**: Run a simple task to verify everything works
2. **Configure your editor**: Set up file watching for hot reload
3. **Explore**: Create new visualizations!
4. **Automate**: Add more npm scripts for common tasks

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [http-server Documentation](https://www.npmjs.com/package/http-server)

---

**Note**: This setup is designed for development and safe autonomous operation. Always review Claude's changes before deploying to production.
