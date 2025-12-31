# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistema de Gestão de Faltas Operacionais (FO) - A complete web application for centralized management of student disciplinary records at Colégio Militar de Brasília (CMB). The system handles the entire disciplinary process flow from initial observation to final documentation, including RICM (Regulamento Interno dos Colégios Militares) framework implementation with 46 disciplinary infractions, 8 mitigating circumstances, and 10 aggravating circumstances.

## Development Commands

```bash
# Development server (runs on http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Install dependencies
npm install
```

## Architecture

### Multi-Entry Point Application

The application has **three separate HTML entry points** with different purposes:

1. **index.html** → `src/main.js` - Main authenticated system (SPA with dynamic routing)
2. **public-fo.html** → `src/fo-main.js` - Public form for submitting FO observations (unauthenticated)
3. **treinamento-operadores.html** - Training slides presentation (standalone, no JS dependencies)

All entry points are configured in `vite.config.js` and built to `dist/`.

### SPA Architecture (index.html)

The main application (`src/main.js`) is a **client-side SPA using vanilla JavaScript** with:
- **Query parameter routing** (`?page=inicial`, `?page=advertencias`, etc.) - NO hash routing
- **Dynamic page loading** via ES modules (`import()`) for code splitting
- **Persistent layout** with sidebar and header that stays rendered during navigation
- **Authentication gate** - redirects to login if not authenticated

Navigation flow:
1. User navigates to `/?page=advertencias`
2. `main.js` checks authentication
3. Renders layout (sidebar + header)
4. Dynamically imports and renders the page module
5. Sets up page-specific event listeners

### Firebase Backend

- **Authentication**: Custom system using Firestore `users` collection (NOT Firebase Auth)
  - Hardcoded user accounts in `src/firebase/auth.js` → `USER_ACCOUNTS`
  - Session stored in sessionStorage with key `cmb_session`
  - Password validation checks Firestore document, falls back to default (username)

- **Database Collections**:
  - `fatosObservados` - Main FO records with status-based workflow
  - `students` - Student master data (número, nome, turma, company, contact info)
  - `users` - User credentials and preferences
  - `auditLog` - Complete audit trail of all system actions
  - `faltasEscolares` - School absences tracking

- **Storage**: Firebase Storage for document attachments

### Cache Layer

**Critical for performance** - `src/services/cacheService.js` implements a three-tier cache:
- **Memory cache** (Map) for fastest in-session data
- **sessionStorage** for persistence across page reloads
- **localStorage** for persistent data across browser sessions

#### Cache TTLs (Aggressively Optimized for Firebase Free Tier)

| Category | TTL | Purpose |
|----------|-----|---------|
| Students | 30 min | Rarely changes |
| Students List | 30 min | Student lists rarely change |
| FOs | 10 min | Main FO data |
| FOs Pending | 5 min | More dynamic, needs fresher data |
| Auth | 2 hours | Authentication credentials |
| Stats | 15 min | Dashboard statistics |
| Audit | 5 min | Audit logs |
| Global | 1 hour | Static/global data |

#### Cache Warming (App Startup)

On app initialization, `main.js` calls `warmCacheInBackground()` which:
1. Preloads all students for the user's company
2. Preloads recent FOs (limit 500)
3. Runs in background without blocking page render
4. Skips if data already cached

This reduces subsequent page navigation to **0 Firebase reads** when data is cached.

**Always use cache service** when fetching students or FOs to avoid excessive Firebase reads. Invalidate cache after mutations using `invalidateStudentCache()` or `invalidateFOCache()`.

#### AI Service Cache

The AI assistant (`src/services/aiService.js`) implements **aggressive caching** to reduce Firebase reads:

**Core optimization:** `getAllFOs()` fetches all FOs once and caches them. All other AI analyses reuse this cached data with client-side filtering, avoiding redundant Firebase queries.

