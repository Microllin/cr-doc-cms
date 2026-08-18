# Contributing

## Development Setup

```bash
pnpm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials
pnpm dev
```

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `refactor:` | Code refactoring |
| `test:` | Tests |
| `ci:` | CI/CD |

## Pull Request Process

1. Fork and create a feature branch from `main`
2. Make changes and add tests
3. Run `pnpm run lint && pnpm run build && pnpm run test:int`
4. Submit a PR with a clear description
