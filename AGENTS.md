# Working on this portfolio

This is the canonical source for TinyIsberg/tinyisberg.github.io. Hosting is GitHub Pages, with the workflow in .github/workflows/pages.yml publishing dist/ on pushes to main. Do not create or publish a separate Sites project.

Preserve the owner's noindex preference on every HTML page and in the checks report generator. The site and repository remain public; do not describe noindex as access protection. Keep the PDF exclusion in robots.txt.

For authorized website changes, edit this checkout, keep the full accepted copy, run the appropriate checks with the preview server serving dist/, commit and push to main, then follow the Pages deployment and verify the live page. Do not modify the legacy Sites checkout as the primary site.

Useful commands: npm run preview; npm test. The test suite requires Playwright Chromium and Firefox. package-lock.json pins the dependency version. Update report artifacts when checked source files change. Do not add dependencies or a build system for simple edits.

index.html and app.js both contain case headings. Keep them consistent. Preserve the confirmed Sportson results, exam date and contact information unless the user requests changes.