**Cached queries (all 15 min TTL):**
- `getAllFOs()` - Base data for most analyses
- `getFOStats()` - FO statistics (today/week/month)
- `getObserverRanking()` - Top 10 observers
- `getAditamentoStats()` - Weekly aditamento stats
- `getFaltasStats()` - School absences aggregated
- `getSancoesCumprimento()` - Students in AOE/Retirada today
- `getSancoesStats()` - Monthly sanction stats
- `getComportamentoStats()` - Behavior decline analysis
- `getPedagogicalFOs()` - Weekly learning-related FOs
- `getStudentHistory()` - Individual student FO history
- `getRecurrenceAnalysis()` - Students with multiple FOs
- `getPeriodComparison()` - Compare periods
- `getAnalysisByTurma()` - FOs grouped by class
- `getPreventiveAlerts()` - Risk scoring

**Performance impact:**
- **First query**: 1 config read + N document reads (where N = # of docs in collections)
- **Subsequent queries (within TTL)**: 1 config read + 0 document reads (all from cache)
- **Reduction**: ~95-99% fewer Firebase reads for repeat queries

**Cache invalidation:**
- Automatically invalidated when FOs are created, updated, or deleted
- Called via `invalidateAICache()` in mutation handlers (e.g., `src/pages/inicial.js`)
- All AI data cache is cleared together to prevent stale cross-query data

**Example:** A commander asking 3 questions about FO statistics:
- Without cache: ~150-300 reads (50 FOs × 3 queries)
- With cache: ~51 reads (50 on first query, 1 config × 2 subsequent queries)

### Status Workflow

FO records follow an 8-stage workflow defined in `src/constants/index.js` → `FO_STATUS`:

```
pendente → [advertencia|repreensao|atividade_oe|retirada] → consolidar → concluir → encerrado
                                                          ↘ glpi (parallel track)
```

Each status has:
- Corresponding page module in `src/pages/`
- Sidebar navigation item
- Color coding (`FO_STATUS_COLORS`)
- Display label (`FO_STATUS_LABELS`)

Sanction types (advertencia, repreensao, atividade_oe, retirada) use a **shared template** in `src/pages/sanctionPage.js` to reduce code duplication.

### Permission System

5 user roles with hierarchical access:
- **admin** - Full access, all companies, can delete FOs
- **comandoCA** - View all, edit status, no delete
- **commander** - Specific company only, edit own company
- **sergeant** - Specific company only, edit own company, no audit access
- **auxiliar** - Restricted pages only (faltas-escolares, processo-disciplinar)

Company filtering is automatic based on user session - use `getCompanyFilter()` from `src/firebase/auth.js`.

### Document Generation

Two document types generated client-side:

1. **DOCX** (Notas de Aditamento) - `src/utils/docxGenerator.js`
   - Uses `docx` library
   - Professional formatting with military headers
   - Export via `file-saver`

2. **PDF** (Processo Disciplinar) - `src/utils/pdfGenerator.js`
   - Browser's built-in print API
   - Custom HTML → PDF conversion
   - Includes RICM citations and signatures

### AI Integration

Google Gemini API integrated in `src/services/aiService.js`:
- **AI Chat** component (`src/components/aiChat.js`) - floating chat button visible to authenticated users
- Capabilities:
  - RICM framework suggestions based on FO description
  - Statistical analysis of discipline data
  - Natural language queries about students/FOs
  - Document drafting assistance
- Prompts defined in `src/utils/aiPrompts.js`
- API key configured in `src/constants/aiConfig.js`

### Constants System

All system constants centralized in `src/constants/`:
- `index.js` - Status, routes, collections, utility functions
- `ricm.js` - Complete RICM framework (46 faltas, 8 atenuantes, 10 agravantes)
- `aiConfig.js` - AI service configuration

**Always import from constants** rather than hardcoding values.

### Component Architecture

Reusable components in `src/components/`:
- `sidebar.js` - Navigation with role-based menu filtering
- `header.js` - Top bar with user info and logout
- `expandableCard.js` - Collapsible FO cards with full details
- `actionModals.js` - Shared modals for status changes, deletions, etc.
- `aiChat.js` - Floating AI assistant

Components export both render functions and event setup functions that must be called separately.

### Audit System

Complete audit logging in `src/services/auditLogger.js`:
- Logs ALL mutations (create, update, delete, status changes)
- Captures: user, timestamp, action type, target, old/new values
- Stored in `auditLog` collection
- Viewable in Auditoria page (permission-gated)

**Always call `logAction()` after database mutations** to maintain audit trail.

## Important Patterns

### Page Module Pattern

All page modules follow this structure:

```javascript
export async function renderPageName(containerElement) {
  // 1. Get session/permissions
  const session = getSession();
  const companyFilter = getCompanyFilter();

  // 2. Try to get from cache first
  let data = getCachedData();

  if (!data) {
    // 3. Query Firestore with company filter if needed
    data = await fetchFromFirestore();

    // 4. Cache the results
    cacheData(data);
  }

  // 5. Render HTML to container
  containerElement.innerHTML = generateHTML(data);

  // 6. Set up event listeners
  setupEventListeners();
}
```

### Adding New Routes

To add a new page:

1. Add route constant to `ROUTES` in `src/constants/index.js`
2. Add page title to `PAGE_TITLES`
3. Create page module in `src/pages/yourpage.js` following the pattern above
4. Add case in `loadPage()` switch in `src/main.js`
5. Add sidebar menu item in `src/components/sidebar.js` with role check
6. Update permissions in `src/firebase/auth.js` if needed

### Working with FOs

When querying FOs, **always apply company filter** unless user is admin/comandoCA:

```javascript
import { getCompanyFilter } from './firebase/auth.js';

const companyFilter = getCompanyFilter();
let q;

if (companyFilter) {
  q = query(
    collection(db, 'fatosObservados'),
    where('status', '==', targetStatus),
    where('company', '==', companyFilter)
  );
} else {
  q = query(
    collection(db, 'fatosObservados'),
    where('status', '==', targetStatus)
  );
}
```

### FO Data Structure

Key fields in `fatosObservados` documents:
- `studentNumbers` - Array of student números
- `studentInfo` - Array of denormalized student objects (for performance)
- `status` - Current workflow status
- `company` - Companhia (6cia, 7cia, etc.)
- `tipo` - positivo|negativo|neutro
- `dataFato` - Date in YYYY-MM-DD format
- `numeroFO` - FO number for tracking
- `enquadramento` - RICM framework (falta, atenuantes, agravantes)
- `sancaoAplicada` - Final sanction applied

## Styling

Custom CSS in `src/styles/`:
- `variables.css` - CSS custom properties (colors, spacing, etc.)
- `global.css` - Base styles and resets
- `components.css` - Reusable component classes (buttons, cards, badges, etc.)
- `pages.css` - Page-specific styles

Uses **utility-first naming** for components (.btn, .card, .badge) with **BEM modifiers** (.btn--primary, .card__header).

## Deployment

Deployed to Netlify at: https://gestaocentralizadafo.netlify.app

Build configuration:
- Build command: `npm run build`
- Publish directory: `dist`
- No server-side routing needed (SPA uses query parameters)

## Known Issues & Patterns

1. **No TypeScript** - Pure vanilla JavaScript, no build-time type checking
2. **No state management library** - State managed via sessionStorage and Firestore
3. **No client-side routing library** - Custom implementation using URLSearchParams
4. **Firebase config is committed** - API keys are restricted by Firebase security rules, not environment variables
5. **Password system is basic** - Custom auth system, not Firebase Authentication
6. **Cache invalidation is manual** - Always call invalidate functions after mutations
7. **Company filter is critical** - Most queries MUST respect company boundaries based on user role

## Testing Notes

No automated test suite. Manual testing checklist:
- Test all roles (admin, comandoCA, commander, sergeant, auxiliar)
- Verify company filtering works correctly
- Check audit logs are created for all mutations
- Test document generation for both DOCX and PDF
- Verify cache invalidation after updates
- Test AI assistant with various queries
