# Project Changelog

## [2026-11-05] Fix ESM Named Export Mismatch in `backend/utils/dbEngine.js`

### Summary
Resolved a startup `SyntaxError` in Node.js ESM loader where `backend/controllers/system.controller.js` imported `computeJobAnalyticsFacet` and `computeRecruiterPipelineFacet` from `backend/utils/dbEngine.js`.

### Files Changed
- `backend/utils/dbEngine.js`
- `CHANGELOG_AND_SECURITY_AUDIT.md`
- `docs/CHANGELOG.md`

### What Changed & How It Was Done
- Exported `computeJobAnalyticsFacet` (aliased to `computeJobAnalytics`) and `computeRecruiterPipelineFacet` (aliased to `computeRecruiterPipelineAnalytics`) from `backend/utils/dbEngine.js`.
- Preserved all existing exports (`encodeCursor`, `decodeCursor`, `computeJobAnalytics`, `computeRecruiterPipelineAnalytics`) so `job.controller.js` and `system.controller.js` both work without breaking any existing functionality.

### Why
- `backend/controllers/system.controller.js` imported `{ computeJobAnalyticsFacet, computeRecruiterPipelineFacet }`, causing Node.js v24 ESM instantiation to throw `SyntaxError: The requested module '../utils/dbEngine.js' does not provide an export named 'computeJobAnalyticsFacet'`.

### How to Test
1. Start the backend server (`cd backend && npm run dev`).
2. Confirm the server boots cleanly on port `8000` with no `SyntaxError`.
3. Hit `GET http://localhost:8000/api/v1/system/health` and `GET http://localhost:8000/api/v1/system/hq-analytics` to verify the analytics facet engine returns data.